import { useId } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, targetColor, noSeriesData, noDataBound, ScalerHeader, MeasureErrorBanner } from "./shared";

export function BarChartWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const gradId = useId().replace(/:/g, "");
  const { series, multiSeries, hasSeries, measureError } = useWidgetData(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (measureError) return wrap(c, boxStyle(c), <MeasureErrorBanner message={measureError} />);
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());

  const seriesMax = Math.max(...series.map((s) => Math.abs(s.v)), 1);
  const gid = (i: number) => `bar-grad-${gradId}-${i}`;
  const data = multiSeries.length
    ? multiSeries[0].data.map((row, i) => ({
        name: row.x,
        ...Object.fromEntries(multiSeries.map((ms) => [ms.name, ms.data[i]?.v ?? 0])),
      }))
    : [];

  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={series} c={c} />
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 14, right: 16, left: 0, bottom: 0 }}>
            <defs>
              {multiSeries.map((ms, i) => {
                const base = ms.color;
                return (
                  <linearGradient key={i} id={gid(i)} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={base} stopOpacity={0.75} />
                    <stop offset="100%" stopColor={base} stopOpacity={0.35} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e5e7eb" }} />
            {multiSeries.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {multiSeries.length === 1 ? (
              <Bar dataKey={multiSeries[0].name} name={multiSeries[0].label} fill={c.accent ?? "#ec4899"} radius={[4, 4, 0, 0]}>
                {multiSeries[0].data.map((s, i) => (
                  <Cell key={i} fill={targetColor(s.v, c.target, seriesMax)} />
                ))}
              </Bar>
            ) : (
              multiSeries.map((ms, i) => (
                <Bar key={ms.name} dataKey={ms.name} name={ms.label} fill={`url(#${gid(i)})`} radius={[4, 4, 0, 0]} />
              ))
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
