import { useState } from "react";
import { Search, CheckCircle2, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

const recentCheckins = [
  { name: "David Thompson", time: "10:16am", visit: 45 },
  { name: "Mary Johnson", time: "10:14am", visit: 23 },
  { name: "Robert Williams", time: "10:12am", visit: 67 },
  { name: "Patricia Davis", time: "10:09am", visit: 12 },
  { name: "James Wilson", time: "10:07am", visit: 31 },
];

export default function CheckIn() {
  const [search, setSearch] = useState("");

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="text-center mt-8 mb-8">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Live Session</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Wednesday Session — Bristol</h1>
        <p className="text-lg text-muted-foreground mt-2">15 January 2025</p>
      </div>

      {/* Live Counter */}
      <div className="flex items-center gap-3 mb-8">
        <div className="h-3 w-3 rounded-full bg-success animate-pulse-green" />
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold text-foreground">147</span>
          <span className="text-xl text-muted-foreground">/ ~250 expected</span>
        </div>
        <Users className="h-6 w-6 text-muted-foreground ml-2" />
      </div>

      {/* Confirmation Card */}
      <div className="w-full max-w-md bg-success/10 border-2 border-success rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
            MJ
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm font-semibold text-success uppercase tracking-wide">Checked In</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">Mary Johnson</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> 10:14am</span>
              <span>•</span>
              <span>Visit #23</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Check-ins */}
      <div className="w-full max-w-md mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Recent Check-ins</h3>
        <div className="space-y-2">
          {recentCheckins.map((c) => (
            <div key={c.name} className="flex items-center justify-between bg-card rounded-lg border px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground">
                  {c.name.split(" ").map(n => n[0]).join("")}
                </div>
                <span className="text-sm font-medium text-foreground">{c.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Visit #{c.visit}</span>
                <span>{c.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manual Search */}
      <div className="w-full max-w-md mb-12">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Can't scan? Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
      </div>
    </div>
  );
}
