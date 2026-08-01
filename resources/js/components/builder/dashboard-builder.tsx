import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { logActivity, setPageContext } from "@/lib/activity";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { Palette } from "./palette";
import { BuilderProvider } from "./store";
import { useBuilder } from "./store";
import { BuilderToolbar } from "./toolbar";
import type { Widget } from "./types";

export function DashboardBuilder({
  pageId, pageDbId, title, defaultLayout, apiBase,
}: { pageId: string; pageDbId: number; title: string; defaultLayout: Widget[]; apiBase?: string }) {
  const loggedViewRef = useRef(false);

  useEffect(() => {
    setPageContext({ page_id: pageDbId, page_slug: pageId, page_name: title });
    if (!loggedViewRef.current) {
      loggedViewRef.current = true;
      logActivity("page.view");
    }
  }, [pageDbId, pageId, title]);

  return (
    <BuilderProvider pageId={pageId} pageDbId={pageDbId} defaultLayout={defaultLayout} apiBase={apiBase}>
      <BuilderShell title={title} />
    </BuilderProvider>
  );
}

function BuilderShell({ title }: { title: string }) {
  const { mode, selectedId } = useBuilder();
  const [paletteOpen, setPaletteOpen] = useState(true);
  const showInspector = mode === "edit" && !!selectedId;

  return (
    <div className="flex flex-col h-[calc(100vh-40px)]">
      <BuilderToolbar title={title} />
      <div className="flex-1 flex min-h-0">
        {mode === "edit" && (
          <>
            {paletteOpen ? (
              <div className="relative">
                <Palette />
                <button
                  onClick={() => setPaletteOpen(false)}
                  className="absolute top-2 right-2 h-6 w-6 rounded bg-secondary hover:bg-secondary/80 flex items-center justify-center z-10"
                  title="Fermer la palette"
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPaletteOpen(true)}
                className="w-8 shrink-0 border-r border-border bg-card/40 hover:bg-secondary flex items-center justify-center"
                title="Ouvrir la palette"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}
          </>
        )}
        <div className="relative flex-1 min-w-0 min-h-0">
          <Canvas />
          {showInspector && <Inspector />}
        </div>
      </div>
    </div>
  );
}
