import { MapPin, Users, CalendarDays, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

const attendanceByLocation = [
  { name: "Bristol", attendance: 892 },
  { name: "Cardiff", attendance: 645 },
  { name: "Worcester", attendance: 534 },
  { name: "Taunton", attendance: 412 },
  { name: "Durham", attendance: 378 },
];

const membershipGrowth = [
  { month: "Aug", members: 980 },
  { month: "Sep", members: 1050 },
  { month: "Oct", members: 1120 },
  { month: "Nov", members: 1180 },
  { month: "Dec", members: 1240 },
  { month: "Jan", members: 1312 },
];

const locations = [
  { name: "Bristol", members: 312, lastSession: 147 },
  { name: "Cardiff", members: 278, lastSession: 134 },
  { name: "Worcester", members: 245, lastSession: 112 },
  { name: "Taunton", members: 198, lastSession: 89 },
  { name: "Durham", members: 179, lastSession: 76 },
];

export default function GlobalDashboard() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Global Dashboard</h1>
        <p className="page-subheader">Overview across all locations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Members" value="1,312" subtitle="Across all locations" icon={Users} />
        <StatCard title="Attended This Week" value="558" subtitle="+12% from last week" icon={CalendarDays} variant="success" />
        <StatCard title="Active Locations" value="5" icon={MapPin} />
        <StatCard title="Growth This Month" value="+72" subtitle="New registrations" icon={TrendingUp} variant="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Attendance by Location — This Month</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={attendanceByLocation}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
              <Tooltip />
              <Bar dataKey="attendance" fill="hsl(228 72% 36%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Membership Growth</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={membershipGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 20% 90%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220 10% 45%)" }} />
              <Tooltip />
              <Line type="monotone" dataKey="members" stroke="hsl(228 72% 36%)" strokeWidth={2.5} dot={{ fill: "hsl(228 72% 36%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-3">Locations</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <div key={loc.name} className="stat-card flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-foreground">{loc.name}</h4>
              <p className="text-sm text-muted-foreground">{loc.members} members</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{loc.lastSession}</p>
              <p className="text-xs text-muted-foreground">Last session</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
