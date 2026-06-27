// Edge Function: invite-admin
// ----------------------------------------------------------------------------
// Super-admin-only flow: takes an email + optional name, creates the auth
// user with a generated temporary password, marks profile.must_change_password
// so the app forces a password change on first sign-in, and reuses the
// existing send-email Edge Function to deliver the credentials.
//
// Required Edge Function secrets (already used by send-email — no new env):
//   SUPABASE_URL                (auto)
//   SUPABASE_SERVICE_ROLE_KEY   (auto)
//   RESEND_API_KEY              (already set for send-email)
//   RESEND_FROM_EMAIL           (already set for send-email)
//   RESEND_REPLY_TO             (already set for send-email)
// ----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InviteRequest = {
  email: string;
  full_name?: string;
  site_url: string;
};

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

    // 2. Parse + validate the payload.
    const body: InviteRequest = await req.json();
    const email = (body.email ?? "").trim().toLowerCase();
    const fullName = (body.full_name ?? "").trim();
    const siteUrl = (body.site_url ?? "").replace(/\/$/, "");
    if (!email || !email.includes("@") || !siteUrl) {
      return json({ ok: false, error: "bad_payload" }, 400);
    }

    // 3. Create the auth user with a temp password.
    const tempPassword = generatePassword();
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "create_failed";
      const isDuplicate = /already\s+registered|already\s+exists/i.test(msg);
      return json(
        {
          ok: false,
          error: isDuplicate ? "already_exists" : "create_failed",
          detail: msg,
        },
        isDuplicate ? 409 : 500,
      );
    }

    // 4. Mark the new profile as needing a password change. The trigger
    // profile_autocreate inserted the row already; we flip the flag,
    // write the full_name if provided, and assign a default region so
    // /walk (volunteer kiosk) and region-scoped admin pages have data
    // to render. Default region = Bristol while we're a single-region
    // charity; the super_admin can move them later in Settings → Team.
    const { data: defaultRegion } = await admin
      .from("regions")
      .select("id")
      .eq("slug", "bristol")
      .maybeSingle();

    await admin
      .from("profiles")
      .update({
        must_change_password: true,
        ...(fullName ? { full_name: fullName } : {}),
        ...(defaultRegion?.id ? { region_id: defaultRegion.id } : {}),
      })
      .eq("id", created.user.id);

    const firstName = fullName.split(/\s+/).filter(Boolean)[0] ?? "";

    // 5. Hand off to the existing send-email function (one Resend
    // integration point for the whole project — no duplication).
    const loginUrl = `${siteUrl}/login`;
    const sendResp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template: "admin_invite",
        to_email: email,
        first_name: firstName || undefined,
        password: tempPassword,
        login_url: loginUrl,
      }),
    });
    const sendData = await sendResp.json().catch(() => ({}));

    // 6. Return the temp password so the inviter can copy/paste manually
    // if the email never arrives (deliverability fallback). It's never
    // stored anywhere — once this response is sent we forget it.
    return json(
      {
        ok: true,
        email,
        user_id: created.user.id,
        temporary_password: tempPassword,
        email_sent: !!sendData?.ok,
        email_error: sendData?.ok ? null : sendData,
      },
      200,
    );
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

// 12 chars, mixed case + digits. Skips look-alike chars (0/O, 1/l/I) so the
// password is readable in an email.
function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
