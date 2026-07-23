import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, noSeriesData, noKpiSelected, type KpiDataMap } from "./shared";

export function RadarChartWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);

  const option = useMemo(() => {
    const maxVal = Math.max(...series.map((s) => s.v), 1) * 1.2;

    return {
      color: [c.accent ?? "#3b82f6"],
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        textStyle: { color: "#374151", fontSize: 12 },
      },
      radar: {
        indicator: series.map((s) => ({ name: s.x, max: maxVal })),
        radius: "60%",
        axisName: { color: "#6b7280", fontSize: 10 },
        splitArea: {
          areaStyle: {
            color: ["#f9fafb", "#f3f4f6", "#e5e7eb", "#d1d5db"].map((_, i) => (i % 2 === 0 ? "#f9fafb" : "#f3f4f6")),
          },
        },
      },
      series: [{
        type: "radar",
        data: [{
          value: series.map((s) => s.v),
          name: c.label ?? "Value",
          areaStyle: { opacity: 0.2 },
        }],
      }],
    };
  }, [series, c.accent, c.label]);

  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());

  return wrap(c, boxStyle(c),
    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge={true} />
  );
}
