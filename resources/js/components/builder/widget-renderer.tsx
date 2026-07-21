import { KpiCard, HalfGauge, Sparkline, LineKpi, BarKpi, ParetoChart, DonutKpi } from "@/components/v1/primitives";
import { ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, Radar as RechartsRadar, AreaChart, Area, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import type { TableCell, TableGrid, Widget, WidgetConfig } from "./types";

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899", "#14b8a6"];

const SHADOW: Record<NonNullable<WidgetConfig["shadow"]>, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.12)",
  md: "0 4px 8px rgba(0,0,0,0.16)",
  lg: "0 10px 22px rgba(0,0,0,0.20)",
  xl: "0 24px 48px rgba(0,0,0,0.28)",
};

function boxStyle(c: WidgetConfig): React.CSSProperties {
  const transforms: string[] = [];
  if (c.rotate) transforms.push(`rotate(${c.rotate}deg)`);
  if (c.scale && c.scale !== 1) transforms.push(`scale(${c.scale})`);
  return {
    background: c.bgGradient || c.bg,
    color: c.fg,
    borderColor: c.borderColor,
    borderWidth: c.borderWidth,
    borderStyle: c.borderStyle || (c.borderWidth ? "solid" : undefined),
    borderRadius: c.radius,
    padding: c.padding,
    marginTop: c.marginTop,
    marginBottom: c.marginBottom,
    marginLeft: c.marginLeft,
    marginRight: c.marginRight,
    opacity: c.opacity,
    boxShadow: c.shadow && c.shadow !== "none" ? SHADOW[c.shadow] : undefined,
    fontFamily: c.fontFamily,
    fontWeight: c.fontWeight,
    fontSize: c.fontSize,
    lineHeight: c.lineHeight,
    letterSpacing: c.letterSpacing,
    transform: transforms.length ? transforms.join(" ") : undefined,
    height: "100%",
    width: "100%",
    overflow: "hidden",
  };
}

