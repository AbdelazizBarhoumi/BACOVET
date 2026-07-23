import { Trash2, Copy, Rows, Columns, Merge, Split, Plus, Minus, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchKpiList, type KpiSeed } from "@/lib/kpi-rows";
import { useBuilder } from "./store";
import {
  addCol, addRow, cellAt, mergeRegion, removeCol, removeRow, unmergeAt, withCell,
  type TableGrid, type WidgetType,
} from "./types";
import { useKpiData } from "./useKpiData";
import { resolveKpiSeries } from "./widgets/shared";

const PALETTES = ["#22c55e","#3b82f6","#ec4899","#f59e0b","#ef4444","#a855f7","#06b6d4","#14b8a6","#f97316","#64748b","#0ea5e9","#84cc16"];
const GRADIENTS = [
  "linear-gradient(135deg,#3b82f6,#06b6d4)",
  "linear-gradient(135deg,#22c55e,#84cc16)",
  "linear-gradient(135deg,#ec4899,#a855f7)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#0ea5e9,#8b5cf6)",
];
const FONTS = ["inherit", "system-ui", "'Inter'", "'JetBrains Mono'", "'Roboto Mono'", "'Georgia', serif", "'Arial', sans-serif"];
const FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900];

const TYPE_OPTIONS: { value: WidgetType; label: string }[] = [
  { value: "kpi", label: "KPI Card" },
  { value: "gauge", label: "Half Gauge" },
  { value: "sparkline", label: "Sparkline" },
  { value: "line", label: "Line Chart" },
  { value: "bar", label: "Bar Chart" },
  { value: "pareto", label: "Pareto" },
  { value: "donut", label: "Donut" },
  { value: "pie", label: "Pie Chart" },
  { value: "radar", label: "Radar" },
  { value: "area", label: "Area Chart" },
  { value: "combo", label: "Combo Chart" },
  { value: "table", label: "Table simple" },
  { value: "table-grid", label: "Tableau libre" },
  { value: "text", label: "Texte / Titre" },
  { value: "image", label: "Image" },
  { value: "divider", label: "Séparateur" },
];

const DEFAULT_SIZE: Record<WidgetType, { w: number; h: number }> = {
  kpi: { w: 3, h: 3 }, gauge: { w: 3, h: 4 }, sparkline: { w: 3, h: 2 },
  line: { w: 6, h: 4 }, bar: { w: 6, h: 4 }, pareto: { w: 6, h: 5 },
  donut: { w: 3, h: 4 }, pie: { w: 4, h: 4 }, radar: { w: 5, h: 5 }, area: { w: 6, h: 4 }, combo: { w: 8, h: 5 },
  table: { w: 6, h: 5 }, "table-grid": { w: 12, h: 6 },
  text: { w: 6, h: 1 }, image: { w: 3, h: 3 }, divider: { w: 12, h: 1 },
};

const KPI_COMPATIBLE = ["kpi", "gauge", "sparkline", "line", "bar", "pareto", "donut", "pie", "radar", "area", "combo", "table"];

