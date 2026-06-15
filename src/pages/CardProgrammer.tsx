import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Smartphone, Link2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCard, useActivateCard } from "@/hooks/useCards";
import { RevokeCardDialog } from "@/components/RevokeCardDialog";

export default function CardProgrammer() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { data: card, isLoading } = useCard(cardId);
  const activate = useActivateCard();

  const [status, setStatus] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Loading card…</p>;
  if (!card) {
    return (
      <div>
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/cards")}>
          <ArrowLeft className="h-4 w-4" /> Back to Cards
        </Button>
        <p className="text-destructive">Card not found.</p>
      </div>
    );
  }

  const url = `${window.location.origin}/c/${card.token}`;
  const nfcSupported = typeof window !== "undefined" && "NDEFReader" in window;
  const memberName = card.member
    ? `${card.member.first_name} ${card.member.last_name ?? ""}`.trim()
    : "member";

  async function writeNfc() {
    setStatus(null);
    if (!nfcSupported) {
      setStatus("Web NFC isn't supported on this device/browser. Use Android Chrome, or the Copy URL tab.");
      return;
    }
    setWriting(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new (window as any).NDEFReader();
      await reader.write({ records: [{ recordType: "url", data: url }] });
      await activate.mutateAsync(card.id);
      setStatus(`✓ Written and activated for ${memberName}.`);
    } catch (e) {
      setStatus(`Write failed: ${(e as Error).message}`);
    } finally {
      setWriting(false);
    }
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="max-w-2xl">
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/cards")}>
        <ArrowLeft className="h-4 w-4" /> Back to Cards
      </Button>

      <div className="mb-6">
        <h1 className="page-header">Program card</h1>
        <p className="page-subheader">
          {memberName} · {card.member?.member_no} ·{" "}
          <Badge variant={card.state === "active" ? "default" : "secondary"}>
            {card.state}
          </Badge>
        </p>
      </div>

      <Tabs defaultValue="nfc" className="mb-6">
        <TabsList>
          <TabsTrigger value="nfc" className="gap-2">
            <Smartphone className="h-4 w-4" /> Phone (NFC)
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-2">
            <Link2 className="h-4 w-4" /> Copy URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nfc">
          <div className="stat-card space-y-4">
            <p className="text-sm text-muted-foreground">
              On an Android phone in Chrome, tap the button, then hold the blank
              card to the back of the phone until it writes.
            </p>
            {!nfcSupported && (
              <p className="text-sm text-warning">
                This device/browser doesn&apos;t support Web NFC — use Android
                Chrome, or the Copy URL tab.
              </p>
            )}
            <Button onClick={writeNfc} disabled={writing} className="w-full h-16 text-base">
              {writing ? "Hold card to phone…" : "Write to card"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="url">
          <div className="stat-card space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy this URL to encode the card with another tool, or turn it into
              a QR code. It&apos;s the same URL the NFC chip holds.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={url} className="font-mono text-sm" />
              <Button variant="outline" onClick={copyUrl} className="gap-2 shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            {card.state === "pending" && (
              <Button
                variant="outline"
                onClick={() => void activate.mutateAsync(card.id)}
                disabled={activate.isPending}
              >
                Mark card active
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {status && <p className="text-sm mb-4">{status}</p>}

      <div className="flex items-center gap-4">
        {card.member_id && (
          <Button variant="ghost" onClick={() => navigate(`/members/${card.member_id}`)}>
            Go to member
          </Button>
        )}
        <button
          className="text-sm text-destructive underline"
          onClick={() => setRevokeOpen(true)}
        >
          Made a mistake? Revoke this card
        </button>
      </div>

      <RevokeCardDialog
        cardId={card.id}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onRevoked={() => navigate(`/members/${card.member_id}`)}
      />
    </div>
  );
}
