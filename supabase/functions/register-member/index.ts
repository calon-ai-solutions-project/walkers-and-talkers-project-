// Edge Function: register-member
// ----------------------------------------------------------------------------
// Public, unauthenticated endpoint for the share-this-link registration
// form. Anyone with the URL can fill the form; this function creates the
// member with the service-role key (bypassing RLS) and sends the welcome
// email via the existing send-email function.
//
// Required Edge Function secrets (already used elsewhere — no new env):
//   SUPABASE_URL                (auto)
//   SUPABASE_SERVICE_ROLE_KEY   (auto)
// (Welcome email reuses send-email which has its own RESEND_* secrets.)
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

type RegisterRequest = {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  postcode?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  region_slug?: string; // defaults to "bristol"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const body: RegisterRequest = await req.json();

    const first_name = (body.first_name ?? "").trim();
    const last_name = (body.last_name ?? "").trim();
    const email = body.email?.trim().toLowerCase() || null;

    if (!first_name || !last_name) {
      return json(
        { ok: false, error: "missing_name", message: "First and last name are required." },
        400,
      );
    }

    const slug = body.region_slug?.trim() || "bristol";
    const { data: region, error: rErr } = await admin
      .from("regions")
      .select("id")
      .eq("slug", slug)
      .single();
    if (rErr || !region) {
      return json({ ok: false, error: "region_missing" }, 500);
    }

    // Refuse duplicate email.
    if (email) {
      const { data: emailMatch } = await admin
        .from("members")
        .select("id, first_name, last_name, member_no")
        .eq("region_id", region.id)
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (emailMatch) {
        return json(
          {
            ok: false,
            error: "email_exists",
            message:
              "Someone with this email is already registered. If that's you, please contact us instead of re-registering.",
          },
          409,
        );
      }
    }

    // Next member number: WT-#### based on current count.
    const { count } = await admin
      .from("members")
      .select("id", { count: "exact", head: true });
    const member_no = `WT-${String((count ?? 0) + 1).padStart(4, "0")}`;

    const { data: created, error: insErr } = await admin
      .from("members")
      .insert({
        member_no,
        first_name,
        last_name,
        phone: body.phone?.trim() || null,
        email,
        address_line1: body.address_line1?.trim() || null,
        postcode: body.postcode?.trim() || null,
        emergency_contact_name: body.emergency_contact_name?.trim() || null,
        emergency_contact_phone: body.emergency_contact_phone?.trim() || null,
        region_id: region.id,
        data_source: "public_form",
        active: true,
      })
      .select("id, member_no, first_name")
      .single();
    if (insErr || !created) {
      return json(
        { ok: false, error: "insert_failed", detail: insErr?.message },
        500,
      );
    }

    // Best-effort welcome email — never fail registration if email send
    // fails (no email address, opted out, Resend down, etc.).
    if (email) {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template: "welcome",
            member_id: created.id,
          }),
        });
      } catch {
        // swallow — registration is what matters
      }
    }

    return json(
      { ok: true, member_no: created.member_no, first_name: created.first_name },
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
