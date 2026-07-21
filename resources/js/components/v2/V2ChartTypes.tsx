import { useState, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import type { V2KpiItem } from "@/services/v2ProductionApi";

const COLORS = ["#1e6cb8", "#2a9d8f", "#e63946", "#f4a261", "#264653", "#e9c46a", "#606c38", "#283618"];

// ─── Resolve chart_config overrides from kpi ──────────────────────────────
function resolveChartConfig(kpi: V2KpiItem) {
  const cc = kpi.chart_config;
  // Y-axis label: first word of KPI name (e.g., "Efficience" from "Efficience par OPERATEUR par chaine")
  const firstWord = kpi.name?.split(/\s+/)[0] ?? null;
  return {
    xAxisKey: cc?.x_axis_key ?? null,
    yAxisKey: cc?.y_axis_key ?? 'value',
    legendX: cc?.legend_x ?? null,
    legendY: cc?.legend_y ?? firstWord,
    valueKey: cc?.value_key ?? 'value',
    barColor: cc?.bar_color ?? '#1e6cb8',
    lineColor: cc?.line_color ?? '#e63946',
    gradient: cc?.gradient ?? false,
    tooltipFormat: cc?.tooltip_format ?? null,
    tooltipKeys: cc?.tooltip_keys ?? null,
    sortBy: cc?.sort_by ?? null,
    maxItems: cc?.max_items ?? null,
    showRefLine: cc?.show_reference_line ?? true,
    refLineLabel: cc?.reference_line_label ?? 'Cible',
  };
}

function sortData(data: Record<string, unknown>[], sortBy: string | null): Record<string, unknown>[] {
  if (!sortBy) return data;
  const sorted = [...data];
  switch (sortBy) {
    case 'value_desc': return sorted.sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0));
    case 'value_asc': return sorted.sort((a, b) => Number(a.value ?? 0) - Number(b.value ?? 0));
    case 'name_asc': return sorted.sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? '')));
    case 'name_desc': return sorted.sort((a, b) => String(b.name ?? '').localeCompare(String(a.name ?? '')));
    default: return sorted;
  }
}

// Extract _xKey metadata attached by row-by-row formula (join key name like "EmployeeNo")
function getXKey(data: Record<string, unknown>[]): string | null {
  return (data as unknown as { _xKey?: string })._xKey ?? null;
}

// ─── Helper: extract chart-ready data from kpi ──────────────────────────────
// If kpi.value is an array (row-by-row formula result), use it directly.
// If kpi.raw_data exists, use it. Otherwise fallback to single value.
function useChartData(kpi: V2KpiItem, filterVal: string) {
  return useMemo(() => {
    const filterKey = kpi.filter_key;

    // 1. If value is an array (computed row-by-row), filter it
    if (Array.isArray(kpi.value)) {
      if (filterKey && filterVal !== "Tous") {
        return kpi.value.filter((r) => {
          const rowVal = (r as Record<string, unknown>)[filterKey];
          return rowVal != null && String(rowVal).trim() === filterVal;
        });
      }
      return kpi.value;
    }

    // 2. If raw_data exists, use it
    if (kpi.raw_data && kpi.raw_data.length > 0) {
      if (filterKey && filterVal !== "Tous") {
        return kpi.raw_data.filter((r) => String(r[filterKey] ?? "").trim() === filterVal);
      }
      return kpi.raw_data;
    }

    // 3. Fallback: single value
    return [];
  }, [kpi.value, kpi.raw_data, kpi.filter_key, filterVal]);
}

// Detect the label key from a data row (first key that isn't "value")
function detectLabelKey(row: Record<string, unknown>): string {
  if (!row) return "name";
  const keys = Object.keys(row).filter((k) => k !== "value");
  return keys[0] ?? "name";
}

