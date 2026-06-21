import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useMember, useMemberAttendance } from "@/hooks/useMembers";
import { useMemberCards, useIssueCard } from "@/hooks/useCards";
import { RevokeCardDialog } from "@/components/RevokeCardDialog";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function initials(first: string, last: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export default function MemberProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: member, isLoading, error } = useMember(id);
  const { data: attendance } = useMemberAttendance(id);
  const { data: cards } = useMemberCards(id);
  const issueCard = useIssueCard();
  const [revokeId, setRevokeId] = useState<string | null>(null);

  async function issueAndProgram() {
    if (!id) return;
    const created = await issueCard.mutateAsync(id);
    navigate(`/cards/program/${created.id}`);
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Loading member…</p>;
  }
  if (error || !member) {
    return (
      <div>
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/members")}>
          <ArrowLeft className="h-4 w-4" /> Back to Directory
        </Button>
        <p className="text-destructive">
          {error ? (error as Error).message : "Member not found."}
        </p>
      </div>
    );
  }

  const visits = attendance?.length ?? 0;
  const dates = (attendance ?? []).map((a) => a.checked_in_at).sort();
  const firstVisit = dates[0] ?? null;
  const lastVisit = dates[dates.length - 1] ?? null;
  const fullName = `${member.first_name} ${member.last_name ?? ""}`.trim();

  return (
    <div>
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/members")}>
        <ArrowLeft className="h-4 w-4" /> Back to Directory
      </Button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="stat-card">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center text-xl font-bold text-secondary-foreground">
                {initials(member.first_name, member.last_name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-bold text-foreground">{fullName}</h1>
                  <Badge>{member.member_no}</Badge>
                  {!member.active && <Badge variant="destructive">inactive</Badge>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-foreground ml-1">{member.phone || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground ml-1">{member.email || "—"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address:</span>
                    <span className="text-foreground ml-1">
                      {[member.address_line1, member.city, member.postcode]
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Emergency:</span>
                    <span className="text-foreground ml-1">
                      {member.emergency_contact_name
                        ? `${member.emergency_contact_name} — ${member.emergency_contact_phone ?? ""}`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {member.health_notes && (
            <div className="stat-card border-warning/40">
              <h3 className="text-sm font-semibold text-foreground mb-1">
                Health notes
              </h3>
              <p className="text-sm text-muted-foreground">{member.health_notes}</p>
            </div>
          )}

          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Attendance Stats</h3>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-foreground">{visits}</p>
                <p className="text-xs text-muted-foreground">Total Visits</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{fmtDate(firstVisit)}</p>
                <p className="text-xs text-muted-foreground">First Visit</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{fmtDate(lastVisit)}</p>
                <p className="text-xs text-muted-foreground">Last Visit</p>
              </div>
            </div>
          </div>

          {/* Cards */}
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Cards</h3>
              <Button
                size="sm"
                onClick={() => void issueAndProgram()}
                disabled={issueCard.isPending}
                className="text-white border-0 shadow-md"
                style={{ backgroundImage: "linear-gradient(135deg, #3b82f6, #1e3a8a)" }}
              >
                + Issue new card
              </Button>
            </div>
            {!cards || cards.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active card. Issue one to get started.
              </p>
            ) : (
              <div className="space-y-2">
                {cards.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between border-b last:border-0 pb-2 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          "px-3 py-1 rounded-full text-xs font-semibold capitalize " +
                          (c.state === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.state === "revoked"
                              ? "bg-rose-100 text-rose-700"
                              : c.state === "lost"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-700")
                        }
                      >
                        {c.state}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {c.token}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {(c.state === "pending" || c.state === "active") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/cards/program/${c.id}`)}
                        >
                          Program
                        </Button>
                      )}
                      {c.state !== "revoked" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setRevokeId(c.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-96">
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Attendance History</h3>
            {visits === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins yet.</p>
            ) : (
              <div className="space-y-3">
                {(attendance ?? []).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {fmtDate(a.session?.session_date ?? a.checked_in_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.method} check-in
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {fmtTime(a.checked_in_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <RevokeCardDialog
        cardId={revokeId}
        open={!!revokeId}
        onOpenChange={(v) => !v && setRevokeId(null)}
      />
    </div>
  );
}
