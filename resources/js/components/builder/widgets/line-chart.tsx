import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, statusColor, noSeriesData, noKpiSelected, type KpiDataMap } from "./shared";

export function LineChartWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);

  const option = useMemo(() => {
    const xData = series.map((s) => s.x);
    const defaultColor = c.accent ?? "#3b82f6";

    return {
      color: [defaultColor],
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        textStyle: { color: "#374151", fontSize: 12 },
      },
      grid: { left: 8, right: 8, top: 16, bottom: 8, containLabel: true },
      xAxis: {
        type: "category",
        data: xData,
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 10, rotate: series.length > 10 ? 45 : 0 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLabel: { color: "#6b7280", fontSize: 10 },
      },
      series: [{
        type: "line",
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 2, color: defaultColor },
        areaStyle: { opacity: 0.08, color: defaultColor },
        data: series.map((s) => ({
          value: s.v,
          itemStyle: { color: c.target ? statusColor(s.v, c.target) : defaultColor },
        })),
      }],
      ...(c.showTarget && c.target != null ? {
        markLine: {
          silent: true,
          lineStyle: { color: "#ef4444", type: "dashed", width: 1 },
          data: [{ yAxis: c.target, label: { formatter: `Cible: ${c.target}`, fontSize: 10 } }],
        },
      } : {}),
    };
  }, [series, c.accent, c.showTarget, c.target]);

  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());

  return wrap(c, boxStyle(c),
    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge={true} />
  );
}
