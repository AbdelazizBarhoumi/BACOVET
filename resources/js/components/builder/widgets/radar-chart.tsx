import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, lighten, noSeriesData, noKpiSelected, ScalerHeader, type KpiDataMap } from "./shared";

export function RadarChartWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);

  const option = useMemo(() => {
    const maxVal = Math.max(...series.map((s) => s.v), 1) * 1.2;
    const accent = c.accent ?? "#3b82f6";

    return {
      color: [accent],
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        textStyle: { color: "#374151", fontSize: 12 },
      },
      radar: {
        indicator: series.map((s) => ({ name: s.x, max: maxVal })),
        radius: "62%",
        axisName: { color: "#6b7280", fontSize: 10 },
        splitLine: { lineStyle: { color: "#e5e7eb" } },
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        splitArea: {
          areaStyle: { color: ["#fafbfc", "#f3f4f6"] },
        },
      },
      series: [{
        type: "radar",
        data: [{
          value: series.map((s) => s.v),
          name: c.label ?? "Value",
          symbol: "circle",
          symbolSize: 5,
          areaStyle: {
            color: {
              type: "radial", x: 0.5, y: 0.5, r: 0.8,
              colorStops: [{ offset: 0, color: `${lighten(accent, 0.3)}66` }, { offset: 1, color: `${accent}22` }],
            },
          },
          lineStyle: { width: 2, color: accent },
          itemStyle: { color: accent },
        }],
      }],
    };
  }, [series, c.accent, c.label]);

  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());

  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={series} c={c} />
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge={true} />
      </div>
    </div>
  );
}
