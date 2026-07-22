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

export function resolveKpiSeries(c: WidgetConfig, kpiData?: KpiDataMap): { series: { x: string; v: number }[]; hasData: boolean } {
  const kpiResult = c.kpiCode ? kpiData?.get(c.kpiCode) : undefined;
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
    marginTop: c.marginTop,
    marginBottom: c.marginBottom,
    marginLeft: c.marginLeft,
    marginRight: c.marginRight,
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
  return (
    <div className="h-full w-full flex flex-col" style={style}>
      {c.showLabel !== false && c.label && (
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 shrink-0">{c.label}</div>
      )}
      <div className="flex-1 min-h-0">{child}</div>
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
