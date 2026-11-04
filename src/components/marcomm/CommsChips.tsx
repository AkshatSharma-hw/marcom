/**
 * Communication pills, shared by the `/communications` list and the routed
 * `/communications/:id` record, so a row and its page match.
 *
 * `investor` is the only comms type with a tone of its own; every other type
 * reads as plain text rather than being dressed up as a state it is not.
 */

import { Landmark, Lock } from "lucide-react";

import type { Classification, CommsType } from "@/data/types";
import { cn } from "@/lib/utils";

export function CommsTypeChip({ commsType }: { commsType: CommsType }) {
  if (commsType !== "investor") {
    return <span className="text-sm capitalize">{commsType}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      <Landmark className="h-3 w-3" />
      Investor
    </span>
  );
}

const classificationStyles: Record<Classification, string> = {
  Public: "bg-success/10 text-success border-success/20",
  Internal: "bg-muted text-muted-foreground border-border",
  Confidential: "bg-warning/10 text-warning border-warning/20",
  Restricted: "bg-destructive/10 text-destructive border-destructive/20",
};

export function ClassificationChip({ classification }: { classification: Classification }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        classificationStyles[classification] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {classification === "Restricted" && <Lock className="h-3 w-3" />}
      {classification}
    </span>
  );
}
