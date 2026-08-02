import { FileDown, FileImage, FileSpreadsheet, FileText, Image, Presentation } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logActivity } from "../activity";
import { useBuilder } from "../store";
import { exportCsv, exportExcel, exportImageFile, exportPdfFile, exportPptxFile, type ExportStats } from "./export";

type ExportItem = { key: string; label: string; icon: typeof FileText; run: () => Promise<ExportStats | void> };

export function ExporterButton({ title }: { title: string }) {
  const {
    widgets,
    allMeasures,
    filteredRowsBySlug,
    rowsBySlug,
    datasets,
    crossFilter,
    theme,
    slicerSelections,
    slicerDateRanges,
    slicerTopN,
  } = useBuilder();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const state = { allMeasures, filteredRowsBySlug, rowsBySlug, datasets, crossFilter, theme };
  const filters = { slicerSelections, slicerDateRanges, slicerTopN };
  const meta = { title };

  const items: ExportItem[] = [
    { key: "xlsx", label: "Excel (.xlsx)", icon: FileSpreadsheet, run: async () => exportExcel(state, widgets, filters, meta) },
    { key: "csv", label: "CSV", icon: FileText, run: async () => exportCsv(state, widgets, filters, meta) },
    { key: "pdf", label: "PDF", icon: FileImage, run: async () => exportPdfFile(state, widgets, meta) },
    { key: "image", label: "Image PNG", icon: Image, run: async () => exportImageFile(state, widgets, meta) },
    { key: "pptx", label: "PowerPoint (.pptx)", icon: Presentation, run: async () => exportPptxFile(state, widgets, meta) },
  ];

  const execute = async (item: ExportItem) => {
    setBusy(item.key);
    setOpen(false);
    try {
      const stats = (await item.run()) ?? null;
      toast.success(`Export ${item.key.toUpperCase()} terminé`);
      if (stats) {
        logActivity(`export.${item.key}`, {
          detail: { widgetCount: stats.widgetCount, dataWidgetCount: stats.dataWidgetCount, rowCount: stats.rowCount },
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Échec de l'export");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        disabled={!!busy}
        className="h-8 text-xs"
      >
        <FileDown className="h-3 w-3 mr-1" />
        {busy ? "Export en cours…" : "Exporter"}
      </Button>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded border border-border bg-card py-1 shadow-lg">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                disabled={!!busy}
                onClick={() => execute(item)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left font-mono text-xs transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Icon className="h-3 w-3" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
