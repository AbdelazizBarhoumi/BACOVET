import type { WidgetConfig } from "../types";

export type KpiResult = {
  scalar_value: number | null;
  status: string;
  mapped_rows: Record<string, unknown>[] | null;
  filter_options: Record<string, string[]>;
  computed_at: string | null;
};

export type KpiDataMap = Map<string, KpiResult>;

export function resolveKpiValue(c: WidgetConfig, kpiData?: KpiDataMap): { value: number; hasData: boolean; status: string } {
  const kpiResult = c.kpiCode ? kpiData?.get(c.kpiCode) : undefined;
  const hasData = !!(kpiResult && kpiResult.scalar_value !== null);
  const value = hasData ? kpiResult!.scalar_value! : 0;
  const status = kpiResult?.status ?? "grey";
  return { value, hasData, status };
}

export function resolveKpiSeries(c: WidgetConfig | undefined, kpiData?: KpiDataMap): { series: { x: string; v: number }[]; hasData: boolean } {
  const kpiResult = c?.kpiCode ? kpiData?.get(c.kpiCode) : undefined;
  if (!kpiResult?.mapped_rows?.length) return { series: [], hasData: false };
  const joinKey = Object.keys(kpiResult.mapped_rows[0]).find((k) => k !== "value") ?? "x";
  const series = kpiResult.mapped_rows.map((row) => ({
    x: String(row[joinKey] ?? ""),
    v: Number(row.value ?? 0),
  }));
  return { series, hasData: true };
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

export function kpiLoading() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-xs text-muted-foreground animate-pulse">Chargement…</div>
    </div>
  );
}

export function noSeriesData() {
  return (
    <div className="h-full w-full flex items-center justify-center p-3">
      <div className="text-xs text-muted-foreground text-center">Pas de données série pour ce KPI</div>
    </div>
  );
}

export function noKpiSelected() {
  return (
    <div className="h-full w-full flex items-center justify-center p-3">
      <div className="text-xs text-muted-foreground text-center">Sélectionnez un KPI</div>
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
