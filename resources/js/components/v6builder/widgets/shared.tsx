import { useBuilder } from "../store";
import type { WidgetConfig } from "../types";
import { DATASET_COLORS, useDatasetData } from "./use-dataset";

export function hasWidgetBinding(c: WidgetConfig | undefined): boolean {
  return !!(c?.datasetSlug && (c.dataValue || c.dataValues?.length));
}

export type MultiSeries = {
  name: string;
  label: string;
  color: string;
  data: { x: string; v: number }[];
};

/**
 * Unified widget data source. Returns dataset-aggregated series/scalar for a
 * widget bound to an endpoint dataset (datasetSlug + dataValue(s)). Enables
 * dragging columns onto any chart widget, and multiple values → multiple series.
 */
export function useWidgetData(c: WidgetConfig, widgetId?: string): {
  series: { x: string; v: number }[];
  multiSeries: MultiSeries[];
  hasSeries: boolean;
  scalar: number;
  hasScalar: boolean;
  rows: Record<string, unknown>[];
  loading: boolean;
} {
  const ds = useDatasetData(c, widgetId);
  const hasData = !!c.datasetSlug && (!!c.dataValue || !!c.dataValues?.length) && ds.hasData;

  const series = hasData ? ds.data.map((d) => ({ x: d.name, v: d.value })) : [];
  const multiSeries: MultiSeries[] = hasData
    ? ds.valueFields.map((vf, i) => ({
        name: vf.key,
        label: vf.label,
        color: DATASET_COLORS[i % DATASET_COLORS.length],
        data: ds.multi.map((d) => ({ x: d.name, v: d.values[vf.key] ?? 0 })),
      }))
    : [];
  const hasSeries = hasData;
  const scalar = hasData ? ds.data.reduce((sum, d) => sum + d.value, 0) : 0;
  const hasScalar = hasData;

  return { series, multiSeries, hasSeries, scalar, hasScalar, rows: hasData ? ds.rows : [], loading: false };
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
  const onOther = !!crossFilter && !!widgetId && crossFilter.sourceId !== widgetId && !!c.datasetSlug && hasColumn;
  const active = onOther;
  const isDimmed = (name: string) => active && String(name) !== crossFilter!.value;
  const click = (name: string) => {
    if (!c.dataAxis) return;
    applyCrossFilter(widgetId ?? "", c.dataAxis, String(name));
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