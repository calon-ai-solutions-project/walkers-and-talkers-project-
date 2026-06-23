import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else if (data.session) {
      // Email confirmation is off → signed in immediately.
      navigate("/");
    } else {
      // Confirmation email required.
      setSent(true);
    }
  }

  const backdrop = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(1000px 520px at 110% -10%, hsl(252 90% 70% / 0.45), transparent 60%), radial-gradient(800px 460px at -10% 110%, hsl(206 90% 60% / 0.40), transparent 55%)",
      }}
    />
  );

  if (sent) {
    return (
      <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 brand-gradient overflow-hidden">
        {backdrop}
        <div className="relative w-full max-w-md bg-card p-8 sm:p-10 rounded-3xl border border-white/40 shadow-2xl text-center space-y-4 backdrop-blur-sm">
          <Logo className="h-14 mx-auto object-contain" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Check your inbox
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <strong>{email}</strong>. Click it,
            then sign in.
          </p>
          <Link
            to="/login"
            className="inline-block text-sm text-primary font-medium hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 brand-gradient overflow-hidden">
      {backdrop}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-card p-8 sm:p-10 rounded-3xl border border-white/40 shadow-2xl space-y-6 backdrop-blur-sm"
      >
        <div className="text-center space-y-3">
          <Logo className="h-14 mx-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Join the Walkers & Talkers team
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            required
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
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
            minLength={8}
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <Button
          type="submit"
          className="w-full h-11 text-base font-semibold"
          disabled={loading || !email || !password || !fullName}
        >
          {loading ? "Creating account…" : "Create account"}
        </Button>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground text-center pt-2 border-t">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
