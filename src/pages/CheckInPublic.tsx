import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
  region?: string;
};

const NAVY_GRADIENT =
  "linear-gradient(135deg, #0A1A5E 0%, #1E3A8A 50%, #0A1A5E 100%)";

function copyFor(r: CheckInResult): { emoji: string; title: string; body: string } {
  const name = r.first_name ? ` ${r.first_name}` : "";
  const at = r.region ? ` to the ${r.region} walk` : "";
  switch (r.status) {
    case "ok":
      return { emoji: "👋", title: `Welcome${name}!`, body: `You're checked in${at}. Lovely to see you — enjoy the walk.` };
    case "already":
      return { emoji: "✅", title: `You're all set${name}`, body: `Already checked in${at} today. Good to see you.` };
    case "no_session":
      return { emoji: "📅", title: "No walk today", body: "There isn't a walk scheduled for today. See you next time!" };
    case "cancelled":
      return { emoji: "🌧️", title: "Today's walk is off", body: "This week's walk has been cancelled. Nothing to do today." };
    case "not_open":
      return { emoji: "⏳", title: "Check-in isn't open yet", body: "Please ask a volunteer to open check-in, then tap again." };
    case "inactive_card":
      return { emoji: "💳", title: "This card isn't active yet", body: "Please speak to a volunteer about your card." };
    case "invalid_card":
      return { emoji: "🔍", title: "Card not recognised", body: "We couldn't find this card. Please speak to a volunteer." };
    default:
      return { emoji: "⚠️", title: "Something went wrong", body: "Please try again in a moment, or ask a volunteer for help." };
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

  const content = result ? copyFor(result) : { emoji: "👋", title: "Checking you in…", body: "" };

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8 text-white"
      style={{ background: NAVY_GRADIENT }}
    >
      <div className="text-center max-w-md">
        <div className="text-7xl mb-6">{content.emoji}</div>
        <h1 className="text-4xl font-serif mb-3">{content.title}</h1>
        {content.body && <p className="text-lg opacity-80">{content.body}</p>}
        <p className="text-xs opacity-40 mt-12 font-mono break-all">ref: {token}</p>
      </div>
    </main>
  );
}
