import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="text-center max-w-md bg-white p-8 rounded-2xl shadow">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-serif mb-3">Check your inbox</h1>
          <p className="text-gray-600">
            We sent a sign-in link to <strong>{email}</strong>. Click it to log
            in.
          </p>
          <p className="text-sm text-gray-400 mt-6">
            Link expires in 1 hour. Didn&apos;t arrive? Check spam.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full bg-white p-8 rounded-2xl shadow space-y-4"
      >
        <h1 className="text-2xl font-serif">Walkers &amp; Talkers</h1>
        <p className="text-sm text-gray-500">Admin sign-in</p>
        <input
          type="email"
          required
          placeholder="your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-wt-navy"
        />
        <button
          type="submit"
          disabled={loading || !email}
          className="w-full p-3 bg-wt-navy text-white rounded-lg disabled:opacity-50"
        >
          {loading ? "Sending…" : "Send sign-in link"}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </form>
    </main>
  );
}
