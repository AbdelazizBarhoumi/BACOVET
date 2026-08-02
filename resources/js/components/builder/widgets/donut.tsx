import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiValue, targetColor, lighten, noKpiSelected, type KpiDataMap } from "./shared";

export function DonutWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { value, hasData } = resolveKpiValue(c, kpiData);
  const remainder = 100 - value;

  const mainColor = c.target ? targetColor(value, c.target, 100) : c.accent ?? "#3b82f6";

  const option = useMemo(() => ({
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255,255,255,0.95)",
      borderColor: "#e5e7eb",
      textStyle: { color: "#374151", fontSize: 12 },
    },
    series: [{
      type: "pie",
      radius: ["45%", "70%"],
      center: ["50%", "55%"],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
      label: { show: false },
      emphasis: {
        scale: true,
        scaleSize: 4,
        label: { show: true, fontSize: 14, fontWeight: "bold" },
      },
      labelLine: { show: false },
      data: [
        {
          value,
          name: c.label ?? "Value",
          itemStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 1, y2: 1,
              colorStops: [{ offset: 0, color: lighten(mainColor, 0.25) }, { offset: 1, color: mainColor }],
            },
            shadowColor: `${mainColor}55`,
            shadowBlur: 8,
          },
        },
        ...(remainder > 0 ? [{ value: remainder, name: "Reste", itemStyle: { color: "#eef1f5" } }] : []),
      ],
    }],
    graphic: [{
      type: "text",
      left: "center",
      top: "48%",
      style: {
        text: !hasData ? "—" : `${value.toFixed(c.decimals ?? 0)}%`,
        textAlign: "center",
        fill: !hasData ? "#94a3b8" : "#111827",
        fontSize: 22,
        fontWeight: "bold",
      },
    }],
  }), [value, remainder, c.label, c.decimals, hasData, mainColor]);

  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());

  return wrap(c, boxStyle(c),
    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge={true} />
  );
}
