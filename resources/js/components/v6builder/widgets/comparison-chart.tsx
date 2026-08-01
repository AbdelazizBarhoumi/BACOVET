import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, hasWidgetBinding, noDataBound, noSeriesData, useWidgetData, useCrossFilter, rechartClickLabel, ScalerHeader, wrap } from "./shared";

const COLORS = ["#3b82f6", "#22c55e", "#ec4899", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#14b8a6"];

export type ComparisonChartType = "column" | "stackedColumn" | "stacked100Column" | "stacked100Bar" | "ribbon";

export function ComparisonChartWidget({ type, c, id }: { type: ComparisonChartType; c: WidgetConfig; id?: string }) {
  const { series, hasSeries } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);

  const data = useMemo(
    () => series.map((item) => ({ name: item.x, value: item.v, x: Number(item.x) || 0, y: item.v })),
    [series],
  );

  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (!hasSeries || !data.length) return wrap(c, boxStyle(c), noSeriesData());

  const horizontal = type === "stacked100Bar";
  const is100 = type === "stacked100Column" || type === "stacked100Bar";
  const stacked = type === "stackedColumn" || type === "stacked100Column" || type === "stacked100Bar";
  const chartData = is100 ? toPercent(data) : data;
  const accent = c.accent ?? COLORS[0];

  const dimOpacity = (name: string) => (isDimmed(name) ? 0.2 : 1);

  if (type === "ribbon") {
    return wrap(c, boxStyle(c), <div className="flex h-full min-h-0 flex-col"><ScalerHeader series={series} c={c} /><div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} onClick={(e: unknown) => { const n = rechartClickLabel(e); if (n != null) click(n); }}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip />{c.analyticsAverage && <ReferenceLine y={data.reduce((s, d) => s + d.value, 0) / (data.length || 1)} stroke="#f59e0b" strokeDasharray="4 4" />}<Area type="monotone" dataKey="value" name="value" fill={accent} fillOpacity={0.25} stroke={accent} strokeWidth={2} opacity={1}>{data.map((d, i) => <Cell key={i} fillOpacity={dimOpacity(d.name)} />)}</Area></AreaChart></ResponsiveContainer></div></div>);
  }

  return wrap(c, boxStyle(c), <div className="flex h-full min-h-0 flex-col"><ScalerHeader series={series} c={c} /><div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%">
    <BarChart data={chartData} layout={horizontal ? "vertical" : "horizontal"} onClick={(e: unknown) => { const n = rechartClickLabel(e); if (n != null) click(n); }}>
      <CartesianGrid stroke="var(--border)" vertical={horizontal} horizontal={!horizontal} />
      {horizontal ? (
        <>
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
        </>
      ) : (
        <>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
        </>
      )}
      <Tooltip />
      {c.analyticsAverage && <ReferenceLine y={data.reduce((s, d) => s + d.value, 0) / (data.length || 1)} stroke="#f59e0b" strokeDasharray="4 4" />}
      {c.analyticsConstant !== undefined && <ReferenceLine y={c.analyticsConstant} stroke="#ef4444" strokeDasharray="6 3" />}
      <Bar dataKey="value" stackId={stacked ? "stack" : undefined} fill={accent} radius={stacked ? [2, 2, 0, 0] : [4, 4, 0, 0]}>
        {data.map((d, i) => <Cell key={i} fill={accent} fillOpacity={dimOpacity(d.name)} />)}
      </Bar>
    </BarChart>
  </ResponsiveContainer></div></div>);
}

function toPercent(data: { name: string; value: number }[]): { name: string; value: number }[] {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  return data.map((d) => ({ ...d, value: (d.value / total) * 100 }));
}
