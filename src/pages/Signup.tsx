import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const shell = "relative min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden";
  const bgStyle = {
    backgroundImage:
      "linear-gradient(135deg, hsl(228 80% 28%) 0%, hsl(238 72% 40%) 45%, hsl(258 70% 52%) 100%)",
  };
  const backdrop = (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "radial-gradient(1000px 520px at 110% -10%, hsl(206 100% 70% / 0.40), transparent 60%), radial-gradient(800px 460px at -10% 110%, hsl(252 90% 75% / 0.35), transparent 55%)",
      }}
    />
  );
  const inputClass =
    "h-11 border-[hsl(220_15%_85%)] focus-visible:ring-[hsl(228_72%_45%)]";
  const labelClass = "text-[hsl(228_60%_18%)]";

  if (sent) {
    return (
      <main className={shell} style={bgStyle}>
        {backdrop}
        <div className="relative w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-2xl text-center space-y-4">
          <Logo className="h-20 mx-auto object-contain" />
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(228_72%_18%)]">
            Check your inbox
          </h1>
          <p className="text-sm text-[hsl(228_20%_45%)]">
            We sent a confirmation link to <strong>{email}</strong>. Click it,
            then sign in.
          </p>
          <Link
            to="/login"
            className="inline-block text-sm font-semibold text-[hsl(228_72%_36%)] hover:text-[hsl(228_72%_28%)] hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={shell} style={bgStyle}>
      {backdrop}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-2xl space-y-6"
      >
        <div className="text-center space-y-4">
          <Logo className="h-20 mx-auto object-contain" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(228_72%_18%)]">
              Create your account
            </h1>
            <p className="text-sm mt-1 text-[hsl(228_20%_45%)]">
              Join the Walkers &amp; Talkers team
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName" className={labelClass}>
            Full name
          </Label>
          <Input
            id="fullName"
            required
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className={labelClass}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className={labelClass}>
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-11`}
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
          <p className="text-xs text-[hsl(228_20%_50%)]">At least 8 characters.</p>
        </div>
        <button
          type="submit"
          disabled={loading || !email || !password || !fullName}
          className="w-full h-11 rounded-md text-base font-semibold text-white shadow-md transition-all duration-150 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(228_72%_45%)]"
          style={{
            backgroundImage:
              "linear-gradient(135deg, hsl(228 80% 36%), hsl(212 85% 50%))",
          }}
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <p className="text-sm text-center pt-2 border-t text-[hsl(228_20%_45%)]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[hsl(228_72%_36%)] hover:text-[hsl(228_72%_28%)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
