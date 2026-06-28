import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Link2, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { appUrl } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateMember } from "@/hooks/useMembers";

export default function AddMember() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVolunteerContext = location.pathname.startsWith("/walk");
  const createMember = useCreateMember();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    address_line1: "",
    postcode: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    data_source: "admin_entry",
  });
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSave() {
    setError(null);
    if (!form.first_name || !form.last_name) {
      setError("First and last name are required.");
      return;
    }
    try {
      const result = await createMember.mutateAsync(form);
      // Volunteer kiosk has no member-profile view to land on, so send
      // them back to today's walk. Admins keep their existing
      // profile-on-create flow. Updates (a same-name match was found
      // and we wrote into the existing row) follow the same redirect.
      if (isVolunteerContext) {
        const verb = result.action === "updated" ? "Updated" : "Added";
        navigate(`/walk?flash=${encodeURIComponent(
          `${verb} ${form.first_name} ${form.last_name}`,
        )}`);
      } else {
        navigate(`/members/${result.id}`);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const shareUrl = appUrl("/register");
  const [copied, setCopied] = useState(false);
  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Add New Member</h1>
          <p className="page-subheader">Register a Bristol member</p>
        </div>
        {!isVolunteerContext && (
          <div className="bg-gradient-to-br from-[hsl(228_60%_96%)] to-white border border-[hsl(228_72%_36%/0.18)] rounded-xl p-3 sm:w-72 shrink-0">
            <p className="text-xs font-semibold text-[hsl(228_72%_36%)] uppercase tracking-wide flex items-center gap-1.5">
              <Link2 className="h-3 w-3" />
              Self-register link
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Share with anyone who wants to register themselves.
            </p>
            <div className="mt-2 flex items-center gap-1">
              <code className="text-[11px] bg-white border rounded px-2 py-1.5 flex-1 truncate font-mono">
                {shareUrl}
              </code>
              <button
                type="button"
                onClick={copyShareUrl}
                className="h-7 w-7 rounded inline-flex items-center justify-center bg-[hsl(228_72%_36%)] text-white hover:bg-[hsl(228_72%_28%)] shrink-0"
                aria-label="Copy registration URL"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="stat-card space-y-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input
              placeholder="First name"
              value={form.first_name}
              onChange={(e) => set("first_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input
              placeholder="Last name"
              value={form.last_name}
              onChange={(e) => set("last_name", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              placeholder="07700 000 000"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Address</Label>
            <Input
              placeholder="Address line"
              value={form.address_line1}
              onChange={(e) => set("address_line1", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Postcode</Label>
            <Input
              placeholder="BS1 4DJ"
              value={form.postcode}
              onChange={(e) => set("postcode", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Emergency Contact Name</Label>
            <Input
              placeholder="Name"
              value={form.emergency_contact_name}
              onChange={(e) => set("emergency_contact_name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Emergency Contact Phone</Label>
            <Input
              placeholder="07700 000 000"
              value={form.emergency_contact_phone}
              onChange={(e) => set("emergency_contact_phone", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Location</Label>
            <Input value="Bristol" disabled />
          </div>
          <div className="space-y-2">
            <Label>Registration Method</Label>
            <Select
              value={form.data_source}
              onValueChange={(v) => set("data_source", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="How registered?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin_entry">Admin Entry</SelectItem>
                <SelectItem value="paper_form">Paper Form</SelectItem>
                <SelectItem value="online">Online Registration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <Button
        size="lg"
        onClick={handleSave}
        disabled={createMember.isPending}
        className="w-full sm:w-auto"
      >
        {createMember.isPending ? "Saving…" : "Save member"}
      </Button>
      <p className="text-xs text-muted-foreground mt-3">
        A card can be issued and programmed for this member next.
      </p>
    </div>
  );
}
