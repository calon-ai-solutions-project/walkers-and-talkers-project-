import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export function useInviteAdmin() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
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
