import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "muted" | "destructive" | "info";

const toneStyles: Record<Tone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  muted: "bg-muted text-muted-foreground border-border",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-primary/10 text-primary border-primary/20",
};

/**
 * Lowercased status label -> tone, per the platform state taxonomy
 * (docs/STATE_TAXONOMY.md). Colour carries meaning and the meaning is fixed:
 *
 *   muted       inert — not started, nothing in motion
 *   info        in motion — a machine or process owns it
 *   warning     WAITING ON A PERSON — always, and only, this
 *   destructive BLOCKED, FAILED OR BREACHED — always, and only, this
 *   success     complete / healthy
 *
 * Amber and red are the two that must never drift: if amber can mean "a
 * machine is busy" then it stops telling a user where to spend attention.
 */
const statusTones: Record<string, Tone> = {
  // success — complete / healthy
  live: "success",
  approved: "success",
  completed: "success",
  published: "success",
  "in use": "success",
  sent: "success",
  "on track": "success",
  resolved: "success",
  succeeded: "success",

  // warning — waiting on a person
  "in review": "warning",
  "in approval": "warning",
  requested: "warning",
  rework: "warning",
  "changes requested": "warning",
  briefed: "warning",
  escalated: "warning",
  "at risk": "warning",

  // muted — inert
  draft: "muted",
  planned: "muted",
  parked: "muted",
  archived: "muted",
  retired: "muted",
  uploaded: "muted",
  "no data yet": "muted",
  withdrawn: "muted",
  idea: "muted",
  scored: "muted",
  discarded: "muted",

  // destructive — blocked, failed or breached
  rejected: "destructive",
  blocked: "destructive",
  // A live crisis is the strongest "breached" state the product has. Left
  // unmapped it fell through to muted, so an Active, Critical incident wore the
  // "inert" chip on the governance page and in the board pack.
  active: "destructive",
  killed: "destructive",
  cancelled: "destructive",
  expired: "destructive",
  failed: "destructive",
  "off track": "destructive",
  "sla breached": "destructive",

  // info — in motion, a machine or process owns it
  scheduled: "info",
  promoted: "info",
  drafting: "info",
  queued: "info",
  sending: "info",
  cataloged: "info",
  "in progress": "info",
  paused: "info",
  // Crisis lifecycle either side of Active: the war room is watching, or the
  // review is running. Both are "a process owns it", neither is inert.
  monitoring: "info",
  "post-mortem": "info",
  // Agent-run states. `succeeded` and `failed` are outcomes, the other two are
  // in-flight; unmapped, a successful run wore the muted chip and read as
  // "nothing happened", which is why the agent pages had been painting these
  // locally instead of using the badge.
  running: "info",
};

/**
 * Statuses that ship lowercase in the data (`sent`, `failed`) while every other
 * badge is title case. The badge normalises presentation without touching the
 * stored value.
 */
function displayLabel(status: string): string {
  const trimmed = status.trim();
  if (!trimmed) return trimmed;
  if (trimmed !== trimmed.toLowerCase()) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * Statuses whose meaning genuinely differs by entity, so a single global tone
 * cannot be right for both. Keep this map tiny — it exists for real collisions
 * in the vocabulary, not as an escape hatch for per-page preference.
 *
 * `Active` is the one collision the data actually contains: an Active crisis
 * incident is the most severe state the product has, while an Active journey is
 * simply running normally. The global map is tuned for the incident, so without
 * this the four healthy journeys wore the same red chip as a live crisis.
 */
const entityStatusTones: Record<string, Record<string, Tone>> = {
  Journey: { active: "success" },
};

/**
 * Tone a status resolves to. Exported so the taxonomy can be asserted in tests —
 * an unmapped status falls back to `muted`, which reads as "inert" and is
 * silently wrong, so drift needs to fail loudly somewhere.
 */
export function statusTone(status: string, entity?: string): Tone {
  const key = status.trim().toLowerCase();
  const override = entity ? entityStatusTones[entity]?.[key] : undefined;
  return override ?? statusTones[key] ?? "muted";
}

export type { Tone as StatusTone };

interface StatusBadgeProps {
  status: string;
  /**
   * Entity the status belongs to. Only needed where the same word means
   * different things per entity — see `entityStatusTones`.
   */
  entity?: string;
  /** Optional label override; defaults to the status text. */
  children?: ReactNode;
  className?: string;
}

export function StatusBadge({ status, entity, children, className }: StatusBadgeProps) {
  const tone = statusTone(status, entity);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
    >
      {children ?? displayLabel(status)}
    </span>
  );
}
