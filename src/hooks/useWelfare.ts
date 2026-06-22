import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WelfareFlag = {
  id: string;
  member_id: string;
  name: string;
  region_id: string | null;
  stage: string;
  weeks_absent: number | null;
  flagged_at: string | null;
  last_email_sent_at: string | null;
  escalated_to_phone_at: string | null;
  resolved_at: string | null;
};

// Open welfare flags (cron-populated) joined to member names via members_safe
// (no health notes). RLS already scopes reads: super_admin sees all,
// regional_admin sees their region. We optionally narrow to one region.
export function useWelfareFlags(regionId?: string) {
  return useQuery({
    queryKey: ["welfare-flags", regionId ?? "all"],
    queryFn: async (): Promise<WelfareFlag[]> => {
      const { data: flags, error } = await supabase
        .from("welfare_flags")
        .select(
          "id, member_id, stage, weeks_absent, flagged_at, last_email_sent_at, escalated_to_phone_at, resolved_at",
        )
        .is("resolved_at", null)
        .order("escalated_to_phone_at", { ascending: false, nullsFirst: false })
        .order("flagged_at", { ascending: false });
      if (error) throw error;
      const ids = (flags ?? []).map((f) => f.member_id);
      if (!ids.length) return [];

      const { data: members } = await supabase
        .from("members_safe")
        .select("id, first_name, last_name, region_id")
        .in("id", ids);
      const byId = new Map((members ?? []).map((m) => [m.id, m]));

      return (flags ?? [])
        .map((f) => {
          const m = byId.get(f.member_id);
          return {
            id: f.id,
            member_id: f.member_id,
            name: m ? `${m.first_name} ${m.last_name ?? ""}`.trim() : "Member",
            region_id: m?.region_id ?? null,
            stage: f.stage,
            weeks_absent: f.weeks_absent,
            flagged_at: f.flagged_at,
            last_email_sent_at: f.last_email_sent_at,
            escalated_to_phone_at: f.escalated_to_phone_at,
            resolved_at: f.resolved_at,
          } as WelfareFlag;
        })
        .filter((f) => !regionId || f.region_id === regionId);
    },
  });
}

export type EmailHistoryRow = {
  id: string;
  template: string | null;
  subject: string | null;
  sent_at: string;
  status: string | null;
};

// Every email sent to one member, newest first. Lazy — only runs when expanded.
export function useEmailHistory(memberId?: string) {
  return useQuery({
    enabled: !!memberId,
    queryKey: ["email-history", memberId],
    queryFn: async (): Promise<EmailHistoryRow[]> => {
      const { data, error } = await supabase
        .from("email_log")
        .select("id, template, subject, sent_at, sent_status, status")
        .eq("member_id", memberId as string)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        template: r.template,
        subject: r.subject,
        sent_at: r.sent_at,
        status: r.sent_status ?? r.status ?? null,
      }));
    },
  });
}
