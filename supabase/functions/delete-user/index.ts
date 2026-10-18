import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DeleteRequest = { user_id: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  try {
    // 1. Verify the caller is a super_admin via their JWT.
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ ok: false, error: "no_auth" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerErr,
    } = await userClient.auth.getUser();
    if (callerErr || !caller) {
      return json({ ok: false, error: "invalid_token" }, 401);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const { data: callerProfile, error: profErr } = await admin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (profErr || callerProfile?.role !== "super_admin") {
      return json({ ok: false, error: "forbidden" }, 403);
    }

    // 2. Validate the target.
    const body: DeleteRequest = await req.json();
    const userId = (body.user_id ?? "").trim();
    if (!userId) {
      return json({ ok: false, error: "bad_payload" }, 400);
    }
    if (userId === caller.id) {
      return json({ ok: false, error: "cannot_delete_self" }, 400);
    }

    // 3. Null out audit references (best-effort) so the cascading profile
    //    delete isn't blocked by ON DELETE RESTRICT foreign keys.
    await admin.from("attendance").update({ recorded_by: null }).eq("recorded_by", userId);
    await admin.from("sessions").update({ opened_by: null }).eq("opened_by", userId);
    await admin.from("welfare_flags").update({ resolved_by: null }).eq("resolved_by", userId);

    // 4. Delete the auth user — cascades to the profiles row.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return json({ ok: false, error: "delete_failed", detail: delErr.message }, 500);
    }

    return json({ ok: true, user_id: userId }, 200);
  } catch (e) {
    return json(
      { ok: false, error: "unexpected", detail: (e as Error).message },
      500,
    );
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
