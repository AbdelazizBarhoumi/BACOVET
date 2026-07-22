import { BarKpi } from "@/components/v1/primitives";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, statusColor, noSeriesData, noKpiSelected, type KpiDataMap } from "./shared";

export function BarChartWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);
  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());

  const coloredSeries = series.map((s) => ({
    ...s,
    color: c.target ? statusColor(s.v, c.target) : undefined,
  }));

  return wrap(c, boxStyle(c), <BarKpi data={coloredSeries} color={c.accent ?? "#ec4899"} target={c.showTarget ? c.target : undefined} height={160} />);
}
