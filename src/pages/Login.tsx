import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) setError(error.message);
    else navigate("/");
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(135deg, hsl(228 80% 28%) 0%, hsl(238 72% 40%) 45%, hsl(258 70% 52%) 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(1000px 520px at 110% -10%, hsl(206 100% 70% / 0.40), transparent 60%), radial-gradient(800px 460px at -10% 110%, hsl(252 90% 75% / 0.35), transparent 55%)",
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-2xl space-y-6"
      >
        <div className="text-center space-y-4">
          <Logo className="h-24 mx-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(228_72%_18%)]">
              Welcome back
            </h1>
            <p className="text-sm mt-1 text-[hsl(228_20%_45%)]">
              Admin sign in
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[hsl(228_60%_18%)]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 border-[hsl(220_15%_85%)] focus-visible:ring-[hsl(228_72%_45%)]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[hsl(228_60%_18%)]">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pr-11 border-[hsl(220_15%_85%)] focus-visible:ring-[hsl(228_72%_45%)]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-md text-[hsl(228_50%_28%)] hover:bg-[hsl(220_22%_94%)] hover:text-[hsl(228_72%_36%)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(228_72%_45%)]"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" strokeWidth={2.25} />
              ) : (
                <Eye className="h-5 w-5" strokeWidth={2.25} />
              )}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !email || !password}
          className="group w-full h-11 rounded-md text-base font-semibold text-white shadow-md transition-all duration-150 enabled:hover:brightness-110 enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(228_72%_45%)] inline-flex items-center justify-center gap-2"
          style={{
            backgroundImage: loading
              ? "linear-gradient(135deg, hsl(228 80% 36%), hsl(212 85% 50%))"
              : !email || !password
              ? "linear-gradient(135deg, hsl(220 15% 70%), hsl(220 15% 78%))"
              : "linear-gradient(135deg, hsl(228 80% 36%), hsl(212 85% 50%))",
          }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <p className="text-sm text-center pt-2 border-t text-[hsl(228_20%_45%)]">
          New here?{" "}
          <Link
            to="/signup"
            className="font-semibold text-[hsl(228_72%_36%)] hover:text-[hsl(228_72%_28%)] hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
