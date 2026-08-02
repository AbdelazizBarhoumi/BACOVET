import { TriangleAlert } from "lucide-react";
import { useBuilder } from "../store";
import type { WidgetConfig } from "../types";
import { DATASET_COLORS, useDatasetData, type ScatterPoint } from "./use-dataset";

export function hasWidgetBinding(c: WidgetConfig | undefined): boolean {
  if (!c?.datasetSlug) return false;
  if (c.dataValue || c.dataValues?.length) return true;
  return !!(c.scatterX && c.scatterY);
}

export type MultiSeries = {
  name: string;
  label: string;
  color: string;
  data: { x: string; v: number; tips?: Record<string, string | number> }[];
};

export type VisualSeries = { x: string; v: number; tips: Record<string, string | number> };

/**
 * Unified widget data source. Returns dataset-aggregated series/scalar for a
 * widget bound to an endpoint dataset (datasetSlug + dataValue(s)). Enables
 * dragging columns onto any chart widget, and multiple values → multiple series.
 * When a Legend dimension is bound, multiSeries is split into one series per
 * legend value (Power-BI style). Scatter/bubble widgets get explicit X/Y points.
 */
export function useVisualData(c: WidgetConfig, widgetId?: string): {
  series: VisualSeries[];
  multiSeries: MultiSeries[];
  hasSeries: boolean;
  scalar: number;
  hasScalar: boolean;
  rows: Record<string, unknown>[];
  loading: boolean;
  measureError: string | null;
  /** Per-axis aggregated tooltip fields (aligned with `series`). */
  tips: Record<string, string | number>[];
  /** Scatter/bubble points when config.scatterX/scatterY are bound (empty otherwise). */
  scatterPoints: ScatterPoint[];
} {
  const ds = useDatasetData(c, widgetId);
  const hasValues = !!c.dataValue || !!c.dataValues?.length;
  const hasScatter = !!c.scatterX && !!c.scatterY;
  const hasData = !!c.datasetSlug && (hasValues || hasScatter) && ds.hasData;

  const series: VisualSeries[] = hasData
    ? ds.multi.map((d) => ({ x: d.name, v: d.value, tips: d.tips }))
    : [];
  const multiSeries: MultiSeries[] = hasData
    ? (ds.legendSeries.length
        ? ds.legendSeries
        : ds.valueFields.map((vf, i) => ({
            name: vf.key,
            label: vf.label,
            color: DATASET_COLORS[i % DATASET_COLORS.length],
            data: ds.multi.map((d) => ({ x: d.name, v: d.values[vf.key] ?? 0, tips: d.tips })),
          })))
    : [];
  const hasSeries = hasData;
  const scalar = hasData ? ds.multi.reduce((sum, d) => sum + d.value, 0) : 0;
  const hasScalar = hasData;

  return {
    series,
    multiSeries,
    hasSeries,
    scalar,
    hasScalar,
    rows: hasData ? ds.rows : [],
    loading: false,
    measureError: ds.measureError,
    tips: hasData ? ds.multi.map((d) => d.tips) : [],
    scatterPoints: hasData ? ds.scatterPoints : [],
  };
}

/** Legacy alias kept for existing callers. */
export const useWidgetData = useVisualData;

export const LEGEND_COLORS = DATASET_COLORS;

/** Cyclic legend color for a series index. */
export function legendColorFor(seriesIndex: number): string {
  return LEGEND_COLORS[seriesIndex % LEGEND_COLORS.length];
}

/** Display label for a legend series. */
export function legendValueFor(ms: MultiSeries): string {
  return ms.label;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Recharts <Tooltip content={...}> rendering the chart's bound fields plus any
 * config.dataTooltips extras aggregated per axis group.
 */
export function WidgetTooltip({ active, payload, label }: { active?: boolean; payload?: unknown[]; label?: unknown }) {
  if (!active || !payload?.length) return null;
  const row = (payload[0] as { payload?: Record<string, unknown> })?.payload;
  const tips = row?.tips as Record<string, string | number> | undefined;
  return (
    <div className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] shadow-lg">
      {label != null && String(label) !== "" && <div className="mb-1 font-semibold text-foreground">{String(label)}</div>}
      {payload.map((entry, i) => {
        const e = entry as { name?: string; value?: unknown; color?: string };
        const valueText = Array.isArray(e.value) ? e.value.map((v) => String(v)).join(" · ") : String(e.value ?? "");
        return (
          <div key={i} className="flex items-center gap-1.5 text-foreground">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color }} />
            <span>{e.name}</span>
            <span className="ml-auto pl-3 font-mono tabular-nums">{valueText}</span>
          </div>
        );
      })}
      {tips &&
        Object.entries(tips).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-2 shrink-0" />
            <span>{key}</span>
            <span className="ml-auto pl-3 font-mono tabular-nums">{String(value)}</span>
          </div>
        ))}
    </div>
  );
}

