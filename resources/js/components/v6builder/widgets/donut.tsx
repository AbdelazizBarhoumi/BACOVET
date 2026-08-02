import ReactECharts from "echarts-for-react";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, targetColor, lighten, widgetTooltipFormatter, noDataBound, noSeriesData, MeasureErrorBanner } from "./shared";

export function DonutWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { multiSeries, hasSeries, hasScalar, measureError } = useWidgetData(c, id);

  const values = hasScalar && !multiSeries.length
    ? [{ name: c.label ?? "Value", value: multiSeries.reduce((s, m) => s + m.data.reduce((x, d) => x + d.v, 0), 0), color: c.accent ?? "#3b82f6" }]
    : multiSeries.map((ms) => ({ name: ms.label, value: ms.data.reduce((s, d) => s + d.v, 0), color: ms.color }));

  const multiple = values.length > 1;

  const options = values.map((v) => {
    const mainColor = c.target ? targetColor(v.value, c.target, Math.max(v.value, 1)) : v.color;
    const remainder = 100 - v.value;
    return {
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(255,255,255,0.95)",
        borderColor: "#e5e7eb",
        textStyle: { color: "#374151", fontSize: 12 },
        formatter: widgetTooltipFormatter(),
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
            value: v.value,
            name: v.name,
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
          text: `${v.value.toFixed(c.decimals ?? 0)}%`,
          textAlign: "center",
          fill: "#111827",
          fontSize: multiple ? 14 : 22,
          fontWeight: "bold",
        },
      }],
    };
  });

  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (measureError) return wrap(c, boxStyle(c), <MeasureErrorBanner message={measureError} />);
  if (!hasSeries && !hasScalar) return wrap(c, boxStyle(c), noSeriesData());

  return wrap(c, boxStyle(c),
    <div className="flex h-full w-full flex-col">
      <div className={`flex min-h-0 flex-1 ${multiple ? "grid gap-1" : ""}`} style={multiple ? { gridTemplateColumns: `repeat(${values.length}, 1fr)` } : undefined}>
        {values.map((v, i) => (
          <ReactECharts key={v.name} option={options[i]} style={{ height: "100%", width: "100%" }} opts={{ renderer: "svg" }} notMerge={true} />
        ))}
      </div>
      {multiple && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pb-1">
          {values.map((v) => (
            <span key={v.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: v.color }} />
              {v.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
