import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Eye, ChevronDown, ChevronUp, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMembers, useAttendanceCounts, useBristolRegion } from "@/hooks/useMembers";
import {
  useWelfareFlags,
  useEmailHistory,
  type WelfareFlag,
} from "@/hooks/useWelfare";

function fmtDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function EngagementAlerts() {
  const [filter, setFilter] = useState("8");
  const navigate = useNavigate();
  const { data: members } = useMembers();
  const { data: counts } = useAttendanceCounts();

  const rows = useMemo(() => {
    const now = Date.now();
    return (members ?? [])
      .map((m) => {
        const c = counts?.[m.id];
        const weeks = c?.last
          ? Math.floor((now - new Date(c.last).getTime()) / (7 * 864e5))
          : 999; // never attended
        return {
          id: m.id,
          name: `${m.first_name} ${m.last_name ?? ""}`.trim(),
          lastAttended: fmtDate(c?.last ?? null),
          visits: c?.visits ?? 0,
          phone: m.phone ?? "—",
          weeks,
        };
      })
      .filter((m) =>
        filter === "never" ? m.weeks === 999 : m.weeks >= parseInt(filter, 10),
      )
      .sort((a, b) => b.weeks - a.weeks);
  }, [members, counts, filter]);

  return (
    <div>
      <div
        className="rounded-2xl p-5 mb-6 border shadow-md text-white"
        style={{ backgroundImage: "linear-gradient(135deg, #fb7185, #be123c)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Engagement Alerts
              </h1>
              <p className="text-sm text-white/85">
                {filter === "never"
                  ? "Members who have never checked in"
                  : `Not seen in ${filter}+ week${filter === "1" ? "" : "s"}`}{" "}
                · <span className="font-bold">{rows.length}</span> flagged
              </p>
            </div>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl bg-white/15 border-white/30 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1+ week</SelectItem>
              <SelectItem value="2">2+ weeks</SelectItem>
              <SelectItem value="4">4+ weeks (1 month)</SelectItem>
              <SelectItem value="8">8+ weeks (2 months)</SelectItem>
              <SelectItem value="12">12+ weeks (3 months)</SelectItem>
              <SelectItem value="26">6+ months</SelectItem>
              <SelectItem value="52">12+ months</SelectItem>
              <SelectItem value="never">Never returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        {rows.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            No members flagged at this threshold.
          </p>
        ) : (
         <>
          {/* Mobile: card list */}
          <div className="md:hidden space-y-3">
            {rows.map((m) => (
              <div key={m.id} className="bg-card rounded-2xl border p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate(`/members/${m.id}`)}
                    className="font-semibold text-foreground text-left truncate"
                  >
                    {m.name}
                  </button>
                  <Badge variant="destructive" className="text-xs shrink-0">
                    {m.weeks === 999 ? "never" : `${m.weeks}w`}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Last attended {m.lastAttended} · {m.visits} visits
                </div>
                {m.phone !== "—" && (
                  <a
                    href={`tel:${m.phone}`}
                    className="inline-block mt-2 text-sm text-primary font-medium"
                  >
                    📞 {m.phone}
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block stat-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Last Attended</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Total Visits</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Phone</th>
                <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{m.name}</span>
                      <Badge variant="destructive" className="text-xs">
                        {m.weeks === 999 ? "never" : `${m.weeks}w`}
                      </Badge>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{m.lastAttended}</td>
                  <td className="py-3 px-4 text-foreground">{m.visits}</td>
                  <td className="py-3 px-4 text-muted-foreground">{m.phone}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/members/${m.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
         </>
        )}
      </div>

      <WelfareSection />
    </div>
  );
}

const STAGE_LABELS: Record<string, string> = {
  missed_you: "missed you",
  welfare_check: "welfare check",
  escalated: "phone escalation",
};

function WelfareSection() {
  const { data: region } = useBristolRegion();
  const { data: flags } = useWelfareFlags(region?.id);
  const [filter, setFilter] = useState<"all" | "escalated" | "welfare_check">("all");

  const visible = useMemo(() => {
    const list = flags ?? [];
    if (filter === "escalated")
      return list.filter((f) => f.escalated_to_phone_at);
    if (filter === "welfare_check")
      return list.filter((f) => f.stage === "welfare_check" || f.stage === "escalated");
    return list;
  }, [flags, filter]);

  const escalatedCount = (flags ?? []).filter((f) => f.escalated_to_phone_at).length;

  return (
    <div className="mt-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Welfare flags</h2>
          <p className="text-sm text-muted-foreground">
            Raised by the nudge engine.{" "}
            <span className="font-semibold text-destructive">
              {escalatedCount}
            </span>{" "}
            need a phone call.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-full sm:w-56 h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All open flags</SelectItem>
            <SelectItem value="escalated">Phone escalations only</SelectItem>
            <SelectItem value="welfare_check">Welfare checks</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          No welfare flags at this filter. The nudge engine raises these
          automatically when members miss consecutive walks.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((f) => (
            <WelfareFlagCard key={f.id} flag={f} />
          ))}
        </div>
      )}
    </div>
  );
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function WelfareFlagCard({ flag }: { flag: WelfareFlag }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: history, isLoading } = useEmailHistory(open ? flag.member_id : undefined);
  const escalated = !!flag.escalated_to_phone_at;

  return (
    <div
      className={
        "bg-card rounded-2xl border p-4 shadow-sm " +
        (escalated ? "border-destructive/40" : "")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate(`/members/${flag.member_id}`)}
          className="font-semibold text-foreground text-left truncate"
        >
          {flag.name}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {escalated && (
            <Badge variant="destructive" className="text-xs gap-1">
              <Phone className="h-3 w-3" /> Call
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {STAGE_LABELS[flag.stage] ?? flag.stage}
          </Badge>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {flag.weeks_absent != null && <>Missed {flag.weeks_absent} · </>}
        Last email {fmtDateTime(flag.last_email_sent_at)}
        {escalated && <> · escalated {fmtDateTime(flag.escalated_to_phone_at)}</>}
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-2 inline-flex items-center gap-1 text-sm text-primary font-medium"
      >
        Email history
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="mt-2 border-t pt-2">
          {isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : (history ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No emails sent yet.</p>
          ) : (
            <ul className="space-y-1">
              {(history ?? []).map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-foreground">
                    {(e.template ?? "email").replace("_", " ")}
                  </span>
                  <span className="text-muted-foreground">
                    {fmtDateTime(e.sent_at)} · {e.status ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