/**
 * ECharts tooltip formatter: renders the hovered series plus any
 * config.dataTooltips extras carried on the data item's `tips` field.
 */
export function widgetTooltipFormatter() {
  return (params: unknown): string => {
    const arr = Array.isArray(params) ? params : [params];
    const p0 = arr[0] as { name?: unknown };
    const lines: string[] = [];
    if (p0?.name != null && String(p0.name) !== "") {
      lines.push(`<div style="font-weight:600;margin-bottom:4px">${escapeHtml(String(p0.name))}</div>`);
    }
    for (const p of arr) {
      const pp = p as { seriesName?: unknown; value?: unknown; color?: unknown; data?: unknown };
      const raw = pp.value;
      const val = Array.isArray(raw) ? raw[raw.length - 1] : raw;
      lines.push(
        `<div style="display:flex;gap:8px;align-items:center">
          <span style="width:8px;height:8px;border-radius:50%;display:inline-block;background:${escapeHtml(String(pp.color ?? "#ccc"))}"></span>
          <span>${escapeHtml(String(pp.seriesName ?? ""))}</span>
          <span style="margin-left:auto;padding-left:14px;font-variant-numeric:tabular-nums">${escapeHtml(String(val ?? ""))}</span>
        </div>`,
      );
      const tips = (pp.data as { tips?: Record<string, string | number> } | undefined)?.tips;
      if (tips) {
        for (const [key, value] of Object.entries(tips)) {
          lines.push(
            `<div style="display:flex;gap:8px;align-items:center;color:#6b7280">
              <span style="width:8px"></span>
              <span>${escapeHtml(key)}</span>
              <span style="margin-left:auto;padding-left:14px;font-variant-numeric:tabular-nums">${escapeHtml(String(value))}</span>
            </div>`,
          );
        }
      }
    }
    return `<div style="font-size:12px;color:#374151;line-height:1.7">${lines.join("")}</div>`;
  };
}

/** Widget-sized inline warning when a bound measure formula is invalid or references a deleted column. */
export function MeasureErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
      <TriangleAlert className="size-5 shrink-0 text-amber-500" />
      <div className="max-w-[90%] text-[11px] font-medium text-amber-700">{message}</div>
      <div className="text-[10px] text-muted-foreground">Corrigez la formule de la mesure dans le panneau Data.</div>
    </div>
  );
}

/** Extract a category label from an ECharts click event (no `any`). */
export function echartsClickLabel(params: unknown): string | null {
  if (!params || typeof params !== "object") return null;
  const p = params as { name?: unknown; seriesType?: string };
  return p.name == null ? null : String(p.name);
}

/** Extract a category label from a recharts click event (no `any`). */
export function rechartClickLabel(e: unknown): string | null {
  if (!e || typeof e !== "object") return null;
  const obj = e as Record<string, unknown>;
  const label = obj.activeLabel ?? obj.name;
  return label == null ? null : String(label);
}

/** Cross-filter helpers: which points to dim on the source chart and which to click. */
export function useCrossFilter(c: WidgetConfig, widgetId?: string): {
  active: boolean;
  isDimmed: (name: string) => boolean;
  click: (name: string) => void;
} {
  const { crossFilter, applyCrossFilter, datasets } = useBuilder();
  const ds = datasets.find((item) => item.slug === c.datasetSlug);
  const hasColumn = !!ds?.columns?.some((col) => col.name === crossFilter?.column);
  const reacts = c.interaction !== "none";
  const active = !!crossFilter && !!widgetId && !!c.datasetSlug && hasColumn && reacts;
  const isDimmed = (name: string) => active && String(name) !== crossFilter!.value;
  const click = (name: string) => {
    if (!c.dataAxis || c.interaction === "none") return;
    const mode: "filter" | "highlight" = c.interaction === "highlight" ? "highlight" : "filter";
    applyCrossFilter(widgetId ?? "", c.dataAxis, String(name), mode);
  };
  return { active, isDimmed, click };
}

