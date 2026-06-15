import { Users, CalendarDays, AlertTriangle, Clock, ScanLine, UserPlus, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const recentSessions = [
  { date: "Wed 15 Jan 2025", attended: 147, newMembers: 4 },
  { date: "Wed 8 Jan 2025", attended: 139, newMembers: 2 },
  { date: "Wed 1 Jan 2025", attended: 98, newMembers: 1 },
];

export default function BristolDashboard() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Bristol Location</h1>
        <p className="page-subheader">Day-to-day management for Bristol</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Members" value="312" icon={Users} />
        <StatCard title="Present Today" value="147" icon={CalendarDays} variant="success" />
        <StatCard title="Sessions This Month" value="3" icon={Clock} />
        <StatCard title="Not Seen 8+ Weeks" value="14" subtitle="Needs attention" icon={AlertTriangle} variant="destructive" />
      </div>

      <div className="stat-card mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-foreground">Next Session</h3>
        </div>
        <p className="text-lg font-bold text-foreground">Wednesday 22 January 2025 — 9:30am</p>
        <p className="text-sm text-muted-foreground">Bristol Community Hall, BS1 4DJ</p>
      </div>

      <div className="stat-card mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Attendance</h3>
        <div className="space-y-3">
          {recentSessions.map((s) => (
            <div key={s.date} className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
              <span className="text-sm font-medium text-foreground">{s.date}</span>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{s.attended} attended</span>
                <span className="text-success">{s.newMembers} new</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/")} className="gap-2">
          <ScanLine className="h-4 w-4" /> Start Check-In
        </Button>
        <Button variant="outline" onClick={() => navigate("/members/new")} className="gap-2">
          <UserPlus className="h-4 w-4" /> Add Member
        </Button>
        <Button variant="outline" onClick={() => navigate("/reports")} className="gap-2">
          <BarChart3 className="h-4 w-4" /> View Reports
        </Button>
      </div>
    </div>
  );
}
