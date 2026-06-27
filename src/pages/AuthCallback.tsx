import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

type VerifyType =
  | "magiclink"
  | "signup"
  | "invite"
  | "recovery"
  | "email_change"
  | "email";

// Confirms a magic-link / invite / recovery email by exchanging the token_hash
// for a session locally, then redirects to `next`. Pairs with the email
// templates that point at /auth/callback?token_hash=...&type=...&next=... —
// avoids the supabase.co/auth/v1/verify gateway entirely (which on newer
// projects rejects requests without an apikey query param).
export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token_hash = params.get("token_hash");
    const type = params.get("type") as VerifyType | null;
    const next = params.get("next") || "/";

    if (!token_hash || !type) {
      setError("This sign-in link is missing required information.");
      return;
    }

    supabase.auth
      .verifyOtp({ token_hash, type })
      .then(({ error }) => {
        if (error) setError(error.message);
        else navigate(next, { replace: true });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Could not verify the link.");
      });
  }, [params, navigate]);

  return (
    <main
      className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(135deg, hsl(228 80% 28%) 0%, hsl(238 72% 40%) 45%, hsl(258 70% 52%) 100%)",
      }}
    >
      <div className="relative w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl shadow-2xl text-center space-y-4">
        <Logo className="h-16 mx-auto object-contain" />
        {error ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(228_72%_18%)]">
              Sign-in link didn't work
            </h1>
            <p className="text-sm text-[hsl(228_20%_45%)]">{error}</p>
            <p className="text-sm text-[hsl(228_20%_45%)]">
              The link may have expired or already been used. Ask an admin to
              re-send.
            </p>
            <Link
              to="/login"
              className="inline-block text-sm font-semibold text-[hsl(228_72%_36%)] hover:text-[hsl(228_72%_28%)] hover:underline"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-[hsl(228_72%_36%)]" />
            <h1 className="text-2xl font-bold tracking-tight text-[hsl(228_72%_18%)]">
              Signing you in…
            </h1>
            <p className="text-sm text-[hsl(228_20%_45%)]">
              Verifying your invitation link.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
