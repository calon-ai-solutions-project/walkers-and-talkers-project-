import { useMemo, useState } from "react";
import { Search, Eye, Trash2, Printer } from "lucide-react";
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
import {
  useMembers,
  useAttendanceCounts,
  useDeleteMember,
  useMemberCardTokens,
  useBulkUpdateCardStatus,
  CARD_STATUSES,
  CARD_STATUS_LABEL,
  asCardStatus,
  type CardStatus,
} from "@/hooks/useMembers";
import { matchesSearch, sortMembers, SORT_OPTIONS, type SortKey } from "@/lib/memberSearch";

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

// Colours for the card printing status pill / select.
const CARD_STATUS_PILL: Record<CardStatus, string> = {
  to_print: "bg-amber-100 text-amber-800",
  on_the_way: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
};

export default function MemberDirectory() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("last_name");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const { data: members, isLoading, error } = useMembers();
  const { data: counts } = useAttendanceCounts();
  const { data: cardTokens } = useMemberCardTokens();
  const deleteMember = useDeleteMember();
  const bulk = useBulkUpdateCardStatus();

  async function handleDelete(id: string, name: string) {
    if (
      !window.confirm(
        `Delete ${name}? This permanently removes the member and their cards and attendance. This cannot be undone.`,
      )
    )
      return;
    try {
      await deleteMember.mutateAsync(id);
    } catch (e) {
      window.alert("Couldn't delete: " + (e as Error).message);
    }
  }

  // Change one member's card status (inline select on each row).
  async function changeOne(id: string, next: CardStatus) {
    try {
      await bulk.mutateAsync({ ids: [id], status: next });
    } catch (e) {
      window.alert("Couldn't update card status: " + (e as Error).message);
    }
  }

  // Change every selected member's card status at once.
  async function changeMany(next: CardStatus) {
    const ids = [...selected];
    if (ids.length === 0) return;
    try {
      const { updated } = await bulk.mutateAsync({ ids, status: next });
      setSelected(new Set());
      if (updated < ids.length) {
        window.alert(
          `${updated} of ${ids.length} updated. The rest are outside your region / permissions.`,
        );
      }
    } catch (e) {
      window.alert("Couldn't update card statuses: " + (e as Error).message);
    }
  }

  const rows = useMemo(() => {
    const statusOf = (m: { active: boolean | null; needs_full_data: boolean | null }): Status =>
      !m.active ? "inactive" : m.needs_full_data ? "pending" : "active";
    // members_safe columns are all nullable in the generated types.
    const list = (members ?? []).flatMap((m) =>
      m.id != null && m.member_no != null && m.first_name != null
        ? [{ ...m, id: m.id, member_no: m.member_no, first_name: m.first_name }]
        : [],
    );
    const found = list.filter((m) => {
      const card = asCardStatus(m.print_status);
      const matchStatus =
        status === "all" ||
        statusOf(m) === status ||
        (status === "card_to_print" && card === "to_print") ||
        (status === "card_on_the_way" && card === "on_the_way") ||
        (status === "card_delivered" && card === "delivered");
      return matchStatus && matchesSearch(m, search, cardTokens?.[m.id]);
    });
    return sortMembers(found, sort).map((m) => {
      const c = counts?.[m.id];
      return {
        id: m.id,
        member_no: m.member_no,
        name: `${m.first_name} ${m.last_name ?? ""}`.trim(),
        visits: c?.visits ?? 0,
        lastSeen: fmtDate(c?.last ?? null),
        status: statusOf(m),
        cardStatus: asCardStatus(m.print_status),
      };
    });
  }, [members, counts, cardTokens, search, status, sort]);

  const filteredIds = rows.map((r) => r.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(() => (allSelected ? new Set() : new Set(filteredIds)));
  }

  // The inline card-status control: a coloured select on each row.
  function StatusSelect({ id, value }: { id: string; value: CardStatus }) {
    return (
      <select
        value={value}
        disabled={bulk.isPending}
        aria-label="Card printing status"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          void changeOne(id, e.target.value as CardStatus);
        }}
        className={`text-xs font-semibold rounded-full px-2.5 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 ${CARD_STATUS_PILL[value]}`}
      >
        {CARD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {CARD_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Member Directory</h1>
        <p className="page-subheader">Bristol members</p>
      </div>

      <div
        className="rounded-2xl p-4 mb-6 border border-primary/20 shadow-md"
        style={{
          backgroundImage:
            "linear-gradient(135deg, hsl(228 72% 97%), hsl(248 70% 96%))",
        }}
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
            <Input
              placeholder="Search name, email, phone, postcode, member or card number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white border-primary/30 shadow-sm focus-visible:ring-primary text-base"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-52 h-12 rounded-xl bg-white border-primary/30">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="card_to_print">Card: To Print</SelectItem>
              <SelectItem value="card_on_the_way">Card: On the Way</SelectItem>
              <SelectItem value="card_delivered">Card: Delivered</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger
              className="w-full sm:w-48 h-12 rounded-xl bg-white border-primary/30"
              aria-label="Sort members"
            >
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk card-status toolbar */}
      {selected.size > 0 && (
        <div className="rounded-xl mb-4 px-4 py-3 bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-medium text-foreground inline-flex items-center gap-2">
            <Printer className="h-4 w-4" />
            {selected.size} selected — set card status to:
          </span>
          <div className="flex flex-wrap gap-2">
            {CARD_STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant="outline"
                disabled={bulk.isPending}
                onClick={() => void changeMany(s)}
              >
                {CARD_STATUS_LABEL[s]}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <div>
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
         <>
          {/* Mobile: tappable cards */}
          <div className="md:hidden space-y-3">
            {rows.map((m) => (
              <div
                key={m.id}
                className="bg-card rounded-2xl border p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary cursor-pointer"
                    aria-label={`Select ${m.name}`}
                    checked={selected.has(m.id)}
                    onChange={() => toggleOne(m.id)}
                  />
                  <div
                    className="flex-1 min-w-0 cursor-pointer active:scale-[0.99] transition"
                    onClick={() => navigate(`/members/${m.id}`)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.member_no}</p>
                      </div>
                      <Badge variant={statusVariant[m.status]}>{m.status}</Badge>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{m.visits} visits</span>
                      <span>Last seen {m.lastSeen}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Card:</span>
                    <StatusSelect id={m.id} value={m.cardStatus} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/members/${m.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => void handleDelete(m.id, m.name)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block stat-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary cursor-pointer"
                    aria-label="Select all shown"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">ID</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Visits</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Last Seen</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Card</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr
                  key={m.id}
                  className={`border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer ${
                    selected.has(m.id) ? "bg-primary/5" : ""
                  }`}
                  onClick={() => navigate(`/members/${m.id}`)}
                >
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary cursor-pointer"
                      aria-label={`Select ${m.name}`}
                      checked={selected.has(m.id)}
                      onChange={() => toggleOne(m.id)}
                    />
                  </td>
                  <td className="py-3 px-4 font-medium text-foreground">{m.name}</td>
                  <td className="py-3 px-4 text-muted-foreground">{m.member_no}</td>
                  <td className="py-3 px-4 text-foreground">{m.visits}</td>
                  <td className="py-3 px-4 text-muted-foreground">{m.lastSeen}</td>
                  <td className="py-3 px-4">
                    <Badge variant={statusVariant[m.status]}>{m.status}</Badge>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <StatusSelect id={m.id} value={m.cardStatus} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`View ${m.name}`}
                        title="View"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/members/${m.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label={`Delete ${m.name}`}
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDelete(m.id, m.name);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
         </>
        )}
      </div>

      <p className="text-sm text-muted-foreground mt-4">
        Showing {rows.length} of {members?.length ?? 0} members
      </p>
    </div>
  );
}
