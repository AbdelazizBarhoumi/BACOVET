import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBuilder } from "./store";
import type { WidgetConfig } from "./types";

const FONTS = ["inherit", "system-ui", "'Inter'", "'JetBrains Mono'", "'Roboto Mono'", "'Georgia', serif", "'Arial', sans-serif"];
const SHADOWS = ["none", "sm", "md", "lg", "xl"] as const;
const DEFAULT_PALETTE = ["#3b82f6", "#22c55e", "#ec4899", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#14b8a6"];

function ColorInput({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <input
          type="color"
          value={value && /^#/.test(value) ? value : "#888888"}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
        />
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="#hex" className="h-6 text-[10px]" />
      </div>
    </div>
  );
}

/** Page-level theme editor. Edits apply live to the canvas (fill-only-unset) and are persisted on the next dashboard save. */
export function ThemeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { theme, setTheme, saveTheme } = useBuilder();
  const defaults = theme?.defaults ?? {};
  const palette = theme?.palette && theme.palette.length ? theme.palette : DEFAULT_PALETTE;

  const update = (patch: Partial<WidgetConfig>) => {
    setTheme({ name: theme?.name, palette: theme?.palette, defaults: { ...(theme?.defaults ?? {}), ...patch } });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm"><Palette className="h-4 w-4" /> Thème du tableau de bord</DialogTitle>
          <DialogDescription className="text-xs">
            Le thème complète les réglages non définis de chaque visuel — les valeurs personnalisées d&apos;un visuel sont conservées.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Nom</Label>
            <Input
              value={theme?.name ?? ""}
              onChange={(e) => setTheme({ name: e.target.value || undefined, palette: theme?.palette, defaults: theme?.defaults ?? {} })}
              className="h-7 text-xs"
              placeholder="ex. Corporate bleu"
            />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Palette des séries</Label>
            <div className="grid grid-cols-4 gap-1">
              {palette.map((color, i) => (
                <input
                  key={i}
                  type="color"
                  value={/^#/.test(color) ? color : "#888888"}
                  onChange={(e) => {
                    const next = palette.slice();
                    next[i] = e.target.value;
                    setTheme({ name: theme?.name, palette: next, defaults: theme?.defaults ?? {} });
                  }}
                  className="h-7 w-full cursor-pointer rounded border border-border bg-transparent p-0"
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ColorInput label="Accent" value={defaults.accent} onChange={(v) => update({ accent: v })} />
            <ColorInput label="Fond" value={defaults.bg} onChange={(v) => update({ bg: v, bgGradient: undefined })} />
            <ColorInput label="Texte" value={defaults.fg} onChange={(v) => update({ fg: v })} />
            <ColorInput label="Bordure" value={defaults.borderColor} onChange={(v) => update({ borderColor: v })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Police</Label>
              <Select value={defaults.fontFamily ?? "inherit"} onValueChange={(v) => update({ fontFamily: v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Taille (px)</Label>
              <Input type="number" min={8} max={120} value={defaults.fontSize ?? 14} onChange={(e) => update({ fontSize: Number(e.target.value) })} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Ombre</Label>
              <Select value={defaults.shadow ?? "none"} onValueChange={(v) => update({ shadow: v as WidgetConfig["shadow"] })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHADOWS.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button size="sm" variant="outline" onClick={() => { setTheme(null); }} className="h-8 text-xs">
            Réinitialiser
          </Button>
          <Button size="sm" variant="outline" onClick={() => saveTheme(theme?.name ?? "Thème")} className="h-8 text-xs">
            Capter des visuels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
