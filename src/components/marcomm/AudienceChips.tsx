/**
 * The audience-workspace pills, shared by the `/audiences` tabs and the routed
 * `/audiences/:id` record.
 *
 * Both surfaces render the same three states, and each had its own copy until
 * the record page landed. A chip is a piece of the state vocabulary — two
 * copies is two places for a tone to drift, so there is one.
 */

import type { AudienceKind, SuppressionReason } from "@/data/types";
import { cn } from "@/lib/utils";

const kindStyles: Record<AudienceKind, string> = {
  customer: "bg-primary/10 text-primary border-primary/20",
  employee: "bg-success/10 text-success border-success/20",
  investor: "bg-warning/10 text-warning border-warning/20",
  press: "bg-muted text-muted-foreground border-border",
  regulator: "bg-destructive/10 text-destructive border-destructive/20",
};

export function KindChip({ kind }: { kind: AudienceKind }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        kindStyles[kind] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {kind}
    </span>
  );
}

/** Blueprint mapping: reason → chip tone. */
const reasonStyles: Record<SuppressionReason, string> = {
  "opt-out": "bg-muted text-muted-foreground border-border",
  "legal-complaint": "bg-destructive/10 text-destructive border-destructive/20",
  "do-not-contact": "bg-warning/10 text-warning border-warning/20",
  bounce: "bg-muted text-muted-foreground border-border",
};

/**
 * `whitespace-nowrap`: every reason but `bounce` is hyphenated, and a browser
 * happily breaks a line at a hyphen. In the `w-36` Reason column that split
 * "do-not-contact" and "legal-complaint" across two lines inside the pill and
 * took those rows from 55px to 73px, so the list read as ragged. A reason is
 * one token; the column widens to hold it instead.
 */
export function ReasonChip({ reason }: { reason: SuppressionReason }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        reasonStyles[reason] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {reason}
    </span>
  );
}

/** Consent below this threshold gets the 'Low consent' warning chip. */
export const LOW_CONSENT_PCT = 70;

/**
 * `shrink-0 whitespace-nowrap`: in the consent table this chip sits in a fixed
 * `w-72` cell beside the meter and the percentage. Left shrinkable it lost the
 * argument for space and broke across two lines — a two-word pill reading
 * "Low / consent" — which pushed every low-consent row from 53px to 71px tall.
 * The meter is the elastic thing in that row, so it is the one that gives.
 */
export function LowConsentChip() {
  return (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
      Low consent
    </span>
  );
}
