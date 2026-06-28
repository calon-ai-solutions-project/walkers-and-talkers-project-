import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY) as string;

type Form = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address_line1: string;
  postcode: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

const emptyForm: Form = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  address_line1: "",
  postcode: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

export default function PublicRegister() {
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    first_name: string;
    member_no: string;
  } | null>(null);

  function set<K extends keyof Form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First and last name are required.");
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/register-member`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
          body: JSON.stringify(form),
        },
      );
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setError(data?.message || data?.error || "Couldn't register. Please try again.");
        setLoading(false);
        return;
      }
      setSuccess({ first_name: data.first_name, member_no: data.member_no });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-4 sm:p-8"
        style={{
          backgroundImage:
            "linear-gradient(135deg, hsl(228 80% 28%) 0%, hsl(238 72% 40%) 45%, hsl(258 70% 52%) 100%)",
        }}
      >
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 sm:p-10 text-center space-y-4">
          <Logo className="h-16 mx-auto object-contain" />
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(228_72%_18%)]">
            Thank you, {success.first_name}!
          </h1>
          <p className="text-[hsl(228_20%_45%)]">
            You're registered with Walkers &amp; Talkers Bristol. Your member
            number is{" "}
            <span className="font-mono font-semibold text-[hsl(228_72%_22%)]">
              {success.member_no}
            </span>
            .
          </p>
          <p className="text-sm text-[hsl(228_20%_55%)]">
            We meet every Wednesday for a gentle walk and a chat. We've sent
            you a welcome email — keep an eye out, and we look forward to
            seeing you soon.
          </p>
          <button
            type="button"
            onClick={() => {
              setSuccess(null);
              setForm(emptyForm);
            }}
            className="text-sm font-semibold text-[hsl(228_72%_36%)] hover:underline"
          >
            Register another person
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 sm:p-8"
      style={{
        backgroundImage:
          "linear-gradient(135deg, hsl(228 80% 28%) 0%, hsl(238 72% 40%) 45%, hsl(258 70% 52%) 100%)",
      }}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-xl bg-white rounded-3xl shadow-2xl p-6 sm:p-10 space-y-5"
      >
        <div className="text-center space-y-2">
          <Logo className="h-16 mx-auto object-contain" />
          <h1 className="text-2xl font-bold tracking-tight text-[hsl(228_72%_18%)]">
            Join Walkers &amp; Talkers
          </h1>
          <p className="text-sm text-[hsl(228_20%_45%)]">
            Bristol — a gentle walk and a chat, every Wednesday.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">First name *</Label>
            <Input
              id="first_name"
              required
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last name *</Label>
            <Input
              id="last_name"
              required
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="07700 000 000"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address_line1}
              onChange={(e) => set("address_line1", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:w-32">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              placeholder="BS1"
              value={form.postcode}
              onChange={(e) => set("postcode", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emerg_name">Emergency contact name</Label>
            <Input
              id="emerg_name"
              value={form.emergency_contact_name}
              onChange={(e) => set("emergency_contact_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emerg_phone">Emergency contact phone</Label>
            <Input
              id="emerg_phone"
              type="tel"
              placeholder="07700 000 000"
              value={form.emergency_contact_phone}
              onChange={(e) => set("emergency_contact_phone", e.target.value)}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-md text-base font-semibold text-white shadow-md inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          style={{
            backgroundImage: loading
              ? "linear-gradient(135deg, hsl(228 80% 36%), hsl(212 85% 50%))"
              : "linear-gradient(135deg, hsl(228 80% 36%), hsl(212 85% 50%))",
          }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Registering…" : "Register"}
        </button>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <p className="text-xs text-center text-[hsl(228_20%_55%)]">
          By registering you agree to be contacted about Walkers &amp; Talkers
          walks. You can opt out anytime.
        </p>
      </form>
    </main>
  );
}
