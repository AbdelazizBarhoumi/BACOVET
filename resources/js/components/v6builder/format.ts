/**
 * Centralized number/percentage formatting for V6 widgets (Phase 6).
 *
 * Default behaviour (no `prefix`/`compact`) reproduces the legacy per-widget
 * `toFixed(n).replace(".", ",")` output so existing dashboards are unchanged.
 */

export type FormatOptions = {
  decimals?: number;
  prefix?: string;
  unit?: string;
  /** Shorten large magnitudes with k/M/B suffixes. */
  compact?: boolean;
};

const COMPACT_STEPS: { threshold: number; suffix: string }[] = [
  { threshold: 1e9, suffix: " B" },
  { threshold: 1e6, suffix: " M" },
  { threshold: 1e3, suffix: " k" },
];

function frenchComma(n: number, decimals: number): string {
  return n.toFixed(decimals).replace(".", ",");
}

export function formatNumber(value: number | null | undefined, opts: FormatOptions = {}): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  const { decimals = 0, prefix, unit, compact } = opts;
  const out = `${prefix ?? ""}${frenchComma(value, decimals)}${unit ?? ""}`;
  if (!compact) return out;

  const abs = Math.abs(value);
  const step = COMPACT_STEPS.find((s) => abs >= s.threshold);
  if (!step) return out;

  const compactDecimals = Math.max(0, decimals) || 1;
  const scaled = value / step.threshold;
  const body = frenchComma(scaled, compactDecimals).replace(/,0$/, "");
  return `${prefix ?? ""}${body}${step.suffix}${unit ?? ""}`;
}
