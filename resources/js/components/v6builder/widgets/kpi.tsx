import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useId } from "react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, hasWidgetBinding, useWidgetData } from "./shared";

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amt).toString(16).padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

export function KpiWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const style = boxStyle(c);
  const gradientId = useId();
  const { scalar, hasScalar, series } = useWidgetData(c, id);
  const v = hasScalar ? scalar : 0;
  const tgt = c.target ?? 0;
  const status = tgt ? (v >= tgt ? "ok" : v >= tgt * 0.9 ? "warn" : "bad") : "ok";
  const statusColor = status === "ok" ? "#22c55e" : status === "warn" ? "#f59e0b" : "#ef4444";

  const prev = series.length >= 2 ? series[series.length - 2].v : null;
  const last = series.length >= 1 ? series[series.length - 1].v : null;
  const trendDelta = prev != null && last != null ? last - prev : null;
  const trendPct = trendDelta != null && prev ? (trendDelta / Math.abs(prev)) * 100 : null;
  const trendDir = trendDelta == null || Math.abs(trendDelta) < 1e-9 ? "flat" : trendDelta > 0 ? "up" : "down";
  const trendColor = trendDir === "up" ? "#16a34a" : trendDir === "down" ? "#dc2626" : "#94a3b8";

  const targetPct = tgt ? Math.min(100, Math.max(0, (v / tgt) * 100)) : 0;

  const labelStyle: React.CSSProperties = {
    fontSize: c.labelFontSize ?? 10,
    textTransform: c.labelTransform ?? "uppercase",
    letterSpacing: "0.1em",
    color: c.labelColor,
    textAlign: c.labelAlign,
  };
  const hasLabel = c.showLabel !== false && !!c.label;

  return (
    <div className="h-full w-full flex flex-col p-3 relative group transition-shadow duration-200" style={style}>
      {hasLabel && (c.labelPosition ?? "top") === "top" && (
        <div className="mb-1 shrink-0" style={labelStyle}>{c.label}</div>
      )}
      <div className="flex items-end justify-between mt-1 gap-2">
        {!hasWidgetBinding(c) ? (
          <div className="text-sm text-muted-foreground">Glissez une colonne depuis le panneau Data</div>
        ) : !hasScalar ? (
          <div className="text-xl font-bold text-muted-foreground animate-pulse">—</div>
        ) : (
          <>
            <div
              className="text-3xl font-black leading-none transition-transform duration-150 group-hover:scale-[1.03]"
              style={{
                backgroundImage: `linear-gradient(135deg, ${lighten(statusColor, 0.25)}, ${statusColor})`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {v.toFixed(c.decimals ?? 1).replace(".", ",")}
              <span
                className="text-base ml-1 font-bold text-muted-foreground"
                style={{ WebkitTextFillColor: "initial", backgroundImage: "none" }}
              >
                {c.unit ?? ""}
              </span>
            </div>
            {trendPct != null && (
              <div
                className="flex items-center gap-0.5 text-[11px] font-semibold rounded-full px-1.5 py-0.5 mb-1 shrink-0"
                style={{ color: trendColor, backgroundColor: `${trendColor}1a` }}
                title={`${trendDelta! > 0 ? "+" : ""}${trendDelta!.toFixed(c.decimals ?? 1).replace(".", ",")}${c.unit ?? ""} vs période précédente`}
              >
                {trendDir === "up" ? <ArrowUpRight size={12} /> : trendDir === "down" ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                {Math.abs(trendPct).toFixed(0)}%
              </div>
            )}
          </>
        )}
      </div>
      {c.showTarget && c.target != null && hasScalar && (
        <div className="mt-2 shrink-0">
          <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${targetPct}%`, backgroundColor: statusColor }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-medium text-muted-foreground">
              Objectif : {tgt}{c.unit ?? ""}
            </span>
            <span className="text-[10px] font-semibold" style={{ color: statusColor }}>
              {targetPct.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
      {c.showSparkline && series.length > 0 && (
        <div className="h-8 mt-1">
          <ResponsiveContainer>
            <AreaChart data={series.map((s, i) => ({ x: i, y: s.v }))}>
              <defs>
                <linearGradient id={`kpi-spark-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={statusColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={statusColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke={statusColor}
                fill={`url(#kpi-spark-${gradientId})`}
                strokeWidth={1.75}
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {hasLabel && (c.labelPosition ?? "top") === "bottom" && (
        <div className="mt-auto pt-1 shrink-0" style={labelStyle}>{c.label}</div>
      )}
      {hasLabel && ((c.labelPosition ?? "top") === "inside" || (c.labelPosition ?? "top") === "overlay") && (
        <div className="absolute bottom-2 left-2 right-2 z-10" style={{ ...labelStyle, textAlign: labelStyle.textAlign ?? "left" }}>{c.label}</div>
      )}
    </div>
  );
}