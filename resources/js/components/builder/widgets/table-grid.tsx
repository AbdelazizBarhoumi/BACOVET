import { GripVertical } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { TableCell, TableGrid, WidgetConfig } from "../types";
import { boxStyle, wrap, type KpiDataMap } from "./shared";

type ContextMenuItem =
  | { label: string; shortcut?: string; action: () => void; destructive?: boolean }
  | { type: "separator" };

export function TableGridWidget({ c, editing, onCellSelect, onCellKpiClick, selectedCells, cursor, kpiData,
  onCopy, onPaste, onInsertRow, onInsertCol, onDeleteRow, onDeleteCol, onResize }: {
  c: WidgetConfig;
  editing: boolean;
  onCellSelect?: (r: number, c: number, add: boolean) => void;
  onCellKpiClick?: (kpiCode: string) => void;
  selectedCells?: string[];
  cursor?: [number, number] | null;
  kpiData?: KpiDataMap;
  onCopy?: (r: number, c: number) => void;
  onPaste?: (r: number, c: number) => void;
  onInsertRow?: (r: number, position: "before" | "after") => void;
  onInsertCol?: (c: number, position: "before" | "after") => void;
  onDeleteRow?: (r: number) => void;
  onDeleteCol?: (c: number) => void;
  onResize?: (colWidths: number[], rowHeights: number[]) => void;
}) {
  return (
    <div className="h-full w-full relative group/tg">
      {wrap(c, boxStyle(c), (
        <TableGridRenderer t={c.tableGrid!} editing={editing} onCellSelect={onCellSelect}
          onCellKpiClick={onCellKpiClick} selectedCells={selectedCells} cursor={cursor} kpiData={kpiData}
          onCopy={onCopy} onPaste={onPaste} onInsertRow={onInsertRow} onInsertCol={onInsertCol}
          onDeleteRow={onDeleteRow} onDeleteCol={onDeleteCol} onResize={onResize} />
      ))}
      {editing && (
        <div className="absolute top-1 right-1 z-20 opacity-0 group-hover/tg:opacity-100 transition-opacity">
          <div className="h-6 w-6 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center shadow border border-border cursor-grab active:cursor-grabbing" title="Glisser pour déplacer">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      )}
    </div>
  );
}

