import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

type CheckInStatus =
  | "ok"
  | "already"
  | "no_session"
  | "cancelled"
  | "not_open"
  | "invalid_card"
  | "inactive_card"
  | "error";

type CheckInResult = {
  status: CheckInStatus;
  first_name?: string;
  last_name?: string;
  member_no?: string;
  region?: string;
  walk_day?: string;
};

const NAVY_GRADIENT =
  "linear-gradient(160deg, #0A1A5E 0%, #1E3A8A 55%, #16307a 100%)";

function fullName(r: CheckInResult) {
  return `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
}

function headline(r: CheckInResult): { emoji: string; title: string; body: string } {
  const name = r.first_name ? `, ${r.first_name}` : "";
  switch (r.status) {
    case "ok":
      return { emoji: "🎉", title: `Thank you${name}!`, body: "You're checked in. Lovely to see you — enjoy the walk." };
    case "already":
      return { emoji: "✅", title: `You're all set${name}`, body: "You're already checked in today. Good to see you." };
    case "no_session":
      return { emoji: "📅", title: "No walk today", body: "There isn't a walk scheduled today. See you next time!" };
    case "cancelled":
      return { emoji: "🌧️", title: "Today's walk is off", body: "This week's walk has been cancelled. Nothing to do today." };
    case "not_open":
      return { emoji: "⏳", title: "Check-in opens soon", body: "Please ask a volunteer to open check-in, then tap again." };
    case "inactive_card":
      return { emoji: "💳", title: "Card not active yet", body: "Please speak to a volunteer about your card." };
    case "invalid_card":
      return { emoji: "🔍", title: "Card not recognised", body: "We couldn't find this card. Please speak to a volunteer." };
    default:
      return { emoji: "⚠️", title: "Something went wrong", body: "Please try again, or ask a volunteer for help." };
  }
}

export default function CheckInPublic() {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<CheckInResult | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        if (active) setResult({ status: "invalid_card" });
        return;
      }
      const { data, error } = await supabase.rpc("check_in_by_token", {
        p_token: token,
      });
      if (!active) return;
      setResult(error || !data ? { status: "error" } : (data as unknown as CheckInResult));
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const loading = !result;
  const r = result ?? { status: "error" as CheckInStatus };
  const h = headline(r);
  const showMemberCard =
    (r.status === "ok" || r.status === "already") && !!r.member_no;

  return (
    <main
      className="min-h-screen flex flex-col items-center px-6 py-10 text-white"
      style={{ background: NAVY_GRADIENT }}
    >
      {/* Branded logo */}
      <div className="bg-white rounded-2xl p-3 shadow-xl w-44 mb-10">
        <Logo className="h-12 w-full object-contain" showWordmarkFallback={false} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm text-center">
        {loading ? (
          <p className="text-white/80">Checking you in…</p>
        ) : (
          <>
            <div className="text-7xl mb-5">{h.emoji}</div>
            <h1 className="text-4xl font-extrabold mb-3 leading-tight">{h.title}</h1>
            <p className="text-lg text-white/85">{h.body}</p>

            {showMemberCard && (
              <div className="mt-8 w-full rounded-3xl bg-white/10 border border-white/20 backdrop-blur p-6 text-left shadow-xl">
                <p className="text-xs uppercase tracking-wider text-white/60 mb-1">
                  Member
                </p>
                <p className="text-2xl font-bold">{fullName(r)}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-white/60">Member no.</p>
                    <p className="font-semibold font-mono">{r.member_no}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Walk</p>
                    <p className="font-semibold">
                      {r.region}
                      {r.walk_day ? ` · ${r.walk_day}` : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-[11px] text-white/30 mt-10 font-mono break-all">
        ref: {token}
      </p>
    </main>
  );
}