// Pick the best X-axis label key from data: prefer join key (_xKey), then EmployeeNo/EmployeeName, then first non-value key
function pickXKey(data: Record<string, unknown>[]): string {
  // 1. If _xKey metadata exists (from row-by-row join), use it
  const xKey = getXKey(data);
  if (xKey) return xKey;
  // 2. If data has EmployeeNo or EmployeeName, prefer those
  if (data.length > 0) {
    const row = data[0] as Record<string, unknown>;
    if ("EmployeeNo" in row) return "EmployeeNo";
    if ("EmployeeName" in row) return "EmployeeName";
  }
  // 3. Fallback to detectLabelKey
  return data.length > 0 ? detectLabelKey(data[0]) : "name";
}

// ─── Filter Dropdown ────────────────────────────────────────────────────────
function FilterDropdown({ filterKey, raw, selected, onSelect }: {
  filterKey: string;
  raw: Record<string, unknown>[] | null;
  selected: string;
  onSelect: (val: string) => void;
}) {
  const options = useMemo(() => {
    if (!raw || raw.length === 0) return ["Tous"];
    const vals = raw.map((r) => String(r[filterKey] ?? "")).filter(Boolean);
    return ["Tous", ...Array.from(new Set(vals)).sort()];
  }, [raw, filterKey]);

  if (options.length <= 1) return null;

  return (
    <select
      value={selected}
      onChange={(e) => onSelect(e.target.value)}
      className="mb-2 text-[10px] font-mono bg-card border border-border rounded px-2 py-1 cursor-pointer"
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Generic Chart Tooltip ──────────────────────────────────────────────────
interface TooltipPayloadItem {
  name: string;
  value: number | string;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-2 py-1 text-[10px] shadow-md">
      <div className="font-bold mb-0.5">{label}</div>
      {payload.map((p: TooltipPayloadItem, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Line Chart ─────────────────────────────────────────────────────────────
interface LineTooltipProps extends ChartTooltipProps {
  yLabel?: string;
}

function LineTooltip({ active, payload, label, yLabel }: LineTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-2 py-1 text-[10px] shadow-md">
      <div className="font-bold mb-0.5">{label}</div>
      {payload.map((p: TooltipPayloadItem, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {yLabel}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
}

export function V2LineChart({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  const data = useChartData(kpi, filterVal);
  const cc = resolveChartConfig(kpi);

  const labelKey = cc.xAxisKey ?? pickXKey(data);
  const valueKey = cc.yAxisKey;
  const maxItems = cc.maxItems ?? 10;
  const xLabel = cc.legendX ?? getXKey(data);
  const yLabel = cc.legendY ?? kpi.name?.split(/\s+/)[0] ?? "value";

  const chartData = data.length > 0
    ? sortData(data, cc.sortBy).slice(0, maxItems).map((r: Record<string, unknown>, i: number) => ({
        name: String(r[labelKey] ?? `#${i + 1}`),
        [yLabel]: Number(r[valueKey] ?? r.value ?? 0),
      }))
    : [{ name: "—", [yLabel]: kpi.value != null && !Array.isArray(kpi.value) ? Number(kpi.value) : 0 }];

  return (
    <div className="h-48">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" fontSize={10} tickLine={false} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 9 } : undefined} />
          <YAxis fontSize={10} tickLine={false} label={cc.legendY ? { value: cc.legendY, angle: -90, position: 'insideLeft', fontSize: 9 } : undefined} />
          <Tooltip content={<LineTooltip yLabel={yLabel} />} />
          <Line type="monotone" dataKey={yLabel} stroke={cc.lineColor} strokeWidth={2} dot={{ r: 3 }} />
          {kpi.target_value != null && cc.showRefLine && <ReferenceLine y={kpi.target_value} stroke="#e63946" strokeDasharray="5 5" label={{ value: cc.refLineLabel, fontSize: 9 }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Gauge Chart ────────────────────────────────────────────────────────────
export function V2GaugeChart({ kpi }: { kpi: V2KpiItem }) {
  const val = kpi.value != null ? Number(kpi.value) : 0;
  const target = kpi.target_value ?? 100;
  const pct = Math.min(100, Math.max(0, (val / target) * 100));
  const angle = (pct / 100) * 180;
  const color = pct >= 85 ? "#16a34a" : pct >= 70 ? "#ea580c" : "#dc2626";

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-48">
        <svg viewBox="0 0 200 110" className="h-full w-full">
          <path d="M10,100 A90,90 0 0,1 190,100" fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
          <path d="M10,100 A90,90 0 0,1 190,100" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(angle / 180) * 283} 283`} />
          <text x="100" y="85" textAnchor="middle" className="font-mono font-bold" fontSize="28" fill="currentColor">{val.toFixed(1)}%</text>
          <text x="100" y="105" textAnchor="middle" className="font-mono" fontSize="10" fill="var(--muted-foreground)">Cible: {target}%</text>
        </svg>
      </div>
    </div>
  );
}

// ─── Combo Bar/Line ─────────────────────────────────────────────────────────
function ComboTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded px-2 py-1 text-[10px] shadow-md">
      <div className="font-bold mb-0.5">{label}</div>
      {payload.map((p: TooltipPayloadItem, i: number) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}%
        </div>
      ))}
    </div>
  );
}

export function V2ComboChart({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  const data = useChartData(kpi, filterVal);
  const cc = resolveChartConfig(kpi);

  const labelKey = cc.xAxisKey ?? pickXKey(data);
  const valueKey = cc.yAxisKey;
  const maxItems = cc.maxItems ?? 10;
  const xLabel = cc.legendX ?? getXKey(data);
  const yLabel = cc.legendY ?? kpi.name?.split(/\s+/)[0] ?? "";

  const chartData = data.length > 0
    ? sortData(data, cc.sortBy).slice(0, maxItems).map((r: Record<string, unknown>, i: number) => ({
        name: String(r[labelKey] ?? `#${i + 1}`),
        [yLabel || "value"]: Number(r[valueKey] ?? r.value ?? 0),
      }))
    : [{ name: "—", [yLabel || "value"]: kpi.value != null && !Array.isArray(kpi.value) ? Number(kpi.value) : 0 }];

  return (
    <div className="h-48">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" fontSize={10} tickLine={false} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 9 } : undefined} />
          <YAxis fontSize={10} tickLine={false} label={cc.legendY ? { value: cc.legendY, angle: -90, position: 'insideLeft', fontSize: 9 } : undefined} />
          <Tooltip content={<ComboTooltip />} />
          <Bar dataKey={yLabel || "value"} fill={cc.barColor} radius={[2, 2, 0, 0]} barSize={16} />
          <Line type="monotone" dataKey={yLabel || "value"} stroke={cc.lineColor} strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Pareto Chart ───────────────────────────────────────────────────────────
export function V2ParetoChart({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  const data = useChartData(kpi, filterVal);
  const cc = resolveChartConfig(kpi);

  const groupKey = cc.xAxisKey ?? kpi.filter_key ?? Object.keys(data[0] ?? {})[0] ?? "name";
  const maxItems = cc.maxItems ?? 8;
  const grouped = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((r) => {
      const k = String(r[groupKey] ?? "—");
      map[k] = (map[k] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxItems)
      .map(([name, count], i, arr) => {
        const total = arr.reduce((s, x) => s + x[1], 0);
        const cumPct = arr.slice(0, i + 1).reduce((s, x) => s + x[1], 0) / total * 100;
        return { name, count, cumPct };
      });
  }, [data, groupKey, maxItems]);

  const chartData = grouped.length > 0 ? grouped : [{ name: "—", count: 1, cumPct: 100 }];

  return (
    <div className="h-48">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" fontSize={9} tickLine={false} />
          <YAxis yAxisId="left" fontSize={10} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" fontSize={10} tickLine={false} domain={[0, 100]} />
          <Tooltip content={<ChartTooltip />} />
          <Bar yAxisId="left" dataKey="count" fill={cc.barColor} radius={[2, 2, 0, 0]} barSize={20} />
          <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={cc.lineColor} strokeWidth={2} dot={{ r: 3 }} />
          <ReferenceLine yAxisId="right" y={80} stroke="#f4a261" strokeDasharray="5 5" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Horizontal Bar Chart ───────────────────────────────────────────────────
export function V2HorizontalBarChart({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  const data = useChartData(kpi, filterVal);
  const cc = resolveChartConfig(kpi);

  const labelKey = cc.xAxisKey ?? pickXKey(data);
  const valueKey = cc.yAxisKey;
  const maxItems = cc.maxItems ?? 8;

  const chartData = data.length > 0
    ? sortData(data, cc.sortBy).slice(0, maxItems).map((r: Record<string, unknown>) => ({ name: String(r[labelKey] ?? "—"), value: Number(r[valueKey] ?? r.value ?? 0) }))
    : [{ name: "—", value: kpi.value != null ? Number(kpi.value) : 0 }];

  return (
    <div className="h-48">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" fontSize={10} tickLine={false} />
          <YAxis dataKey="name" type="category" fontSize={10} tickLine={false} width={60} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" fill={cc.barColor} radius={[0, 2, 2, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Area Chart ─────────────────────────────────────────────────────────────
export function V2AreaChart({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  const data = useChartData(kpi, filterVal);
  const cc = resolveChartConfig(kpi);

  const labelKey = cc.xAxisKey ?? pickXKey(data);
  const valueKey = cc.yAxisKey;
  const maxItems = cc.maxItems ?? 10;
  const xLabel = cc.legendX ?? getXKey(data);

  const chartData = data.length > 0
    ? sortData(data, cc.sortBy).slice(0, maxItems).map((r: Record<string, unknown>, i: number) => ({
        name: String(r[labelKey] ?? `#${i + 1}`),
        value: Number(r[valueKey] ?? r.value ?? 0),
      }))
    : [{ name: "—", value: kpi.value != null ? Number(kpi.value) : 0 }];

  return (
    <div className="h-48">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" fontSize={10} tickLine={false} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 9 } : undefined} />
          <YAxis fontSize={10} tickLine={false} label={cc.legendY ? { value: cc.legendY, angle: -90, position: 'insideLeft', fontSize: 9 } : undefined} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="value" stroke={cc.barColor} fill={cc.barColor} fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Timeline ───────────────────────────────────────────────────────────────
export function V2Timeline({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  const data = useChartData(kpi, filterVal);
  const cc = resolveChartConfig(kpi);

  const labelKey = cc.xAxisKey ?? pickXKey(data);
  const valueKey = cc.yAxisKey;
  const maxItems = cc.maxItems ?? 10;

  const chartData = data.length > 0
    ? sortData(data, cc.sortBy).slice(0, maxItems).map((r: Record<string, unknown>) => ({
        name: String(r[labelKey] ?? r.LostTypeDesc ?? "—"),
        minutes: Number(r[valueKey] ?? r.TotalLostTime ?? r.minutes ?? r.value ?? 0),
      }))
    : [{ name: "—", minutes: kpi.value != null ? Number(kpi.value) : 0 }];

  return (
    <div className="h-48">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" fontSize={9} tickLine={false} angle={-30} textAnchor="end" height={40} />
          <YAxis fontSize={10} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="minutes" fill={cc.lineColor} radius={[2, 2, 0, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Bar Chart (per chaîne) ─────────────────────────────────────────────────
export function V2BarChart({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  const data = useChartData(kpi, filterVal);
  const cc = resolveChartConfig(kpi);

  const labelKey = cc.xAxisKey ?? pickXKey(data);
  const valueKey = cc.yAxisKey;
  const maxItems = cc.maxItems ?? 10;
  const xLabel = cc.legendX ?? getXKey(data);

  const chartData = data.length > 0
    ? sortData(data, cc.sortBy).slice(0, maxItems).map((r: Record<string, unknown>) => ({ name: String(r[labelKey] ?? "—"), value: Number(r[valueKey] ?? r.value ?? 0) }))
    : [{ name: "—", value: kpi.value != null ? Number(kpi.value) : 0 }];

  return (
    <div className="h-48">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" fontSize={10} tickLine={false} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -5, fontSize: 9 } : undefined} />
          <YAxis fontSize={10} tickLine={false} label={cc.legendY ? { value: cc.legendY, angle: -90, position: 'insideLeft', fontSize: 9 } : undefined} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" fill={cc.barColor} radius={[2, 2, 0, 0]} barSize={18} />
          {kpi.target_value != null && cc.showRefLine && <ReferenceLine y={kpi.target_value} stroke="#e63946" strokeDasharray="5 5" label={{ value: cc.refLineLabel, fontSize: 9 }} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Donut Chart ────────────────────────────────────────────────────────────
export function V2DonutChart({ kpi }: { kpi: V2KpiItem }) {
  const cc = resolveChartConfig(kpi);
  const val = kpi.value != null ? Number(kpi.value) : 0;
  const data = [
    { name: "Complété", value: val },
    { name: "Restant", value: Math.max(0, 100 - val) },
  ];
  return (
    <div className="flex items-center justify-center h-48">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" startAngle={90} endAngle={-270}>
            <Cell fill={cc.barColor} />
            <Cell fill="var(--muted)" />
          </Pie>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="font-mono font-bold" fontSize="20" fill="currentColor">{val.toFixed(1)}%</text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Jauge Radiale ──────────────────────────────────────────────────────────
export function V2RadialGauge({ kpi }: { kpi: V2KpiItem }) {
  const val = kpi.value != null ? Number(kpi.value) : 0;
  const target = kpi.target_value ?? 100;
  const pct = Math.min(100, (val / target) * 100);
  const color = pct >= 85 ? "#16a34a" : pct >= 70 ? "#ea580c" : "#dc2626";

  return (
    <div className="flex items-center justify-center h-48">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie data={[{ value: pct }, { value: 100 - pct }]} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" startAngle={90} endAngle={-270}>
            <Cell fill={color} />
            <Cell fill="var(--muted)" />
          </Pie>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="font-mono font-bold" fontSize="18" fill="currentColor">{val.toFixed(1)}%</text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Pie Chart ──────────────────────────────────────────────────────────────
export function V2PieChart({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  const data = useChartData(kpi, filterVal);
  const cc = resolveChartConfig(kpi);

  const groupKey = cc.xAxisKey ?? kpi.filter_key ?? Object.keys(data[0] ?? {})[0] ?? "name";
  const maxItems = cc.maxItems ?? 6;
  const grouped = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((r) => { const k = String(r[groupKey] ?? "—"); map[k] = (map[k] ?? 0) + 1; });
    return Object.entries(map).slice(0, maxItems).map(([name, value]) => ({ name, value }));
  }, [data, groupKey, maxItems]);

  const chartData = grouped.length > 0 ? grouped : [{ name: "—", value: 1 }];

  return (
    <div className="flex items-center justify-center h-48">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={9}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Podium / Top 3 ────────────────────────────────────────────────────────
export function V2Podium({ kpi }: { kpi: V2KpiItem }) {
  const val = kpi.value != null ? Number(kpi.value) : 0;
  const items = [
    { name: "1er", value: val * 1.2, color: "#f4a261", height: "h-24" },
    { name: "2ème", value: val * 1.05, color: "#a8a8a8", height: "h-18" },
    { name: "3ème", value: val * 0.9, color: "#cd7f32", height: "h-14" },
  ];
  return (
    <div className="flex items-end justify-center gap-2 h-48">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="text-[10px] font-bold text-muted-foreground mb-1">{item.name}</div>
          <div className="text-xs font-mono font-bold mb-1">{item.value.toFixed(1)}</div>
          <div className={`w-16 ${item.height} rounded-t-lg`} style={{ backgroundColor: item.color }} />
        </div>
      ))}
    </div>
  );
}

// ─── Scatter Plot ───────────────────────────────────────────────────────────
export function V2ScatterPlot({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  const data = useChartData(kpi, filterVal);
  const cc = resolveChartConfig(kpi);

  const valueKey = cc.yAxisKey;
  const maxItems = cc.maxItems ?? 20;

  const chartData = data.length > 0
    ? sortData(data, cc.sortBy).slice(0, maxItems).map((r, i) => ({ x: i + 1, y: Number(r[valueKey] ?? r.value ?? 0) }))
    : [{ x: 1, y: kpi.value != null ? Number(kpi.value) : 0 }];

  return (
    <div className="h-48">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="x" fontSize={10} tickLine={false} />
          <YAxis dataKey="y" fontSize={10} tickLine={false} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="y" fill={cc.barColor} radius={[2, 2, 0, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── OF List ────────────────────────────────────────────────────────────────
export function V2OfList({ kpi }: { kpi: V2KpiItem }) {
  const [filterVal, setFilterVal] = useState("Tous");
  // OF List always uses raw_data (needs full row details, not computed values)
  const data = useMemo(() => {
    if (!kpi.raw_data) return [];
    if (kpi.filter_key && filterVal !== "Tous") {
      return kpi.raw_data.filter((r) => String(r[kpi.filter_key!] ?? "") === filterVal);
    }
    return kpi.raw_data;
  }, [kpi.raw_data, kpi.filter_key, filterVal]);

  const items = data.length > 0
    ? data.slice(0, 8).map((r) => ({
        of: String(r.IDOFabrication ?? r.of ?? "—"),
        article: String(r.Article ?? r.article ?? "—"),
        qte: Number(r.Quantite ?? r.qte ?? 0),
      }))
    : [];

  if (items.length === 0) {
    return <div className="text-xs text-muted-foreground italic p-4">Aucun OF en cours</div>;
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-auto">
      {kpi.filter_key && data.length > 1 && <FilterDropdown filterKey={kpi.filter_key} raw={data} selected={filterVal} onSelect={setFilterVal} />}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 rounded border border-border bg-card p-1.5 text-[10px]">
          <div className="font-mono font-bold min-w-[60px]">{item.of}</div>
          <div className="flex-1 truncate">{item.article}</div>
          <div className="text-muted-foreground">Qte: {item.qte}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Chart component selector ───────────────────────────────────────────────
export function V2ChartType({ kpi }: { kpi: V2KpiItem }) {
  const graphType = kpi.graph_types?.[0] ?? "Not specified";

  switch (graphType) {
    case "Line Chart (Courbe)":
    case "Line Chart mensuel":
      return <V2LineChart kpi={kpi} />;
    case "Gauge Chart (Jauge)": return <V2GaugeChart kpi={kpi} />;
    case "Combo Bar/Line": return <V2ComboChart kpi={kpi} />;
    case "Pareto Chart (Interactif)": return <V2ParetoChart kpi={kpi} />;
    case "Horizontal Bar Chart": return <V2HorizontalBarChart kpi={kpi} />;
    case "Area Chart (Graph. aires)": return <V2AreaChart kpi={kpi} />;
    case "Chronologie (Timeline)": return <V2Timeline kpi={kpi} />;
    case "Bar Chart (par chaîne)": return <V2BarChart kpi={kpi} />;
    case "Donut Chart (Anneau)": return <V2DonutChart kpi={kpi} />;
    case "Jauge Radiale": return <V2RadialGauge kpi={kpi} />;
    case "Pie Chart (Secteurs)": return <V2PieChart kpi={kpi} />;
    case "Podium ou Top 3 List": return <V2Podium kpi={kpi} />;
    case "Scatter Plot (Nuage)": return <V2ScatterPlot kpi={kpi} />;
    case "Liste de OF en cours non soldés": return <V2OfList kpi={kpi} />;
    default: return <V2LineChart kpi={kpi} />;
  }
}
