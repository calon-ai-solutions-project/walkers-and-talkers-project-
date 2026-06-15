import { useMemo, useState } from "react";
import { Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useMembers, useAttendanceCounts } from "@/hooks/useMembers";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Status = "active" | "pending" | "inactive";
const statusVariant: Record<Status, "default" | "secondary" | "destructive"> = {
  active: "default",
  pending: "secondary",
  inactive: "destructive",
};

export default function MemberDirectory() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const navigate = useNavigate();

  const { data: members, isLoading, error } = useMembers();
  const { data: counts } = useAttendanceCounts();

  const rows = useMemo(() => {
    const list = (members ?? []).map((m) => {
      const c = counts?.[m.id];
      const st: Status = !m.active
        ? "inactive"
        : m.needs_full_data
          ? "pending"
          : "active";
      return {
        id: m.id,
        member_no: m.member_no,
        name: `${m.first_name} ${m.last_name ?? ""}`.trim(),
        visits: c?.visits ?? 0,
        lastSeen: fmtDate(c?.last ?? null),
        status: st,
      };
    });
    const q = search.toLowerCase();
    return list.filter(
      (m) =>
        (status === "all" || m.status === status) &&
        (m.name.toLowerCase().includes(q) ||
          m.member_no.toLowerCase().includes(q)),
    );
  }, [members, counts, search, status]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Member Directory</h1>
        <p className="page-subheader">Bristol members</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="stat-card overflow-x-auto">
        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">Loading members…</p>
        ) : error ? (
          <p className="text-destructive py-8 text-center">
            {(error as Error).message}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            No members found.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">ID</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Visits</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Last Seen</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/members/${m.id}`)}
                >
                  <td className="py-3 px-4 font-medium text-foreground">{m.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{m.member_no}</td>
                  <td className="py-3 px-4 text-foreground">{m.visits}</td>
                  <td className="py-3 px-4 text-muted-foreground">{m.lastSeen}</td>
                  <td className="py-3 px-4">
                    <Badge variant={statusVariant[m.status]}>{m.status}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/members/${m.id}`);
                        }}
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

      <p className="text-sm text-muted-foreground mt-4">
        Showing {rows.length} of {members?.length ?? 0} members
      </p>
    </div>
  );
}
