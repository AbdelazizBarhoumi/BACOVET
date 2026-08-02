import { useId } from "react";
import { Bar, BarChart, Cell, Legend, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, hasWidgetBinding, noDataBound, noSeriesData, rechartClickLabel, useWidgetData, useCrossFilter, targetColor, barGradientStops, ScalerHeader, wrap } from "./shared";

export function AdvancedChartWidget({ type, c, id }: { type: "card" | "funnel" | "treemap" | "waterfall" | "scatter" | "bubble" | "stacked-bar" | "stacked-area"; c: WidgetConfig; id?: string }) {
  const gradId = useId();
  const { series, multiSeries, hasSeries, scalar, hasScalar } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (!hasSeries && !hasScalar) return wrap(c, boxStyle(c), noSeriesData());
  const data = multiSeries.length
    ? multiSeries[0].data.map((row, i) => ({
        name: row.x,
        ...Object.fromEntries(multiSeries.map((ms) => [ms.name, ms.data[i]?.v ?? 0])),
      }))
    : [];

  if (type === "card") {
    const values = hasScalar ? [{ label: c.label ?? "Measure", value: scalar }] : multiSeries.map((ms) => ({ label: ms.label, value: ms.data.reduce((s, d) => s + d.v, 0) }));
    return wrap(c, boxStyle(c), <div className="flex h-full flex-col items-center justify-center gap-2">
      {values.map((v) => {
        const color = v.value !== undefined ? targetColor(Number(v.value), c.target, Math.max(Number(v.value) || 1, 1)) : undefined;
        return (
          <div key={v.label} className="flex flex-col items-center">
            <div className="text-4xl font-semibold tabular-nums" style={color ? { color } : undefined}>{Number(v.value).toLocaleString()}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{v.label}</div>
          </div>
        );
      })}
    </div>);
  }

  const dim = (name: string) => (isDimmed(name) ? 0.2 : 1);
  const onClick = (e: unknown) => { const n = rechartClickLabel(e); if (n != null) click(n); };
  const gradients = barGradientStops(series.map((s) => s.v), c.target);
  const gid = (i: number) => `adv-grad-${gradId}-${i}`;

  if (type === "scatter" || type === "bubble") {
    return wrap(c, boxStyle(c), <div className="flex h-full min-h-0 flex-col"><ScalerHeader series={series} c={c} /><div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%">
      <ScatterChart onClick={onClick}><CartesianGrid stroke="var(--border)" /><XAxis dataKey="x" type="number" /><YAxis dataKey="y" type="number" /><Tooltip />
        {multiSeries.map((ms) => <Scatter key={ms.name} name={ms.label} data={ms.data.map((d) => ({ x: Number(d.x) || 0, y: d.v }))} fill={ms.color} fillOpacity={1}>{ms.data.map((d, i) => <Cell key={i} fill={c.target ? targetColor(d.v, c.target, Math.max(...ms.data.map((x) => x.v), 1)) : ms.color} fillOpacity={dim(d.x)} />)}</Scatter>)}
      </ScatterChart>
    </ResponsiveContainer></div></div>);
  }

  if (type === "funnel" || type === "treemap" || type === "waterfall") {
    // These chart types are inherently single-series; fall back to first value.
    const single = multiSeries[0];
    const fallbackData = (single?.data ?? series).map((s) => ({ name: s.x, value: s.v, x: Number(s.x) || 0, y: s.v }));
    const maxVal = Math.max(...fallbackData.map((d) => d.value), 1);
    if (type === "funnel") {
      return wrap(c, boxStyle(c), <div className="flex h-full flex-col items-center justify-center gap-1 p-4">{fallbackData.map((d) => (
        <div key={d.name} className="flex w-full items-center justify-between rounded bg-primary/15 px-2 py-1 text-[11px]" style={{ width: `${30 + (d.value / maxVal) * 65}%` }}>
          <span className="truncate">{d.name}</span><span className="font-semibold tabular-nums">{d.value.toLocaleString()}</span>
        </div>
      ))}</div>);
    }
    if (type === "treemap") {
      return wrap(c, boxStyle(c), <div className="flex h-full flex-wrap content-start gap-1 p-2 overflow-auto">{fallbackData.map((d) => (
        <div key={d.name} className="flex min-w-[40%] flex-1 flex-col justify-between rounded p-2 text-[10px] text-white" style={{ background: targetColor(d.value, c.target, maxVal), height: 60, minHeight: 40 }}>
          <span className="truncate">{d.name}</span><span className="text-right font-bold">{d.value.toLocaleString()}</span>
        </div>
      ))}</div>);
    }
    return wrap(c, boxStyle(c), <div className="flex h-full flex-col justify-end gap-1 p-2">{fallbackData.map((d, i) => {
      const base = fallbackData.slice(0, i).reduce((s, x) => s + x.value, 0);
      return (
        <div key={d.name} className="flex items-center gap-2">
          <span className="w-16 truncate text-[10px] text-muted-foreground text-right">{d.name}</span>
          <div className="h-5 flex-1 rounded" style={{ background: targetColor(d.value, c.target, maxVal), opacity: 0.85, position: "relative" }}>
            <div className="absolute inset-0" style={{ transform: `translateY(${Math.min(base / (base + d.value), 1) * 100}%)` }} />
          </div>
        </div>
      );
    })}</div>);
  }

  const stacked = type === "stacked-bar" || type === "stacked-area";
  return wrap(c, boxStyle(c), <div className="flex h-full min-h-0 flex-col"><ScalerHeader series={series} c={c} /><div className="min-h-0 flex-1"><ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} onClick={onClick}>
      <defs>{gradients.map((g, i) => <linearGradient key={i} id={gid(i)} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={g.from} /><stop offset="100%" stopColor={g.to} /></linearGradient>)}</defs>
      <CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" /><YAxis /><Tooltip />{multiSeries.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}{c.analyticsAverage && <ReferenceLine y={series.reduce((sum, item) => sum + item.v, 0) / (series.length || 1)} stroke="#f59e0b" strokeDasharray="4 4" />}{c.analyticsConstant !== undefined && <ReferenceLine y={c.analyticsConstant} stroke="#ef4444" strokeDasharray="6 3" />}
      {multiSeries.map((ms, i) => (
        <Bar key={ms.name} dataKey={ms.name} name={ms.label} stackId={stacked ? "stack" : undefined} radius={[5, 5, 0, 0]} fill={i === 0 ? `url(#${gid(0)})` : ms.color}>
          {multiSeries.length === 1 && series.map((d, j) => <Cell key={j} fill={`url(#${gid(j)})`} fillOpacity={dim(d.x)} />)}
        </Bar>
      ))}
    </BarChart>
  </ResponsiveContainer></div></div>);
}
