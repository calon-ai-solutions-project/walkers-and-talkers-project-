import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Smartphone, Link2, Check, Copy, Usb } from "lucide-react";
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
  const [writingUsb, setWritingUsb] = useState(false);
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

  async function writeViaReader() {
    setStatus("Connecting to your ACR122U… hold a blank card on the reader.");
    setWritingUsb(true);
    try {
      const res = await fetch("http://127.0.0.1:8899/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = (await res.json()) as { status?: string; message?: string };
      if (json.status === "ok") {
        await activate.mutateAsync(card!.id);
        setStatus(`✓ Written and activated for ${memberName}.`);
      } else {
        setStatus(`Write failed: ${json.message ?? "unknown error"}`);
      }
    } catch {
      setStatus(
        "Couldn't reach the local reader. In tools/acr122u run `npm install` then `npm start` (with the ACR122U plugged in), then try again.",
      );
    } finally {
      setWritingUsb(false);
    }
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
          <TabsTrigger value="usb" className="gap-2">
            <Usb className="h-4 w-4" /> USB Reader
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
                Chrome, the <strong>Copy URL</strong> tab, or a USB reader
                (ACR122U) with the writer in <code>tools/acr122u</code>.
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

        <TabsContent value="usb">
          <div className="stat-card space-y-4">
            <p className="text-sm text-muted-foreground">
              Use your <strong>ACR122U</strong> USB reader. First, on the computer
              with the reader plugged in, run the bridge once:
            </p>
            <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto">
cd tools/acr122u
npm install
npm start
            </pre>
            <p className="text-sm text-muted-foreground">
              Leave that window open, then click below and hold a blank card on
              the reader.
            </p>
            <Button
              onClick={writeViaReader}
              disabled={writingUsb}
              className="w-full h-16 text-base"
            >
              {writingUsb ? "Hold card on the reader…" : "Write to card (USB reader)"}
            </Button>
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
