import { Bar, BarChart, Cell, Funnel, FunnelChart, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, Treemap, XAxis, YAxis, CartesianGrid } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, hasWidgetBinding, noDataBound, noSeriesData, rechartClickLabel, useWidgetData, useCrossFilter, ScalerHeader, wrap } from "./shared";

export function AdvancedChartWidget({ type, c, id }: { type: "card" | "funnel" | "treemap" | "waterfall" | "scatter" | "bubble" | "stacked-bar" | "stacked-area"; c: WidgetConfig; id?: string }) {
  const { series, hasSeries, scalar, hasScalar } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (!hasSeries && !hasScalar) return wrap(c, boxStyle(c), noSeriesData());
  const data = series.map((item) => ({ name: item.x, value: item.v, x: Number(item.x) || 0, y: item.v }));

  if (type === "card") {
    const value = hasScalar ? scalar : data[0]?.value;
    return wrap(c, boxStyle(c), <div className="flex h-full flex-col items-center justify-center"><div className="text-4xl font-semibold tabular-nums">{value !== undefined ? Number(value).toLocaleString() : "—"}</div><div className="mt-1 text-[11px] text-muted-foreground">{c.label ?? "Measure"}</div></div>);
  }

  const dim = (name: string) => (isDimmed(name) ? 0.2 : 1);
  const onClick = (e: unknown) => { const n = rechartClickLabel(e); if (n != null) click(n); };

  return wrap(c, boxStyle(c), <div className="flex h-full min-h-0 flex-col"><ScalerHeader series={series} c={c} /><div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%">
    {type === "funnel" ? <FunnelChart onClick={onClick}><Tooltip /><Funnel data={data} dataKey="value" nameKey="name" isAnimationActive={false}><LabelList position="right" fill="var(--foreground)" dataKey="name" /></Funnel></FunnelChart> :
      type === "treemap" ? <Treemap data={data.map((item) => ({ ...item, size: item.value, fill: `rgba(59,130,246,${0.3 + dim(item.name) * 0.5})` }))} dataKey="size" nameKey="name" stroke="var(--card)" /> :
      type === "scatter" || type === "bubble" ? <ScatterChart onClick={onClick}><CartesianGrid stroke="var(--border)" /><XAxis dataKey="x" type="number" /><YAxis dataKey="y" type="number" /><Tooltip /><Scatter data={data.map((d) => ({ ...d, fillOpacity: dim(d.name) }))} fill={c.accent ?? "#3b82f6"} /></ScatterChart> :
      type === "waterfall" ? <BarChart data={data.map((item, index) => ({ ...item, base: data.slice(0, index).reduce((sum, current) => sum + current.value, 0) }))} onClick={onClick}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="base" stackId="total" fill="transparent" /><Bar dataKey="value" stackId="total" fill={c.accent ?? "#3b82f6"} /></BarChart> :
      <BarChart data={data} onClick={onClick}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip />{c.analyticsAverage && <ReferenceLine y={data.reduce((sum, item) => sum + item.value, 0) / (data.length || 1)} stroke="#f59e0b" strokeDasharray="4 4" />}{c.analyticsConstant !== undefined && <ReferenceLine y={c.analyticsConstant} stroke="#ef4444" strokeDasharray="6 3" />}<Bar dataKey="value" stackId={type === "stacked-bar" ? "stack" : undefined} fill={c.accent ?? "#3b82f6"} fillOpacity={1}>{data.map((d, i) => <Cell key={i} fillOpacity={dim(d.name)} />)}</Bar></BarChart>}
  </ResponsiveContainer></div></div>);
}
