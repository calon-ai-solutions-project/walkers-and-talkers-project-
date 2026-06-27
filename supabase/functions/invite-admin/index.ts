// Edge Function: invite-admin
// ----------------------------------------------------------------------------
// Admin-only flow: takes an email, optional full name, generates a temporary
// password, creates the auth.users row via the service-role admin API, and
// emails the credentials via Resend. The invitee logs in at /login with the
// emailed password and is encouraged to change it under Settings.
//
// Caller MUST be authenticated as a super_admin (we verify their JWT against
// the profiles table). The frontend invokes this via supabase.functions.invoke
// which forwards the user's session JWT in the Authorization header.
//
// Required Edge Function secrets:
//   SUPABASE_URL                (auto)
//   SUPABASE_SERVICE_ROLE_KEY   (auto)
//   RESEND_API_KEY
//   RESEND_FROM_EMAIL           e.g.  "Walkers & Talkers <noreply@walkersandtalkers.org.uk>"
//   RESEND_REPLY_TO             e.g.  "hello@walkersandtalkers.org.uk"
// ----------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL")!;
const RESEND_REPLY_TO = Deno.env.get("RESEND_REPLY_TO") ?? RESEND_FROM;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InviteRequest = {
  email: string;
  full_name?: string;
  site_url: string; // e.g. "https://walkers-and-talkers-project.vercel.app"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  try {
    // 1. Verify caller is super_admin via their JWT.
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
      // Most common: "User already registered" — surface a clean message.
      const msg = createErr?.message ?? "create_failed";
      const isDuplicate = /already\s+registered|already\s+exists/i.test(msg);
      return json(
        { ok: false, error: isDuplicate ? "already_exists" : "create_failed", detail: msg },
        isDuplicate ? 409 : 500,
      );
    }

    // 4. Send the credentials email via Resend.
    const loginUrl = `${siteUrl}/login`;
    const subject = "Your Walkers & Talkers admin login";
    const { html, text } = buildEmail({
      first_name: fullName.split(" ")[0] || email.split("@")[0],
      email,
      password: tempPassword,
      login_url: loginUrl,
    });

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        reply_to: RESEND_REPLY_TO,
        to: [email],
        subject,
        html,
        text,
      }),
    });
    const resendData = await resendResp.json();

    // 5. Return result. We return the temp password so the inviter can copy
    // it manually if the email never arrives (deliverability fallback).
    return json(
      {
        ok: true,
        email,
        user_id: created.user.id,
        temporary_password: tempPassword,
        email_sent: resendResp.ok,
        email_id: resendData.id ?? null,
        email_error: resendResp.ok ? null : resendData,
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

function buildEmail(v: {
  first_name: string;
  email: string;
  password: string;
  login_url: string;
}) {
  const safeName = escapeHtml(v.first_name);
  const safeEmail = escapeHtml(v.email);
  const safePass = escapeHtml(v.password);
  const safeUrl = escapeHtml(v.login_url);

  const text = `Hi ${v.first_name},

You've been added as an admin to the Walkers & Talkers portal.

Sign in here: ${v.login_url}

Email:    ${v.email}
Password: ${v.password}

Please change your password under Settings once you're in.

Andy
Walkers & Talkers`;

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1a2547;line-height:1.55;">
  <h2 style="margin:0 0 16px;color:#1a2547;">Welcome to the Walkers &amp; Talkers portal</h2>
  <p>Hi ${safeName},</p>
  <p>You've been added as an admin. Use the details below to sign in:</p>
  <div style="background:#f4f6fb;border:1px solid #dde3f0;border-radius:12px;padding:16px;margin:16px 0;">
    <p style="margin:0 0 6px;"><strong>Email:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${safeEmail}</code></p>
    <p style="margin:0;"><strong>Password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${safePass}</code></p>
  </div>
  <p>
    <a href="${safeUrl}" style="display:inline-block;background:linear-gradient(135deg,#1c47b0,#1f7fe6);color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;">Sign in</a>
  </p>
  <p style="font-size:13px;color:#5b6379;">For your security, please change your password under <strong>Settings &rarr; Change password</strong> once you're signed in.</p>
  <p style="font-size:13px;color:#5b6379;">If you weren't expecting this, just ignore the email — your account won't be active without anyone using it.</p>
  <p style="margin-top:24px;">Andy<br>Walkers &amp; Talkers</p>
</body></html>`;

  return { text, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
