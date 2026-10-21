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
      // Only people who attended are emailed. The missed-you and welfare
      // emails to non-attendees were switched off on 2026-10-21.
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
    return new Response(JSON.stringify({ ok: false, error: (error as Error).message }), { status: 500 });
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
