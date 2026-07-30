import { ParetoChart } from "@/components/v1/primitives";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, noSeriesData, noKpiSelected, ScalerHeader, type KpiDataMap } from "./shared";

export function ParetoWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);
  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());
  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={series} c={c} />
      <div className="flex-1 min-h-0">
        <ParetoChart data={series.map((s) => ({ label: s.x, v: s.v }))} height={180} />
      </div>
    </div>
  );
}
