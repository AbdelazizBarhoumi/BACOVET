import ReactECharts from "echarts-for-react";
import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, useCrossFilter, echartsClickLabel, lighten, widgetTooltipFormatter, noSeriesData, noDataBound, ScalerHeader, MeasureErrorBanner } from "./shared";

export function RadarChartWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { series, multiSeries, hasSeries, measureError } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);

  const option = useMemo(() => {
    const maxVal = Math.max(...series.map((s) => s.v), 1) * 1.2;
    const accent = c.accent ?? "#3b82f6";
    const dimmed = series.some((s) => isDimmed(s.x));

    return {
      color: [accent, ...multiSeries.slice(1).map((ms) => ms.color)],
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
        trigger: "item",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        textStyle: { color: "#374151", fontSize: 12 },
        formatter: widgetTooltipFormatter(),
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
        data: multiSeries.map((ms, i) => {
          const color = i === 0 ? accent : ms.color;
          return {
            value: ms.data.map((s) => s.v),
            name: ms.label,
            symbol: "circle",
            symbolSize: 5,
            areaStyle: multiSeries.length > 1 ? undefined : {
              color: {
                type: "radial" as const, x: 0.5, y: 0.5, r: 0.8,
                colorStops: [{ offset: 0, color: `${lighten(color, 0.3)}66` }, { offset: 1, color: `${color}22` }],
              },
            },
            lineStyle: { width: 2, color },
            itemStyle: { color, opacity: dimmed ? 0.25 : 1 },
          };
        }),
      }],
    };
  }, [series, multiSeries, c.accent, isDimmed]);

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