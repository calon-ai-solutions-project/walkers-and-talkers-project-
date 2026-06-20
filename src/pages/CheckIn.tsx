import { useMemo, useState } from "react";
import { Search, CheckCircle2, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBristolRegion, useMembers } from "@/hooks/useMembers";
import {
  useTodaySession,
  useSessionAttendees,
  useManualCheckIn,
} from "@/hooks/useSessions";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function initials(name: string) {
  return name.split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export default function CheckIn() {
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  const { data: region } = useBristolRegion();
  const { data: session } = useTodaySession(region?.id);
  const { data: attendees } = useSessionAttendees(session?.id);
  const { data: members } = useMembers();
  const manual = useManualCheckIn();

  const isOpen = !!session?.opened_at && !session?.closed_at && !session?.cancelled;
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const list = attendees ?? [];
  const last = list[0];

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return (members ?? [])
      .filter((m) => `${m.first_name} ${m.last_name ?? ""}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [search, members]);

  async function checkIn(memberId: string, name: string) {
    if (!session || !isOpen) {
      setFlash("Open today's walk from the Bristol dashboard before checking people in.");
      return;
    }
    try {
      const res = await manual.mutateAsync({ memberId, sessionId: session.id });
      setFlash(
        res?.status === "ok"
          ? `Checked in ${name}`
          : res?.status === "already"
            ? `${name} was already checked in`
            : `Couldn't check in ${name} (${res?.status ?? "error"})`,
      );
      setSearch("");
    } catch (e) {
      setFlash((e as Error).message);
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center min-h-[calc(100vh-5rem)]">
      <div className="text-center mt-8 mb-8">
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
          {isOpen ? "Live Session" : "Check-in"}
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
          {region?.walk_day ?? "Wednesday"} Session — {region?.name ?? "Bristol"}
        </h1>
        <p className="text-lg text-muted-foreground mt-2">{today}</p>
      </div>

      {!isOpen && (
        <div className="w-full max-w-md bg-muted rounded-2xl p-6 mb-8 text-center">
          <p className="text-sm text-muted-foreground">
            {session?.cancelled
              ? "Today's walk is cancelled."
              : "Check-in isn't open yet. Open today's walk from the Bristol dashboard."}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-8">
        <div
          className={
            "h-3 w-3 rounded-full " +
            (isOpen ? "bg-success animate-pulse-green" : "bg-muted-foreground")
          }
        />
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-extrabold text-foreground">{list.length}</span>
          <span className="text-xl text-muted-foreground">checked in</span>
        </div>
        <Users className="h-6 w-6 text-muted-foreground ml-2" />
      </div>

      {last && (
        <div className="w-full max-w-md bg-success/10 border-2 border-success rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
              {initials(last.name)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-sm font-semibold text-success uppercase tracking-wide">
                  Checked In
                </span>
              </div>
              <h3 className="text-xl font-bold text-foreground">{last.name}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> {fmtTime(last.time)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-md mb-8">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Recent Check-ins
        </h3>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one checked in yet.</p>
        ) : (
          <div className="space-y-2">
            {list.slice(0, 6).map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-card rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground">
                    {initials(c.name)}
                  </div>
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{fmtTime(c.time)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual / by-name check-in — branded blue panel */}
      <div className="w-full max-w-lg mb-12">
        <div
          className="rounded-3xl p-6 border border-primary/20 shadow-xl"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(228 72% 97%), hsl(248 70% 96%))",
          }}
        >
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3">
            Forgot a card? Check in by name
          </h3>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/60" />
            <Input
              placeholder="Start typing a member's name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 text-base rounded-2xl border-primary/30 bg-white shadow-sm focus-visible:ring-primary"
            />
          </div>

          {flash && (
            <p className="text-sm text-primary mt-3 font-medium">{flash}</p>
          )}

          {matches.length > 0 && (
            <ul className="mt-3 rounded-2xl border border-primary/15 divide-y divide-primary/10 bg-white overflow-hidden shadow-sm">
              {matches.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-primary/5 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">
                    {m.first_name} {m.last_name ?? ""}
                  </span>
                  <Button
                    size="sm"
                    disabled={manual.isPending}
                    onClick={() =>
                      void checkIn(m.id, `${m.first_name} ${m.last_name ?? ""}`.trim())
                    }
                  >
                    Check in
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {search.trim().length >= 2 && matches.length === 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              No members match “{search}”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
