import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, useCrossFilter, echartsClickLabel, targetColor, noSeriesData, noDataBound, ScalerHeader, MeasureErrorBanner } from "./shared";

export function LineChartWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { series, multiSeries, hasSeries, measureError } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);

  const option = useMemo(() => {
    const xData = series.map((s) => s.x);
    const defaultColor = c.accent ?? "#3b82f6";
    const seriesMax = Math.max(...series.map((s) => Math.abs(s.v)), 1);
    const chartSeries = multiSeries.map((ms, i) => {
      const color = i === 0 ? defaultColor : ms.color;
      return {
        name: ms.label,
        type: "line" as const,
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 2.5, color },
        areaStyle: multiSeries.length > 1 ? undefined : {
          color: {
            type: "linear" as const, x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: `${color}30` }, { offset: 1, color: `${color}00` }],
          },
        },
        data: ms.data.map((s) => ({
          value: s.v,
          itemStyle: {
            color: multiSeries.length === 1 && c.target ? targetColor(s.v, c.target, seriesMax) : color,
            opacity: isDimmed(s.x) ? 0.2 : 1,
          },
        })),
      };
    });

    return {
      color: [defaultColor, ...multiSeries.slice(1).map((ms) => ms.color)],
      ...(multiSeries.length > 1 ? {
        legend: {
          show: true,
          top: 0,
          textStyle: { fontSize: 11, color: "#6b7280" },
          itemWidth: 16,
          itemHeight: 8,
        },
      } : {}),
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        textStyle: { color: "#374151", fontSize: 12 },
        axisPointer: { type: "line", lineStyle: { color: "#cbd5e1" } },
      },
      grid: { left: 8, right: 8, top: multiSeries.length > 1 ? 32 : 16, bottom: 8, containLabel: true },
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
      series: chartSeries,
      ...(c.showTarget && c.target != null ? {
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "#ef4444", type: "dashed", width: 1.5 },
          label: { fontSize: 10, color: "#ef4444" },
          data: [{ yAxis: c.target, label: { formatter: `Cible: ${c.target}` } }],
        },
      } : {}),
    };
  }, [series, multiSeries, c.accent, c.showTarget, c.target, isDimmed]);

  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (measureError) return wrap(c, boxStyle(c), <MeasureErrorBanner message={measureError} />);
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());

  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={series} c={c} />
      <div className="flex-1 min-h-0">
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
          notMerge={true}
          onEvents={{ click: (params: unknown) => { const n = echartsClickLabel(params); if (n != null) click(n); } }}
        />
      </div>
    </div>
  );
}
