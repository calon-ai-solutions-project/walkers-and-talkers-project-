import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CardState = "pending" | "active" | "lost" | "revoked";
export type RevokeReason =
  | "lost"
  | "damaged"
  | "wrong_url_written"
  | "member_left"
  | "other";

const ALPHA = "abcdefghijklmnopqrstuvwxyz0123456789";
export function genToken(len = 12): string {
  const r = new Uint32Array(len);
  crypto.getRandomValues(r);
  let t = "";
  for (let i = 0; i < len; i++) t += ALPHA[r[i] % ALPHA.length];
  return t;
}

export type CardRow = {
  id: string;
  token: string;
  state: CardState;
  member_id: string;
  issued_at: string | null;
  revoked_at: string | null;
  notes: string | null;
  member: { first_name: string; last_name: string | null; member_no: string } | null;
};

const cardSelect =
  "id, token, state, member_id, issued_at, revoked_at, notes, member:members(first_name, last_name, member_no)";

export function useCards() {
  return useQuery({
    queryKey: ["cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(cardSelect)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CardRow[];
    },
  });
}

export function useCard(id?: string) {
  return useQuery({
    enabled: !!id,
    queryKey: ["card", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(cardSelect)
        .eq("id", id as string)
        .single();
      if (error) throw error;
      return data as unknown as CardRow;
    },
  });
}

export function useMemberCards(memberId?: string) {
  return useQuery({
    enabled: !!memberId,
    queryKey: ["member-cards", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(cardSelect)
        .eq("member_id", memberId as string)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CardRow[];
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["cards"] });
  qc.invalidateQueries({ queryKey: ["card"] });
  qc.invalidateQueries({ queryKey: ["member-cards"] });
}

export function useIssueCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { data, error } = await supabase
        .from("cards")
        .insert({ member_id: memberId, token: genToken(), state: "pending" })
        .select("id, token")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useActivateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from("cards")
        .update({ state: "active" })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useRevokeCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      cardId,
      reason,
    }: {
      cardId: string;
      reason: RevokeReason;
    }) => {
      const { error } = await supabase
        .from("cards")
        .update({
          state: "revoked",
          revoked_at: new Date().toISOString(),
          notes: reason,
        })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}
