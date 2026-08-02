import { BarKpi } from "@/components/v1/primitives";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, targetColor, noSeriesData, noKpiSelected, ScalerHeader, type KpiDataMap } from "./shared";

export function BarChartWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);
  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());

  const seriesMax = Math.max(...series.map((s) => Math.abs(s.v)), 1);
  const coloredSeries = series.map((s) => ({
    ...s,
    color: targetColor(s.v, c.target, seriesMax),
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
