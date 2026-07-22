import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, noSeriesData, noKpiSelected, type KpiDataMap } from "./shared";

export function SparklineWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);

  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());

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

  return wrap(c, boxStyle(c),
    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge={true} />
  );
}
