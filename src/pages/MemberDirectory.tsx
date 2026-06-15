import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, Pencil, UserX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const members = [
  { id: "MC-001", name: "Mary Johnson", location: "Bristol", visits: 23, lastSeen: "15 Jan 2025", status: "active" },
  { id: "MC-002", name: "David Thompson", location: "Bristol", visits: 45, lastSeen: "15 Jan 2025", status: "active" },
  { id: "MC-003", name: "Robert Williams", location: "Cardiff", visits: 67, lastSeen: "14 Jan 2025", status: "active" },
  { id: "MC-004", name: "Patricia Davis", location: "Bristol", visits: 12, lastSeen: "8 Jan 2025", status: "pending" },
  { id: "MC-005", name: "James Wilson", location: "Worcester", visits: 31, lastSeen: "10 Jan 2025", status: "active" },
  { id: "MC-006", name: "Barbara Moore", location: "Taunton", visits: 8, lastSeen: "18 Nov 2024", status: "inactive" },
  { id: "MC-007", name: "Michael Brown", location: "Durham", visits: 52, lastSeen: "12 Jan 2025", status: "active" },
  { id: "MC-008", name: "Elizabeth Taylor", location: "Bristol", visits: 3, lastSeen: "1 Jan 2025", status: "pending" },
];

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "secondary",
  inactive: "destructive",
};

export default function MemberDirectory() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Member Directory</h1>
        <p className="page-subheader">Search and manage all members across locations</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select>
          <SelectTrigger className="w-40"><SelectValue placeholder="Location" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="bristol">Bristol</SelectItem>
            <SelectItem value="cardiff">Cardiff</SelectItem>
            <SelectItem value="worcester">Worcester</SelectItem>
            <SelectItem value="taunton">Taunton</SelectItem>
            <SelectItem value="durham">Durham</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="stat-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">ID</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Location</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Visits</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Last Seen</th>
              <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
              <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                <td className="py-3 px-4 font-medium text-foreground">{m.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{m.id}</td>
                <td className="py-3 px-4 text-muted-foreground">{m.location}</td>
                <td className="py-3 px-4 text-foreground">{m.visits}</td>
                <td className="py-3 px-4 text-muted-foreground">{m.lastSeen}</td>
                <td className="py-3 px-4">
                  <Badge variant={statusVariant[m.status]}>{m.status}</Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/members/MC-001")}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><UserX className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">Showing {filtered.length} of {members.length} members</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm text-muted-foreground">Page 1 of 1</span>
          <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
