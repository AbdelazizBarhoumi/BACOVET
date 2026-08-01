import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, noSeriesData, noDataBound, ScalerHeader } from "./shared";

export function SparklineWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { series, hasSeries } = useWidgetData(c, id);

  const option = useMemo(() => ({
    color: [c.accent ?? "#3b82f6"],
    grid: { left: 0, right: 0, top: 4, bottom: 4, containLabel: false },
    xAxis: { type: "category", show: false, data: series.map((s) => s.x) },
    yAxis: { type: "value", show: false },
    series: [{
      type: "line",
      smooth: true,
      symbol: "none",
      lineStyle: { width: 2 },
      areaStyle: { opacity: 0.15 },
      data: series.map((s) => s.v),
    }],
  }), [series, c.accent]);

  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());

  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={series} c={c} />
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge={true} />
      </div>
    </div>
  );
}
