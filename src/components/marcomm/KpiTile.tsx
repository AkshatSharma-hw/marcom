import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TrendBadgeProps {
  /** Percent or absolute delta; sign decides direction unless `direction` is given. */
  delta: number;
  /** Override the up/down rendering (e.g. when a decrease is good). */
  direction?: "up" | "down";
  /** Formatted label; defaults to signed number with a percent sign. */
  label?: string;
  className?: string;
}

export function TrendBadge({ delta, direction, label, className }: TrendBadgeProps) {
  const dir = direction ?? (delta >= 0 ? "up" : "down");
  const text = label ?? `${delta > 0 ? "+" : ""}${delta}%`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
        dir === "up"
          ? "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
          : "border-rose-600/20 bg-rose-600/10 text-rose-700 dark:text-rose-400",
        className,
      )}
    >
      {dir === "up" ? (
        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      ) : (
        <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
      )}
      {text}
    </span>
  );
}

interface KpiTileProps {
  label: string;
  value: ReactNode;
  /** Optional delta chip; pass a number or full TrendBadge props. */
  delta?: number | TrendBadgeProps;
  /** Optional sub-line under the value. */
  sub?: ReactNode;
  className?: string;
}

export function KpiTile({ label, value, delta, sub, className }: KpiTileProps) {
  const trendProps =
    typeof delta === "number" ? { delta } : delta;
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-3xl font-light tabular-nums">{value}</span>
          {trendProps && <TrendBadge {...trendProps} />}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
