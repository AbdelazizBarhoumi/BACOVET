import { Eye, Pencil, Save, RotateCcw, Download, Upload, Undo2, Redo2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBuilder } from "./store";

export function BuilderToolbar({ title }: { title: string }) {
  const { mode, setMode, save, reset, exportJson, importJson, widgets, isDirty, undo, redo, canUndo, canRedo } = useBuilder();
  const fileRef = useRef<HTMLInputElement>(null);


  const onExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.layout.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (f: File) => {
    const text = await f.text();
    importJson(text);
    toast.success("Layout importé");
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card/60">
      <div className="text-sm font-bold uppercase tracking-wide flex-1">{title}</div>
      <div className="text-[10px] text-muted-foreground mr-2">
        {widgets.length} widget(s){isDirty && mode === "edit" ? " · non enregistré" : ""}
      </div>
      <Button
        size="sm" variant={mode === "edit" ? "default" : "outline"}
        onClick={() => setMode(mode === "edit" ? "view" : "edit")}
        className="h-8 text-xs uppercase tracking-wider"
      >
        {mode === "edit" ? <><Eye className="h-3 w-3 mr-1" /> Vue</> : <><Pencil className="h-3 w-3 mr-1" /> Éditer</>}
      </Button>
      {mode === "edit" && (
        <>
          <Button size="sm" variant="outline" onClick={undo} disabled={!canUndo} className="h-8 w-8 p-0" title="Annuler (Ctrl+Z)">
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={redo} disabled={!canRedo} className="h-8 w-8 p-0" title="Rétablir (Ctrl+Shift+Z)">
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={async () => { const ok = await save(); if (ok) { toast.success("Layout sauvegardé"); } else { toast.error("Échec de la sauvegarde"); } }} className="h-8 text-xs">
            <Save className="h-3 w-3 mr-1" /> Sauvegarder
          </Button>
          <Button size="sm" variant="outline" onClick={async () => { if (confirm("Réinitialiser le layout ?")) await reset(); }} className="h-8 text-xs">
            <RotateCcw className="h-3 w-3 mr-1" /> Reset
          </Button>
          <Button size="sm" variant="outline" onClick={onExport} className="h-8 text-xs">
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} className="h-8 text-xs">
            <Upload className="h-3 w-3 mr-1" /> Import
          </Button>
          <input ref={fileRef} type="file" accept="application/json" hidden
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
        </>
      )}
    </div>
  );
}
