import { WidthProvider, ReactGridLayout, type Layout, type LayoutItem } from "react-grid-layout/legacy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBuilder } from "./store";
import { WidgetRenderer } from "./widget-renderer";
import { useKpiData } from "./useKpiData";
import { fetchKpiList, type KpiSeed } from "@/lib/kpi-rows";
import KpiDetailModal from "./kpi-detail-modal";
import { Copy, Lock, LockOpen, X } from "lucide-react";
import type { WidgetType } from "./types";

const ResponsiveGrid = WidthProvider(ReactGridLayout);
const COLS = 24;
const KPI_COMPATIBLE = new Set(["kpi", "gauge", "sparkline", "line", "bar", "pareto", "donut", "pie", "radar", "area", "combo", "table"]);

export function Canvas() {
  const { widgets, mode, setLayoutBulk, selectedId, select, removeWidget, duplicateWidget, toggleLock, addWidget, updateWidget, tableSel, setTableSel, undo, redo } = useBuilder();
  const containerRef = useRef<HTMLDivElement>(null);

  const kpiCodes = useMemo(() => widgets.filter((w) => w.config.kpiCode).map((w) => w.config.kpiCode!), [widgets]);
  const kpiData = useKpiData(kpiCodes);
  const layout: Layout = widgets.map((w) => ({
    i: w.id, x: w.x, y: w.y, w: w.w, h: w.h,
    static: !!w.locked || mode !== "edit",
  }));

  // KPI list for modal metadata
  const [kpiList, setKpiList] = useState<KpiSeed[]>([]);
  useEffect(() => { fetchKpiList().then(setKpiList); }, []);

  // Detail modal state
  const [detailModal, setDetailModal] = useState<{ kpiCode: string } | null>(null);

  // Arrow key navigation for selected widget
  useEffect(() => {
    if (mode !== "edit" || !selectedId) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      const widget = widgets.find((w) => w.id === selectedId);
      if (!widget || widget.locked) return;
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
      className="flex-1 min-w-0 overflow-auto bg-background outline-none focus:ring-1 focus:ring-primary/30"
      onClick={(e) => { if (e.target === e.currentTarget) select(null); }}
    >
      <ResponsiveGrid
        className="layout"
        layout={layout}
        cols={24}
        rowHeight={30}
        margin={[8, 8]}
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
                selectedCells={tableSel[w.id]}
                kpiData={kpiData}
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
