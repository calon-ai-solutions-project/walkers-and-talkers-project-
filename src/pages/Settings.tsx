import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useBristolRegion } from "@/hooks/useMembers";
import {
  useProfiles,
  useUpdateRole,
  useUpdateRegion,
  useClaimAdmin,
  useChangePassword,
  useUpdateProfile,
  useInviteAdmin,
  type Role,
} from "@/hooks/useSettings";

export default function Settings() {
  const { profile, signOut } = useAuth();
  const isSuper = profile?.role === "super_admin";
  const { data: region } = useBristolRegion();
  const updateRegion = useUpdateRegion();
  const { data: profiles } = useProfiles();
  const updateRole = useUpdateRole();

  const claimAdmin = useClaimAdmin();
  const changePassword = useChangePassword();
  const updateProfile = useUpdateProfile();
  const inviteAdmin = useInviteAdmin();

  const [fullName, setFullName] = useState("");
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    password: string;
    emailSent: boolean;
  } | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  async function saveName() {
    setNameMsg(null);
    try {
      await updateProfile.mutateAsync({ full_name: fullName.trim() });
      setNameMsg("Name saved.");
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      setNameMsg((e as Error).message);
    }
  }

  async function sendInvite() {
    setInviteMsg(null);
    setInviteResult(null);
    if (!inviteEmail.trim()) return;
    try {
      const res = await inviteAdmin.mutateAsync({
        email: inviteEmail,
        full_name: inviteName,
      });
      setInviteResult({
        email: res.email,
        password: res.temporary_password,
        emailSent: res.email_sent,
      });
      setInviteMsg(
        res.email_sent
          ? `Login details sent to ${res.email}. They'll appear in the team list after they sign in once (then set their role here).`
          : `Account created for ${res.email}, but the email failed to send. Copy the password below and share it manually.`,
      );
      setInviteEmail("");
      setInviteName("");
    } catch (e) {
      setInviteMsg((e as Error).message);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore — older browsers without clipboard API
    }
  }

  const [walkDay, setWalkDay] = useState("");
  const [walkTime, setWalkTime] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  async function claim() {
    setClaimMsg(null);
    try {
      const res = await claimAdmin.mutateAsync();
      if (res?.status === "ok") {
        setClaimMsg("You're now the admin. Reloading…");
        setTimeout(() => window.location.reload(), 800);
      } else if (res?.status === "admin_exists") {
        setClaimMsg("An admin already exists — ask them to change your role.");
      } else {
        setClaimMsg(`Couldn't claim admin (${res?.status ?? "error"}).`);
      }
    } catch (e) {
      setClaimMsg((e as Error).message);
    }
  }

  async function savePassword() {
    setPwMsg(null);
    if (newPw.length < 8) {
      setPwMsg("Password must be at least 8 characters.");
      return;
    }
    try {
      await changePassword.mutateAsync(newPw);
      setNewPw("");
      setPwMsg("Password updated.");
    } catch (e) {
      setPwMsg((e as Error).message);
    }
  }

  useEffect(() => {
    if (region) {
      setWalkDay(region.walk_day ?? "");
      setWalkTime((region.walk_time ?? "").slice(0, 5));
      setContactEmail(region.contact_email ?? "");
    }
  }, [region]);

  async function saveRegion() {
    if (!region) return;
    setSavedMsg(null);
    try {
      await updateRegion.mutateAsync({
        id: region.id,
        values: {
          walk_day: walkDay,
          walk_time: walkTime,
          contact_email: contactEmail || null,
        },
      });
      setSavedMsg("Region settings saved.");
    } catch (e) {
      setSavedMsg((e as Error).message);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="page-header">Settings</h1>
        <p className="page-subheader">Your account, the Bristol walk, and the team</p>
      </div>

      {/* Profile */}
      <div className="stat-card space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Your account</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Name:</span>{" "}
            <span className="text-foreground">{profile?.full_name || "—"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Email:</span>{" "}
            <span className="text-foreground">{profile?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Role:</span>
            <Badge>{profile?.role?.replace("_", " ")}</Badge>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Label>Full name</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
          />
          <p className="text-xs text-muted-foreground">
            Sign-in method: email &amp; password.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            onClick={() => void signOut()}
            className="text-sm text-muted-foreground underline"
          >
            Sign out
          </button>
          <div className="flex items-center gap-3">
            {nameMsg && (
              <span className="text-sm text-muted-foreground">{nameMsg}</span>
            )}
            <Button
              size="sm"
              onClick={saveName}
              disabled={
                updateProfile.isPending ||
                fullName.trim() === (profile?.full_name ?? "")
              }
            >
              {updateProfile.isPending ? "Saving…" : "Save name"}
            </Button>
          </div>
        </div>
      </div>

      {/* Become admin (only meaningful if no admin exists yet) */}
      {!isSuper && (
        <div className="stat-card space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Become the admin</h3>
          <p className="text-sm text-muted-foreground">
            If you're the first person setting this up, claim the super-admin
            role. This only works while no admin exists yet.
          </p>
          <Button onClick={() => void claim()} disabled={claimAdmin.isPending}>
            {claimAdmin.isPending ? "Claiming…" : "Make me admin"}
          </Button>
          {claimMsg && <p className="text-sm text-muted-foreground">{claimMsg}</p>}
        </div>
      )}

      {/* Change password (in-portal, no email needed) */}
      <div className="stat-card space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Change password</h3>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="space-y-2 flex-1">
            <Label>New password</Label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <Button onClick={savePassword} disabled={changePassword.isPending || !newPw}>
            {changePassword.isPending ? "Saving…" : "Update password"}
          </Button>
        </div>
        {pwMsg && <p className="text-sm text-muted-foreground">{pwMsg}</p>}
      </div>

      {/* Region / walk settings */}
      <div className="stat-card space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Bristol walk</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Walk day</Label>
            <Select value={walkDay} onValueChange={setWalkDay} disabled={!isSuper}>
              <SelectTrigger>
                <SelectValue placeholder="Day" />
              </SelectTrigger>
              <SelectContent>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                  (d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Walk time</Label>
            <Input
              type="time"
              value={walkTime}
              onChange={(e) => setWalkTime(e.target.value)}
              disabled={!isSuper}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact email</Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              disabled={!isSuper}
            />
          </div>
        </div>
        {isSuper && (
          <div className="flex items-center gap-3">
            <Button onClick={saveRegion} disabled={updateRegion.isPending}>
              {updateRegion.isPending ? "Saving…" : "Save walk settings"}
            </Button>
            {savedMsg && <span className="text-sm text-muted-foreground">{savedMsg}</span>}
          </div>
        )}
      </div>

      {/* Team management */}
      {isSuper && (
        <div className="stat-card">
          <h3 className="text-sm font-semibold text-foreground mb-1">Team</h3>
          <p className="text-sm text-muted-foreground mb-4">
            People who can access the portal. Set someone to <b>Volunteer</b> and
            they get the simple check-in-only screen.
          </p>

          {/* Invite a new admin */}
          <div className="rounded-xl border p-3 mb-4 space-y-2">
            <Label>Invite someone (emails them a temporary password)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <Input
                placeholder="Their name (optional)"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
              <Input
                type="email"
                placeholder="their email here"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <Button onClick={sendInvite} disabled={inviteAdmin.isPending || !inviteEmail}>
                {inviteAdmin.isPending ? "Creating…" : "Send invite"}
              </Button>
            </div>
            {inviteMsg && <p className="text-sm text-muted-foreground">{inviteMsg}</p>}
            {inviteResult && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-2">
                <p className="font-medium text-foreground">
                  {inviteResult.emailSent
                    ? "Account created — credentials emailed."
                    : "Account created — share these manually:"}
                </p>
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      {inviteResult.email}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inviteResult.email)}
                      className="text-primary hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      <span className="text-muted-foreground">Password:</span>{" "}
                      {inviteResult.password}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(inviteResult.password)}
                      className="text-primary hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This password is shown once. Ask them to change it under
                  Settings → Change password after first sign-in.
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              New people start as Volunteer with no access until you set their
              role below.
            </p>
          </div>

          <div className="space-y-3">
            {(profiles ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {p.full_name || p.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
                <Select
                  value={p.role}
                  onValueChange={(role) =>
                    updateRole.mutate({ id: p.id, role: role as Role })
                  }
                  disabled={p.id === profile?.id}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="super_admin">super admin</SelectItem>
                    <SelectItem value="regional_admin">regional admin</SelectItem>
                    <SelectItem value="volunteer">volunteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            You can't change your own role here. Changing roles requires the
            super-admin update policy (see setup).
          </p>
        </div>
      )}
    </div>
  );
}
