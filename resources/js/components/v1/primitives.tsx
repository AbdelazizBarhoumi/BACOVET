import { HTMLAttributes, ReactNode } from "react";
type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};
import { ResponsiveContainer, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ComposedChart, Legend } from "recharts";
import { Check, AlertTriangle } from "lucide-react";
export function Card({
  children,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-lg border border-2 bg-card p-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
export function ReqLabel({ id, title }: { id: string; title: string }) {
  return (
    <div className="mb-1">
      <div className="text-ms text-foreground/90">{id}</div>
      <div className="text-xs text-foreground/90">{title}</div>
    </div>
  );
}
export type StatusKind = "ok" | "warn" | "bad";
export function statusFromValue(v: number, target: number, dir: "min" | "max" = "min"): StatusKind {
  if (dir === "min") return v >= target ? "ok" : v >= target * 0.9 ? "warn" : "bad";
  return v <= target ? "ok" : v <= target * 1.1 ? "warn" : "bad";
}
const STATUS_COLOR: Record<StatusKind, string> = {
  ok: "#22c55e", warn: "#f59e0b", bad: "#ef4444",
};
export function KpiCard({
  id, title, value, unit = "", target, status = "ok", spark, icon,
}: {
  id: string; title: string; value: string; unit?: string; target?: string;
  status?: StatusKind; spark?: number[]; icon?: ReactNode;
}) {
  const color = STATUS_COLOR[status];
  return (
    <Card>
      <ReqLabel id={id} title={title} />
      <div className="flex items-end justify-between mt-1">
        <div className="text-3xl font-black leading-none" style={{ color }}>
          {value}<span className="text-base ml-1 font-bold text-muted-foreground">{unit}</span>
        </div>
        {icon}
      </div>
      <div className="flex items-center justify-between mt-2">
        {target && <div className="text-[10px] text-muted-foreground">Objectif : {target}</div>}
        {status === "ok" ? <Check className="h-4 w-4 text-green-500" /> : status === "bad" ? <AlertTriangle className="h-4 w-4 text-red-500" /> : null}
      </div>
      {spark && (
        <div className="h-8 mt-1">
          <ResponsiveContainer>
            <AreaChart data={spark.map((y, x) => ({ x, y }))}>
              <Area type="monotone" dataKey="y" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
export function HalfGauge({ value, target, targetLabel, color: forced }: { value: number; target: number; targetLabel?: string; color?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = forced ?? (pct >= target ? "#22c55e" : pct >= target * 0.85 ? "#f59e0b" : "#ef4444");
  const data = [{ v: pct }, { v: 100 - pct }];
  return (
    <div className="relative w-full">
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={data} dataKey="v" cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={70} outerRadius={100} stroke="none">
            <Cell fill={color} />
            <Cell fill="hsl(var(--muted, 220 13% 90%))" fillOpacity={0.25} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-2 text-center">
        <div className="text-3xl font-black" style={{ color }}>{value.toFixed(1).replace(".", ",")} %</div>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground -mt-1 px-2">
        <span>0%</span><span>{targetLabel ?? `Objectif : > ${target} %`}</span><span>100%</span>
      </div>
    </div>
  );
}
const axisTick = { fill: "var(--muted-foreground)", fontSize: 10 };
const tt = { backgroundColor: "var(--card)", border: "1px solid var(--border)", fontSize: 11 };
export function Sparkline({ data, color = "#22c55e", height = 50, type = "line" as "line" | "area" }: { data: number[]; color?: string; height?: number; type?: "line" | "area" }) {
  const d = data.map((y, x) => ({ x, y }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "area" ? (
        <AreaChart data={d}><Area type="monotone" dataKey="y" stroke={color} fill={color} fillOpacity={0.25} strokeWidth={1.5} /></AreaChart>
      ) : (
        <LineChart data={d}><Line type="monotone" dataKey="y" stroke={color} strokeWidth={1.5} dot={false} /></LineChart>
      )}
    </ResponsiveContainer>
  );
}
export function LineKpi({ data, target, color = "#3b82f6", targetColor = "#22c55e", domain, height = 160, labelKey = "v" }: {
  data: { x: string; v: number }[]; target?: number; color?: string; targetColor?: string; domain?: [number, number]; height?: number; labelKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 18, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="x" tick={axisTick} />
        <YAxis tick={axisTick} domain={domain ?? ["auto", "auto"]} />
        <Tooltip contentStyle={tt} />
        {target !== undefined && <ReferenceLine y={target} stroke={targetColor} strokeDasharray="4 4" label={{ value: `${target}%`, fill: targetColor, fontSize: 10, position: "right" }} />}
        <Line type="monotone" dataKey={labelKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} label={{ position: "top", fill: color, fontSize: 10 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
export function BarKpi({ data, color = "#3b82f6", target, vertical = false, height = 160 }: {
  data: { x: string; v: number }[]; color?: string; target?: number; vertical?: boolean; height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 14, right: 30, left: vertical ? 30 : 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        {vertical ? <>
          <XAxis type="number" tick={axisTick} /><YAxis dataKey="x" type="category" tick={axisTick} width={40} />
        </> : <>
          <XAxis dataKey="x" tick={axisTick} /><YAxis tick={axisTick} />
        </>}
        <Tooltip contentStyle={tt} />
        {target !== undefined && <ReferenceLine {...(vertical ? { x: target } : { y: target })} stroke="#22c55e" strokeDasharray="4 4" />}
        <Bar dataKey="v" fill={color} radius={vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]} label={{ position: vertical ? "right" : "top", fill: "var(--foreground)", fontSize: 10 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}
export function ParetoChart({ data, height = 180 }: { data: { label: string; v: number }[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.v, 0);
  let acc = 0;
  const enriched = data.map((d) => { acc += d.v; return { ...d, cum: (acc / total) * 100 }; });
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={enriched} margin={{ top: 14, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 9 }} interval={0} angle={-12} textAnchor="end" height={50} />
        <YAxis yAxisId="left" tick={axisTick} />
        <YAxis yAxisId="right" orientation="right" tick={axisTick} domain={[0, 100]} unit="%" />
        <Tooltip contentStyle={tt} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar yAxisId="left" dataKey="v" name="Nb de défauts" fill="#3b82f6" label={{ position: "top", fill: "var(--foreground)", fontSize: 10 }} />
        <Line yAxisId="right" type="monotone" dataKey="cum" name="% Cumulé" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
export function DonutKpi({ value, color = "#22c55e", label }: { value: number; color?: string; label?: string }) {
  const data = [{ v: value }, { v: 100 - value }];
  return (
    <div className="relative w-full h-[150px]">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="v" cx="50%" cy="50%" innerRadius={45} outerRadius={65} startAngle={90} endAngle={-270} stroke="none">
            <Cell fill={color} /><Cell fill="hsl(var(--muted, 220 13% 90%))" fillOpacity={0.25} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-black" style={{ color }}>{value}%</div>
        {label && <div className="text-[10px] text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}