function TableGridRenderer({ t, editing, onCellSelect, onCellKpiClick, selectedCells, cursor, kpiData,
  onCopy, onPaste, onInsertRow, onInsertCol, onDeleteRow, onDeleteCol, onResize }: {
  t: TableGrid;
  editing: boolean;
  onCellSelect?: (r: number, c: number, add: boolean) => void;
  onCellKpiClick?: (kpiCode: string) => void;
  selectedCells?: string[];
  cursor?: [number, number] | null;
  kpiData?: KpiDataMap;
  onCopy?: (r: number, c: number) => void;
  onPaste?: (r: number, c: number) => void;
  onInsertRow?: (r: number, position: "before" | "after") => void;
  onInsertCol?: (c: number, position: "before" | "after") => void;
  onDeleteRow?: (r: number) => void;
  onDeleteCol?: (c: number) => void;
  onResize?: (colWidths: number[], rowHeights: number[]) => void;
}) {
  if (!t) return null;
  const isSel = (r: number, c: number) => selectedCells?.includes(`${r},${c}`);
  const isCursor = (r: number, c: number) => cursor && cursor[0] === r && cursor[1] === c;
  const colTemplate = t.colWidths?.length === t.cols
    ? t.colWidths.map((v) => `${v}fr`).join(" ")
    : `repeat(${t.cols}, minmax(0, 1fr))`;
  const rowTemplate = t.rowHeights?.length === t.rows
    ? t.rowHeights.map((v) => `${v}fr`).join(" ")
    : `repeat(${t.rows}, minmax(0, 1fr))`;

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{ r: number; c: number; x: number; y: number } | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) {
        setCtxMenu(null);
      }
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [ctxMenu]);

  const handleContextMenu = useCallback((r: number, c: number, e: React.MouseEvent) => {
    if (!editing) return;
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ r, c, x: e.clientX, y: e.clientY });
  }, [editing]);

  const ctxItems: ContextMenuItem[] = ctxMenu ? [
    { label: "Copier", shortcut: "Ctrl+C", action: () => { onCopy?.(ctxMenu.r, ctxMenu.c); setCtxMenu(null); } },
    { label: "Coller", shortcut: "Ctrl+V", action: () => { onPaste?.(ctxMenu.r, ctxMenu.c); setCtxMenu(null); } },
    { type: "separator" },
    { label: "Insérer ligne au-dessus", action: () => { onInsertRow?.(ctxMenu.r, "before"); setCtxMenu(null); } },
    { label: "Insérer ligne en dessous", action: () => { onInsertRow?.(ctxMenu.r, "after"); setCtxMenu(null); } },
    { label: "Insérer colonne à gauche", action: () => { onInsertCol?.(ctxMenu.c, "before"); setCtxMenu(null); } },
    { label: "Insérer colonne à droite", action: () => { onInsertCol?.(ctxMenu.c, "after"); setCtxMenu(null); } },
    { type: "separator" },
    { label: "Supprimer ligne", destructive: true, action: () => { onDeleteRow?.(ctxMenu.r); setCtxMenu(null); } },
    { label: "Supprimer colonne", destructive: true, action: () => { onDeleteCol?.(ctxMenu.c); setCtxMenu(null); } },
  ] : [];

  // ── Column/Row resize via drag ──
  const gridRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ type: "col" | "row"; index: number; start: number; widths: number[]; heights: number[] } | null>(null);

  const getDefaultWidths = useCallback(() => Array(t.cols).fill(1), [t.cols]);
  const getDefaultHeights = useCallback(() => Array(t.rows).fill(1), [t.rows]);
  const widths = t.colWidths?.length === t.cols ? t.colWidths : getDefaultWidths();
  const heights = t.rowHeights?.length === t.rows ? t.rowHeights : getDefaultHeights();

  const onColResizeStart = useCallback((colIndex: number, e: React.MouseEvent) => {
    if (!editing || !onResize || !gridRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { type: "col", index: colIndex, start: e.clientX, widths: [...widths], heights: [...heights] };
    const onMove = (ev: MouseEvent) => {
      const ctx = resizeRef.current;
      if (!ctx || ctx.type !== "col" || !gridRef.current) return;
      const gridRect = gridRef.current.getBoundingClientRect();
      const totalFr = ctx.widths.reduce((a, b) => a + b, 0);
      const pxPerFr = gridRect.width / totalFr;
      const dx = ev.clientX - ctx.start;
      const dFr = dx / pxPerFr;
      const newWidths = [...ctx.widths];
      newWidths[ctx.index] = Math.max(0.2, ctx.widths[ctx.index] + dFr);
      onResize(newWidths, ctx.heights);
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [editing, onResize, widths, heights]);

  const onRowResizeStart = useCallback((rowIndex: number, e: React.MouseEvent) => {
    if (!editing || !onResize || !gridRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { type: "row", index: rowIndex, start: e.clientY, widths: [...widths], heights: [...heights] };
    const onMove = (ev: MouseEvent) => {
      const ctx = resizeRef.current;
      if (!ctx || ctx.type !== "row" || !gridRef.current) return;
      const gridRect = gridRef.current.getBoundingClientRect();
      const totalFr = ctx.heights.reduce((a, b) => a + b, 0);
      const pxPerFr = gridRect.height / totalFr;
      const dy = ev.clientY - ctx.start;
      const dFr = dy / pxPerFr;
      const newHeights = [...ctx.heights];
      newHeights[ctx.index] = Math.max(0.2, ctx.heights[ctx.index] + dFr);
      onResize(ctx.widths, newHeights);
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [editing, onResize, widths, heights]);

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < t.rows; r++) {
    for (let c = 0; c < t.cols; c++) {
      const cell: TableCell = t.cells.find((x) => x.r === r && x.c === c) ?? { r, c };
      if (cell.hidden) continue;
      const value = cell.kpiCode
        ? formatValue(cell, kpiData)
        : cell.content ?? "";
      const isHead = cell.isHeader || (t.headerRow && r === 0) || (t.headerCol && c === 0);
      const zebra = t.zebra && !isHead && r % 2 === 1;

      // Status color for KPI values
      let statusColor: string | undefined;
      if (cell.kpiCode && cell.displayMode === "value") {
        const kpiResult = kpiData?.get(cell.kpiCode);
        const st = kpiResult?.status;
        if (st === "green") statusColor = "#22c55e";
        else if (st === "orange") statusColor = "#f59e0b";
        else if (st === "red") statusColor = "#ef4444";
      }

      const selected = isSel(r, c);
      const active = isCursor(r, c);

      cells.push(
        <div
          key={`${r},${c}`}
          className={`no-drag overflow-hidden text-xs px-2 py-1 flex items-center border border-border ${selected ? "outline outline-2 outline-primary z-10" : ""} ${active ? "ring-2 ring-blue-500" : ""}`}
          style={{
            gridColumn: `${c + 1} / span ${cell.colSpan ?? 1}`,
            gridRow: `${r + 1} / span ${cell.rowSpan ?? 1}`,
            borderColor: t.borderColor,
            background: cell.bg ?? (isHead ? "var(--secondary)" : zebra ? "rgba(127,127,127,0.06)" : undefined),
            color: statusColor ?? cell.fg,
            fontWeight: cell.fontWeight ?? (isHead ? 700 : undefined),
            fontSize: cell.fontSize,
            justifyContent: cell.align === "center" ? "center" : cell.align === "right" ? "flex-end" : "flex-start",
            textAlign: cell.align,
            cursor: editing ? "cell" : cell.kpiCode ? "pointer" : undefined,
          }}
          onClick={(e) => {
            if (editing) {
              e.stopPropagation();
              onCellSelect?.(r, c, e.shiftKey || e.ctrlKey || e.metaKey);
            } else if (cell.kpiCode && onCellKpiClick) {
              e.stopPropagation();
              onCellKpiClick(cell.kpiCode);
            }
          }}
          onContextMenu={(e) => handleContextMenu(r, c, e)}
        >
          <span className="truncate w-full">{value || (editing ? <span className="text-muted-foreground/40">·</span> : "")}</span>
        </div>
      );
    }
  }

  return (
    <div ref={gridRef} className="h-full w-full grid relative" style={{ gridTemplateColumns: colTemplate, gridTemplateRows: rowTemplate }}>
      {cells}
      {/* Column resize handles */}
      {editing && widths.map((_, ci) => {
        if (ci === 0) return null;
        return (
          <div
            key={`col-resize-${ci}`}
            className="absolute top-0 bottom-0 w-1 cursor-col-resize z-20 hover:bg-primary/40 transition-colors"
            style={{ left: `calc(${(widths.slice(0, ci).reduce((a, b) => a + b, 0) / widths.reduce((a, b) => a + b, 0)) * 100}% - 2px)` }}
            onMouseDown={(e) => onColResizeStart(ci - 1, e)}
          />
        );
      })}
      {/* Row resize handles */}
      {editing && heights.map((_, ri) => {
        if (ri === 0) return null;
        return (
          <div
            key={`row-resize-${ri}`}
            className="absolute left-0 right-0 h-1 cursor-row-resize z-20 hover:bg-primary/40 transition-colors"
            style={{ top: `calc(${(heights.slice(0, ri).reduce((a, b) => a + b, 0) / heights.reduce((a, b) => a + b, 0)) * 100}% - 2px)` }}
            onMouseDown={(e) => onRowResizeStart(ri - 1, e)}
          />
        );
      })}
      {ctxMenu && (
        <ContextMenu ref={ctxRef} x={ctxMenu.x} y={ctxMenu.y} items={ctxItems} onClose={() => setCtxMenu(null)} />
      )}
    </div>
  );
}

const ContextMenu = ({ ref, x, y, items, onClose }: {
  ref: React.RefObject<HTMLDivElement | null>;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}) => {
  // Position: clamp to viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - items.length * 32),
    zIndex: 9999,
  };

  return createPortal(
    <div ref={ref} style={style}
      className="bg-popover border border-border rounded-md shadow-lg py-1 min-w-[200px] text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => {
        if ("type" in item && item.type === "separator") {
          return <div key={i} className="h-px bg-border my-1" />;
        }
        const mi = item as { label: string; shortcut?: string; action: () => void; destructive?: boolean };
        return (
          <button key={i}
            className={`w-full text-left px-3 py-1.5 hover:bg-secondary flex items-center justify-between gap-4 ${mi.destructive ? "text-destructive" : ""}`}
            onClick={mi.action}
          >
            <span>{mi.label}</span>
            {mi.shortcut && <span className="text-muted-foreground text-[10px]">{mi.shortcut}</span>}
          </button>
        );
      })}
    </div>,
    document.body
  );
};

function formatValue(cell: TableCell, kpiData?: KpiDataMap): string {
  if (!cell.kpiCode) return cell.content ?? "";

  // Show actual value if displayMode is "value"
  if (cell.displayMode === "value") {
    const kpiResult = kpiData?.get(cell.kpiCode);
    if (kpiResult && kpiResult.scalar_value !== null) {
      const decimals = cell.decimals ?? 1;
      const unit = cell.unit ?? "";
      return `${kpiResult.scalar_value.toFixed(decimals).replace(".", ",")}${unit}`;
    }
    return "—";
  }

  // Default: show KPI name (stored in content) or fallback to code
  return cell.content || cell.kpiCode;
}
