import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Smartphone, ZoomIn } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Ribbon } from "@/components/pbi/Ribbon";
import { Canvas, PageTabs } from "@/components/pbi/Canvas";
import {
  BookmarksPane,
  FieldsPane,
  FiltersPane,
  SelectionPane,
  SyncSlicersPane,
  VisualizationsPane,
} from "@/components/pbi/Panes";
import { DaxDialog, PerformanceDialog, PowerQueryDialog, QnaDialog } from "@/components/pbi/Dialogs";
import { PbiProvider, usePbi } from "@/lib/pbi/store";
import { SALES } from "@/lib/pbi/model";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fabrix BI — Build interactive reports in the browser" },
      {
        name: "description",
        content:
          "A Power BI style report builder: free-form canvas, selection and bookmarks panes, cross-filtering, drill-down and 30+ visual types — all in the browser.",
      },
      { property: "og:title", content: "Fabrix BI — Build interactive reports in the browser" },
      {
        property: "og:description",
        content:
          "Drag fields onto a free-form canvas, cross-filter live charts, bookmark views and design mobile layouts. Frontend-only BI report designer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Workspace() {
  const [pq, setPq] = useState(false);
  const [dax, setDax] = useState(false);
  const [perf, setPerf] = useState(false);
  const [qna, setQna] = useState(false);
  const {
    rows,
    page,
    filters,
    openPanes,
    zoom,
    setZoom,
    mobileView,
    setState,
    editInteractions,
    drillthrough,
    clearDrillthrough,
  } = usePbi();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex items-center gap-3 bg-brand px-3 py-1.5 text-brand-foreground">
        <span className="text-[13px] font-semibold tracking-tight">Fabrix BI Desktop</span>
        <span className="text-[11px] opacity-80">Sales Analytics — Report view</span>
        <span className="ml-auto text-[11px] opacity-80">Import mode · Local model</span>
      </header>

      <Ribbon
        onOpenPowerQuery={() => setPq(true)}
        onOpenDax={() => setDax(true)}
        onOpenPerformance={() => setPerf(true)}
        onOpenQna={() => setQna(true)}
      />

      {editInteractions && (
        <div className="bg-brand/15 px-3 py-1 text-[11px] text-foreground">
          Edit interactions is on — select a source visual, then choose Filter / Highlight / None on
          each other visual.
        </div>
      )}
      {drillthrough && (
        <div className="flex items-center gap-2 bg-muted px-3 py-1 text-[11px]">
          Drillthrough: {drillthrough.column} = {drillthrough.value}
          <button onClick={clearDrillthrough} className="underline">
            Back
          </button>
        </div>
      )}

      <main className="flex min-h-0 flex-1">
        <section className="min-h-0 flex-1 overflow-auto bg-muted">
          <h1 className="sr-only">Interactive report canvas</h1>
          <Canvas />
        </section>
        {openPanes.selection && (
          <aside className="min-h-0 w-56 overflow-hidden border-l border-border bg-panel">
            <SelectionPane />
          </aside>
        )}
        {openPanes.bookmarks && (
          <aside className="min-h-0 w-52 overflow-hidden border-l border-border bg-panel">
            <BookmarksPane />
          </aside>
        )}
        {openPanes.syncSlicers && (
          <aside className="min-h-0 w-52 overflow-hidden border-l border-border bg-panel">
            <SyncSlicersPane />
          </aside>
        )}
        {openPanes.filters && (
          <aside className="min-h-0 w-56 overflow-hidden border-l border-border bg-panel">
            <FiltersPane />
          </aside>
        )}
        <aside className="min-h-0 w-60 overflow-hidden border-l border-border bg-panel">
          <VisualizationsPane />
        </aside>
        <aside className="min-h-0 w-56 overflow-hidden border-l border-border bg-panel">
          <FieldsPane />
        </aside>
      </main>

      <PageTabs />
      <footer className="flex items-center justify-between gap-4 border-t border-border bg-panel px-3 py-1 text-[10px] text-muted-foreground">
        <span>
          {page.visuals.length} visuals · {rows.length.toLocaleString()} of{" "}
          {SALES.length.toLocaleString()} rows in context · {filters.length} report filters
        </span>
        <span className="flex items-center gap-2">
          <button
            onClick={() => setState((s) => ({ ...s, mobileView: !s.mobileView }))}
            className={mobileView ? "text-brand-foreground" : ""}
            aria-label="Mobile layout"
          >
            <Smartphone className="size-3.5" />
          </button>
          <ZoomIn className="size-3.5" />
          <input
            type="range"
            min={30}
            max={200}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-32 accent-[var(--brand)]"
            aria-label="Zoom"
          />
          <span className="w-9 tabular-nums">{zoom}%</span>
        </span>
      </footer>

      <PowerQueryDialog open={pq} onClose={() => setPq(false)} />
      <DaxDialog open={dax} onClose={() => setDax(false)} />
      <PerformanceDialog open={perf} onClose={() => setPerf(false)} />
      <QnaDialog open={qna} onClose={() => setQna(false)} />
      <Toaster />
    </div>
  );
}

function Index() {
  return (
    <PbiProvider>
      <Workspace />
    </PbiProvider>
  );
}

