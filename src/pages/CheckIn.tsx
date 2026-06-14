import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

type CheckInStatus =
  | "ok"
  | "already"
  | "no_session"
  | "cancelled"
  | "not_open"
  | "invalid_card"
  | "inactive_card"
  | "error";

type CheckInResult = { status: CheckInStatus; first_name?: string };

const NAVY_GRADIENT =
  "linear-gradient(135deg, #0A1A5E 0%, #1E3A8A 50%, #0A1A5E 100%)";

function copyFor(result: CheckInResult): {
  emoji: string;
  title: string;
  body: string;
} {
  const name = result.first_name ? `, ${result.first_name}` : "";
  switch (result.status) {
    case "ok":
      return {
        emoji: "👋",
        title: "Check-in received",
        body: `Lovely to see you${name}. Enjoy the walk!`,
      };
    case "already":
      return {
        emoji: "✅",
        title: "You're already checked in",
        body: `Good to see you${name} — you're on today's list.`,
      };
    case "no_session":
      return {
        emoji: "📅",
        title: "No walk today",
        body: "There isn't a walk scheduled for today. See you next time!",
      };
    case "cancelled":
      return {
        emoji: "🌧️",
        title: "Today's walk is off",
        body: "This week's walk has been cancelled. Nothing to do today.",
      };
    case "not_open":
      return {
        emoji: "⏳",
        title: "Check-in isn't open yet",
        body: "Please ask a volunteer to open check-in, then tap again.",
      };
    case "inactive_card":
      return {
        emoji: "💳",
        title: "This card isn't active",
        body: "Please speak to a volunteer about your card.",
      };
    case "invalid_card":
      return {
        emoji: "🔍",
        title: "Card not recognised",
        body: "We couldn't find this card. Please speak to a volunteer.",
      };
    case "error":
    default:
      return {
        emoji: "⚠️",
        title: "Something went wrong",
        body: "Please try again in a moment, or ask a volunteer for help.",
      };
  }
}

export default function CheckIn() {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        if (active) {
          setResult({ status: "invalid_card" });
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase.functions.invoke<CheckInResult>(
        "checkin",
        { body: { token } },
      );
      if (!active) return;
      setResult(error || !data ? { status: "error" } : data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const content = loading ? null : copyFor(result ?? { status: "error" });

  return (
    <main
      className="min-h-screen flex items-center justify-center p-8 text-white"
      style={{ background: NAVY_GRADIENT }}
    >
      <div className="text-center max-w-md">
        {loading ? (
          <>
            <div className="text-5xl mb-6 animate-pulse">👋</div>
            <p className="text-lg opacity-80">Checking you in…</p>
          </>
        ) : (
          <>
            <div className="text-7xl mb-6">{content!.emoji}</div>
            <h1 className="text-4xl font-serif mb-3">{content!.title}</h1>
            <p className="text-lg opacity-80">{content!.body}</p>
          </>
        )}
        <p className="text-xs opacity-40 mt-12 font-mono break-all">
          ref: {token}
        </p>
      </div>
    </main>
  );
}
