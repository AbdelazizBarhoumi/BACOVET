import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, useCrossFilter, echartsClickLabel, statusColor, noSeriesData, noDataBound, ScalerHeader } from "./shared";

export function ComboChartWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { series, hasSeries } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);

  const option = useMemo(() => {
    const xData = series.map((s) => s.x);
    const defaultColor = c.accent ?? "#3b82f6";

    return {
      color: [defaultColor, "#ef4444"],
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        textStyle: { color: "#374151", fontSize: 12 },
      },
      legend: {
        show: true,
        top: 0,
        textStyle: { fontSize: 11, color: "#6b7280" },
        itemWidth: 16,
        itemHeight: 8,
      },
      grid: { left: 8, right: 8, top: 32, bottom: 8, containLabel: true },
      xAxis: {
        type: "category",
        data: xData,
        axisLine: { lineStyle: { color: "#e5e7eb" } },
        axisLabel: { color: "#6b7280", fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        splitLine: { lineStyle: { color: "#f3f4f6" } },
        axisLabel: { color: "#6b7280", fontSize: 10 },
      },
      series: [
        {
          name: "Valeur",
          type: "bar",
          barMaxWidth: 32,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          data: series.map((s) => ({
            value: s.v,
            itemStyle: {
              color: c.target ? statusColor(s.v, c.target) : defaultColor,
              opacity: isDimmed(s.x) ? 0.2 : 1,
            },
          })),
        },
        ...(c.showTarget && c.target != null ? [{
          name: "Cible",
          type: "line",
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#ef4444", type: "dashed", width: 2 },
          data: series.map(() => c.target),
        }] : []),
      ],
    };
  }, [series, c.accent, c.showTarget, c.target, isDimmed]);

  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
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
