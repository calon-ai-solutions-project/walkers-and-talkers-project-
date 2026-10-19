import { useEffect, useState, type ComponentProps } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateMember, type MemberChanges } from "@/hooks/useMembers";
import type { Database } from "@/integrations/supabase/types";

type Member = Database["public"]["Tables"]["members"]["Row"];

const TEXT_FIELDS = [
  "first_name",
  "last_name",
  "member_no",
  "phone",
  "email",
  "address_line1",
  "city",
  "postcode",
  "date_of_birth",
  "emergency_contact_name",
  "emergency_contact_relationship",
  "emergency_contact_phone",
  "health_notes",
] as const;
type TextField = (typeof TEXT_FIELDS)[number];
type Form = Record<TextField, string> & { active: boolean; needs_full_data: boolean };

function toForm(m: Member): Form {
  const form = { active: m.active ?? true, needs_full_data: m.needs_full_data ?? false } as Form;
  for (const f of TEXT_FIELDS) form[f] = m[f] ?? "";
  return form;
}

function toChanges(form: Form): MemberChanges {
  const blankToNull = (s: string) => s.trim() || null;
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    member_no: form.member_no.trim().toUpperCase(),
    phone: blankToNull(form.phone),
    email: blankToNull(form.email)?.toLowerCase() ?? null,
    address_line1: blankToNull(form.address_line1),
    city: blankToNull(form.city),
    postcode: blankToNull(form.postcode)?.toUpperCase() ?? null,
    date_of_birth: blankToNull(form.date_of_birth),
    emergency_contact_name: blankToNull(form.emergency_contact_name),
    emergency_contact_relationship: blankToNull(form.emergency_contact_relationship),
    emergency_contact_phone: blankToNull(form.emergency_contact_phone),
    health_notes: blankToNull(form.health_notes),
    active: form.active,
    needs_full_data: form.needs_full_data,
  };
}

export function EditMemberDialog({
  member,
  open,
  onOpenChange,
}: {
  member: Member;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const update = useUpdateMember();
  const [form, setForm] = useState<Form>(() => toForm(member));
  const [error, setError] = useState<string | null>(null);

  // Start from the saved values each time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm(toForm(member));
      setError(null);
    }
  }, [open, member]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.first_name.trim()) return setError("First name is required.");
    if (!form.member_no.trim()) return setError("Member number is required.");
    setError(null);
    try {
      await update.mutateAsync({ id: member.id, changes: toChanges(form) });
      onOpenChange(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const field = (key: TextField, label: string, props: ComponentProps<typeof Input> = {}) => (
    <div className="space-y-2">
      <Label htmlFor={`edit-${key}`}>{label}</Label>
      <Input
        id={`edit-${key}`}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        {...props}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit member</DialogTitle>
          <DialogDescription>
            Changes are saved to the member&apos;s record straight away.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {field("first_name", "First name")}
            {field("last_name", "Last name")}
            {field("member_no", "Member number", { placeholder: "WT-0001" })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field("phone", "Phone", { type: "tel" })}
            {field("email", "Email", { type: "email" })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3">{field("address_line1", "Address")}</div>
            {field("city", "Town / city")}
            {field("postcode", "Postcode")}
            {field("date_of_birth", "Date of birth", { type: "date" })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {field("emergency_contact_name", "Emergency contact")}
            {field("emergency_contact_relationship", "Relationship")}
            {field("emergency_contact_phone", "Emergency phone", { type: "tel" })}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-health_notes">Health &amp; accessibility notes</Label>
            <Textarea
              id="edit-health_notes"
              rows={3}
              value={form.health_notes}
              onChange={(e) => set("health_notes", e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.active} onCheckedChange={(v) => set("active", v)} />
              Active member
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch
                checked={form.needs_full_data}
                onCheckedChange={(v) => set("needs_full_data", v)}
              />
              Full details still to collect
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={update.isPending}>
            {update.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
