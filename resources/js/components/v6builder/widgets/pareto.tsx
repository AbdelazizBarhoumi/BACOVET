import { ParetoChart } from "@/components/v1/primitives";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, targetColor, noSeriesData, noDataBound, ScalerHeader, MeasureErrorBanner } from "./shared";

export function ParetoWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { series, hasSeries, measureError } = useWidgetData(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (measureError) return wrap(c, boxStyle(c), <MeasureErrorBanner message={measureError} />);
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());

  const seriesMax = Math.max(...series.map((s) => Math.abs(s.v)), 1);

  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={series} c={c} />
      <div className="flex-1 min-h-0">
        <ParetoChart
          data={series.map((s) => ({ label: s.x, v: s.v, color: targetColor(s.v, c.target, seriesMax, c) }))}
          height={180}
        />
      </div>
    </div>
  );
}