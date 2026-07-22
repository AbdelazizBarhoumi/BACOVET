import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, resolveKpiSeries, type KpiDataMap } from "./shared";

export function KpiWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const style = boxStyle(c);
  const kpiResult = c.kpiCode ? kpiData?.get(c.kpiCode) : undefined;
  const hasData = kpiResult && kpiResult.scalar_value !== null;
  const v = hasData ? kpiResult!.scalar_value! : 0;
  const tgt = c.target ?? 0;
  const dbStatus = kpiResult?.status;
  const status = dbStatus === "green" ? "ok" : dbStatus === "orange" ? "warn" : dbStatus === "red" ? "bad"
    : tgt ? (v >= tgt ? "ok" : v >= tgt * 0.9 ? "warn" : "bad") : "ok";
  const statusColor = status === "ok" ? "#22c55e" : status === "warn" ? "#f59e0b" : "#ef4444";
  const { series } = resolveKpiSeries(c, kpiData);

  return (
    <div className="h-full w-full flex flex-col p-3" style={style}>
      {c.showLabel !== false && c.label && (
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{c.label}</div>
      )}
      <div className="text-[10px] font-mono text-muted-foreground">{c.kpiCode ?? ""}</div>
      <div className="flex items-end justify-between mt-1">
        {!c.kpiCode ? (
          <div className="text-sm text-muted-foreground">Sélectionnez un KPI</div>
        ) : !hasData ? (
          <div className="text-xl font-bold text-muted-foreground animate-pulse">—</div>
        ) : (
          <div className="text-3xl font-black leading-none" style={{ color: statusColor }}>
            {v.toFixed(c.decimals ?? 1).replace(".", ",")}
            <span className="text-base ml-1 font-bold text-muted-foreground">{c.unit ?? ""}</span>
          </div>
        )}
      </div>
      {c.showTarget && c.target != null && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
          <span className="text-[10px] font-medium text-muted-foreground">
            Objectif : {tgt}{c.unit ?? ""}
          </span>
        </div>
      )}
      {c.showSparkline && series.length > 0 && (
        <div className="h-8 mt-1">
          <ResponsiveContainer>
            <AreaChart data={series.map((s, i) => ({ x: i, y: s.v }))}>
              <Area type="monotone" dataKey="y" stroke={statusColor} fill={statusColor} fillOpacity={0.2} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
