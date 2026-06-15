import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Eye, MessageSquare, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const flaggedMembers = [
  { name: "Barbara Moore", location: "Taunton", lastAttended: "18 Nov 2024", visits: 8, phone: "07734 567 890", weeks: 8 },
  { name: "Thomas Anderson", location: "Bristol", lastAttended: "11 Nov 2024", visits: 15, phone: "07745 678 901", weeks: 9 },
  { name: "Jennifer White", location: "Cardiff", lastAttended: "4 Nov 2024", visits: 22, phone: "07756 789 012", weeks: 10 },
  { name: "Charles Harris", location: "Worcester", lastAttended: "28 Oct 2024", visits: 6, phone: "07767 890 123", weeks: 11 },
  { name: "Margaret Clark", location: "Bristol", lastAttended: "21 Oct 2024", visits: 34, phone: "07778 901 234", weeks: 12 },
  { name: "Richard Lewis", location: "Durham", lastAttended: "14 Oct 2024", visits: 19, phone: "07789 012 345", weeks: 13 },
  { name: "Dorothy Walker", location: "Bristol", lastAttended: "7 Oct 2024", visits: 41, phone: "07790 123 456", weeks: 14 },
  { name: "George Hall", location: "Cardiff", lastAttended: "30 Sep 2024", visits: 11, phone: "07701 234 567", weeks: 15 },
  { name: "Helen Allen", location: "Taunton", lastAttended: "23 Sep 2024", visits: 5, phone: "07712 345 678", weeks: 16 },
  { name: "Kenneth Young", location: "Bristol", lastAttended: "16 Sep 2024", visits: 27, phone: "07723 456 789", weeks: 17 },
  { name: "Betty King", location: "Worcester", lastAttended: "9 Sep 2024", visits: 3, phone: "07734 567 890", weeks: 18 },
  { name: "Edward Wright", location: "Durham", lastAttended: "2 Sep 2024", visits: 14, phone: "07745 678 901", weeks: 19 },
  { name: "Sandra Lopez", location: "Bristol", lastAttended: "26 Aug 2024", visits: 9, phone: "07756 789 012", weeks: 20 },
  { name: "Frank Hill", location: "Cardiff", lastAttended: "19 Aug 2024", visits: 37, phone: "07767 890 123", weeks: 21 },
];

export default function EngagementAlerts() {
  const [filter, setFilter] = useState("8");
  const navigate = useNavigate();

  const filtered = flaggedMembers.filter(m => m.weeks >= parseInt(filter));

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" /> Engagement Alerts
          </h1>
          <p className="page-subheader">Members not seen in {filter}+ weeks — {filtered.length} members flagged</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="4">4+ weeks</SelectItem>
            <SelectItem value="8">8+ weeks</SelectItem>
            <SelectItem value="12">12+ weeks</SelectItem>
            <SelectItem value="52">Never returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Location</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Last Attended</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Total Visits</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Phone</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.name} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{m.name}</span>
                    <Badge variant="destructive" className="text-xs">{m.weeks}w</Badge>
                  </div>
                </td>
                <td className="py-3 px-4 text-muted-foreground">{m.location}</td>
                <td className="py-3 px-4 text-muted-foreground">{m.lastAttended}</td>
                <td className="py-3 px-4 text-foreground">{m.visits}</td>
                <td className="py-3 px-4 text-muted-foreground">{m.phone}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Contacted
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
                      <MessageSquare className="h-3.5 w-3.5" /> Note
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/members/MC-001")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