export const SHADOW: Record<NonNullable<WidgetConfig["shadow"]>, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.12)",
  md: "0 4px 8px rgba(0,0,0,0.16)",
  lg: "0 10px 22px rgba(0,0,0,0.20)",
  xl: "0 24px 48px rgba(0,0,0,0.28)",
};

export const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#14b8a6"];

export function boxStyle(c: WidgetConfig): React.CSSProperties {
  const transforms: string[] = [];
  if (c.rotate) transforms.push(`rotate(${c.rotate}deg)`);
  if (c.scale && c.scale !== 1) transforms.push(`scale(${c.scale})`);
  return {
    background: c.bgGradient || c.bg,
    color: c.fg,
    borderColor: c.borderColor,
    borderWidth: c.borderWidth,
    borderStyle: c.borderStyle || (c.borderWidth ? "solid" : undefined),
    borderRadius: c.radius,
    padding: c.padding,
    opacity: c.opacity,
    boxShadow: c.shadow && c.shadow !== "none" ? SHADOW[c.shadow] : undefined,
    fontFamily: c.fontFamily,
    fontWeight: c.fontWeight,
    fontSize: c.fontSize,
    lineHeight: c.lineHeight,
    letterSpacing: c.letterSpacing,
    transform: transforms.length ? transforms.join(" ") : undefined,
    height: "100%",
    width: "100%",
    overflow: "hidden",
  };
}

export function wrap(c: WidgetConfig, style: React.CSSProperties, child: React.ReactNode) {
  const hasLabel = c.showLabel !== false && !!c.label;
  const labelPos = c.labelPosition ?? "top";
  const labelStyle: React.CSSProperties = {
    fontSize: c.labelFontSize ?? 10,
    textTransform: c.labelTransform ?? "uppercase",
    letterSpacing: "0.1em",
    color: c.labelColor,
    textAlign: c.labelAlign,
  };
  const labelEl = hasLabel ? (
    <div className="shrink-0" style={labelStyle}>{c.label}</div>
  ) : null;

  if (labelPos === "overlay") {
    return (
      <div className="h-full w-full relative" style={style}>
        <div className="flex-1 min-h-0">{child}</div>
        {labelEl && (
          <div className="absolute bottom-2 left-2 right-2 z-10" style={{ ...labelStyle, textAlign: labelStyle.textAlign ?? "left" }}>{c.label}</div>
        )}
      </div>
    );
  }

  if (labelPos === "bottom") {
    return (
      <div className="h-full w-full flex flex-col" style={style}>
        <div className="flex-1 min-h-0">{child}</div>
        {labelEl}
      </div>
    );
  }

  // "top" (default) or "inside"
  return (
    <div className="h-full w-full flex flex-col" style={style}>
      {labelPos === "top" && labelEl}
      <div className="flex-1 min-h-0 relative">
        {child}
        {labelPos === "inside" && hasLabel && (
          <div className="absolute bottom-2 left-2 right-2 z-10" style={{ ...labelStyle, textAlign: labelStyle.textAlign ?? "left" }}>{c.label}</div>
        )}
      </div>
    </div>
  );
}

export function noSeriesData() {
  return (
    <div className="h-full w-full flex items-center justify-center p-3">
      <div className="text-xs text-muted-foreground text-center">Pas de données série</div>
    </div>
  );
}

export function noDataBound() {
  return (
    <div className="h-full w-full flex items-center justify-center p-3">
      <div className="text-xs text-muted-foreground text-center">Glissez une colonne depuis le panneau Data</div>
    </div>
  );
}

export function statusColor(value: number, target?: number): string {
  if (!target) return "";
  if (value >= target) return "#22c55e";
  if (value >= target * 0.9) return "#f59e0b";
  return "#ef4444";
}

// ─── Gradient / continuous target-scale helpers ───
// A single red → amber → green scale used everywhere a value is judged
// against a target (or, absent a target, against the rest of its series).
// This replaces flat 3-bucket coloring with a continuous hue so every bar,
// line point, or cell reads as "how close to target" at a glance.

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex([ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]);
}

export function lighten(hex: string, amt: number): string {
  return mixHex(hex, "#ffffff", amt);
}

export function darken(hex: string, amt: number): string {
  return mixHex(hex, "#000000", amt);
}

const SCALE_RED = "#ef4444";
const SCALE_AMBER = "#f59e0b";
const SCALE_GREEN = "#22c55e";

