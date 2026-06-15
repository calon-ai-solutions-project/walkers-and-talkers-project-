import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, CalendarDays, Users, BarChart3, Trophy } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const trendData = [
  { date: "1 Oct", attendance: 134 },
  { date: "8 Oct", attendance: 142 },
  { date: "15 Oct", attendance: 138 },
  { date: "22 Oct", attendance: 151 },
  { date: "29 Oct", attendance: 145 },
  { date: "5 Nov", attendance: 139 },
  { date: "12 Nov", attendance: 148 },
  { date: "19 Nov", attendance: 155 },
  { date: "26 Nov", attendance: 142 },
  { date: "3 Dec", attendance: 131 },
  { date: "10 Dec", attendance: 146 },
  { date: "17 Dec", attendance: 152 },
];

const sessions = [
  { date: "15 Jan 2025", location: "Bristol", attended: 147, newMembers: 4, notes: "Record turnout" },
  { date: "14 Jan 2025", location: "Cardiff", attended: 134, newMembers: 2, notes: "" },
  { date: "13 Jan 2025", location: "Worcester", attended: 112, newMembers: 3, notes: "" },
  { date: "8 Jan 2025", location: "Bristol", attended: 139, newMembers: 2, notes: "" },
  { date: "7 Jan 2025", location: "Cardiff", attended: 128, newMembers: 1, notes: "Guest speaker" },
];

const milestones = [
  { name: "Robert Williams", visits: 50, location: "Cardiff" },
  { name: "David Thompson", visits: 25, location: "Bristol" },
  { name: "Susan Clark", visits: 10, location: "Worcester" },
];

export default function Reports() {
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-header">Attendance Reports</h1>
          <p className="page-subheader">Data and exports for funders and management</p>
        </div>
        <Button className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <Input type="date" className="w-40" defaultValue="2024-10-01" />
        <span className="self-center text-muted-foreground">to</span>
        <Input type="date" className="w-40" defaultValue="2025-01-15" />
        <Select>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Locations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="bristol">Bristol</SelectItem>
            <SelectItem value="cardiff">Cardiff</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Sessions" value="48" icon={CalendarDays} />
        <StatCard title="Total Attendances" value="6,892" icon={Users} />
        <StatCard title="Unique Members" value="943" icon={Users} />
        <StatCard title="Avg Per Session" value="143" icon={BarChart3} />
      </div>

      <div className="stat-card mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-4">Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
            <Tooltip />
            <Line type="monotone" dataKey="attendance" stroke="hsl(228 72% 36%)" strokeWidth={2.5} dot={{ fill: "hsl(228 72% 36%)" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="stat-card mb-8 overflow-x-auto">
        <h3 className="text-sm font-semibold text-foreground mb-4">Session Log</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Location</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Attended</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">New</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3 px-4 text-foreground">{s.date}</td>
                <td className="py-3 px-4 text-muted-foreground">{s.location}</td>
                <td className="py-3 px-4 font-medium text-foreground">{s.attended}</td>
                <td className="py-3 px-4 text-success">{s.newMembers}</td>
                <td className="py-3 px-4 text-muted-foreground">{s.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stat-card">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" /> Milestones This Month
        </h3>
        <div className="space-y-3">
          {milestones.map((m) => (
            <div key={m.name} className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{m.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{m.location}</span>
                <Badge variant="secondary">{m.visits} visits</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
