import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { VolunteerShell } from "@/components/VolunteerShell";
import { useAuth } from "@/lib/auth";
import { useMembers } from "@/hooks/useMembers";
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

function Centered({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center text-center mt-16">
      <div className="text-6xl mb-5">{emoji}</div>
      <h2 className="text-2xl font-serif font-bold mb-2">{title}</h2>
      <p className="text-white/75 text-lg max-w-md">{body}</p>
    </div>
  );
}

export default function VolunteerCheckIn() {
  const { profile } = useAuth();
  const regionId = profile?.region_id ?? undefined;

  const { data: session, isLoading } = useTodaySession(regionId);
  const { data: attendees } = useSessionAttendees(session?.id);
  const { data: members } = useMembers();
  const manual = useManualCheckIn();

  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef<number>();

  const checkedInIds = useMemo(
    () => new Set((attendees ?? []).map((a) => a.member_id)),
    [attendees],
  );

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    return (members ?? [])
      .filter(
        (m) =>
          !checkedInIds.has(m.id) &&
          `${m.first_name} ${m.last_name ?? ""}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [search, members, checkedInIds]);

  async function checkIn(memberId: string, name: string) {
    if (!session) return;
    try {
      const res = await manual.mutateAsync({ memberId, sessionId: session.id });
      if (res?.status === "ok" || res?.status === "already") {
        setSearch("");
        setFlash(`${name} checked in.`);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(null), 3000);
      } else {
        setFlash(`Couldn't check in ${name}.`);
      }
    } catch {
      setFlash(`Couldn't check in ${name}.`);
    }
  }

  // ---- State machine ----
  let content: React.ReactNode;

  if (!regionId) {
    content = (
      <Centered
        emoji="🪧"
        title="No region assigned"
        body="Ask an admin to assign you to the Bristol walk, then sign in again."
      />
    );
  } else if (isLoading) {
    content = (
      <div className="flex flex-col items-center mt-20">
        <div className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white animate-spin mb-4" />
        <p className="text-white/75">Loading today's walk…</p>
      </div>
    );
  } else if (!session || !session.opened_at) {
    content = (
      <Centered
        emoji="☕"
        title="Today's walk hasn't started yet"
        body="Andy or Emma needs to open the walk before you can check members in. Check back shortly."
      />
    );
  } else if (session.cancelled) {
    content = (
      <Centered
        emoji="🌧️"
        title="Today's walk is cancelled"
        body={session.cancelled_reason || "The walk has been cancelled."}
      />
    );
  } else if (session.closed_at) {
    content = (
      <Centered emoji="👋" title="Today's walk has ended" body="See you next week." />
    );
  } else {
    // State 3 — open
    const checkedInCount = (attendees ?? []).length;
    const sessionDate = new Date(session.session_date).toLocaleDateString(
      "en-GB",
      { weekday: "long", day: "numeric", month: "long", year: "numeric" },
    );

    content = (
      <div>
        {/* Session header — same info the admin Check-In page shows */}
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/90 font-semibold">
            Live Session
          </p>
          <h2 className="text-3xl font-serif font-bold mt-2">
            Wednesday Session — Bristol
          </h2>
          <p className="text-white/70 mt-1">{sessionDate}</p>
        </div>

        {/* Big live count card — matches the admin layout */}
        <div
          className="rounded-2xl p-6 mb-4 shadow-xl flex items-center gap-5"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(228 80% 36%), hsl(212 85% 50%))",
          }}
        >
          <div className="h-14 w-14 rounded-xl bg-white/15 flex items-center justify-center text-3xl">
            👥
          </div>
          <div className="flex-1">
            <div className="text-5xl font-bold leading-none">{checkedInCount}</div>
            <div className="flex items-center gap-2 mt-2 text-sm text-white/85">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              checked in · live
            </div>
          </div>
        </div>

        <Link
          to="/walk/add-member"
          className="mb-6 w-full inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 transition-colors text-base font-semibold"
        >
          <UserPlus className="h-5 w-5" />
          Add a new member
        </Link>

        {flash && (
          <div className="mb-4 rounded-xl bg-emerald-500/20 border border-emerald-400/40 px-4 py-3 text-emerald-100 font-medium">
            ✓ {flash}
          </div>
        )}

        <div className="rounded-2xl bg-white/10 border border-white/15 p-5 mb-6">
          <p className="text-xs uppercase tracking-wider text-white/65 font-semibold mb-3">
            Forgot a card? Check in by name
          </p>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Start typing a member's name…"
            className="w-full h-14 rounded-2xl bg-white text-foreground px-5 text-lg outline-none shadow-lg"
          />

          {matches.length > 0 && (
            <ul className="mt-3 rounded-2xl overflow-hidden bg-white/5 border border-white/15 divide-y divide-white/10">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() =>
                      void checkIn(m.id, `${m.first_name} ${m.last_name ?? ""}`.trim())
                    }
                    disabled={manual.isPending}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/10 text-left min-h-[56px] disabled:opacity-50"
                  >
                    <span>
                      <span className="font-semibold">
                        {m.first_name} {m.last_name ?? ""}
                      </span>
                      <span className="block text-xs text-white/55 font-mono">
                        {m.member_no}
                      </span>
                    </span>
                    <span className="text-sm text-sky-300 font-medium">
                      Tap to check in →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {search.trim().length >= 2 && matches.length === 0 && (
            <p className="mt-3 text-white/60 text-sm">No matching members.</p>
          )}
        </div>

        <div>
          <h3 className="text-sm uppercase tracking-wider text-white/50 mb-3">
            Recent check-ins
          </h3>
          {(attendees ?? []).length === 0 ? (
            <p className="text-white/55 text-sm">No one checked in yet.</p>
          ) : (
            <ul className="space-y-2">
              {(attendees ?? []).map((a, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3"
                >
                  <span className="font-medium">{a.name}</span>
                  <span className="text-sm text-white/55">{fmtTime(a.time)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return <VolunteerShell>{content}</VolunteerShell>;
}
