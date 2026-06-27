import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Role = "super_admin" | "regional_admin" | "volunteer";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  region_id: string | null;
  must_change_password: boolean;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) void fetchProfile(data.session.user.id);
      else setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) void fetchProfile(s.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    // Two-step fetch so we don't crash the whole app if Migration B
    // (must_change_password column) hasn't been applied yet on this
    // Supabase project. The base columns must exist; the new flag is
    // additive and defaults to false when missing.
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, region_id")
      .eq("id", userId)
      .single();
    if (error) {
      console.error("Profile fetch failed:", error.message);
      setProfile(null);
      setLoading(false);
      return;
    }

    let mustChange = false;
    const { data: flagRow, error: flagErr } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", userId)
      .single();
    if (!flagErr && flagRow && typeof flagRow.must_change_password === "boolean") {
      mustChange = flagRow.must_change_password;
    }
    setProfile({
      ...(data as object),
      must_change_password: mustChange,
    } as unknown as Profile);
    setLoading(false);
  }

  async function refreshProfile() {
    const userId = session?.user.id;
    if (userId) await fetchProfile(userId);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(Ctx);
