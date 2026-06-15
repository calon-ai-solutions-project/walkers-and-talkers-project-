import { useMemo } from "react";
import { MapPin, Users, CalendarDays, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useBristolRegion, useMembers } from "@/hooks/useMembers";
import { useRecentSessions } from "@/hooks/useSessions";

export default function GlobalDashboard() {
  const { data: region } = useBristolRegion();
  const { data: members } = useMembers();
  const { data: recent } = useRecentSessions(region?.id, 8);

  const total = members?.length ?? 0;
  const monthKey = new Date().toISOString().slice(0, 7);
  const newThisMonth = (members ?? []).filter((m) =>
    (m.created_at ?? "").startsWith(monthKey),
  ).length;
  const latestSession = recent?.[0]?.attended ?? 0;

  const attendanceBySession = useMemo(
    () =>
      (recent ?? [])
        .slice()
        .reverse()
        .map((s) => ({
          name: new Date(s.date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
          attendance: s.attended,
        })),
    [recent],
  );

  const membershipGrowth = useMemo(() => {
    const byMonth: Record<string, number> = {};
    for (const m of members ?? []) {
      const key = (m.created_at ?? "").slice(0, 7);
      if (key) byMonth[key] = (byMonth[key] ?? 0) + 1;
    }
    const keys = Object.keys(byMonth).sort();
    let cumulative = 0;
    return keys.map((k) => {
      cumulative += byMonth[k];
      return {
        month: new Date(k + "-01").toLocaleDateString("en-GB", {
          month: "short",
          year: "2-digit",
        }),
        members: cumulative,
      };
    });
  }, [members]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Dashboard</h1>
        <p className="page-subheader">Bristol overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Members" value={String(total)} subtitle="Bristol" icon={Users} />
        <StatCard title="Latest Session" value={String(latestSession)} subtitle="Attended" icon={CalendarDays} variant="success" />
        <StatCard title="Active Locations" value="1" subtitle="Bristol (v1)" icon={MapPin} />
        <StatCard title="New This Month" value={String(newThisMonth)} subtitle="Registrations" icon={TrendingUp} variant="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Session Attendance</h3>
          {attendanceBySession.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={attendanceBySession}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="attendance" fill="hsl(228 72% 36%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Membership Growth</h3>
          {membershipGrowth.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={membershipGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="members" stroke="hsl(228 72% 36%)" strokeWidth={2.5} dot={{ fill: "hsl(228 72% 36%)" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-3">Locations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-foreground">{region?.name ?? "Bristol"}</h4>
            <p className="text-sm text-muted-foreground">{total} members</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{latestSession}</p>
            <p className="text-xs text-muted-foreground">Last session</p>
          </div>
        </div>
      </div>
    </div>
  );
}
