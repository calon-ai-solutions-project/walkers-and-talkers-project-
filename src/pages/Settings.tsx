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
        <Button variant="outline" size="sm" onClick={() => void signOut()}>
          Sign out
        </Button>
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
          <h3 className="text-sm font-semibold text-foreground mb-4">Team</h3>
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
