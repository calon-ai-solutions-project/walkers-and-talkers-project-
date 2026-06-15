import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useReports(regionId?: string) {
  return useQuery({
    enabled: !!regionId,
    queryKey: ["reports", regionId],
    queryFn: async () => {
      const { data: sessions, error: sErr } = await supabase
        .from("sessions")
        .select("id, session_date, cancelled")
        .eq("region_id", regionId as string)
        .order("session_date", { ascending: true });
      if (sErr) throw sErr;

      const { data: attendance, error: aErr } = await supabase
        .from("attendance")
        .select("member_id, session_id");
      if (aErr) throw aErr;

      const sessionIds = new Set((sessions ?? []).map((s) => s.id));
      const att = (attendance ?? []).filter((a) => sessionIds.has(a.session_id));

      const countBySession: Record<string, number> = {};
      const uniqueMembers = new Set<string>();
      for (const a of att) {
        countBySession[a.session_id] = (countBySession[a.session_id] ?? 0) + 1;
        uniqueMembers.add(a.member_id);
      }

      const heldSessions = (sessions ?? []).filter((s) => !s.cancelled);
      const totalSessions = heldSessions.length;
      const totalAttendances = att.length;

      const sessionLog = (sessions ?? [])
        .slice()
        .reverse()
        .map((s) => ({
          id: s.id,
          date: s.session_date,
          attended: countBySession[s.id] ?? 0,
          cancelled: !!s.cancelled,
        }));

      const trend = heldSessions.map((s) => ({
        date: new Date(s.session_date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        }),
        attendance: countBySession[s.id] ?? 0,
      }));

      return {
        totalSessions,
        totalAttendances,
        uniqueMembers: uniqueMembers.size,
        avgPerSession: totalSessions
          ? Math.round(totalAttendances / totalSessions)
          : 0,
        sessionLog,
        trend,
      };
    },
  });
}
