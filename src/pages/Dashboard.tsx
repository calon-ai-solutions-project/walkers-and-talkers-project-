import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Smoke test: how many members can THIS user see under RLS?
    // super_admin -> all; regional_admin -> own region; volunteer -> 0
    // (volunteers read members_safe, not members).
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) setError(error.message);
        else setMemberCount(count ?? 0);
      });
  }, []);

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif">Walkers &amp; Talkers</h1>
            <p className="text-sm text-gray-500">
              Signed in as {profile?.full_name ?? profile?.email} ·{" "}
              <span className="font-mono">{profile?.role}</span>
            </p>
          </div>
          <button
            onClick={() => void signOut()}
            className="text-sm px-3 py-2 border rounded-lg"
          >
            Sign out
          </button>
        </header>

        <section className="bg-white p-6 rounded-2xl shadow">
          <h2 className="text-lg font-medium mb-2">Members visible to you</h2>
          {error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : memberCount === null ? (
            <p className="text-gray-400">Loading…</p>
          ) : (
            <p className="text-4xl font-semibold">{memberCount}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">
            This count is enforced by Row Level Security, not the UI. The full
            dashboard arrives in Phase 3.
          </p>
        </section>

        <Link
          to="/sessions"
          className="block bg-white p-6 rounded-2xl shadow hover:shadow-md transition"
        >
          <h2 className="text-lg font-medium">Walk sessions →</h2>
          <p className="text-sm text-gray-400 mt-1">
            Open today's check-in before the walk, close it after, or cancel.
          </p>
        </Link>
      </div>
    </main>
  );
}
