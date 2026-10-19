import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export function useBristolRegion() {
  return useQuery({
    queryKey: ["region", "bristol"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("id, name, slug, walk_day, walk_time, contact_email")
        .eq("slug", "bristol")
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members_safe")
        .select("*")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMember(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["member", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("id", id as string)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export type MemberAttendanceRow = {
  id: string;
  checked_in_at: string;
  method: string;
  session: { session_date: string; region_id: string } | null;
};

export function useMemberAttendance(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["member-attendance", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, checked_in_at, method, session:sessions(session_date, region_id)")
        .eq("member_id", id as string)
        .order("checked_in_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as MemberAttendanceRow[];
    },
  });
}

// Visit counts + last-seen per member, computed client-side (attendance is
// small in early operation). Returns a map keyed by member_id.
export function useAttendanceCounts() {
  return useQuery({
    queryKey: ["attendance-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("member_id, checked_in_at");
      if (error) throw error;
      const map: Record<string, { visits: number; last: string | null }> = {};
      for (const r of data ?? []) {
        const e = map[r.member_id] ?? { visits: 0, last: null };
        e.visits += 1;
        if (!e.last || r.checked_in_at > e.last) e.last = r.checked_in_at;
        map[r.member_id] = e;
      }
      return map;
    },
  });
}

export type NewMember = {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  postcode?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  data_source?: string;
};

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["attendance-counts"] });
    },
  });
}

// Card numbers (tokens) per member, so the directory can search by card.
export function useMemberCardTokens() {
  return useQuery({
    queryKey: ["member-card-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cards").select("member_id, token");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const c of data ?? []) (map[c.member_id] ??= []).push(c.token);
      return map;
    },
  });
}

export type MemberChanges = Database["public"]["Tables"]["members"]["Update"];

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: MemberChanges }) => {
      const { data, error } = await supabase
        .from("members")
        .update(changes)
        .eq("id", id)
        .select("id");
      if (error) {
        if (error.code === "23505") {
          throw new Error(
            `Member number ${changes.member_no} is already used by another member.`,
          );
        }
        throw error;
      }
      // RLS filters out rows the caller may not change instead of erroring.
      if (!data?.length) throw new Error("You don't have permission to edit this member.");
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["member", id] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export type UpsertResult = {
  id: string;
  member_no: string;
  action: "created" | "updated";
};

type CreateMemberResponse = {
  status: "created" | "updated" | "email_exists";
  id: string;
  member_no: string;
  first_name?: string;
  last_name?: string;
};

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewMember): Promise<UpsertResult> => {
      // The create_member RPC does the duplicate-email check, the
      // update-by-name upsert and the member number server-side, with the
      // caller's role and region enforced. Volunteers have no read access to
      // the members table (health notes), so this can't be done client-side.
      const { data, error } = await supabase.rpc("create_member", {
        p_first_name: input.first_name,
        p_last_name: input.last_name,
        p_phone: input.phone,
        p_email: input.email,
        p_address_line1: input.address_line1,
        p_postcode: input.postcode,
        p_emergency_contact_name: input.emergency_contact_name,
        p_emergency_contact_phone: input.emergency_contact_phone,
        p_data_source: input.data_source,
      });
      if (error) throw error;
      const result = data as unknown as CreateMemberResponse;

      if (result.status === "email_exists") {
        throw new Error(
          `A member with this email already exists (${result.first_name} ${result.last_name}, ${result.member_no}). Please use a different email or update the existing record.`,
        );
      }

      // Phase 5: fire the welcome email if the member has an address. Best-effort
      // — a mail failure must never fail member creation. The send-email Edge
      // Function skips silently if no email/opted out.
      if (result.status === "created" && input.email) {
        try {
          await supabase.functions.invoke("send-email", {
            body: { template: "welcome", member_id: result.id },
          });
        } catch {
          // swallow — member is saved; welcome email is non-critical
        }
      }

      return { id: result.id, member_no: result.member_no, action: result.status };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
