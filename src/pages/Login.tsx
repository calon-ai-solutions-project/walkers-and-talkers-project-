import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <main className="min-h-screen flex items-center justify-center p-8 bg-background">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-card p-8 rounded-2xl border shadow-sm space-y-5"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Walkers &amp; Talkers
          </h1>
          <p className="text-sm text-muted-foreground">Admin sign-in</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !email || !password}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">
          Accounts are created by an administrator in Supabase.
        </p>
      </form>
    </main>
  );
}
