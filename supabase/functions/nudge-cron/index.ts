import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEND_EMAIL_URL = `${SUPABASE_URL}/functions/v1/send-email`;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

Deno.serve(async (req) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const results = {
      thank_you: 0,
      missed_you: 0,
      welfare: 0,
      escalations: 0,
      skipped: 0,
    };

    // Find all sessions that closed today (so we send 5pm summaries)
    const { data: closedToday } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_date", today)
      .eq("cancelled", false)
      .not("closed_at", "is", null);

    for (const session of closedToday ?? []) {
      // --- THANK YOU emails to attendees ---
      const { data: attendees } = await supabase
        .from("session_attendees_view")
        .select("*")
        .eq("session_id", session.id);

      for (const a of attendees ?? []) {
        const sent = await alreadySentThisWeek(a.member_id, "thank_you", today);
        if (sent) {
          results.skipped++;
          continue;
        }
        await sendEmail("thank_you", a.member_id, session.id);
        results.thank_you++;
      }

      // --- MISSED YOU emails to non-attendees ---
      const { data: missed } = await supabase.rpc("members_who_missed_session", {
        p_session_id: session.id,
      });

      for (const m of missed ?? []) {
        const consecMissed = m.consecutive_misses;

        // Frequency rule:
        // - 1st or 2nd consecutive miss: send missed_you
        // - 3rd or more consecutive: switch to welfare email
        if (consecMissed >= 3) {
          // Check welfare cap: don't re-send welfare if we sent one in last 14 days
          const recentWelfare = await alreadySentWithin(m.member_id, "welfare", 14);
          if (recentWelfare) {
            results.skipped++;
            continue;
          }
          await sendEmail("welfare", m.member_id, session.id);
          await createOrUpdateWelfareFlag(m.member_id, consecMissed);
          results.welfare++;
        } else {
          // Send missed_you if we haven't already sent one this week
          const sentThisWeek = await alreadySentThisWeek(m.member_id, "missed_you", today);
          if (sentThisWeek) {
            results.skipped++;
            continue;
          }
          await sendEmail("missed_you", m.member_id, session.id);
          results.missed_you++;
        }
      }
    }

    // --- ESCALATION: check welfare flags that need phone escalation ---
    // Rule: welfare email sent >= 7 days ago, no reply received (resolved_at null),
    // and member has now been absent another 14 days. Flag to Emma's dashboard.
    const cutoff21 = new Date();
    cutoff21.setDate(cutoff21.getDate() - 21);

    const { data: flagsToEscalate } = await supabase
      .from("welfare_flags")
      .select("*")
      .lte("last_email_sent_at", cutoff21.toISOString())
      .is("resolved_at", null)
      .is("escalated_to_phone_at", null);

    for (const f of flagsToEscalate ?? []) {
      await supabase
        .from("welfare_flags")
        .update({
          escalated_to_phone_at: new Date().toISOString(),
          stage: "escalated",
        })
        .eq("id", f.id);
      results.escalations++;
    }

    return new Response(JSON.stringify({ ok: true, today, results }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }
});

async function alreadySentThisWeek(memberId: string, template: string, weekOf: string): Promise<boolean> {
  const { data } = await supabase
    .from("email_log")
    .select("id")
    .eq("member_id", memberId)
    .eq("template", template)
    .eq("week_of", weekOf)
    .eq("sent_status", "sent")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function alreadySentWithin(memberId: string, template: string, days: number): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const { data } = await supabase
    .from("email_log")
    .select("id")
    .eq("member_id", memberId)
    .eq("template", template)
    .gte("sent_at", cutoff.toISOString())
    .eq("sent_status", "sent")
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function sendEmail(template: string, memberId: string, sessionId?: string): Promise<void> {
  await fetch(SEND_EMAIL_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ template, member_id: memberId, session_id: sessionId }),
  });
}

async function createOrUpdateWelfareFlag(memberId: string, weeksAbsent: number) {
  const { data: existing } = await supabase
    .from("welfare_flags")
    .select("id")
    .eq("member_id", memberId)
    .is("resolved_at", null)
    .limit(1);

  if (existing?.length) {
    await supabase
      .from("welfare_flags")
      .update({
        weeks_absent: weeksAbsent,
        stage: weeksAbsent >= 4 ? "welfare_check" : "missed_you",
        last_email_sent_at: new Date().toISOString(),
      })
      .eq("id", existing[0].id);
  } else {
    await supabase.from("welfare_flags").insert({
      member_id: memberId,
      weeks_absent: weeksAbsent,
      stage: "welfare_check",
      last_email_sent_at: new Date().toISOString(),
    });
  }
}
