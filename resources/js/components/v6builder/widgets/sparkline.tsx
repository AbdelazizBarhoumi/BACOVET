import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, targetColor, noSeriesData, noDataBound, ScalerHeader, MeasureErrorBanner } from "./shared";

export function SparklineWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { series, hasSeries, measureError } = useWidgetData(c, id);

  const option = useMemo(() => {
    const last = series.length ? series[series.length - 1].v : 0;
    const seriesMax = Math.max(...series.map((s) => Math.abs(s.v)), 1);
    const lineColor = c.target ? targetColor(last, c.target, seriesMax) : (c.accent ?? "#3b82f6");

    return {
      color: [lineColor],
      grid: { left: 0, right: 0, top: 4, bottom: 4, containLabel: false },
      xAxis: { type: "category", show: false, data: series.map((s) => s.x) },
      yAxis: { type: "value", show: false },
      series: [{
        type: "line",
        smooth: true,
        symbol: "circle",
        showSymbol: false,
        lineStyle: { width: 2.25, color: lineColor },
        areaStyle: {
          color: {
            type: "linear", x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: `${lineColor}40` }, { offset: 1, color: `${lineColor}00` }],
          },
        },
        data: series.map((s) => s.v),
        markPoint: {
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: lineColor, borderColor: "#fff", borderWidth: 1.5 },
          data: [{ coord: [series.length - 1, last] }],
          label: { show: false },
        },
      }],
    };
  }, [series, c.accent, c.target]);

  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (measureError) return wrap(c, boxStyle(c), <MeasureErrorBanner message={measureError} />);
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());

  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={series} c={c} />
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ height: "100%", width: "100%" }} opts={{ renderer: "canvas" }} notMerge={true} />
      </div>
    </div>
  );
}