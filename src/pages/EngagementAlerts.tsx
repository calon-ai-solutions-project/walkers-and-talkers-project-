import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMembers, useAttendanceCounts } from "@/hooks/useMembers";

function fmtDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EngagementAlerts() {
  const [filter, setFilter] = useState("8");
  const navigate = useNavigate();
  const { data: members } = useMembers();
  const { data: counts } = useAttendanceCounts();

  const rows = useMemo(() => {
    const now = Date.now();
    return (members ?? [])
      .map((m) => {
        const c = counts?.[m.id];
        const weeks = c?.last
          ? Math.floor((now - new Date(c.last).getTime()) / (7 * 864e5))
          : 999; // never attended
        return {
          id: m.id,
          name: `${m.first_name} ${m.last_name ?? ""}`.trim(),
          lastAttended: fmtDate(c?.last ?? null),
          visits: c?.visits ?? 0,
          phone: m.phone ?? "—",
          weeks,
        };
      })
      .filter((m) =>
        filter === "52" ? m.weeks === 999 : m.weeks >= parseInt(filter, 10),
      )
      .sort((a, b) => b.weeks - a.weeks);
  }, [members, counts, filter]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" /> Engagement Alerts
          </h1>
          <p className="page-subheader">
            {filter === "52"
              ? "Members who have never checked in"
              : `Members not seen in ${filter}+ weeks`}{" "}
            — {rows.length} flagged
          </p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="4">4+ weeks</SelectItem>
            <SelectItem value="8">8+ weeks</SelectItem>
            <SelectItem value="12">12+ weeks</SelectItem>
            <SelectItem value="52">Never returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="stat-card overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            No members flagged at this threshold.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Last Attended</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Total Visits</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Phone</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{m.name}</span>
                      <Badge variant="destructive" className="text-xs">
                        {m.weeks === 999 ? "never" : `${m.weeks}w`}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{m.lastAttended}</td>
                  <td className="py-3 px-4 text-foreground">{m.visits}</td>
                  <td className="py-3 px-4 text-muted-foreground">{m.phone}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/members/${m.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
