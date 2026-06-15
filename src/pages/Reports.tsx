import { useMemo } from "react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CalendarDays, Users, BarChart3, Trophy } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useBristolRegion, useMembers, useAttendanceCounts } from "@/hooks/useMembers";
import { useReports } from "@/hooks/useReports";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Reports() {
  const { data: region } = useBristolRegion();
  const { data: report, isLoading } = useReports(region?.id);
  const { data: members } = useMembers();
  const { data: counts } = useAttendanceCounts();

  const milestones = useMemo(() => {
    return (members ?? [])
      .map((m) => ({
        name: `${m.first_name} ${m.last_name ?? ""}`.trim(),
        visits: counts?.[m.id]?.visits ?? 0,
      }))
      .filter((m) => m.visits > 0)
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5);
  }, [members, counts]);

  function exportCsv() {
    const rows = [
      ["Date", "Attended", "Cancelled"],
      ...(report?.sessionLog ?? []).map((s) => [
        s.date,
        String(s.attended),
        s.cancelled ? "yes" : "no",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bristol-sessions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-header">Attendance Reports</h1>
          <p className="page-subheader">Bristol — data for funders and management</p>
        </div>
        <Button className="gap-2" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Sessions" value={String(report?.totalSessions ?? 0)} icon={CalendarDays} />
        <StatCard title="Total Attendances" value={String(report?.totalAttendances ?? 0)} icon={Users} />
        <StatCard title="Unique Members" value={String(report?.uniqueMembers ?? 0)} icon={Users} />
        <StatCard title="Avg Per Session" value={String(report?.avgPerSession ?? 0)} icon={BarChart3} />
      </div>

      <div className="stat-card mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-4">Attendance Trend</h3>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (report?.trend?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground">No sessions held yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={report!.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="attendance" stroke="hsl(228 72% 36%)" strokeWidth={2.5} dot={{ fill: "hsl(228 72% 36%)" }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="stat-card mb-8 overflow-x-auto">
        <h3 className="text-sm font-semibold text-foreground mb-4">Session Log</h3>
        {(report?.sessionLog?.length ?? 0) === 0 ? (
          <p className="text-muted-foreground">No sessions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Attended</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {report!.sessionLog.map((s) => (
                <tr key={s.id} className="border-b last:border-0">
                  <td className="py-3 px-4 text-foreground">{fmtDate(s.date)}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{s.attended}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {s.cancelled ? "cancelled" : "held"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="stat-card">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" /> Most Active Members
        </h3>
        {milestones.length === 0 ? (
          <p className="text-muted-foreground text-sm">No attendance recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {milestones.map((m) => (
              <div key={m.name} className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{m.name}</span>
                <Badge variant="secondary">{m.visits} visits</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