export function Inspector() {
  const { selected, updateConfig, updateWidget, removeWidget, duplicateWidget } = useBuilder();
  const [kpiList, setKpiList] = useState<KpiSeed[]>([]);

  useEffect(() => {
    fetchKpiList().then(setKpiList);
  }, []);

  const kpiCodes = useMemo(() => (selected?.type === "kpi" && selected?.config?.kpiCode ? [selected.config.kpiCode] : []), [selected]);
  const kpiData = useKpiData(kpiCodes);
  const { series: kpiSeries } = useMemo(() => resolveKpiSeries(selected?.config, kpiData), [selected?.config, kpiData]);

  if (!selected) {
    return (
      <div className="w-72 shrink-0 border-l border-border bg-card/40 h-full p-4 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
        Sélectionnez un widget pour l'éditer.
      </div>
    );
  }
  const c = selected.config;
  const t = selected.type;
  const set = (patch: Partial<typeof c>) => updateConfig(selected.id, patch);

  const isTableGrid = t === "table-grid";
  const hasValue = ["kpi", "gauge", "donut"].includes(t);
  const hasSubtitle = t === "donut";
  const hasTarget = ["kpi", "gauge", "line", "bar", "area", "combo"].includes(t);

  const hasSparkline = t === "kpi" && kpiSeries.length > 0;

  const hasAccent = ["gauge", "sparkline", "line", "bar", "donut", "pie", "radar", "area", "combo"].includes(t) && t !== "kpi";
  const hasFontFamily = t !== "divider" && t !== "image";
  const hasTypography = ["text", "table-grid"].includes(t);
  const hasBg = t !== "divider";
  const hasBgGradient = t !== "divider";
  const hasFg = t !== "divider";
  const hasBorder = true; // all widgets get border + radius controls
  const hasShowLabel = !["text", "image", "divider"].includes(t);
  const hasShowBorder = true;
  const hasShadow = t !== "divider";
  const hasTransform = t !== "divider";
  const hasSpacing = t !== "divider";

  return (
    <div className="w-72 shrink-0 border-l border-border bg-card/40 h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Type</div>
          <Select value={selected.type} onValueChange={(v) => {
            const newType = v as WidgetType;
            const size = DEFAULT_SIZE[newType];
            updateWidget(selected.id, { type: newType, w: size.w, h: size.h });
          }}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1 ml-2 mt-4">
          <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => duplicateWidget(selected.id)} title="Dupliquer">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="destructive" className="h-7 w-7 p-0" onClick={() => removeWidget(selected.id)} title="Supprimer">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="p-3">
        <TabsList className={`w-full grid h-8 ${isTableGrid ? "grid-cols-4" : "grid-cols-3"}`}>
          <TabsTrigger value="content" className="text-[11px]">Contenu</TabsTrigger>
          <TabsTrigger value="style" className="text-[11px]">Style</TabsTrigger>
          <TabsTrigger value="layout" className="text-[11px]">Disposition</TabsTrigger>
          {isTableGrid && <TabsTrigger value="table" className="text-[11px]">Tableau</TabsTrigger>}
        </TabsList>

        {/* ─── TAB 1: CONTENT ─── */}
        <TabsContent value="content" className="space-y-2 pt-3">
          {KPI_COMPATIBLE.includes(t) && (
            <Field label="KPI">
              <Select value={c.kpiCode ?? "__none"} onValueChange={(v) => {
                if (v === "__none") return set({ kpiCode: undefined, target: undefined });
                const k = kpiList.find((x) => x.kpi === v);
                set({
                  kpiCode: v,
                  label: k?.name ?? c.label,
                  target: k?.cible_value ?? c.target,
                });
              }}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Sélectionner un KPI…" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="__none" className="text-xs">— aucun —</SelectItem>
                  {kpiList.map((k) => (
                    <SelectItem key={k.kpi} value={k.kpi} className="text-xs">{k.kpi} · {k.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Label">
            <Input value={c.label ?? ""} onChange={(e) => set({ label: e.target.value })} className="h-7 text-xs" />
          </Field>
          {hasSubtitle && (
            <Field label="Sous-titre">
              <Input value={c.subtitle ?? ""} onChange={(e) => set({ subtitle: e.target.value })} className="h-7 text-xs" />
            </Field>
          )}

          {hasValue && (
            <>
              <Field label="Unité">
                <Input value={c.unit ?? ""} onChange={(e) => set({ unit: e.target.value })} className="h-7 text-xs" />
              </Field>
              <Field label="Décimales">
                <Input type="number" min={0} max={4} value={c.decimals ?? 1}
                  onChange={(e) => set({ decimals: Number(e.target.value) })} className="h-7 text-xs" />
              </Field>
            </>
          )}
          {hasTarget && (
            <FieldSwitch label="Afficher la cible" checked={!!c.showTarget} onChange={(v) => set({ showTarget: v })} />
          )}
          {hasSparkline && (
            <FieldSwitch label="Afficher sparkline" checked={!!c.showSparkline} onChange={(v) => set({ showSparkline: v })} />
          )}

          {t === "gauge" && (
            <>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold pt-1 border-t border-border mt-2">Gauge</div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Min">
                  <Input type="number" value={c.gaugeMin ?? 0} onChange={(e) => set({ gaugeMin: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
                <Field label="Max">
                  <Input type="number" value={c.gaugeMax ?? 100} onChange={(e) => set({ gaugeMax: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
                <Field label="Start °">
                  <Input type="number" min={-360} max={360} value={c.gaugeStartAngle ?? 210} onChange={(e) => set({ gaugeStartAngle: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
                <Field label="End °">
                  <Input type="number" min={-360} max={360} value={c.gaugeEndAngle ?? -30} onChange={(e) => set({ gaugeEndAngle: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
              </div>
            </>
          )}

          {selected.type === "text" && (
            <Field label="Texte">
              <textarea value={c.text ?? ""} onChange={(e) => set({ text: e.target.value })}
                className="w-full text-xs border border-border rounded p-1.5 h-20 bg-background" />
            </Field>
          )}

          {selected.type === "image" && (
            <Field label="URL de l'image">
              <Input value={c.imageUrl ?? ""} onChange={(e) => set({ imageUrl: e.target.value })} className="h-7 text-xs" />
            </Field>
          )}
        </TabsContent>

        {/* ─── TAB 2: STYLE ─── */}
        <TabsContent value="style" className="space-y-3 pt-3">
          {/* Colors */}
          <SectionTitle>Couleurs</SectionTitle>
          {hasAccent && (
            <Field label="Couleur d'accent">
              <ColorRow value={c.accent} onChange={(v) => set({ accent: v })} />
            </Field>
          )}
          {hasBg && (
            <Field label="Fond (couleur)">
              <ColorRow value={c.bg} onChange={(v) => set({ bg: v, bgGradient: undefined })} withNone />
            </Field>
          )}
          {hasBgGradient && (
            <Field label="Fond (dégradé)">
              <div className="flex flex-wrap gap-1">
                <button onClick={() => set({ bgGradient: undefined })}
                  className={`h-6 px-2 text-[10px] rounded border border-border ${!c.bgGradient ? "ring-2 ring-primary" : ""}`}>×</button>
                {GRADIENTS.map((g) => (
                  <button key={g} onClick={() => set({ bgGradient: g, bg: undefined })}
                    className={`h-6 w-10 rounded border border-border ${c.bgGradient === g ? "ring-2 ring-primary" : ""}`}
                    style={{ background: g }} />
                ))}
              </div>
            </Field>
          )}
          {hasFg && (
            <Field label="Texte (couleur)">
              <ColorRow value={c.fg} onChange={(v) => set({ fg: v })} withNone />
            </Field>
          )}

          {/* Typography */}
          {hasFontFamily && (
            <>
              <SectionTitle>Typographie</SectionTitle>
              <Field label="Police">
                <Select value={c.fontFamily ?? "inherit"} onValueChange={(v) => set({ fontFamily: v })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONTS.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          {hasTypography && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Taille (px)">
                  <Input type="number" min={8} max={120} value={c.fontSize ?? 14}
                    onChange={(e) => set({ fontSize: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
                <Field label="Graisse">
                  <Select value={String(c.fontWeight ?? 400)} onValueChange={(v) => set({ fontWeight: Number(v) })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_WEIGHTS.map((w) => <SelectItem key={w} value={String(w)} className="text-xs">{w}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Interligne">
                  <Input type="number" min={0.5} max={3} step={0.1} value={c.lineHeight ?? 1.5}
                    onChange={(e) => set({ lineHeight: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
                <Field label="Espacement">
                  <Input type="number" min={-5} max={20} step={0.5} value={c.letterSpacing ?? 0}
                    onChange={(e) => set({ letterSpacing: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
              </div>
              <Field label="Alignement">
                <AlignButtons value={c.align ?? "left"} onChange={(v) => set({ align: v as "left" | "center" | "right" })} />
              </Field>
            </>
          )}

          {/* Spacing */}
          {hasSpacing && (
            <>
              <SectionTitle>Espacement</SectionTitle>
              <Field label="Padding (px)">
                <Input type="number" min={0} max={100} value={c.padding ?? 8}
                  onChange={(e) => set({ padding: Number(e.target.value) })} className="h-7 text-xs" />
              </Field>
              <Field label="Marges (T / D / B / G)">
                <div className="grid grid-cols-4 gap-1">
                  <Input type="number" min={0} placeholder="T" value={c.marginTop ?? 0}
                    onChange={(e) => set({ marginTop: Number(e.target.value) })} className="h-7 text-[10px] text-center" />
                  <Input type="number" min={0} placeholder="D" value={c.marginRight ?? 0}
                    onChange={(e) => set({ marginRight: Number(e.target.value) })} className="h-7 text-[10px] text-center" />
                  <Input type="number" min={0} placeholder="B" value={c.marginBottom ?? 0}
                    onChange={(e) => set({ marginBottom: Number(e.target.value) })} className="h-7 text-[10px] text-center" />
                  <Input type="number" min={0} placeholder="G" value={c.marginLeft ?? 0}
                    onChange={(e) => set({ marginLeft: Number(e.target.value) })} className="h-7 text-[10px] text-center" />
                </div>
              </Field>
            </>
          )}

          {/* Border */}
          {hasBorder && (
            <>
              <SectionTitle>Bordure</SectionTitle>
              <Field label="Couleur bord">
                <ColorRow value={c.borderColor} onChange={(v) => set({ borderColor: v })} withNone />
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Épaisseur">
                  <Input type="number" min={0} max={20} value={c.borderWidth ?? 1}
                    onChange={(e) => set({ borderWidth: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
                <Field label="Rayon">
                  <Input type="number" min={0} max={100} value={c.radius ?? 8}
                    onChange={(e) => set({ radius: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
                <Field label="Style">
                  <Select value={c.borderStyle ?? "solid"} onValueChange={(v) => set({ borderStyle: v as "solid" | "dashed" | "dotted" | "none" })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["solid","dashed","dotted","none"].map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              {hasShowBorder && (
                <FieldSwitch label="Afficher la bordure" checked={c.showBorder !== false} onChange={(v) => set({ showBorder: v })} />
              )}
            </>
          )}

          {/* Effects */}
          <SectionTitle>Effets</SectionTitle>
          {hasShadow && (
            <Field label="Ombre">
              <Select value={c.shadow ?? "none"} onValueChange={(v) => set({ shadow: v as "none" | "sm" | "md" | "lg" | "xl" })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["none","sm","md","lg","xl"].map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Opacité">
            <Input type="number" min={0} max={1} step={0.05} value={c.opacity ?? 1}
              onChange={(e) => set({ opacity: Number(e.target.value) })} className="h-7 text-xs" />
          </Field>
          {hasTransform && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Rotation">
                <Input type="number" min={-180} max={180} value={c.rotate ?? 0}
                  onChange={(e) => set({ rotate: Number(e.target.value) })} className="h-7 text-xs" />
              </Field>
              <Field label="Échelle">
                <Input type="number" min={0.1} max={3} step={0.1} value={c.scale ?? 1}
                  onChange={(e) => set({ scale: Number(e.target.value) })} className="h-7 text-xs" />
              </Field>
            </div>
          )}

          {/* Display toggles */}
          {hasShowLabel && (
            <FieldSwitch label="Afficher le label" checked={c.showLabel !== false} onChange={(v) => set({ showLabel: v })} />
          )}
        </TabsContent>

        {/* ─── TAB 3: LAYOUT ─── */}
        <TabsContent value="layout" className="space-y-2 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="x">
              <Input type="number" value={selected.x} onChange={(e) => updateWidget(selected.id, { x: Number(e.target.value) })} className="h-7 text-xs" />
            </Field>
            <Field label="y">
              <Input type="number" value={selected.y} onChange={(e) => updateWidget(selected.id, { y: Number(e.target.value) })} className="h-7 text-xs" />
            </Field>
            <Field label="Largeur (cols)">
              <Input type="number" min={1} max={24} value={selected.w} onChange={(e) => updateWidget(selected.id, { w: Number(e.target.value) })} className="h-7 text-xs" />
            </Field>
            <Field label="Hauteur (rows)">
              <Input type="number" min={1} max={24} value={selected.h} onChange={(e) => updateWidget(selected.id, { h: Number(e.target.value) })} className="h-7 text-xs" />
            </Field>
          </div>
          <FieldSwitch label="Verrouillé (ignoré au drag)" checked={!!selected.locked}
            onChange={(v) => updateWidget(selected.id, { locked: v })} />
        </TabsContent>

        {/* ─── TAB 4: TABLE (table-grid only) ─── */}
        {isTableGrid && (
          <TabsContent value="table" className="space-y-2 pt-3">
            <TableGridInspector
              widgetId={selected.id}
              t={c.tableGrid!}
              onChange={(next) => set({ tableGrid: next })}
              kpiList={kpiList}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ─── Sub-components ─── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold pt-1 border-t border-border first:border-0 first:pt-0">{children}</div>;
}

function AlignButtons({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const opts = [
    { v: "left", icon: AlignLeft },
    { v: "center", icon: AlignCenter },
    { v: "right", icon: AlignRight },
  ];
  return (
    <div className="flex gap-1">
      {opts.map(({ v, icon: Icon }) => (
        <button key={v} onClick={() => onChange(v)}
          className={`flex-1 h-7 rounded border text-xs flex items-center justify-center transition-colors ${value === v ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-secondary"}`}>
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

function TableGridInspector({ widgetId, t, onChange, kpiList }: {
  widgetId: string;
  t: TableGrid;
  onChange: (t: TableGrid) => void;
  kpiList: KpiSeed[];
}) {
  const { tableSel, setTableSel } = useBuilder();
  const sel = tableSel[widgetId] ?? [];
  const parsed = sel.map((k) => k.split(",").map(Number) as [number, number]);
  const rs = parsed.map((p) => p[0]);
  const cs = parsed.map((p) => p[1]);
  const region = parsed.length
    ? { r1: Math.min(...rs), r2: Math.max(...rs), c1: Math.min(...cs), c2: Math.max(...cs) }
    : null;

  const clearSel = () => {
    setTableSel((p) => ({ ...p, [widgetId]: [] }));
  };

  const activeCell = parsed.length === 1 ? cellAt(t, parsed[0][0], parsed[0][1]) : null;

  const patchActive = (patch: Partial<NonNullable<typeof activeCell>>) => {
    if (parsed.length === 0) return;
    let next = t;
    for (const [r, c] of parsed) next = withCell(next, r, c, patch);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Structure</div>

      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onChange(addRow(t))}>
          <Plus className="h-3 w-3 mr-1" /><Rows className="h-3 w-3" /> Ligne
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => onChange(addCol(t))}>
          <Plus className="h-3 w-3 mr-1" /><Columns className="h-3 w-3" /> Colonne
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region} onClick={() => region && onChange(removeRow(t, region.r1))}>
          <Minus className="h-3 w-3 mr-1" /><Rows className="h-3 w-3" /> Ligne
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region} onClick={() => region && onChange(removeCol(t, region.c1))}>
          <Minus className="h-3 w-3 mr-1" /><Columns className="h-3 w-3" /> Col.
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region || (region.r1 === region.r2 && region.c1 === region.c2)}
          onClick={() => { if (region) { onChange(mergeRegion(t, region.r1, region.c1, region.r2, region.c2)); clearSel(); } }}>
          <Merge className="h-3 w-3 mr-1" /> Fusionner
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!parsed.length}
          onClick={() => { for (const [r, c] of parsed) onChange(unmergeAt(t, r, c)); clearSel(); }}>
          <Split className="h-3 w-3 mr-1" /> Séparer
        </Button>
      </div>

      <FieldSwitch label="En-tête de ligne" checked={!!t.headerRow} onChange={(v) => onChange({ ...t, headerRow: v })} />
      <FieldSwitch label="En-tête de colonne" checked={!!t.headerCol} onChange={(v) => onChange({ ...t, headerCol: v })} />
      <FieldSwitch label="Lignes alternées (zebra)" checked={!!t.zebra} onChange={(v) => onChange({ ...t, zebra: v })} />

      <div className="pt-2 border-t border-border mt-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {parsed.length === 0 ? "Aucune cellule sélectionnée" :
           parsed.length === 1 ? `Cellule ${parsed[0][0]+1},${parsed[0][1]+1}` :
           `${parsed.length} cellules (shift+clic pour étendre)`}
        </div>
        {parsed.length > 0 && (
          <>
            <Field label="Contenu">
              <Input value={activeCell?.content ?? ""} onChange={(e) => patchActive({ content: e.target.value })} className="h-7 text-xs" />
            </Field>
            <Field label="KPI (code)">
              <Select value={activeCell?.kpiCode ?? "__none"} onValueChange={(v) => {
                if (v === "__none") return patchActive({ kpiCode: undefined, displayMode: undefined });
                const k = kpiList.find((x) => x.kpi === v);
                patchActive({ kpiCode: v, content: k?.name ?? activeCell?.content, displayMode: "value" });
              }}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="__none" className="text-xs">— aucun —</SelectItem>
                  {kpiList.map((k) => <SelectItem key={k.kpi} value={k.kpi} className="text-xs">{k.kpi} · {k.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            {activeCell?.kpiCode && (
              <Field label="Afficher">
                <Select value={activeCell?.displayMode ?? "name"} onValueChange={(v) => patchActive({ displayMode: v as "name" | "value" })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name" className="text-xs">Nom</SelectItem>
                    <SelectItem value="value" className="text-xs">Valeur</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Unité">
                <Input value={activeCell?.unit ?? ""} onChange={(e) => patchActive({ unit: e.target.value })} className="h-7 text-xs" />
              </Field>
              <Field label="Décimales">
                <Input type="number" min={0} max={4} value={activeCell?.decimals ?? 1} onChange={(e) => patchActive({ decimals: Number(e.target.value) })} className="h-7 text-xs" />
              </Field>
              <Field label="Alignement">
                <Select value={activeCell?.align ?? "left"} onValueChange={(v) => patchActive({ align: v as "left" | "center" | "right" })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["left","center","right"].map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Graisse">
                <Select value={String(activeCell?.fontWeight ?? 400)} onValueChange={(v) => patchActive({ fontWeight: Number(v) })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[300,400,500,600,700,800,900].map((w) => <SelectItem key={w} value={String(w)} className="text-xs">{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Taille (px)">
                <Input type="number" min={8} max={72} value={activeCell?.fontSize ?? 12}
                  onChange={(e) => patchActive({ fontSize: Number(e.target.value) })} className="h-7 text-xs" />
              </Field>
            </div>
            <Field label="Fond cellule">
              <ColorRow value={activeCell?.bg} onChange={(v) => patchActive({ bg: v })} withNone />
            </Field>
            <Field label="Texte cellule">
              <ColorRow value={activeCell?.fg} onChange={(v) => patchActive({ fg: v })} withNone />
            </Field>
            <FieldSwitch label="Cellule d'en-tête" checked={!!activeCell?.isHeader} onChange={(v) => patchActive({ isHeader: v })} />
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function FieldSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <Label className="text-xs">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ColorRow({ value, onChange, withNone }: { value?: string; onChange: (v: string) => void; withNone?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {withNone && (
        <button onClick={() => onChange("")}
          className={`h-5 w-5 rounded border border-border bg-background text-[9px] ${!value ? "ring-2 ring-primary" : ""}`}>×</button>
      )}
      {PALETTES.map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`h-5 w-5 rounded border border-border ${value === p ? "ring-2 ring-primary" : ""}`}
          style={{ background: p }} />
      ))}
      <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        placeholder="#hex" className="h-6 text-[10px] w-20 ml-1" />
    </div>
  );
}
