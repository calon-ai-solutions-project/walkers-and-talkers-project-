import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useBristolRegion() {
  return useQuery({
    queryKey: ["region", "bristol"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regions")
        .select("id, name, slug, walk_day, walk_time")
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

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewMember) => {
      const { data: region, error: rErr } = await supabase
        .from("regions")
        .select("id")
        .eq("slug", "bristol")
        .single();
      if (rErr || !region) throw rErr ?? new Error("Bristol region missing");

      // Next member number: WT-#### based on current count.
      const { count } = await supabase
        .from("members")
        .select("id", { count: "exact", head: true });
      const member_no = `WT-${String((count ?? 0) + 1).padStart(4, "0")}`;

      const { data, error } = await supabase
        .from("members")
        .insert({
          member_no,
          first_name: input.first_name,
          last_name: input.last_name,
          phone: input.phone || null,
          email: input.email || null,
          address_line1: input.address_line1 || null,
          postcode: input.postcode || null,
          emergency_contact_name: input.emergency_contact_name || null,
          emergency_contact_phone: input.emergency_contact_phone || null,
          region_id: region.id,
          data_source: input.data_source || "admin_entry",
          active: true,
        })
        .select("id, member_no")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
