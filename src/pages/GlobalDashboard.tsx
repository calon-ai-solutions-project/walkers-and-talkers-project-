import { useMemo } from "react";
import { MapPin, Users, CalendarDays, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const BAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4"];
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
        <StatCard title="Total Members" value={String(total)} subtitle="Bristol" icon={Users} color="blue" />
        <StatCard title="Latest Session" value={String(latestSession)} subtitle="Attended" icon={CalendarDays} color="green" />
        <StatCard title="Active Locations" value="1" subtitle="Bristol (v1)" icon={MapPin} color="violet" />
        <StatCard title="New This Month" value={String(newThisMonth)} subtitle="Registrations" icon={TrendingUp} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Session Attendance</h3>
          {attendanceBySession.length === 0 ? (
            <p className="text-muted-foreground text-sm">No sessions yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={attendanceBySession} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(220 22% 92%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                <Tooltip cursor={{ fill: "hsl(228 72% 36% / 0.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid hsl(220 20% 90%)" }} />
                <Bar dataKey="attendance" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {attendanceBySession.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Membership Growth</h3>
          {membershipGrowth.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={membershipGrowth}>
                <defs>
                  <linearGradient id="areaViolet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="hsl(220 22% 92%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220 20% 90%)" }} />
                <Area type="monotone" dataKey="members" stroke="#7c3aed" strokeWidth={3} fill="url(#areaViolet)" dot={{ fill: "#7c3aed", r: 4 }} />
              </AreaChart>
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
