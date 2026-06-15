import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCards, type CardState } from "@/hooks/useCards";
import { RevokeCardDialog } from "@/components/RevokeCardDialog";

const TABS: { value: CardState; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "lost", label: "Lost" },
  { value: "revoked", label: "Revoked" },
];

const stateVariant: Record<CardState, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "secondary",
  lost: "outline",
  revoked: "destructive",
};

export default function Cards() {
  const navigate = useNavigate();
  const { data: cards, isLoading } = useCards();
  const [tab, setTab] = useState<CardState>("pending");
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const rows = useMemo(
    () => (cards ?? []).filter((c) => c.state === tab),
    [cards, tab],
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Cards</h1>
        <p className="page-subheader">Issue, program and revoke member cards</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as CardState)} className="mb-4">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label} ({(cards ?? []).filter((c) => c.state === t.value).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="stat-card overflow-x-auto">
        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">Loading cards…</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">No {tab} cards.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Member</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Token</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">State</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-3 px-4 font-medium text-foreground">
                    {c.member
                      ? `${c.member.first_name} ${c.member.last_name ?? ""}`.trim()
                      : "—"}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {c.member?.member_no}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-muted-foreground">{c.token}</td>
                  <td className="py-3 px-4">
                    <Badge variant={stateVariant[c.state]}>{c.state}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {(c.state === "pending" || c.state === "active") && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/cards/program/${c.id}`)}
                        >
                          Program
                        </Button>
                      )}
                      {c.state !== "revoked" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setRevokeId(c.id)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <RevokeCardDialog
        cardId={revokeId}
        open={!!revokeId}
        onOpenChange={(v) => !v && setRevokeId(null)}
      />
    </div>
  );
}
