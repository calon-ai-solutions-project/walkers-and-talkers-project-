import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL")!;
const RESEND_REPLY_TO = Deno.env.get("RESEND_REPLY_TO")!;
const EMMA_EMAIL = Deno.env.get("EMMA_EMAIL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

type MemberSendRequest = {
  template: "welcome" | "thank_you" | "missed_you" | "welfare";
  member_id: string;
  session_id?: string;
  recap?: string;
};

type AdminInviteRequest = {
  template: "admin_invite";
  to_email: string;
  first_name?: string;
  password: string;
  login_url: string;
};

type SendRequest = MemberSendRequest | AdminInviteRequest;

// CORS: the welcome email is invoked from the browser (Add Member page) via
// supabase.functions.invoke, which sends a preflight OPTIONS request. Without
// these headers the browser blocks the call and the welcome email never sends.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Who is calling. The other Edge Functions (nudge-cron, invite-admin,
// register-member) send the service-role key; the Add Member page sends the
// signed-in user's JWT. Anyone else gets nothing — this function sends mail
// from the charity's verified domain, so it must never be an open relay.
async function callerKind(req: Request): Promise<"service" | "staff" | null> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  if (token === SUPABASE_SERVICE_ROLE) return "service";
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const staff = ["super_admin", "regional_admin", "volunteer"];
  return profile && staff.includes(profile.role) ? "staff" : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, reason: "method_not_allowed" }, 405);
  }

  try {
    const caller = await callerKind(req);
    if (!caller) {
      return json({ ok: false, reason: "unauthorized" }, 401);
    }

    const body: SendRequest = await req.json();

    // Signed-in staff only trigger the welcome email for a member they just
    // added; every other template is sent by server-side functions.
    if (caller === "staff" && body.template !== "welcome") {
      return json({ ok: false, reason: "forbidden" }, 403);
    }

    // admin_invite goes to a non-member email address (an admin/volunteer
    // being onboarded), so it skips the members table lookup and the
    // email_log row (no member_id to reference).
    if (body.template === "admin_invite") {
      const tpl = buildAdminInviteTemplate(body);
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          reply_to: RESEND_REPLY_TO,
          to: [body.to_email],
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        }),
      });
      const resendData = await resendResponse.json();
      return json(
        { ok: resendResponse.ok, id: resendData.id, error: resendResponse.ok ? null : resendData },
        resendResponse.ok ? 200 : 500,
      );
    }

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("id", body.member_id)
      .single();

    if (memberError || !member) {
      return json({ ok: false, reason: "member_not_found" }, 404);
    }

    if (!member.email || member.email_opt_out) {
      return json({ ok: false, reason: "no_email_or_opted_out" }, 200);
    }

    let session = null;
    if (body.session_id) {
      const { data } = await supabase.from("sessions").select("*").eq("id", body.session_id).single();
      session = data;
    }

    // Get region for {{region}} variable
    const { data: region } = await supabase
      .from("regions")
      .select("*")
      .eq("id", member.region_id)
      .single();

    const variables = {
      first_name: member.first_name,
      region: region?.name ?? "your area",
      optional_recap: body.recap ?? session?.thank_you_recap ?? "",
    };

    const template = buildTemplate(body.template, variables);

    // Send via Resend
    const cc = body.template === "welfare" ? [EMMA_EMAIL] : undefined;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        reply_to: RESEND_REPLY_TO,
        to: [member.email],
        cc,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });

    const resendData = await resendResponse.json();

    // Log in email_log
    await supabase.from("email_log").insert({
      member_id: member.id,
      template: body.template,
      subject: template.subject,
      resend_id: resendData.id,
      sent_status: resendResponse.ok ? "sent" : "failed",
      error_message: resendResponse.ok ? null : JSON.stringify(resendData),
      week_of: session?.session_date ?? new Date().toISOString().slice(0, 10),
    });

    return json(
      { ok: resendResponse.ok, id: resendData.id },
      resendResponse.ok ? 200 : 500,
    );
  } catch (error) {
    return json({ ok: false, error: (error as Error).message }, 500);
  }
});

// =============================================================================
// EMAIL TEMPLATES (client-approved copy, em-dashes removed, shared footer)
// =============================================================================

