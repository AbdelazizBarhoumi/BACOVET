import { BarKpi } from "@/components/v1/primitives";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, statusColor, noSeriesData, noKpiSelected, ScalerHeader, type KpiDataMap } from "./shared";

export function BarChartWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);
  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());

  const coloredSeries = series.map((s) => ({
    ...s,
    color: c.target ? statusColor(s.v, c.target) : undefined,
  }));

  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={series} c={c} />
      <div className="flex-1 min-h-0">
        <BarKpi data={coloredSeries} color={c.accent ?? "#ec4899"} target={c.showTarget ? c.target : undefined} height={160} />
      </div>
    </div>
  );
}
