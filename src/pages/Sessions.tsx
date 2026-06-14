import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

type Region = { id: string; name: string; walk_day: string; walk_time: string };
type Session = {
  id: string;
  region_id: string;
  session_date: string;
  opened_at: string | null;
  closed_at: string | null;
  cancelled: boolean | null;
  cancelled_reason: string | null;
};

// Match the date the check_in_by_token() function uses (Europe/London).
function londonToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(
    new Date(),
  );
}

export default function Sessions() {
  const { profile } = useAuth();
  const today = londonToday();
  const isSuper = profile?.role === "super_admin";

  const [regions, setRegions] = useState<Region[]>([]);
  const [regionId, setRegionId] = useState<string | null>(
    profile?.region_id ?? null,
  );
  const [session, setSession] = useState<Session | null>(null);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // By-name (forgotten card) check-in.
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<
    { id: string; first_name: string; last_name: string | null }[]
  >([]);
  const [flash, setFlash] = useState<string | null>(null);

  // Regions: super_admin manages all; regional_admin is locked to their own.
  useEffect(() => {
    supabase
      .from("regions")
      .select("id, name, walk_day, walk_time")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        const list = isSuper
          ? (data ?? [])
          : (data ?? []).filter((r) => r.id === profile?.region_id);
        setRegions(list);
        setRegionId((cur) => cur ?? list[0]?.id ?? null);
      });
  }, [isSuper, profile?.region_id]);

  const loadAttendees = useCallback(async (sessionId: string) => {
    const { data: rows } = await supabase
      .from("attendance")
      .select("member_id")
      .eq("session_id", sessionId);
    const ids = (rows ?? []).map((r) => r.member_id);
    if (!ids.length) {
      setAttendees([]);
      return;
    }
    const { data: members } = await supabase
      .from("members_safe")
      .select("first_name, last_name")
      .in("id", ids);
    setAttendees(
      (members ?? []).map((m) => `${m.first_name} ${m.last_name ?? ""}`.trim()),
    );
  }, []);

  const loadSession = useCallback(async () => {
    if (!regionId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("sessions")
      .select(
        "id, region_id, session_date, opened_at, closed_at, cancelled, cancelled_reason",
      )
      .eq("region_id", regionId)
      .eq("session_date", today)
      .maybeSingle();
    if (error) setError(error.message);
    setSession(data ?? null);
    setLoading(false);
    if (data) void loadAttendees(data.id);
    else setAttendees([]);
  }, [regionId, today, loadAttendees]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  async function run(
    fn: () => PromiseLike<{ error: { message: string } | null }>,
  ) {
    setBusy(true);
    setError(null);
    const { error } = await fn();
    if (error) setError(error.message);
    setBusy(false);
    await loadSession();
  }

  const openSession = () =>
    run(() =>
      supabase.from("sessions").upsert(
        {
          region_id: regionId!,
          session_date: today,
          opened_at: new Date().toISOString(),
          closed_at: null,
          cancelled: false,
          cancelled_reason: null,
          opened_by: profile?.id ?? null,
        },
        { onConflict: "region_id,session_date" },
      ),
    );

  const closeSession = () =>
    run(() =>
      supabase
        .from("sessions")
        .update({ closed_at: new Date().toISOString() })
        .eq("id", session!.id),
    );

  const reopenSession = () =>
    run(() =>
      supabase
        .from("sessions")
        .update({ closed_at: null, opened_at: new Date().toISOString() })
        .eq("id", session!.id),
    );

  const cancelSession = () => {
    const reason = window.prompt("Reason for cancelling today's walk?") ?? "";
    return run(() =>
      supabase
        .from("sessions")
        .upsert(
          {
            region_id: regionId!,
            session_date: today,
            cancelled: true,
            cancelled_reason: reason || null,
          },
          { onConflict: "region_id,session_date" },
        ),
    );
  };

  const uncancelSession = () =>
    run(() =>
      supabase
        .from("sessions")
        .update({ cancelled: false, cancelled_reason: null })
        .eq("id", session!.id),
    );

  // Live member search for by-name check-in (region-scoped, no health_notes).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2 || !regionId) {
      setMatches([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("members_safe")
        .select("id, first_name, last_name")
        .eq("region_id", regionId)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
        .order("last_name")
        .limit(8);
      if (active) setMatches(data ?? []);
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, regionId]);

  async function checkInByName(memberId: string, name: string) {
    if (!session) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc("check_in_member", {
      p_member_id: memberId,
      p_session_id: session.id,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      const status = (data as { status?: string })?.status;
      setFlash(
        status === "ok"
          ? `Checked in ${name}`
          : status === "already"
            ? `${name} was already checked in`
            : `Couldn't check in ${name} (${status ?? "error"})`,
      );
      setQuery("");
      setMatches([]);
      await loadAttendees(session.id);
    }
  }

  const status: "none" | "cancelled" | "open" | "closed" = !session
    ? "none"
    : session.cancelled
      ? "cancelled"
      : session.opened_at && !session.closed_at
        ? "open"
        : "closed";

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif">Walk sessions</h1>
            <p className="text-sm text-gray-500">{today} (Europe/London)</p>
          </div>
          <Link to="/dashboard" className="text-sm px-3 py-2 border rounded-lg">
            ← Dashboard
          </Link>
        </header>

        {isSuper && regions.length > 1 && (
          <select
            value={regionId ?? ""}
            onChange={(e) => setRegionId(e.target.value)}
            className="w-full p-3 border rounded-lg bg-white"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} — {r.walk_day} {r.walk_time}
              </option>
            ))}
          </select>
        )}

        <section className="bg-white p-6 rounded-2xl shadow space-y-4">
          {loading ? (
            <p className="text-gray-400">Loading…</p>
          ) : !regionId ? (
            <p className="text-gray-500">No region available for your account.</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                {status === "cancelled" && session?.cancelled_reason && (
                  <span className="text-sm text-gray-500">
                    {session.cancelled_reason}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {status === "none" && (
                  <Button onClick={openSession} busy={busy} primary>
                    Open check-in
                  </Button>
                )}
                {status === "open" && (
                  <>
                    <Button onClick={closeSession} busy={busy}>
                      Close check-in
                    </Button>
                    <Button onClick={cancelSession} busy={busy} danger>
                      Cancel walk
                    </Button>
                  </>
                )}
                {status === "closed" && (
                  <>
                    <Button onClick={reopenSession} busy={busy} primary>
                      Re-open check-in
                    </Button>
                    <Button onClick={cancelSession} busy={busy} danger>
                      Cancel walk
                    </Button>
                  </>
                )}
                {status === "cancelled" && (
                  <Button onClick={uncancelSession} busy={busy}>
                    Un-cancel walk
                  </Button>
                )}
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}
            </>
          )}
        </section>

        {session && status === "open" && (
          <section className="bg-white p-6 rounded-2xl shadow space-y-3">
            <h2 className="text-lg font-medium">Forgot their card?</h2>
            <p className="text-sm text-gray-500">
              Search and check a member in by name.
            </p>
            <input
              type="search"
              placeholder="Type a name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
            {matches.length > 0 && (
              <ul className="border rounded-lg divide-y">
                {matches.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between p-3"
                  >
                    <span>
                      {m.first_name} {m.last_name ?? ""}
                    </span>
                    <button
                      onClick={() =>
                        void checkInByName(
                          m.id,
                          `${m.first_name} ${m.last_name ?? ""}`.trim(),
                        )
                      }
                      disabled={busy}
                      className="text-sm px-3 py-1 bg-wt-navy text-white rounded-lg disabled:opacity-50"
                    >
                      Check in
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {flash && <p className="text-sm text-green-700">{flash}</p>}
          </section>
        )}

        {session && status !== "cancelled" && (
          <section className="bg-white p-6 rounded-2xl shadow">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">
                Checked in ({attendees.length})
              </h2>
              <button
                onClick={() => void loadAttendees(session.id)}
                className="text-sm text-wt-navy underline"
              >
                Refresh
              </button>
            </div>
            {attendees.length === 0 ? (
              <p className="text-gray-400 text-sm">No one checked in yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-1 text-sm">
                {attendees.map((name, i) => (
                  <li key={i} className="truncate">
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function StatusBadge({
  status,
}: {
  status: "none" | "cancelled" | "open" | "closed";
}) {
  const map = {
    none: ["No session yet", "bg-gray-100 text-gray-600"],
    open: ["Check-in open", "bg-green-100 text-green-700"],
    closed: ["Check-in closed", "bg-amber-100 text-amber-700"],
    cancelled: ["Walk cancelled", "bg-red-100 text-red-700"],
  } as const;
  const [label, cls] = map[status];
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${cls}`}>
      {label}
    </span>
  );
}

function Button({
  children,
  onClick,
  busy,
  primary,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  const base = "px-4 py-2 rounded-lg text-sm disabled:opacity-50";
  const style = danger
    ? "bg-red-600 text-white"
    : primary
      ? "bg-wt-navy text-white"
      : "border";
  return (
    <button onClick={onClick} disabled={busy} className={`${base} ${style}`}>
      {children}
    </button>
  );
}
