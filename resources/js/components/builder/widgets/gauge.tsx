import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiValue, type KpiDataMap } from "./shared";

function resolveGaugeColor(value: number, hasData: boolean, kpiResult?: { status: string }, target?: number): string {
  if (!hasData) return "#3b82f6";
  const dbStatus = kpiResult?.status;
  if (dbStatus === "green") return "#22c55e";
  if (dbStatus === "orange") return "#f59e0b";
  if (dbStatus === "red") return "#ef4444";
  if (target) {
    if (value >= target) return "#22c55e";
    if (value >= target * 0.9) return "#f59e0b";
    return "#ef4444";
  }
  return "#3b82f6";
}

export function GaugeWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const kpiResult = c.kpiCode ? kpiData?.get(c.kpiCode) : undefined;
  const { value, hasData } = resolveKpiValue(c, kpiData);
  const min = c.gaugeMin ?? 0;
  const max = c.gaugeMax ?? (c.target ? c.target * 1.2 : 100);
  const startAngle = c.gaugeStartAngle ?? 210;
  const endAngle = c.gaugeEndAngle ?? -30;

  const color = resolveGaugeColor(value, hasData, kpiResult, c.target);

  const option = useMemo(() => ({
    series: [{
      type: "gauge",
      startAngle,
      endAngle,
      min,
      max,
      splitNumber: 5,
      radius: "90%",
      center: ["50%", "55%"],
      itemStyle: { color },
      progress: { show: true, width: 18 },
      pointer: { show: true, length: "60%", width: 4 },
      axisLine: { lineStyle: { width: 18, color: [[1, "#e5e7eb"]] } },
      axisTick: { show: false },
      splitLine: { length: 10, lineStyle: { width: 2, color: "#999" } },
      axisLabel: { distance: 20, fontSize: 10, color: "#6b7280" },
      title: { show: false },
      detail: {
        valueAnimation: true,
        fontSize: 28,
        fontWeight: "bold",
        color,
        offsetCenter: [0, "60%"],
        formatter: () => !c.kpiCode
          ? "Sélectionnez un KPI"
          : !hasData ? "—"
          : `${value.toFixed(c.decimals ?? 1).replace(".", ",")}${c.unit ?? ""}`,
      },
      data: [{ value }],
    }],
  }), [value, min, max, startAngle, endAngle, color, c.decimals, c.unit, hasData, c.kpiCode]);

  const content = (
    <div className="relative w-full h-full">
      <ReactECharts option={option} style={{ height: "100%", width: "100%" }} />
    </div>
  );

  return wrap(c, boxStyle(c), content);
}
