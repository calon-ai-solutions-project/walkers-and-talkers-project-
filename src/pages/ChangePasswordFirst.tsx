import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

// Forced password-change screen the gate redirects to on first sign-in
// (profile.must_change_password === true). Calls supabase.auth.updateUser
// to set a new password, then clears the flag so subsequent loads of the
// app bypass this screen.
export default function ChangePasswordFirst() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (!user) {
      setError("You're not signed in. Please sign in again.");
      return;
    }

    setLoading(true);
    const { error: pwErr } = await supabase.auth.updateUser({ password });
    if (pwErr) {
      setLoading(false);
      setError(pwErr.message);
      return;
    }
    const { error: flagErr } = await supabase
      .from("profiles")
      .update({ must_change_password: false })
      .eq("id", user.id);
    if (flagErr) {
      setLoading(false);
      setError(
        `Password updated, but couldn't clear the first-login flag: ${flagErr.message}`,
      );
      return;
    }
    await refreshProfile();
    navigate("/", { replace: true });
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(135deg, hsl(228 80% 28%) 0%, hsl(238 72% 40%) 45%, hsl(258 70% 52%) 100%)",
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-2xl space-y-6"
      >
        <div className="text-center space-y-3">
          <Logo className="h-16 mx-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(228_72%_18%)]">
              Set your password
            </h1>
            <p className="text-sm mt-1 text-[hsl(228_20%_45%)]">
              You signed in with a temporary password. Choose a new one before
              continuing.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[hsl(228_60%_18%)]">
            New password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              required
              autoFocus
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-11 border-[hsl(220_15%_85%)] focus-visible:ring-[hsl(228_72%_45%)]"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-md text-[hsl(228_50%_28%)] hover:bg-[hsl(220_22%_94%)] hover:text-[hsl(228_72%_36%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(228_72%_45%)]"
            >
              {show ? (
                <EyeOff className="h-5 w-5" strokeWidth={2.25} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={2.25} />
              )}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-[hsl(228_60%_18%)]">
            Confirm new password
          </Label>
          <Input
            id="confirm"
            type={show ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Re-enter the same password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-11 border-[hsl(220_15%_85%)] focus-visible:ring-[hsl(228_72%_45%)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirm}
          className="w-full h-11 rounded-md text-base font-semibold text-white shadow-md transition-all duration-150 enabled:hover:brightness-110 enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(228_72%_45%)] inline-flex items-center justify-center gap-2"
          style={{
            backgroundImage:
              loading || (password && confirm)
                ? "linear-gradient(135deg, hsl(228 80% 36%), hsl(212 85% 50%))"
                : "linear-gradient(135deg, hsl(220 15% 70%), hsl(220 15% 78%))",
          }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Updating…" : "Set password and continue"}
        </button>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}
