import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 brand-gradient overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(1000px 520px at 110% -10%, hsl(252 90% 70% / 0.45), transparent 60%), radial-gradient(800px 460px at -10% 110%, hsl(206 90% 60% / 0.40), transparent 55%)",
        }}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-card p-8 sm:p-10 rounded-3xl border border-white/40 shadow-2xl space-y-6 backdrop-blur-sm"
      >
        <div className="text-center space-y-3">
          <Logo className="h-16 mx-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Admin sign-in
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full h-11 text-base font-semibold"
          disabled={loading || !email || !password}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground text-center pt-2 border-t">
          New here?{" "}
          <Link to="/signup" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  );
}
