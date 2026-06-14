// Walkers & Talkers — public check-in endpoint.
//
// Resolves a card token to a member, verifies there is an OPEN session for that
// member's region today, and records an idempotent attendance row. Runs with
// the service_role key inside the Edge runtime (never exposed to the browser),
// so it can write attendance without a client-side RLS insert policy.
//
// Deploy:  supabase functions deploy checkin
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by the
//  Supabase Edge runtime — no secrets to set by hand.)
//
// Response shape: { status, first_name? }
//   ok            – checked in just now
//   already       – already checked in this session (double tap, harmless)
//   no_session    – no walk scheduled for the region today
//   cancelled     – today's walk is cancelled (bank holiday etc.)
//   not_open      – a session exists but a volunteer hasn't opened check-in
//   invalid_card  – token not found / member missing or inactive
//   inactive_card – card exists but is pending / lost / revoked
//   error         – unexpected server error

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// Today's date in the UK walk timezone, as YYYY-MM-DD (matches sessions.session_date).
function ukToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!token) return json({ status: "invalid_card" });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // 1. Card -> member
    const { data: card, error: cardErr } = await supabase
      .from("cards")
      .select("id, state, member_id")
      .eq("token", token)
      .maybeSingle();
    if (cardErr) throw cardErr;
    if (!card) return json({ status: "invalid_card" });
    if (card.state !== "active") return json({ status: "inactive_card" });

    const { data: member, error: memberErr } = await supabase
      .from("members")
      .select("id, first_name, region_id, active")
      .eq("id", card.member_id)
      .maybeSingle();
    if (memberErr) throw memberErr;
    if (!member || !member.active) return json({ status: "invalid_card" });

    // 2. Today's session for the member's region.
    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, opened_at, closed_at, cancelled")
      .eq("region_id", member.region_id)
      .eq("session_date", ukToday())
      .maybeSingle();
    if (sessionErr) throw sessionErr;

    if (!session) return json({ status: "no_session", first_name: member.first_name });
    if (session.cancelled) return json({ status: "cancelled", first_name: member.first_name });
    // 3. Session-open guard — stops a found/lost card logging from someone's home.
    if (!session.opened_at || session.closed_at) {
      return json({ status: "not_open", first_name: member.first_name });
    }

    // 4. Idempotent attendance (unique on session_id + member_id).
    const { error: insErr } = await supabase.from("attendance").insert({
      session_id: session.id,
      member_id: member.id,
      method: "nfc",
      card_id: card.id,
    });
    if (insErr) {
      if (insErr.code === "23505") {
        return json({ status: "already", first_name: member.first_name });
      }
      throw insErr;
    }

    return json({ status: "ok", first_name: member.first_name });
  } catch (e) {
    console.error("checkin error:", e);
    return json({ status: "error" }, 500);
  }
});
