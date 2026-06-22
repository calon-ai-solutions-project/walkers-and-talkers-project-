import {
  Users,
  CalendarDays,
  AlertTriangle,
  Clock,
  ScanLine,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useBristolRegion, useMembers, useAttendanceCounts } from "@/hooks/useMembers";
import {
  useTodaySession,
  useRecentSessions,
  useSessionAttendees,
  useOpenSession,
  useCloseSession,
  useCancelSession,
  useUpdateRecap,
} from "@/hooks/useSessions";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BristolDashboard() {
  const navigate = useNavigate();
  const { data: region } = useBristolRegion();
  const { data: members } = useMembers();
  const { data: counts } = useAttendanceCounts();
  const { data: session } = useTodaySession(region?.id);
  const { data: attendees } = useSessionAttendees(session?.id);
  const { data: recent } = useRecentSessions(region?.id, 12);

  const openSession = useOpenSession();
  const closeSession = useCloseSession();
  const cancelSession = useCancelSession();
  const updateRecap = useUpdateRecap();

  const [recap, setRecap] = useState("");
  const [recapMsg, setRecapMsg] = useState<string | null>(null);
  useEffect(() => {
    setRecap(session?.thank_you_recap ?? "");
  }, [session?.id, session?.thank_you_recap]);

  async function saveRecap() {
    if (!session) return;
    setRecapMsg(null);
    try {
      await updateRecap.mutateAsync({ sessionId: session.id, recap });
      setRecapMsg("Recap saved.");
    } catch (e) {
      setRecapMsg((e as Error).message);
    }
  }

  const total = members?.length ?? 0;
  const presentToday = attendees?.length ?? 0;

  const monthKey = new Date().toISOString().slice(0, 7);
  const sessionsThisMonth = (recent ?? []).filter((s) =>
    s.date.startsWith(monthKey),
  ).length;

  const cutoff = Date.now() - 56 * 864e5;
  const notSeen = (members ?? []).filter((m) => {
    const last = counts?.[m.id]?.last;
    return !last || new Date(last).getTime() < cutoff;
  }).length;

  const status: "none" | "open" | "closed" | "cancelled" = !session
    ? "none"
    : session.cancelled
      ? "cancelled"
      : session.opened_at && !session.closed_at
        ? "open"
        : "closed";

  const busy =
    openSession.isPending || closeSession.isPending || cancelSession.isPending;

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Bristol Location</h1>
        <p className="page-subheader">Day-to-day management for Bristol</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Members" value={String(total)} icon={Users} color="blue" />
        <StatCard
          title="Present Today"
          value={String(presentToday)}
          icon={CalendarDays}
          color="green"
        />
        <StatCard
          title="Sessions This Month"
          value={String(sessionsThisMonth)}
          icon={Clock}
          color="violet"
        />
        <StatCard
          title="Not Seen 8+ Weeks"
          value={String(notSeen)}
          subtitle="Needs attention"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Today's session control */}
      <div className="stat-card mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            Today&apos;s walk ({region?.walk_day ?? "Wednesday"})
          </h3>
          <span
            className={
              "text-xs px-2 py-1 rounded-full font-medium " +
              (status === "open"
                ? "bg-success/15 text-success"
                : status === "cancelled"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-muted text-muted-foreground")
            }
          >
            {status === "none"
              ? "Not opened"
              : status === "open"
                ? "Check-in open"
                : status === "closed"
                  ? "Closed"
                  : "Cancelled"}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {status === "none" && (
            <Button disabled={busy || !region} onClick={() => openSession.mutate(region!.id)}>
              Open check-in
            </Button>
          )}
          {status === "open" && (
            <>
              <Button variant="outline" disabled={busy} onClick={() => closeSession.mutate(session!.id)}>
                Close check-in
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() =>
                  cancelSession.mutate({
                    regionId: region!.id,
                    reason: window.prompt("Reason for cancelling?") ?? "",
                  })
                }
              >
                Cancel walk
              </Button>
            </>
          )}
          {status === "closed" && (
            <Button disabled={busy || !region} onClick={() => openSession.mutate(region!.id)}>
              Re-open check-in
            </Button>
          )}
          {status === "cancelled" && (
            <span className="text-sm text-muted-foreground">
              {session?.cancelled_reason || "Walk cancelled."}
            </span>
          )}
        </div>

        {(status === "open" || status === "closed") && (
          <div className="mt-4 border-t pt-4 space-y-2">
            <label className="text-sm font-medium text-foreground">
              Anything to add to today&apos;s thank-you email? (optional)
            </label>
            <Textarea
              value={recap}
              onChange={(e) => setRecap(e.target.value)}
              placeholder="A photo, a moment, a name to mention…"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be added to the email going out at 5pm today. Leave blank
              if not.
            </p>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={saveRecap}
                disabled={
                  updateRecap.isPending ||
                  recap === (session?.thank_you_recap ?? "")
                }
              >
                {updateRecap.isPending ? "Saving…" : "Save recap"}
              </Button>
              {recapMsg && (
                <span className="text-sm text-muted-foreground">{recapMsg}</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="stat-card mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Recent Attendance</h3>
        {!recent || recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions yet.</p>
        ) : (
          <div className="space-y-3">
            {recent.slice(0, 5).map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
              >
                <span className="text-sm font-medium text-foreground">
                  {fmtDate(s.date)}
                </span>
                <span
                  className={
                    "text-xs font-semibold px-3 py-1 rounded-full " +
                    (s.cancelled
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary")
                  }
                >
                  {s.cancelled ? "cancelled" : `${s.attended} attended`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/")} className="gap-2 text-white border-0 shadow-lg" style={{ backgroundImage: "linear-gradient(135deg, #3b82f6, #1e3a8a)" }}>
          <ScanLine className="h-4 w-4" /> Start Check-In
        </Button>
        <Button onClick={() => navigate("/members/new")} className="gap-2 text-white border-0 shadow-lg" style={{ backgroundImage: "linear-gradient(135deg, #10b981, #047857)" }}>
          <UserPlus className="h-4 w-4" /> Add Member
        </Button>
        <Button onClick={() => navigate("/reports")} className="gap-2 text-white border-0 shadow-lg" style={{ backgroundImage: "linear-gradient(135deg, #8b5cf6, #5b21b6)" }}>
          <BarChart3 className="h-4 w-4" /> View Reports
        </Button>
      </div>
    </div>
  );
}
