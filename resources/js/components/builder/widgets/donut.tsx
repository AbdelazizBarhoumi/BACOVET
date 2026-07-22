import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiValue, statusColor, noKpiSelected, type KpiDataMap } from "./shared";

export function DonutWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { value, hasData } = resolveKpiValue(c, kpiData);
  const remainder = 100 - value;

  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());

  const mainColor = c.target ? statusColor(value, c.target) : c.accent ?? "#3b82f6";

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
      itemStyle: { borderRadius: 4, borderColor: "#fff", borderWidth: 2 },
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: "bold" },
      },
      labelLine: { show: false },
      data: [
        { value, name: c.label ?? "Value", itemStyle: { color: mainColor } },
        ...(remainder > 0 ? [{ value: remainder, name: "Reste", itemStyle: { color: "#e5e7eb" } }] : []),
      ],
    }],
    graphic: [{
      type: "text",
      left: "center",
      top: "48%",
      style: {
        text: !hasData ? "—" : `${value.toFixed(c.decimals ?? 0)}%`,
        textAlign: "center",
        fill: "#111827",
        fontSize: 22,
        fontWeight: "bold",
      },
    }],
  }), [value, remainder, c.label, c.decimals, hasData, mainColor]);

  return wrap(c, boxStyle(c),
    <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge={true} />
  );
}
