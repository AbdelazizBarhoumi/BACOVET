import { ParetoChart } from "@/components/v1/primitives";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, noSeriesData, noKpiSelected, type KpiDataMap } from "./shared";

export function ParetoWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);
  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());
  return wrap(c, boxStyle(c), <ParetoChart data={series.map((s) => ({ label: s.x, v: s.v }))} height={180} />);
}
