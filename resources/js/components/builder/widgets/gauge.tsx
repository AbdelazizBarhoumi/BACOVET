import { useMemo } from "react";
import ReactECharts from "echarts-for-react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiValue, statusColor, type KpiDataMap } from "./shared";

export function GaugeWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { value, hasData } = resolveKpiValue(c, kpiData);
  const min = c.gaugeMin ?? 0;
  const max = c.gaugeMax ?? (c.target ? c.target * 1.2 : 100);
  const startAngle = c.gaugeStartAngle ?? 210;
  const endAngle = c.gaugeEndAngle ?? -30;
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const color = c.accent || statusColor(value, c.target) || "#3b82f6";

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
        color: "#111827",
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
