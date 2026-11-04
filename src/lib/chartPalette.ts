/**
 * Shared chart palette for recharts marks.
 *
 * Token-based values (resolved from the NST theme CSS variables) are used
 * wherever recharts accepts them — always prefer these.
 */
export const CHART_PRIMARY = "hsl(var(--primary))";
export const CHART_MUTED = "hsl(var(--muted-foreground))";

/**
 * Accent series colors for multi-series recharts fills (donut slices, etc.).
 *
 * SINGLE SANCTIONED EXCEPTION: recharts SVG fills need literal color values
 * for accent series, so these hex literals — mapping to tailwind
 * sky/emerald/amber/rose 400–500 tones — are centralized here and ONLY here.
 * No other file under src/ may contain a hex color literal; import
 * CHART_SERIES instead.
 */
export const CHART_SERIES: string[] = [
  "#0ea5e9", // sky-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#38bdf8", // sky-400
  "#34d399", // emerald-400
];
