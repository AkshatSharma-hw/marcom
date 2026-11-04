/**
 * Proposed-vs-authored signalling (UI change instructions item 1).
 *
 * `OriginChip` marks a record an agent produced and nobody has confirmed yet.
 * `proposedRowClass` gives the row its dashed accent border and tint, so a user
 * scanning a list sees at once which rows are waiting on them.
 *
 * Once accepted, the chip becomes a small persistent marker rather than
 * disappearing — provenance is never lost.
 */

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OriginInfo } from "@/data/selectors/originSelectors";
import { fmtDateShort } from "@/lib/format";

/**
 * Row styling for an agent-proposed record awaiting review.
 *
 * The left border style is set with an arbitrary property rather than
 * `border-dashed`: that utility sets the style on all four sides, which would
 * turn a table row's own bottom border dashed too. `border-l-dashed` is not a
 * Tailwind utility at all and silently produced a solid border.
 */
export function proposedRowClass(origin: OriginInfo["origin"]): string {
  return origin === "agent"
    ? "border-l-[3px] border-l-primary [border-left-style:dashed] bg-primary/[0.03]"
    : "";
}

function relativeTime(iso?: string): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  // Shared formatter: pinned to en-US and UTC. Passing `undefined` here read
  // the viewer's browser locale, so the same chip rendered "8 Aug" for one
  // user and "8月8日" for another.
  return fmtDateShort(iso);
}

interface OriginChipProps {
  info: OriginInfo;
  /** Agent that produced it, when the caller knows a friendlier name. */
  agentName?: string;
  className?: string;
}

export function OriginChip({ info, agentName, className }: OriginChipProps) {
  if (info.origin === "manual") return null;

  const producer = agentName ?? info.generator ?? "an agent";

  if (info.origin === "agent-accepted") {
    return (
      <span
        title={`Proposed by ${producer}, since accepted`}
        className={cn("inline-flex items-center text-muted-foreground", className)}
      >
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        <span className="sr-only">Proposed by {producer}, since accepted</span>
      </span>
    );
  }

  const when = relativeTime(info.producedAt);
  // Generators identify themselves as e.g. 'simulated-ai · deterministic'. The
  // trailing qualifier is a determinism note, not part of the name, and it
  // wraps a table cell into three lines — so it lives in the tooltip instead.
  const shortName = producer.split(" · ")[0];
  const tooltip = [producer, info.basis].filter(Boolean).join(" — ");

  return (
    <span
      title={tooltip}
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary",
        className,
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">Proposed by {shortName}</span>
      {when && <span className="shrink-0 font-normal opacity-70">· {when}</span>}
    </span>
  );
}
