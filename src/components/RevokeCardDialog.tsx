import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useRevokeCard, type RevokeReason } from "@/hooks/useCards";

const REASONS: { value: RevokeReason; label: string }[] = [
  { value: "lost", label: "Lost" },
  { value: "damaged", label: "Damaged" },
  { value: "wrong_url_written", label: "Wrong URL written (programming mistake)" },
  { value: "member_left", label: "Member left the group" },
  { value: "other", label: "Other" },
];

export function RevokeCardDialog({
  cardId,
  open,
  onOpenChange,
  onRevoked,
}: {
  cardId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRevoked?: () => void;
}) {
  const revoke = useRevokeCard();
  const [reason, setReason] = useState<RevokeReason | "">("");
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!cardId || !reason) {
      setError("Please choose a reason.");
      return;
    }
    setError(null);
    try {
      await revoke.mutateAsync({ cardId, reason });
      onOpenChange(false);
      setReason("");
      onRevoked?.();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke this card?</DialogTitle>
          <DialogDescription>
            The card will stop working when tapped. The member will need a new
            card to check in. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Label>Reason (required)</Label>
          <RadioGroup value={reason} onValueChange={(v) => setReason(v as RevokeReason)}>
            {REASONS.map((r) => (
              <div key={r.value} className="flex items-center gap-2">
                <RadioGroupItem value={r.value} id={`reason-${r.value}`} />
                <Label htmlFor={`reason-${r.value}`} className="font-normal">
                  {r.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={revoke.isPending}
          >
            {revoke.isPending ? "Revoking…" : "Revoke card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