export function WidgetRenderer({ w, editing, onCellSelect, selectedCells }: {
  w: Widget;
  editing?: boolean;
  onCellSelect?: (r: number, c: number, add: boolean) => void;
  selectedCells?: string[]; // "r,c"
}) {
  const c = w.config;
  const style = boxStyle(c);

  const wrap = (child: React.ReactNode) => (
    <div className="h-full w-full flex flex-col" style={style}>
      {c.showLabel !== false && c.label && (
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 shrink-0">{c.label}</div>
      )}
      <div className="flex-1 min-h-0">{child}</div>
    </div>
  );

  switch (w.type) {
    case "kpi": {
      const v = c.mockValue ?? 0;
      const tgt = c.target ?? 0;
      const status = tgt ? (v >= tgt ? "ok" : v >= tgt * 0.9 ? "warn" : "bad") : "ok";
      const statusColor = status === "ok" ? "#22c55e" : status === "warn" ? "#f59e0b" : "#ef4444";
      return (
        <div className="h-full w-full flex flex-col p-3" style={style}>
          {c.showLabel !== false && c.label && (
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{c.label}</div>
          )}
          <div className="text-[10px] font-mono text-muted-foreground">{c.kpiCode ?? ""}</div>
          <div className="flex items-end justify-between mt-1">
            <div className="text-3xl font-black leading-none" style={{ color: statusColor }}>
              {v.toFixed(c.decimals ?? 1).replace(".", ",")}
              <span className="text-base ml-1 font-bold text-muted-foreground">{c.unit ?? ""}</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            {c.showTarget && tgt ? <div className="text-[10px] text-muted-foreground">Objectif : {tgt}</div> : null}
            {status === "ok" ? "✓" : status === "bad" ? "⚠" : ""}
          </div>
          {c.showSparkline && c.mockSeries && (
            <div className="h-8 mt-1">
              <ResponsiveContainer>
                <AreaChart data={c.mockSeries.map((s, i) => ({ x: i, y: s.v }))}>
                  <Area type="monotone" dataKey="y" stroke={statusColor} fill={statusColor} fillOpacity={0.2} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      );
    }
    case "gauge":
      return wrap(<HalfGauge value={Number(c.mockValue ?? 0)} target={Number(c.target ?? 85)} color={c.accent} />);
    case "sparkline":
      return wrap(<Sparkline data={(c.mockSeries ?? []).map((s) => s.v)} color={c.accent ?? "#3b82f6"} type="area" height={80} />);
    case "line":
      return wrap(<LineKpi data={c.mockSeries ?? []} color={c.accent ?? "#3b82f6"} target={c.showTarget ? c.target : undefined} height={160} />);
    case "bar":
      return wrap(<BarKpi data={c.mockSeries ?? []} color={c.accent ?? "#ec4899"} target={c.showTarget ? c.target : undefined} height={160} />);
    case "pareto":
      return wrap(<ParetoChart data={(c.mockSeries ?? []).map((s) => ({ label: s.x, v: s.v }))} height={180} />);
    case "donut":
      return wrap(<DonutKpi value={Number(c.mockValue ?? 0)} color={c.accent ?? "#22c55e"} label={c.subtitle} />);
    case "pie":
      return wrap(
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={(c.mockSeries ?? []).map((s) => ({ name: s.x, value: s.v }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="80%"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              fontSize={10}
            >
              {(c.mockSeries ?? []).map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    case "radar":
      return wrap(
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={c.mockSeries ?? []}>
            <PolarGrid />
            <PolarAngleAxis dataKey="x" tick={{ fontSize: 10 }} />
            <RechartsRadar
              name="Value"
              dataKey="v"
              stroke={c.accent ?? "#3b82f6"}
              fill={c.accent ?? "#3b82f6"}
              fillOpacity={0.3}
            />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      );
    case "area":
      return wrap(
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={(c.mockSeries ?? []).map((s) => ({ name: s.x, value: s.v }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            {c.showTarget && c.target != null && (
              <CartesianGrid horizontal={false} />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke={c.accent ?? "#3b82f6"}
              fill={c.accent ?? "#3b82f6"}
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    case "combo":
      return wrap(
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={(c.mockSeries ?? []).map((s) => ({ name: s.x, value: s.v }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" fill={c.accent ?? "#3b82f6"} fillOpacity={0.6} radius={[4, 4, 0, 0]} />
            {c.showTarget && c.target != null && (
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ef4444"
                strokeDasharray="5 5"
                dot={false}
                name="Target"
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={c.accent ?? "#3b82f6"}
              strokeWidth={2}
              dot={false}
              name="Actual"
            />
          </ComposedChart>
        </ResponsiveContainer>
      );
    case "table":
      return wrap(
        <div className="text-xs overflow-auto h-full">
          <table className="w-full">
            <thead className="bg-secondary/60 text-[10px] uppercase text-muted-foreground">
              <tr><th className="px-2 py-1 text-left">Nom</th><th className="px-2 py-1 text-right">Valeur</th></tr>
            </thead>
            <tbody>
              {(c.mockSeries ?? []).map((r, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="px-2 py-1">{r.x}</td>
                  <td className="px-2 py-1 text-right font-bold">{r.v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "table-grid":
      return wrap(
        <TableGridRenderer
          t={c.tableGrid!}
          editing={!!editing}
          onCellSelect={onCellSelect}
          selectedCells={selectedCells}
        />
      );
    case "text":
      return (
        <div
          className="h-full w-full flex items-center px-2"
          style={{
            ...style,
            justifyContent: c.align === "center" ? "center" : c.align === "right" ? "flex-end" : "flex-start",
          }}
        >
          <span style={{ fontSize: c.fontSize ?? 16, fontWeight: c.fontWeight ?? 700, color: c.fg, fontFamily: c.fontFamily }}>
            {c.text ?? c.label ?? ""}
          </span>
        </div>
      );
    case "image":
      return (
        <div className="h-full w-full bg-card overflow-hidden" style={{ borderRadius: c.radius, opacity: c.opacity, boxShadow: c.shadow && c.shadow !== "none" ? SHADOW[c.shadow] : undefined, borderColor: c.borderColor, borderWidth: c.borderWidth, borderStyle: c.borderStyle || (c.borderWidth ? "solid" : undefined) }}>
          {c.imageUrl ? (
            <img src={c.imageUrl} alt={c.label ?? ""} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">Image (URL vide)</div>
          )}
        </div>
      );
    case "divider":
      return <div className="w-full" style={{ height: (c.borderWidth ?? 2), background: c.bg ?? "var(--border)", opacity: c.opacity }} />;
    default:
      return <div>Unknown widget</div>;
  }
}

function TableGridRenderer({ t, editing, onCellSelect, selectedCells }: {
  t: TableGrid;
  editing: boolean;
  onCellSelect?: (r: number, c: number, add: boolean) => void;
  selectedCells?: string[];
}) {
  if (!t) return null;
  const isSel = (r: number, c: number) => selectedCells?.includes(`${r},${c}`);
  const colTemplate = t.colWidths?.length === t.cols
    ? t.colWidths.map((v) => `${v}fr`).join(" ")
    : `repeat(${t.cols}, minmax(0, 1fr))`;
  const rowTemplate = t.rowHeights?.length === t.rows
    ? t.rowHeights.map((v) => `${v}fr`).join(" ")
    : `repeat(${t.rows}, minmax(0, 1fr))`;

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < t.rows; r++) {
    for (let c = 0; c < t.cols; c++) {
      const cell: TableCell = t.cells.find((x) => x.r === r && x.c === c) ?? { r, c };
      if (cell.hidden) continue;
      const value = cell.kpiCode || cell.mockValue != null
        ? formatValue(cell)
        : cell.content ?? "";
      const isHead = cell.isHeader || (t.headerRow && r === 0) || (t.headerCol && c === 0);
      const zebra = t.zebra && !isHead && r % 2 === 1;
      cells.push(
        <div
          key={`${r},${c}`}
          className={`no-drag overflow-hidden text-xs px-2 py-1 flex items-center border border-border ${isSel(r, c) ? "outline outline-2 outline-primary z-10" : ""}`}
          style={{
            gridColumn: `${c + 1} / span ${cell.colSpan ?? 1}`,
            gridRow: `${r + 1} / span ${cell.rowSpan ?? 1}`,
            borderColor: t.borderColor,
            background: cell.bg ?? (isHead ? "var(--secondary)" : zebra ? "rgba(127,127,127,0.06)" : undefined),
            color: cell.fg,
            fontWeight: cell.fontWeight ?? (isHead ? 700 : undefined),
            fontSize: cell.fontSize,
            justifyContent: cell.align === "center" ? "center" : cell.align === "right" ? "flex-end" : "flex-start",
            textAlign: cell.align,
            cursor: editing ? "cell" : undefined,
          }}
          onClick={(e) => {
            if (!editing) return;
            e.stopPropagation();
            onCellSelect?.(r, c, e.shiftKey || e.ctrlKey || e.metaKey);
          }}
        >
          <span className="truncate w-full">{value || (editing ? <span className="text-muted-foreground/40">·</span> : "")}</span>
        </div>
      );
    }
  }

  return (
    <div
      className="h-full w-full grid"
      style={{ gridTemplateColumns: colTemplate, gridTemplateRows: rowTemplate }}
    >
      {cells}
    </div>
  );
}

function formatValue(cell: TableCell): string {
  if (cell.mockValue == null && !cell.kpiCode) return cell.content ?? "";
  const v = cell.mockValue;
  if (v == null) return cell.kpiCode ?? "";
  const s = typeof v === "number" ? v.toFixed(cell.decimals ?? 1).replace(".", ",") : String(v);
  return cell.unit ? `${s} ${cell.unit}` : s;
}
