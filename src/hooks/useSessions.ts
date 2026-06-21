import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function londonToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
  }).format(new Date());
}

export type SessionRow = {
  id: string;
  region_id: string;
  session_date: string;
  opened_at: string | null;
  closed_at: string | null;
  cancelled: boolean | null;
  cancelled_reason: string | null;
};

export function useTodaySession(regionId?: string) {
  return useQuery({
    enabled: !!regionId,
    queryKey: ["session-today", regionId, londonToday()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, region_id, session_date, opened_at, closed_at, cancelled, cancelled_reason",
        )
        .eq("region_id", regionId as string)
        .eq("session_date", londonToday())
        .maybeSingle();
      if (error) throw error;
      return (data as SessionRow) ?? null;
    },
  });
}

// Attendee first/last names for a session (via members_safe — no health notes).
export function useSessionAttendees(sessionId?: string) {
  return useQuery({
    enabled: !!sessionId,
    queryKey: ["session-attendees", sessionId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("attendance")
        .select("member_id, checked_in_at, method")
        .eq("session_id", sessionId as string)
        .order("checked_in_at", { ascending: false });
      if (error) throw error;
      const ids = (rows ?? []).map((r) => r.member_id);
      if (!ids.length) return [] as { name: string; time: string }[];
      const { data: members } = await supabase
        .from("members_safe")
        .select("id, first_name, last_name")
        .in("id", ids);
      const byId = new Map((members ?? []).map((m) => [m.id, m]));
      return (rows ?? []).map((r) => {
        const m = byId.get(r.member_id);
        return {
          member_id: r.member_id,
          name: m ? `${m.first_name} ${m.last_name ?? ""}`.trim() : "Member",
          time: r.checked_in_at,
        };
      });
    },
    refetchInterval: 10000,
  });
}

export function useRecentSessions(regionId?: string, limit = 5) {
  return useQuery({
    enabled: !!regionId,
    queryKey: ["recent-sessions", regionId, limit],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("id, session_date, cancelled")
        .eq("region_id", regionId as string)
        .order("session_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const result: { id: string; date: string; attended: number; cancelled: boolean }[] = [];
      for (const s of sessions ?? []) {
        const { count } = await supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("session_id", s.id);
        result.push({
          id: s.id,
          date: s.session_date,
          attended: count ?? 0,
          cancelled: !!s.cancelled,
        });
      }
      return result;
    },
  });
}

function invalidateSession(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["session-today"] });
  qc.invalidateQueries({ queryKey: ["recent-sessions"] });
}

export function useOpenSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (regionId: string) => {
      const { error } = await supabase.from("sessions").upsert(
        {
          region_id: regionId,
          session_date: londonToday(),
          opened_at: new Date().toISOString(),
          closed_at: null,
          cancelled: false,
          cancelled_reason: null,
        },
        { onConflict: "region_id,session_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => invalidateSession(qc),
  });
}

export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from("sessions")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => invalidateSession(qc),
  });
}

export function useCancelSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      regionId,
      reason,
    }: {
      regionId: string;
      reason: string;
    }) => {
      const { error } = await supabase.from("sessions").upsert(
        {
          region_id: regionId,
          session_date: londonToday(),
          cancelled: true,
          cancelled_reason: reason || null,
        },
        { onConflict: "region_id,session_date" },
      );
      if (error) throw error;
    },
    onSuccess: () => invalidateSession(qc),
  });
}

// By-name / forgotten-card check-in (calls the SECURITY DEFINER RPC).
export function useManualCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      memberId,
      sessionId,
    }: {
      memberId: string;
      sessionId: string;
    }) => {
      const { data, error } = await supabase.rpc("manual_check_in", {
        p_member_id: memberId,
        p_session_id: sessionId,
      });
      if (error) throw error;
      return data as { status?: string; first_name?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session-attendees"] });
    },
  });
}
