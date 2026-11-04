/**
 * The small tonal pill the PR surfaces use for sentiment and relationship.
 *
 * Shared between the `/pr` tabs and the routed `/pr/contacts/:id` record so the
 * two render the same states with exactly these tokens rather than a second,
 * drifting copy of them.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChipTone = "success" | "warning" | "muted" | "destructive";

const chipToneStyles: Record<ChipTone, string> = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  muted: "bg-muted text-muted-foreground border-border",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
};

export function Chip({
  tone,
  children,
  className,
}: {
  tone: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        chipToneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