function buildTemplate(template: string, vars: Record<string, string>) {
  const v = (key: string) => vars[key] ?? "";

  // The optional_recap paragraph appears only if recap is non-empty
  const recapBlock = v("optional_recap")
    ? `<p>${escapeHtml(v("optional_recap"))}</p>\n`
    : "";
  const recapBlockText = v("optional_recap") ? `${v("optional_recap")}\n\n` : "";

  switch (template) {
    case "welcome":
      return {
        subject: `Welcome to Walkers & Talkers, ${v("first_name")}`,
        text: wrapText(`Hi ${v("first_name")},

Welcome to Walkers & Talkers. We're so glad you've decided to join us.

We meet every Wednesday in ${v("region")}, and the format is simple: a gentle walk, good conversation, and a cup of tea. No fitness levels required, no pressure, just a friendly group of people who believe in the power of walking and talking together.

A member card is on its way to you. Once it arrives, you'll be able to tap in at the start of each walk so we can keep track of attendance and stay in touch.

If you have any questions at all before your first walk, just reply to this email. We can't wait to meet you.

Andy`),
        html: wrapHtml(`
<p>Hi ${escapeHtml(v("first_name"))},</p>
<p>Welcome to Walkers &amp; Talkers. We're so glad you've decided to join us.</p>
<p>We meet every Wednesday in ${escapeHtml(v("region"))}, and the format is simple: a gentle walk, good conversation, and a cup of tea. No fitness levels required, no pressure, just a friendly group of people who believe in the power of walking and talking together.</p>
<p>A member card is on its way to you. Once it arrives, you'll be able to tap in at the start of each walk so we can keep track of attendance and stay in touch.</p>
<p>If you have any questions at all before your first walk, just reply to this email. We can't wait to meet you.</p>
<p>Andy</p>
`),
      };

    case "thank_you":
      return {
        subject: `Lovely to see you today, ${v("first_name")}`,
        text: wrapText(`Hi ${v("first_name")},

Thank you for coming along today. It was lovely to see you.

${recapBlockText}We'll be back next Wednesday, same time, same place. I hope to see you there.

In the meantime, take care of yourself, and remember, a good walk and a good chat go a long way.

Andy`),
        html: wrapHtml(`
<p>Hi ${escapeHtml(v("first_name"))},</p>
<p>Thank you for coming along today. It was lovely to see you.</p>
${recapBlock}<p>We'll be back next Wednesday, same time, same place. I hope to see you there.</p>
<p>In the meantime, take care of yourself, and remember, a good walk and a good chat go a long way.</p>
<p>Andy</p>
`),
      };

    case "missed_you":
      return {
        subject: `Missed you today, ${v("first_name")}`,
        text: wrapText(`Hi ${v("first_name")},

Just a quick note to say we noticed you weren't with us today, and we wanted to check in.

Life gets in the way sometimes, and that's absolutely fine. But if there's anything going on, or anything we can do to help, just reply to this email. We're here.

Our next walk is Wednesday at the usual time. No pressure. Whenever you're ready, we'd love to have you back.

Take care, ${v("first_name")}.

Andy`),
        html: wrapHtml(`
<p>Hi ${escapeHtml(v("first_name"))},</p>
<p>Just a quick note to say we noticed you weren't with us today, and we wanted to check in.</p>
<p>Life gets in the way sometimes, and that's absolutely fine. But if there's anything going on, or anything we can do to help, just reply to this email. We're here.</p>
<p>Our next walk is Wednesday at the usual time. No pressure. Whenever you're ready, we'd love to have you back.</p>
<p>Take care, ${escapeHtml(v("first_name"))}.</p>
<p>Andy</p>
`),
      };

    case "welfare":
      return {
        subject: `Just thinking of you, ${v("first_name")}`,
        text: wrapText(`Hi ${v("first_name")},

It's been a few weeks since we last saw you on a Wednesday, and I wanted to drop you a line just to make sure everything's okay.

There's no need to reply if all is well. Life is busy and we all have our moments. But if you'd like to talk, or if there's anything you'd like to share, please just hit reply. Emma is copied in here too, so either of us would be glad to hear from you.

If a walk feels like too much right now, you're more than welcome to come along just for a cup of tea and a chat. No need to walk.

Take care of yourself, ${v("first_name")}. We're thinking of you.

Andy & Emma`),
        html: wrapHtml(`
<p>Hi ${escapeHtml(v("first_name"))},</p>
<p>It's been a few weeks since we last saw you on a Wednesday, and I wanted to drop you a line just to make sure everything's okay.</p>
<p>There's no need to reply if all is well. Life is busy and we all have our moments. But if you'd like to talk, or if there's anything you'd like to share, please just hit reply. Emma is copied in here too, so either of us would be glad to hear from you.</p>
<p>If a walk feels like too much right now, you're more than welcome to come along just for a cup of tea and a chat. No need to walk.</p>
<p>Take care of yourself, ${escapeHtml(v("first_name"))}. We're thinking of you.</p>
<p>Andy &amp; Emma</p>
`),
      };

    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

// Admin/volunteer invite. Not a member email, so it uses the plain wrapper
// rather than the member footer ("you're receiving this because you're a
// member...").
function buildAdminInviteTemplate(req: AdminInviteRequest) {
  const firstName =
    (req.first_name && req.first_name.trim()) ||
    req.to_email.split("@")[0];
  const safeName = escapeHtml(firstName);
  const safeEmail = escapeHtml(req.to_email);
  const safePass = escapeHtml(req.password);
  const safeUrl = escapeHtml(req.login_url);

  return {
    subject: "Your Walkers & Talkers admin login",
    text: `Hi ${firstName},

You've been added as an admin on the Walkers & Talkers portal.

Sign in here: ${req.login_url}

Email:    ${req.to_email}
Password: ${req.password}

You'll be asked to set a new password the first time you sign in.

Andy
Walkers & Talkers
walkersandtalkers.org.uk`,
    html: wrapPlainHtml(`
<h2 style="margin:0 0 16px;color:#1a2547;">Welcome to the Walkers &amp; Talkers portal</h2>
<p>Hi ${safeName},</p>
<p>You've been added as an admin. Use the details below to sign in:</p>
<div style="background:#f4f6fb;border:1px solid #dde3f0;border-radius:12px;padding:16px;margin:16px 0;">
  <p style="margin:0 0 6px;"><strong>Email:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${safeEmail}</code></p>
  <p style="margin:0;"><strong>Password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px;">${safePass}</code></p>
</div>
<p><a href="${safeUrl}" style="display:inline-block;background:linear-gradient(135deg,#1c47b0,#1f7fe6);color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px;">Sign in</a></p>
<p style="font-size:13px;color:#5b6379;">You'll be asked to set a new password the first time you sign in.</p>
<p>Andy<br>Walkers &amp; Talkers<br><a href="https://walkersandtalkers.org.uk">walkersandtalkers.org.uk</a></p>
`),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// -----------------------------------------------------------------------------
// Shared footer. Added automatically to EVERY email (html + text) so it can
// never be forgotten on a new template. Keep both versions in sync.
// -----------------------------------------------------------------------------
const FOOTER_HTML = `
<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e6e6e6; font-size: 13px; line-height: 1.6; color: #8a8a8a;">
  <p style="margin: 0 0 4px;"><strong style="color: #6a6a6a;">Walkers &amp; Talkers</strong> &middot; Bristol</p>
  <p style="margin: 0 0 4px;">Wednesday walks, good conversation, and a cup of tea.</p>
  <p style="margin: 0 0 4px;"><a href="https://walkersandtalkers.org.uk" style="color: #8a8a8a;">walkersandtalkers.org.uk</a></p>
  <p style="margin: 8px 0 0;">You're receiving this because you're a member of Walkers &amp; Talkers. If you'd prefer not to receive these emails, just reply and let us know.</p>
</div>`;

const FOOTER_TEXT = `Walkers & Talkers, Bristol
Wednesday walks, good conversation, and a cup of tea.
walkersandtalkers.org.uk

You're receiving this because you're a member of Walkers & Talkers. If you'd prefer not to receive these emails, just reply and let us know.`;

function wrapText(body: string): string {
  return `${body}\n\n\n${FOOTER_TEXT}`;
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin: 0; padding: 0; background-color: #f5f5f4;">
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 28px; background-color: #ffffff; color: #333333; line-height: 1.6; font-size: 16px;">
      <div style="font-size: 20px; font-weight: 700; color: #2f6f4f; letter-spacing: 0.2px; margin-bottom: 24px;">Walkers &amp; Talkers</div>
      ${body}
      ${FOOTER_HTML}
    </div>
  </body>
</html>`;
}

function wrapPlainHtml(body: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
${body}
</body></html>`;
}