/** Continuous red → amber → green color for t in [0,1]. */
export function colorAt(t: number): string {
  const tt = Math.min(1, Math.max(0, t));
  return tt <= 0.5 ? mixHex(SCALE_RED, SCALE_AMBER, tt / 0.5) : mixHex(SCALE_AMBER, SCALE_GREEN, (tt - 0.5) / 0.5);
}

/**
 * Where a value sits on the red→green scale: anchored to `target` (value
 * reaches full green a little past target) when one is set, otherwise
 * anchored to the tallest value in the series so the scale is still
 * meaningful without an explicit target.
 */
export function scalePosition(value: number, target: number | undefined, seriesMax: number): number {
  const max = target ? target * 1.15 : seriesMax || 1;
  return max > 0 ? value / max : 0;
}

/** Solid status color for a value, continuous rather than 3-bucket. */
export function targetColor(value: number, target: number | undefined, seriesMax: number): string {
  return colorAt(scalePosition(value, target, seriesMax));
}

/** ECharts itemStyle.color: vertical gradient (light top → saturated bottom), hue from targetColor. */
export function echartsBarGradient(value: number, target: number | undefined, seriesMax: number) {
  const base = targetColor(value, target, seriesMax);
  return {
    type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
    colorStops: [{ offset: 0, color: lighten(base, 0.35) }, { offset: 1, color: base }],
  };
}

/** Per-value {from, to, solid} triples for building <linearGradient> SVG defs in recharts. */
export function barGradientStops(values: number[], target?: number): { from: string; to: string; solid: string }[] {
  const seriesMax = Math.max(...values.map((v) => Math.abs(v)), 1);
  return values.map((v) => {
    const base = targetColor(v, target, seriesMax);
    return { from: lighten(base, 0.35), to: base, solid: base };
  });
}

export function sortDesc<T extends { v: number }>(series: T[]): T[] {
  return [...series].sort((a, b) => b.v - a.v);
}

// ─── Scaler helpers ───

export type ScalerAgg = "Latest" | "First" | "Sum" | "Average" | "Min" | "Max" | "Count";

export function computeScalerValue(series: { v: number }[], agg: ScalerAgg): number {
  const values = series.map((s) => s.v);
  if (values.length === 0) return 0;
  switch (agg) {
    case "Latest": return values[values.length - 1];
    case "First":  return values[0];
    case "Sum":    return values.reduce((a, b) => a + b, 0);
    case "Average": return values.reduce((a, b) => a + b, 0) / values.length;
    case "Min":    return Math.min(...values);
    case "Max":    return Math.max(...values);
    case "Count":  return values.length;
  }
}

export function computePercentageChange(series: { v: number }[]): number | null {
  if (series.length < 2) return null;
  const latest = series[series.length - 1].v;
  const prev = series[series.length - 2].v;
  if (prev === 0) return null;
  return ((latest - prev) / Math.abs(prev)) * 100;
}

function formatPercentage(percentage: number | null): string {
  if (percentage === null) return "--";
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
}

export function ScalerHeader({ series, c }: { series: { x: string; v: number }[]; c: WidgetConfig }) {
  if (c.showScaler === false) return null;
  if (series.length === 0) return null;

  const agg = c.scalerAggregation ?? "Latest";
  const scalerValue = computeScalerValue(series, agg);
  const pct = computePercentageChange(series);
  const latestDate = series[series.length - 1].x;
  const decimals = c.decimals ?? 1;

  return (
    <div className="shrink-0 px-1 pt-1">
      <div className="flex items-center justify-between">
        {c.label && (
          <span className="text-[10px] text-muted-foreground truncate">{c.label}</span>
        )}
        <span className={`text-[10px] font-mono font-medium tabular-nums ${pct !== null && pct >= 0 ? "text-emerald-600" : pct !== null ? "text-red-500" : "text-muted-foreground"}`}>
          {formatPercentage(pct)}
        </span>
      </div>
      <div className="flex items-baseline justify-between mt-0.5">
        <span className="text-lg font-bold leading-none text-foreground tabular-nums">
          {scalerValue.toFixed(decimals)}
          {c.unit && <span className="text-xs ml-0.5 font-medium text-muted-foreground">{c.unit}</span>}
          <span className="text-[9px] ml-1 font-medium uppercase text-muted-foreground">{agg}</span>
        </span>
        <span className="text-[10px] text-muted-foreground">{latestDate}</span>
      </div>
    </div>
  );
}