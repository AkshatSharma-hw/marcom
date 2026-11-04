/** Shared display formatters — every page renders numbers through these. */

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** '$120,000' */
export function fmtCurrency(value: number): string {
  return currency.format(value);
}

/**
 * '3 communications' / '1 communication'.
 *
 * For free-text nouns. `countLabel` in lib/entityNouns does the same job when
 * the noun is an entity name; this is for the rest — segments, activities,
 * steps — which were being written as `${n.length} things` and read as
 * "1 communications" on any record that had exactly one.
 *
 * `many` defaults to the -s form; pass it for anything irregular.
 */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** '1.2M' */
export function fmtCompact(value: number): string {
  return compact.format(value);
}

/** '73%' from a 0–1 fraction. */
export function fmtPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

/** 'Aug 13, 2026' from an ISO date or timestamp. */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** 'Aug 13, 2026, 11:55' — UTC, so a run reads the same everywhere. */
export function fmtStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

/** 'Aug 13' — short form for tight table cells. */
export function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
