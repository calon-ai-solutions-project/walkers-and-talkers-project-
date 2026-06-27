import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { appUrl } from "@/lib/utils";

export type Role = "super_admin" | "regional_admin" | "volunteer";

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, region_id, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: { full_name: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const id = u.user?.id;
      if (!id) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: values.full_name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export type InviteResult = {
  ok: boolean;
  email: string;
  temporary_password: string;
  email_sent: boolean;
  email_error?: unknown;
};

export function useInviteAdmin() {
  return useMutation({
    mutationFn: async (args: {
      email: string;
      full_name?: string;
    }): Promise<InviteResult> => {
      // Call the Edge Function directly via fetch (instead of
      // supabase.functions.invoke) so we surface the real HTTP status
      // and body when something fails. The default SDK swallows these
      // into a generic "Failed to send a request" string, which makes
      // gateway / CORS / 404 issues impossible to diagnose from the UI.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
        import.meta.env.VITE_SUPABASE_ANON_KEY) as string;
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in.");

      const url = `${supabaseUrl}/functions/v1/invite-admin`;
      let resp: Response;
      try {
        resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: args.email.trim().toLowerCase(),
            full_name: args.full_name?.trim() || undefined,
            site_url: appUrl("/").replace(/\/$/, ""),
          }),
        });
      } catch (e) {
        throw new Error(
          `Network call to invite-admin failed: ${
            (e as Error).message
          }. Is the function deployed?`,
        );
      }

      const raw = await resp.text();
      let body: { ok?: boolean; error?: string; detail?: string } & InviteResult;
      try {
        body = raw ? JSON.parse(raw) : ({} as never);
      } catch {
        throw new Error(
          `invite-admin returned non-JSON (HTTP ${resp.status}): ${raw.slice(
            0,
            300,
          )}`,
        );
      }

      if (!resp.ok || !body.ok) {
        const code = body.error ?? `http_${resp.status}`;
        const detail = body.detail ?? "";
        if (code === "already_exists") {
          throw new Error("That email is already on the team.");
        }
        if (code === "forbidden") {
          throw new Error("Only super admins can invite new admins.");
        }
        if (code === "no_auth" || code === "invalid_token") {
          throw new Error("Sign out and back in, then try again.");
        }
        throw new Error(
          `Invite failed (${code}): ${detail || "see Edge Function logs."}`,
        );
      }

      return body as InviteResult;
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      // Bristol-only v1: regional_admin/volunteer get the Bristol region;
      // super_admin spans all regions (null).
      let region_id: string | null = null;
      if (role !== "super_admin") {
        const { data: r } = await supabase
          .from("regions")
          .select("id")
          .eq("slug", "bristol")
          .single();
        region_id = r?.id ?? null;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ role, region_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

// First-user-becomes-admin: promotes the caller to super_admin, but only while
// no super_admin exists yet (enforced in the DB function).
export function useClaimAdmin() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_admin");
      if (error) throw error;
      return data as { status?: string };
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (password: string) => {
      const { data: u, error: userErr } = await supabase.auth.updateUser({
        password,
      });
      if (userErr) throw userErr;
      // If this user was created by an admin invite, clear the
      // must_change_password flag so the gate doesn't re-trigger.
      if (u.user) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("id", u.user.id);
      }
    },
  });
}

export type RegionSettings = {
  walk_day: string;
  walk_time: string;
  contact_email: string | null;
};

export function useUpdateRegion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: RegionSettings;
    }) => {
      const { error } = await supabase
        .from("regions")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["region", "bristol"] }),
  });
}
