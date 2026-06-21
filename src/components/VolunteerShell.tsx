import { useAuth } from "@/lib/auth";

export function VolunteerShell({ children }: { children: React.ReactNode }) {
  const { profile, user, signOut } = useAuth();
  const name = profile?.full_name || profile?.email || user?.email || "";
  return (
    <div className="min-h-screen bg-[#0A1A5E] text-white">
      <header className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div>
          <h1 className="font-serif text-lg font-bold leading-tight">
            Walkers &amp; Talkers
          </h1>
          <p className="text-xs opacity-60">Bristol walk</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:block opacity-90">{name}</span>
          <button
            onClick={() => void signOut()}
            className="text-sm border border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-6">{children}</main>
    </div>
  );
}
