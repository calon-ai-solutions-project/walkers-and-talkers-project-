import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "super_admin" | "regional_admin" | "volunteer";

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, region_id")
        .order("email");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
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
