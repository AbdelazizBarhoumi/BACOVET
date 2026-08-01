import { BarKpi } from "@/components/v1/primitives";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, statusColor, noSeriesData, noDataBound, ScalerHeader } from "./shared";

export function BarChartWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { series, hasSeries } = useWidgetData(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());

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
