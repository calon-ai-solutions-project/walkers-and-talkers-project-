import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const RESEND_FROM = Deno.env.get("RESEND_FROM_EMAIL")!;
const RESEND_REPLY_TO = Deno.env.get("RESEND_REPLY_TO")!;
const EMMA_EMAIL = Deno.env.get("EMMA_EMAIL")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

type SendRequest = {
  template: "welcome" | "thank_you" | "missed_you" | "welfare";
  member_id: string;
  session_id?: string;
  recap?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body: SendRequest = await req.json();
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("id", body.member_id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ ok: false, reason: "member_not_found" }), { status: 404 });
    }

    if (!member.email || member.email_opt_out) {
      return new Response(JSON.stringify({ ok: false, reason: "no_email_or_opted_out" }), { status: 200 });
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

    return new Response(JSON.stringify({ ok: resendResponse.ok, id: resendData.id }), {
      status: resendResponse.ok ? 200 : 500,
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }
});

// =============================================================================
// EMAIL TEMPLATES (verbatim from Notion Discovery v3, client-approved)
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
        text: `Hi ${v("first_name")},

Welcome to Walkers & Talkers — we're so glad you've decided to join us.

We meet every Wednesday in ${v("region")}, and the format is simple: a gentle walk, good conversation, and a cup of tea. No fitness levels required, no pressure — just a friendly group of people who believe in the power of walking and talking together.

A member card is on its way to you. Once it arrives, you'll be able to tap in at the start of each walk so we can keep track of attendance and stay in touch.

If you have any questions at all before your first walk, just reply to this email. We can't wait to meet you.

Andy
Walkers & Talkers
walkersandtalkers.org.uk`,
        html: wrapHtml(`
<p>Hi ${escapeHtml(v("first_name"))},</p>
<p>Welcome to Walkers &amp; Talkers — we're so glad you've decided to join us.</p>
<p>We meet every Wednesday in ${escapeHtml(v("region"))}, and the format is simple: a gentle walk, good conversation, and a cup of tea. No fitness levels required, no pressure — just a friendly group of people who believe in the power of walking and talking together.</p>
<p>A member card is on its way to you. Once it arrives, you'll be able to tap in at the start of each walk so we can keep track of attendance and stay in touch.</p>
<p>If you have any questions at all before your first walk, just reply to this email. We can't wait to meet you.</p>
<p>Andy<br>Walkers &amp; Talkers<br><a href="https://walkersandtalkers.org.uk">walkersandtalkers.org.uk</a></p>
`),
      };

    case "thank_you":
      return {
        subject: `Lovely to see you today, ${v("first_name")}`,
        text: `Hi ${v("first_name")},

Thank you for coming along today — it was lovely to see you.

${recapBlockText}We'll be back next Wednesday, same time, same place. I hope to see you there.

In the meantime, take care of yourself, and remember — a good walk and a good chat go a long way.

Andy
Walkers & Talkers
walkersandtalkers.org.uk`,
        html: wrapHtml(`
<p>Hi ${escapeHtml(v("first_name"))},</p>
<p>Thank you for coming along today — it was lovely to see you.</p>
${recapBlock}<p>We'll be back next Wednesday, same time, same place. I hope to see you there.</p>
<p>In the meantime, take care of yourself, and remember — a good walk and a good chat go a long way.</p>
<p>Andy<br>Walkers &amp; Talkers<br><a href="https://walkersandtalkers.org.uk">walkersandtalkers.org.uk</a></p>
`),
      };

    case "missed_you":
      return {
        subject: `Missed you today, ${v("first_name")}`,
        text: `Hi ${v("first_name")},

Just a quick note — we noticed you weren't with us today, and we wanted to check in.

Life gets in the way sometimes, and that's absolutely fine. But if there's anything going on, or anything we can do to help, just reply to this email. We're here.

Our next walk is Wednesday at the usual time. No pressure — whenever you're ready, we'd love to have you back.

Take care, ${v("first_name")}.

Andy
Walkers & Talkers
walkersandtalkers.org.uk`,
        html: wrapHtml(`
<p>Hi ${escapeHtml(v("first_name"))},</p>
<p>Just a quick note — we noticed you weren't with us today, and we wanted to check in.</p>
<p>Life gets in the way sometimes, and that's absolutely fine. But if there's anything going on, or anything we can do to help, just reply to this email. We're here.</p>
<p>Our next walk is Wednesday at the usual time. No pressure — whenever you're ready, we'd love to have you back.</p>
<p>Take care, ${escapeHtml(v("first_name"))}.</p>
<p>Andy<br>Walkers &amp; Talkers<br><a href="https://walkersandtalkers.org.uk">walkersandtalkers.org.uk</a></p>
`),
      };

    case "welfare":
      return {
        subject: `Just thinking of you, ${v("first_name")}`,
        text: `Hi ${v("first_name")},

It's been a few weeks since we last saw you on a Wednesday, and I wanted to drop you a line just to make sure everything's okay.

There's no need to reply if all is well — life is busy and we all have our moments. But if you'd like to talk, or if there's anything you'd like to share, please just hit reply. Emma is copied in here too, so either of us would be glad to hear from you.

If a walk feels like too much right now, you're more than welcome to come along just for a cup of tea and a chat. No need to walk.

Take care of yourself, ${v("first_name")}. We're thinking of you.

Andy & Emma
Walkers & Talkers
walkersandtalkers.org.uk`,
        html: wrapHtml(`
<p>Hi ${escapeHtml(v("first_name"))},</p>
<p>It's been a few weeks since we last saw you on a Wednesday, and I wanted to drop you a line just to make sure everything's okay.</p>
<p>There's no need to reply if all is well — life is busy and we all have our moments. But if you'd like to talk, or if there's anything you'd like to share, please just hit reply. Emma is copied in here too, so either of us would be glad to hear from you.</p>
<p>If a walk feels like too much right now, you're more than welcome to come along just for a cup of tea and a chat. No need to walk.</p>
<p>Take care of yourself, ${escapeHtml(v("first_name"))}. We're thinking of you.</p>
<p>Andy &amp; Emma<br>Walkers &amp; Talkers<br><a href="https://walkersandtalkers.org.uk">walkersandtalkers.org.uk</a></p>
`),
      };

    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html><body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
${body}
</body></html>`;
}
