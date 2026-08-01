import { useBuilder } from "../store";
import type { WidgetConfig } from "../types";
import { useDatasetData } from "./use-dataset";

export function hasWidgetBinding(c: WidgetConfig | undefined): boolean {
  return !!(c?.datasetSlug && c?.dataValue);
}

/**
 * Unified widget data source. Returns dataset-aggregated series/scalar for a
 * widget bound to an endpoint dataset (datasetSlug + dataValue). Enables
 * dragging columns onto any chart widget.
 */
export function useWidgetData(c: WidgetConfig, widgetId?: string): {
  series: { x: string; v: number }[];
  hasSeries: boolean;
  scalar: number;
  hasScalar: boolean;
  rows: Record<string, unknown>[];
  loading: boolean;
} {
  const ds = useDatasetData(c, widgetId);
  const hasData = !!c.datasetSlug && !!c.dataValue && ds.hasData;

  const series = hasData ? ds.data.map((d) => ({ x: d.name, v: d.value })) : [];
  const hasSeries = hasData;
  const scalar = hasData ? ds.data.reduce((sum, d) => sum + d.value, 0) : 0;
  const hasScalar = hasData;

  return { series, hasSeries, scalar, hasScalar, rows: hasData ? ds.rows : [], loading: false };
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
