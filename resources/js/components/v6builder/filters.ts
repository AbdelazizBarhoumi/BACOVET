import type { Row } from "@/lib/v6/model";

export type SlicerMode = "list" | "dropdown" | "search" | "buttons" | "date" | "relative" | "topN";

export type DateRange = { from?: string; to?: string };

export type RelativePreset = "today" | "7d" | "30d" | "90d" | "month" | "quarter" | "year" | "all";

export const RELATIVE_PRESETS: { key: RelativePreset; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 derniers jours" },
  { key: "30d", label: "30 derniers jours" },
  { key: "90d", label: "90 derniers jours" },
  { key: "month", label: "Ce mois-ci" },
  { key: "quarter", label: "Ce trimestre" },
  { key: "year", label: "Cette année" },
  { key: "all", label: "Tout" },
];

function toIso(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** ISO (yyyy-mm-dd) bounds for a relative-date preset, anchored on `now`. */
export function relativeDateRange(preset: RelativePreset, now = new Date()): DateRange {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "all":
      return {};
    case "today":
      return { from: toIso(today), to: toIso(today) };
    case "7d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: toIso(from), to: toIso(today) };
    }
    case "30d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from: toIso(from), to: toIso(today) };
    }
    case "90d": {
      const from = new Date(today);
      from.setDate(from.getDate() - 89);
      return { from: toIso(from), to: toIso(today) };
    }
    case "month": {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toIso(from), to: toIso(today) };
    }
    case "quarter": {
      const q = Math.floor(today.getMonth() / 3);
      const from = new Date(today.getFullYear(), q * 3, 1);
      return { from: toIso(from), to: toIso(today) };
    }
    case "year": {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from: toIso(from), to: toIso(today) };
    }
  }
}

/** An invalid range (from > to) must never blank the page — the filter is skipped. */
export function validateDateRange(from?: string, to?: string): boolean {
  if (!from || !to) return true;
  return from <= to;
}

export type TopNEntry = { name: string; value: number };

/**
 * Top-N categories of `axis` ranked by summed `value`. When `value` is not a
 * numeric column (e.g. a custom measure), falls back to row counts.
 */
export function topNAggregates(rows: Row[], axis: string, value: string | undefined, n: number): TopNEntry[] {
  if (!rows.length || !axis || n <= 0) return [];
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  let numeric = false;
  for (const row of rows) {
    const key = String(row[axis] ?? "(vide)");
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const raw = row[value ?? ""];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      numeric = true;
      totals.set(key, (totals.get(key) ?? 0) + raw);
    }
  }
  const weight = (k: string) => (numeric ? totals.get(k) ?? 0 : counts.get(k) ?? 0);
  const sorted = [...counts.keys()].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b));
  return sorted.slice(0, n).map((name) => ({ name, value: weight(name) }));
}

/** Set of the top-N axis categories (the rows kept by the filter). */
export function topNValues(rows: Row[], axis: string, value: string | undefined, n: number): Set<string> {
  return new Set(topNAggregates(rows, axis, value, n).map((e) => e.name));
}

export const SLICER_MAX_DISTINCT = 200;

/** Distinct values of `axis` narrowed by `query`, capped at `cap` for large data. */
export function slicerDistinctValues(
  rows: Row[],
  axis: string,
  query: string,
  cap = SLICER_MAX_DISTINCT,
): { values: string[]; total: number; truncated: boolean } {
  if (!rows.length || !axis) return { values: [], total: 0, truncated: false };
  const q = query.trim().toLowerCase();
  const all = new Set<string>();
  for (const row of rows) {
    const v = String(row[axis] ?? "(vide)");
    if (q && !v.toLowerCase().includes(q)) continue;
    all.add(v);
  }
  const values = [...all];
  return { values: values.slice(0, cap), total: values.length, truncated: values.length > cap };
}
