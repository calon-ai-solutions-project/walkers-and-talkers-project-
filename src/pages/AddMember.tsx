import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
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
      const created = await createMember.mutateAsync(form);
      navigate(`/members/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="page-header">Add New Member</h1>
        <p className="page-subheader">Register a Bristol member</p>
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
