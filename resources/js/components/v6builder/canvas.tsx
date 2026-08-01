import { Copy, GripVertical, Lock, LockOpen, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logWidgetActivity } from "./activity";
import { toggleFieldOnWidget, type FieldRef } from "./field-binds";
import { useBuilder } from "./store";
import type { WidgetType } from "./types";
import { addRow, addCol, removeRow, removeCol, copyCells, pasteCells, withCell, ROW_HEIGHT } from "./types";
import { WidgetRenderer } from "./widget-renderer";

const COLS = 24;
const MIN_W = 1;
const MIN_H = 1;

type DragState = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  ox: number;
  oy: number;
  ow: number;
  oh: number;
};

export function Canvas() {
  const { widgets, mode, selectedId, select, removeWidget, duplicateWidget, toggleLock, addWidget, updateWidget, tableSel, setTableSel, tableCursor, setTableCursor, tableClipboard, setTableClipboard, undo, redo, updateConfig, colWidthPx, setColWidthPx } = useBuilder();
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const cw = el.clientWidth / COLS;
      setColWidthPx(Math.max(1, cw));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [setColWidthPx]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom((z) => Math.min(3, Math.max(0.25, z * factor)));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const contentW = useMemo(() => {
    const base = colWidthPx * COLS;
    if (widgets.length === 0) return base;
    return Math.max(base, ...widgets.map((w) => (w.x + w.w) * colWidthPx));
  }, [widgets, colWidthPx]);
  const contentH = useMemo(() => {
    const base = ROW_HEIGHT * 20;
    if (widgets.length === 0) return base;
    return Math.max(base, ...widgets.map((w) => (w.y + w.h) * ROW_HEIGHT));
  }, [widgets]);

  const clamp = (n: number) => Math.max(0, n);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    if (drag.mode === "move") {
      const dx = (e.clientX - drag.startX) / colWidthPx / zoom;
      const dy = (e.clientY - drag.startY) / ROW_HEIGHT / zoom;
      updateWidget(drag.id, {
        x: clamp(drag.ox + dx),
        y: clamp(drag.oy + dy),
      });
    } else {
      const dw = (e.clientX - drag.startX) / colWidthPx / zoom;
      const dh = (e.clientY - drag.startY) / ROW_HEIGHT / zoom;
      updateWidget(drag.id, {
        w: Math.max(MIN_W, drag.ow + dw),
        h: Math.max(MIN_H, drag.oh + dh),
      });
    }
  };

  const startDrag = (w: typeof widgets[number], kind: "move" | "resize", e: React.MouseEvent) => {
    if (mode !== "edit" || w.locked) return;
    e.stopPropagation();
    e.preventDefault();
    select(w.id);
    setDrag({
      id: w.id,
      mode: kind,
      startX: e.clientX,
      startY: e.clientY,
      ox: w.x,
      oy: w.y,
      ow: w.w,
      oh: w.h,
    });
  };

  // Table-grid cell navigation & clipboard (capture phase)
  useEffect(() => {
    if (mode !== "edit" || !selectedId) return;
    const widget = widgets.find((w) => w.id === selectedId);
    if (!widget || widget.type !== "table-grid" || !widget.config.tableGrid) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      const w = widgets.find((x) => x.id === selectedId);
      if (!w || !w.config.tableGrid) return;
      const tg = w.config.tableGrid;

      const cur = tableCursor[selectedId];
      const sel = tableSel[selectedId] ?? [];
      const activeWidget = widgets.find((x) => x.id === selectedId);

      if ((e.ctrlKey || e.metaKey) && e.key === "c" && sel.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const parsed = sel.map((k) => k.split(",").map(Number));
        const r1 = Math.min(...parsed.map((p) => p[0]));
        const r2 = Math.max(...parsed.map((p) => p[0]));
        const c1 = Math.min(...parsed.map((p) => p[1]));
        const c2 = Math.max(...parsed.map((p) => p[1]));
        setTableClipboard(copyCells(tg, r1, c1, r2, c2));
        if (activeWidget) logWidgetActivity("table.copy", activeWidget, { detail: { region: { r1, c1, r2, c2 } } });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "v" && cur && tableClipboard) {
        e.preventDefault();
        e.stopPropagation();
        const next = pasteCells(tg, cur[0], cur[1], tableClipboard);
        updateConfig(selectedId, { tableGrid: next });
        if (activeWidget) logWidgetActivity("table.paste", activeWidget, { detail: { at: cur } });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "x" && sel.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const parsed = sel.map((k) => k.split(",").map(Number));
        const r1 = Math.min(...parsed.map((p) => p[0]));
        const r2 = Math.max(...parsed.map((p) => p[0]));
        const c1 = Math.min(...parsed.map((p) => p[1]));
        const c2 = Math.max(...parsed.map((p) => p[1]));
        setTableClipboard(copyCells(tg, r1, c1, r2, c2));
        let next = tg;
        for (const [r, c] of parsed) next = withCell(next, r, c, { content: "" });
        updateConfig(selectedId, { tableGrid: next });
        if (activeWidget) logWidgetActivity("table.cut", activeWidget, { detail: { region: { r1, c1, r2, c2 } } });
        return;
      }

      if (cur && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        let [nr, nc] = cur;
        if (e.shiftKey) {
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

      if (e.key === "Enter" && cur) {
        e.preventDefault();
        e.stopPropagation();
        const nr = Math.min(tg.rows - 1, cur[0] + 1);
        setTableCursor((p) => ({ ...p, [selectedId]: [nr, cur[1]] }));
        setTableSel((p) => ({ ...p, [selectedId]: [`${nr},${cur[1]}`] }));
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setTableSel((p) => ({ ...p, [selectedId]: [] }));
        setTableCursor((p) => ({ ...p, [selectedId]: null }));
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && sel.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const parsed = sel.map((k) => k.split(",").map(Number));
        let next = tg;
        for (const [r, c] of parsed) next = withCell(next, r, c, { content: "" });
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    try {
      const raw =
        e.dataTransfer.getData("text/plain") ||
        e.dataTransfer.getData("application/json");
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        kind?: string;
        type?: string;
        config?: Record<string, unknown>;
        table?: string;
        name?: string;
        measure?: boolean;
        datasetSlug?: string;
      };

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const scrollLeft = containerRef.current?.scrollLeft ?? 0;
      const scrollTop = containerRef.current?.scrollTop ?? 0;
      const dropX = (e.clientX - rect.left + scrollLeft) / colWidthPx / zoom;
      const dropY = (e.clientY - rect.top + scrollTop) / ROW_HEIGHT / zoom;

      if (parsed.kind === "field" && parsed.table && parsed.name && parsed.type) {
        const target =
          widgets.find(
            (w) => dropX >= w.x && dropX < w.x + w.w && dropY >= w.y && dropY < w.y + w.h,
          ) ??
          widgets.find((w) => w.id === selectedId) ??
          null;
        if (target) {
          toggleFieldOnWidget(updateConfig, target, {
            table: parsed.table,
            name: parsed.name,
            type: parsed.type as FieldRef["type"],
            measure: parsed.measure,
            datasetSlug: parsed.datasetSlug,
          });
        }
        return;
      }

      if (!parsed.type) return;
      addWidget(parsed.type as WidgetType, {
        x: clamp(dropX),
        y: clamp(dropY),
        ...(parsed.config ? { config: parsed.config } : {}),
      });
    } catch { /* ignore invalid drops */ }
  }, [widgets, addWidget, updateConfig, selectedId, colWidthPx, zoom]);

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

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="h-full min-w-0 overflow-auto bg-background outline-none focus:ring-1 focus:ring-primary/30 relative z-0"
      onClick={(e) => { if (e.target === e.currentTarget) select(null); }}
      onMouseMove={mode === "edit" && drag ? onMouseMove : undefined}
      onMouseUp={mode === "edit" && drag ? () => setDrag(null) : undefined}
      onMouseLeave={mode === "edit" && drag ? () => setDrag(null) : undefined}
      onDragOver={(e) => { if (mode === "edit") e.preventDefault(); }}
      onDrop={(e) => { if (mode === "edit") handleDrop(e); }}
    >
      <div className="relative" style={{ width: contentW * zoom, height: contentH * zoom }}>
        <div className="relative" style={{ width: contentW, height: contentH, transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
          {widgets.map((w) => {
        const isSelected = selectedId === w.id;
        return (
          <div
            key={w.id}
            onMouseDownCapture={() => { if (mode === "edit") select(w.id); }}
            className={`group absolute rounded-lg ${isSelected ? "outline outline-2 outline-primary" : ""}`}
            style={{
              left: w.x * colWidthPx,
              top: w.y * ROW_HEIGHT,
              width: w.w * colWidthPx,
              height: w.h * ROW_HEIGHT,
            }}
          >
            <WidgetRenderer
              w={w}
              editing={mode === "edit"}
              onCellSelect={(r, c, add) => handleCellSelect(w.id, r, c, add)}
              selectedCells={tableSel[w.id]}
              cursor={tableCursor[w.id]}
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
                  setTableClipboard(copyCells(tg, r1, c1, r2, c2));
                } else {
                  setTableClipboard(copyCells(tg, r, c, r, c));
                }
                logWidgetActivity("table.copy", w, { detail: { from: [r, c] } });
              }}
              onPaste={(r, c) => {
                const tg = w.config.tableGrid;
                const clip = tableClipboard;
                if (tg && clip) {
                  updateConfig(w.id, { tableGrid: pasteCells(tg, r, c, clip) });
                  logWidgetActivity("table.paste", w, { detail: { at: [r, c] } });
                }
              }}
              onInsertRow={(r, pos) => {
                const tg = w.config.tableGrid;
                if (tg) {
                  updateConfig(w.id, { tableGrid: addRow(tg, pos === "after" ? r : r - 1) });
                  logWidgetActivity("table.row.add", w, { detail: { at: r, position: pos } });
                }
              }}
              onInsertCol={(c, pos) => {
                const tg = w.config.tableGrid;
                if (tg) {
                  updateConfig(w.id, { tableGrid: addCol(tg, pos === "after" ? c : c - 1) });
                  logWidgetActivity("table.col.add", w, { detail: { at: c, position: pos } });
                }
              }}
              onDeleteRow={(r) => {
                const tg = w.config.tableGrid;
                if (tg) {
                  updateConfig(w.id, { tableGrid: removeRow(tg, r) });
                  logWidgetActivity("table.row.delete", w, { detail: { at: r } });
                }
              }}
              onDeleteCol={(c) => {
                const tg = w.config.tableGrid;
                if (tg) {
                  updateConfig(w.id, { tableGrid: removeCol(tg, c) });
                  logWidgetActivity("table.col.delete", w, { detail: { at: c } });
                }
              }}
              onResize={(colWidths, rowHeights) => {
                const tg = w.config.tableGrid;
                if (tg) {
                  updateConfig(w.id, { tableGrid: { ...tg, colWidths, rowHeights } });
                  logWidgetActivity("table.resize", w, { detail: { colWidths, rowHeights } }, { key: `${w.id}:tgresize` });
                }
              }}
            />

            {mode === "edit" && (
              <>
                <div
                  onMouseDown={(e) => startDrag(w, "move", e)}
                  className={`absolute top-1 left-1 z-20 h-5 w-5 rounded bg-secondary hover:bg-secondary/80 text-foreground grid place-items-center shadow border border-border transition-opacity cursor-move ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  title={w.locked ? "Widget verrouillé" : "Glisser pour déplacer"}
                >
                  <GripVertical className="h-3 w-3" />
                </div>
                <div
                  onMouseDown={(e) => startDrag(w, "resize", e)}
                  className={`absolute bottom-0 right-0 z-20 h-3 w-3 cursor-nwse-resize rounded-sm bg-primary/70 hover:bg-primary transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                  title="Redimensionner"
                />
                {isSelected && (
                  <div className="absolute -top-3 -right-1 flex items-center gap-1 z-20">
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
              </>
            )}
          </div>
        );
        })}
        </div>
      </div>
      {widgets.length === 0 && (
        <div className="p-8 pt-64 text-center text-sm text-muted-foreground pointer-events-none">
          Ajoutez ou glissez un widget depuis la palette à gauche.
        </div>
      )}
    </div>
  );
}
