import { useId } from "react";
import { Bar, BarChart, Cell, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, hasWidgetBinding, noDataBound, noSeriesData, rechartClickLabel, useWidgetData, useCrossFilter, barGradientStops, WidgetTooltip, ScalerHeader, wrap, MeasureErrorBanner } from "./shared";

export type ComparisonChartType = "column" | "stackedColumn" | "stacked100Column" | "stacked100Bar" | "ribbon";

export function ComparisonChartWidget({ type, c, id }: { type: ComparisonChartType; c: WidgetConfig; id?: string }) {
  const gradId = useId();
  const { series, multiSeries, hasSeries, hasScalar, measureError } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (measureError) return wrap(c, boxStyle(c), <MeasureErrorBanner message={measureError} />);
  if (!hasSeries && !hasScalar) return wrap(c, boxStyle(c), noSeriesData());

  const data = multiSeries.length
    ? multiSeries[0].data.map((row, i) => ({
        name: row.x,
        ...Object.fromEntries(multiSeries.map((ms) => [ms.name, ms.data[i]?.v ?? 0])),
        ...(series[i]?.tips ?? {}),
      }))
    : [];

  const dim = (name: string) => (isDimmed(name) ? 0.2 : 1);
  const onClick = (e: unknown) => { const n = rechartClickLabel(e); if (n != null) click(n); };
  const gradients = barGradientStops(series.map((s) => s.v), c.target, c);
  const gid = (i: number) => `cmp-grad-${gradId}-${i}`;
  const stacked = type === "stackedColumn" || type === "stacked100Column" || type === "stacked100Bar";
  const is100 = type === "stacked100Column" || type === "stacked100Bar";

  return wrap(c, boxStyle(c), <div className="flex h-full min-h-0 flex-col"><ScalerHeader series={series} c={c} /><div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} onClick={onClick}>
      <defs>{gradients.map((g, i) => <linearGradient key={i} id={gid(i)} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={g.from} /><stop offset="100%" stopColor={g.to} /></linearGradient>)}</defs>
      <CartesianGrid stroke="var(--border)" vertical={false} />
      <XAxis dataKey="name" />
      <YAxis {...(is100 ? { domain: [0, 100], unit: "%" } : {})} />
      <Tooltip content={<WidgetTooltip />} />
      {multiSeries.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
      {c.analyticsAverage && <ReferenceLine y={series.reduce((sum, item) => sum + item.v, 0) / (series.length || 1)} stroke="#f59e0b" strokeDasharray="4 4" />}
      {c.analyticsConstant !== undefined && <ReferenceLine y={c.analyticsConstant} stroke="#ef4444" strokeDasharray="6 3" />}
      {multiSeries.map((ms, i) => (
        <Bar key={ms.name} dataKey={ms.name} name={ms.label} stackId={stacked ? "stack" : undefined} radius={[5, 5, 0, 0]} fill={i === 0 ? `url(#${gid(0)})` : ms.color}>
          {multiSeries.length === 1 && series.map((d, j) => <Cell key={j} fill={`url(#${gid(j)})`} fillOpacity={dim(d.x)} />)}
        </Bar>
      ))}
    </BarChart>
  </ResponsiveContainer></div></div>);
}
