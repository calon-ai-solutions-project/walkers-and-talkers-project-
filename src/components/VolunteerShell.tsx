import { NavLink } from "react-router-dom";
import { ScanLine, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";

const tabs = [
  { to: "/walk", label: "Check-in", icon: ScanLine },
  { to: "/walk/add-member", label: "Add member", icon: UserPlus },
];

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

      {/* Persistent volunteer tabs — always visible regardless of session
          state, so Add member is reachable even before the walk opens. */}
      <nav className="border-b border-white/10 bg-white/5">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-b-2 ${
                  isActive
                    ? "text-white border-sky-400"
                    : "text-white/65 border-transparent hover:text-white hover:bg-white/5"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-6">{children}</main>
    </div>
  );
}
