import { Copy, Lock, LockOpen, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WidthProvider, ReactGridLayout, type Layout, type LayoutItem } from "react-grid-layout/legacy";
import { fetchKpiList, type KpiSeed } from "@/lib/kpi-rows";
import KpiDetailModal from "./kpi-detail-modal";
import { useBuilder } from "./store";
import type { WidgetType } from "./types";
import { addRow, addCol, removeRow, removeCol, copyCells, pasteCells, withCell } from "./types";
import { useKpiData } from "./useKpiData";
import { WidgetRenderer } from "./widget-renderer";

const ResponsiveGrid = WidthProvider(ReactGridLayout);
const COLS = 24;
const KPI_COMPATIBLE = new Set(["kpi", "gauge", "sparkline", "line", "bar", "pareto", "donut", "pie", "radar", "area", "combo", "table"]);

export function Canvas() {
  const { widgets, mode, setLayoutBulk, selectedId, select, removeWidget, duplicateWidget, toggleLock, addWidget, updateWidget, tableSel, setTableSel, tableCursor, setTableCursor, tableClipboard, setTableClipboard, undo, redo, kpiRefreshTick, updateConfig, widgetGap } = useBuilder();
  const containerRef = useRef<HTMLDivElement>(null);

  const kpiCodes = useMemo(() => {
    const codes: string[] = [];
    for (const w of widgets) {
      if (w.config.kpiCode) codes.push(w.config.kpiCode);
      if (w.config.tableGrid?.cells) {
        for (const cell of w.config.tableGrid.cells) {
          if (cell.kpiCode) codes.push(cell.kpiCode);
        }
      }
    }
    return [...new Set(codes)];
  }, [widgets]);
  const { data: kpiData, loading: kpiLoading } = useKpiData(kpiCodes, kpiRefreshTick);
  const layout: Layout = widgets.map((w) => ({
    i: w.id, x: w.x, y: w.y, w: w.w, h: w.h,
    static: !!w.locked || mode !== "edit",
  }));

  // KPI list for modal metadata
  const [kpiList, setKpiList] = useState<KpiSeed[]>([]);
  useEffect(() => { fetchKpiList().then(setKpiList); }, []);

  // Detail modal state
  const [detailModal, setDetailModal] = useState<{ kpiCode: string } | null>(null);

  // Table-grid cell navigation & clipboard (capture phase, runs before widget movement)
  useEffect(() => {
    if (mode !== "edit" || !selectedId) return;
    const widget = widgets.find((w) => w.id === selectedId);
    if (!widget || widget.type !== "table-grid" || !widget.config.tableGrid) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      // Read fresh state on each keystroke
      const w = widgets.find((x) => x.id === selectedId);
      if (!w || !w.config.tableGrid) return;
      const tg = w.config.tableGrid;

      const cur = tableCursor[selectedId];
      const sel = tableSel[selectedId] ?? [];

      // Ctrl+C: copy
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && sel.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const parsed = sel.map((k) => k.split(",").map(Number));
        const r1 = Math.min(...parsed.map((p) => p[0]));
        const r2 = Math.max(...parsed.map((p) => p[0]));
        const c1 = Math.min(...parsed.map((p) => p[1]));
        const c2 = Math.max(...parsed.map((p) => p[1]));
        setTableClipboard((p) => ({ ...p, [selectedId]: copyCells(tg, r1, c1, r2, c2) }));
        return;
      }

      // Ctrl+V: paste
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && cur && tableClipboard[selectedId]) {
        e.preventDefault();
        e.stopPropagation();
        const next = pasteCells(tg, cur[0], cur[1], tableClipboard[selectedId]!);
        updateConfig(selectedId, { tableGrid: next });
        return;
      }

      // Ctrl+X: cut (copy then clear)
      if ((e.ctrlKey || e.metaKey) && e.key === "x" && sel.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const parsed = sel.map((k) => k.split(",").map(Number));
        const r1 = Math.min(...parsed.map((p) => p[0]));
        const r2 = Math.max(...parsed.map((p) => p[0]));
        const c1 = Math.min(...parsed.map((p) => p[1]));
        const c2 = Math.max(...parsed.map((p) => p[1]));
        setTableClipboard((p) => ({ ...p, [selectedId]: copyCells(tg, r1, c1, r2, c2) }));
        // Clear copied cells
        let next = tg;
        for (const [r, c] of parsed) next = withCell(next, r, c, { content: "", kpiCode: undefined, displayMode: undefined });
        updateConfig(selectedId, { tableGrid: next });
        return;
      }

      // Arrow keys: cell navigation
      if (cur && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        let [nr, nc] = cur;
        if (e.shiftKey) {
          // Range select: extend selection by toggling the next cell
          if (e.key === "ArrowLeft") nc = Math.max(0, nc - 1);
          if (e.key === "ArrowRight") nc = Math.min(tg.cols - 1, nc + 1);
          if (e.key === "ArrowUp") nr = Math.max(0, nr - 1);
          if (e.key === "ArrowDown") nr = Math.min(tg.rows - 1, nr + 1);
          const key = `${nr},${nc}`;
          setTableSel((p) => {
            const cur2 = p[selectedId] ?? [];
            return { ...p, [selectedId]: cur2.includes(key) ? cur2.filter((k) => k !== key) : [...cur2, key] };
          });
          setTableCursor((p) => ({ ...p, [selectedId]: [nr, nc] }));
        } else {
          if (e.key === "ArrowLeft") nc = Math.max(0, nc - 1);
          if (e.key === "ArrowRight") nc = Math.min(tg.cols - 1, nc + 1);
          if (e.key === "ArrowUp") nr = Math.max(0, nr - 1);
          if (e.key === "ArrowDown") nr = Math.min(tg.rows - 1, nr + 1);
          setTableCursor((p) => ({ ...p, [selectedId]: [nr, nc] }));
          setTableSel((p) => ({ ...p, [selectedId]: [`${nr},${nc}`] }));
        }
        return;
      }

      // Tab: move to next/prev cell
      if (e.key === "Tab" && cur) {
        e.preventDefault();
        e.stopPropagation();
        let [nr, nc] = cur;
        if (e.shiftKey) {
          nc--;
          if (nc < 0) { nc = tg.cols - 1; nr = Math.max(0, nr - 1); }
        } else {
          nc++;
          if (nc >= tg.cols) { nc = 0; nr = Math.min(tg.rows - 1, nr + 1); }
        }
        setTableCursor((p) => ({ ...p, [selectedId]: [nr, nc] }));
        setTableSel((p) => ({ ...p, [selectedId]: [`${nr},${nc}`] }));
        return;
      }

      // Enter: move cursor down
      if (e.key === "Enter" && cur) {
        e.preventDefault();
        e.stopPropagation();
        const nr = Math.min(tg.rows - 1, cur[0] + 1);
        setTableCursor((p) => ({ ...p, [selectedId]: [nr, cur[1]] }));
        setTableSel((p) => ({ ...p, [selectedId]: [`${nr},${cur[1]}`] }));
        return;
      }

      // Escape: clear selection and cursor
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setTableSel((p) => ({ ...p, [selectedId]: [] }));
        setTableCursor((p) => ({ ...p, [selectedId]: null }));
        return;
      }

      // Delete/Backspace: clear selected cells content
      if ((e.key === "Delete" || e.key === "Backspace") && sel.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const parsed = sel.map((k) => k.split(",").map(Number));
        let next = tg;
        for (const [r, c] of parsed) next = withCell(next, r, c, { content: "", kpiCode: undefined, displayMode: undefined });
        updateConfig(selectedId, { tableGrid: next });
        return;
      }
    };

    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [mode, selectedId, widgets, tableCursor, tableClipboard, tableSel, setTableCursor, setTableSel, setTableClipboard, updateConfig]);

  // Arrow key navigation for selected widget
  useEffect(() => {
    if (mode !== "edit" || !selectedId) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      const widget = widgets.find((w) => w.id === selectedId);
      if (!widget || widget.locked) return;
      // Table-grid cells handle their own keyboard navigation
      if (widget.type === "table-grid") return;
      const shift = e.shiftKey ? 3 : 1;
      let dx = 0, dy = 0;
      switch (e.key) {
        case "ArrowLeft": dx = -shift; break;
        case "ArrowRight": dx = shift; break;
        case "ArrowUp": dy = -shift; break;
        case "ArrowDown": dy = shift; break;
        case "Delete":
        case "Backspace":
          if (target === containerRef.current || containerRef.current?.contains(target)) {
            e.preventDefault();
            removeWidget(selectedId);
          }
          return;
        default: return;
      }
      e.preventDefault();
      updateWidget(selectedId, {
        x: Math.max(0, Math.min(COLS - widget.w, widget.x + dx)),
        y: Math.max(0, widget.y + dy),
      });
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mode, selectedId, widgets, updateWidget, removeWidget]);

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [undo, redo]);

  const handleDrop = useCallback((layout: Layout, item: LayoutItem | undefined, e: Event) => {
    try {
      const dragEvent = e as DragEvent;
      const data = dragEvent.dataTransfer?.getData("application/json");
      if (!data) return;
      const parsed = JSON.parse(data) as { type: WidgetType; config?: Record<string, unknown> };
      const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
      addWidget(parsed.type, {
        x: item?.x ?? 0,
        y: item?.y ?? maxY,
        ...(parsed.config ? { config: parsed.config } : {}),
      });
    } catch { /* ignore invalid drops */ }
  }, [widgets, addWidget]);

  const handleCellSelect = (widgetId: string, r: number, c: number, add: boolean) => {
    setTableCursor((prev) => ({ ...prev, [widgetId]: [r, c] }));
    setTableSel((prev) => {
      const key = `${r},${c}`;
      const cur = prev[widgetId] ?? [];
      if (add) {
        return { ...prev, [widgetId]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
      }
      return { ...prev, [widgetId]: [key] };
    });
  };

  const handleWidgetClick = (w: typeof widgets[number]) => {
    if (mode === "view" && w.config.kpiCode && KPI_COMPATIBLE.has(w.type)) {
      setDetailModal({ kpiCode: w.config.kpiCode });
    }
  };

  const modalKpiCode = detailModal?.kpiCode;
  const modalKpiData = modalKpiCode ? kpiData.get(modalKpiCode) : undefined;
  const modalKpiSeed = modalKpiCode ? kpiList.find((k) => k.kpi === modalKpiCode) : undefined;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="flex-1 min-w-0 overflow-auto bg-background outline-none focus:ring-1 focus:ring-primary/30 relative"
      onClick={(e) => { if (e.target === e.currentTarget) select(null); }}
    >
      {kpiLoading && (
        <div className="absolute top-0 left-0 right-0 z-30 h-0.5 bg-primary/20">
          <div className="h-full bg-primary animate-pulse w-full" />
        </div>
      )}
      <ResponsiveGrid
        className="layout"
        layout={layout}
        cols={24}
        rowHeight={30}
        margin={[widgetGap, widgetGap]}
        isDraggable={mode === "edit"}
        isResizable={mode === "edit"}
        isDroppable={mode === "edit"}
        onDrop={handleDrop}
        onLayoutChange={(l: Layout) =>
          setLayoutBulk(l.map((it: LayoutItem) => ({ i: it.i, x: it.x, y: it.y, w: it.w, h: it.h })))
        }
        draggableCancel=".no-drag,input,textarea,button,select"
      >
        {widgets.map((w) => {
          const isSelected = selectedId === w.id;
          return (
            <div
              key={w.id}
              onMouseDownCapture={() => { if (mode === "edit") select(w.id); }}
              onClick={() => handleWidgetClick(w)}
              className={`relative group ${mode === "edit" ? "cursor-move" : "cursor-pointer"} ${isSelected ? "outline outline-2 outline-primary rounded-lg" : ""}`}
            >
              <WidgetRenderer
                w={w}
                editing={mode === "edit"}
                onCellSelect={(r, c, add) => handleCellSelect(w.id, r, c, add)}
                onCellKpiClick={(kpiCode) => setDetailModal({ kpiCode })}
                selectedCells={tableSel[w.id]}
                cursor={tableCursor[w.id]}
                kpiData={kpiData}
                onCopy={(r, c) => {
                  const tg = w.config.tableGrid;
                  if (!tg) return;
                  const sel = tableSel[w.id] ?? [];
                  if (sel.length > 0) {
                    const parsed = sel.map((k) => k.split(",").map(Number));
                    const r1 = Math.min(...parsed.map((p) => p[0]));
                    const r2 = Math.max(...parsed.map((p) => p[0]));
                    const c1 = Math.min(...parsed.map((p) => p[1]));
                    const c2 = Math.max(...parsed.map((p) => p[1]));
                    setTableClipboard((p) => ({ ...p, [w.id]: copyCells(tg, r1, c1, r2, c2) }));
                  } else {
                    setTableClipboard((p) => ({ ...p, [w.id]: copyCells(tg, r, c, r, c) }));
                  }
                }}
                onPaste={(r, c) => {
                  const tg = w.config.tableGrid;
                  const clip = tableClipboard[w.id];
                  if (tg && clip) updateConfig(w.id, { tableGrid: pasteCells(tg, r, c, clip) });
                }}
                onInsertRow={(r, pos) => {
                  const tg = w.config.tableGrid;
                  if (tg) updateConfig(w.id, { tableGrid: addRow(tg, pos === "after" ? r : r - 1) });
                }}
                onInsertCol={(c, pos) => {
                  const tg = w.config.tableGrid;
                  if (tg) updateConfig(w.id, { tableGrid: addCol(tg, pos === "after" ? c : c - 1) });
                }}
                onDeleteRow={(r) => {
                  const tg = w.config.tableGrid;
                  if (tg) updateConfig(w.id, { tableGrid: removeRow(tg, r) });
                }}
                onDeleteCol={(c) => {
                  const tg = w.config.tableGrid;
                  if (tg) updateConfig(w.id, { tableGrid: removeCol(tg, c) });
                }}
                onResize={(colWidths, rowHeights) => {
                  const tg = w.config.tableGrid;
                  if (tg) updateConfig(w.id, { tableGrid: { ...tg, colWidths, rowHeights } });
                }}
              />
              {mode === "edit" && isSelected && (
                <div className="no-drag absolute -top-3 -right-1 flex items-center gap-1 z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleLock(w.id); }}
                    className="h-5 w-5 rounded bg-secondary hover:bg-secondary/80 text-foreground grid place-items-center shadow border border-border"
                    title={w.locked ? "Déverrouiller" : "Verrouiller"}
                  >
                    {w.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); duplicateWidget(w.id); }}
                    className="h-5 w-5 rounded bg-secondary hover:bg-secondary/80 text-foreground grid place-items-center shadow border border-border"
                    title="Dupliquer"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeWidget(w.id); }}
                    className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground grid place-items-center shadow"
                    title="Supprimer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {widgets.length === 0 && <div key="__empty" />}
      </ResponsiveGrid>
      {widgets.length === 0 && (
        <div className="p-8 pt-64 text-center text-sm text-muted-foreground pointer-events-none">
          Ajoutez ou glissez un widget depuis la palette à gauche.
        </div>
      )}

      {/* KPI Detail Modal */}
      {detailModal && (
        <KpiDetailModal
          kpiCode={detailModal.kpiCode}
          kpiData={modalKpiData}
          kpiSeed={modalKpiSeed}
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  );
}
