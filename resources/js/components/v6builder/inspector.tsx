import { Trash2, Copy, Merge, Split, Plus, Minus, AlignLeft, AlignCenter, AlignRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { logActivity } from "./activity";
import { bindFieldToRole, roleEligible, unbindFieldFromRole, type FieldRef, type FieldRole } from "./field-binds";
import { useBuilder, DEFAULT_CONFIG_FOR, DEFAULT_SIZE } from "./store";
import {
  addCol, addRow, cellAt, mergeRegion, moveCol, moveRow, removeCol, removeRow, unmergeAt, withCell,
  type Agg, type TableGrid, type WidgetType, type WidgetConfig,
} from "./types";

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
  { value: "card", label: "Card" },
  { value: "funnel", label: "Funnel" },
  { value: "treemap", label: "Treemap" },
  { value: "waterfall", label: "Waterfall" },
  { value: "scatter", label: "Scatter" },
  { value: "bubble", label: "Bubble" },
  { value: "stacked-bar", label: "Stacked bar" },
  { value: "stacked-area", label: "Stacked area" },
  { value: "column", label: "Clustered column" },
  { value: "stackedColumn", label: "Stacked column" },
  { value: "stacked100Column", label: "100% stacked column" },
  { value: "stacked100Bar", label: "100% stacked bar" },
  { value: "ribbon", label: "Ribbon" },
  { value: "matrix", label: "Matrix" },
  { value: "map", label: "Map" },
  { value: "filledMap", label: "Filled map" },
  { value: "shapeMap", label: "Shape map" },
  { value: "slicer", label: "Slicer" },
  { value: "buttonSlicer", label: "Button slicer" },
  { value: "listSlicer", label: "List slicer" },
  { value: "inputSlicer", label: "Input slicer" },
  { value: "dateSlicer", label: "Date slicer" },
  { value: "image", label: "Image" },
  { value: "button", label: "Button" },
  { value: "decompositionTree", label: "Arbre de décomposition" },
  { value: "keyInfluencers", label: "Influenceurs clés" },
  { value: "smartNarrative", label: "Narratif intelligent" },
  { value: "qna", label: "Q&R" },
  { value: "rVisual", label: "Visuel R" },
  { value: "pythonVisual", label: "Visuel Python" },
  { value: "table", label: "Table simple" },
  { value: "table-grid", label: "Tableau libre" },
  { value: "text", label: "Texte / Titre" },
  { value: "divider", label: "Séparateur" },
];

const STYLE_KEYS: (keyof WidgetConfig)[] = [
  'label', 'showLabel', 'labelFontSize', 'labelColor', 'labelAlign', 'labelTransform', 'labelPosition',
  'bg', 'bgGradient', 'fg', 'accent',
  'borderColor', 'borderWidth', 'borderStyle', 'radius', 'showBorder',
  'padding', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'opacity', 'shadow',
  'fontFamily', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing', 'align',
  'rotate', 'scale',
];

const DATA_BINDABLE: WidgetType[] = [
  "kpi", "gauge", "sparkline", "line", "bar", "pareto", "donut", "pie", "radar", "area", "combo",
  "card", "funnel", "treemap", "waterfall", "scatter", "bubble", "stacked-bar", "stacked-area",
  "column", "stackedColumn", "stacked100Column", "stacked100Bar", "ribbon", "matrix",
  "map", "filledMap", "shapeMap",
  "slicer", "buttonSlicer", "listSlicer", "inputSlicer", "dateSlicer",
  "decompositionTree", "keyInfluencers", "smartNarrative", "qna", "rVisual", "pythonVisual",
  "table",
];

/** Widgets that render a single value (read dataValue/scalar directly) — endpoint change clears their binding. */
const SINGLE_VALUE_WIDGETS: WidgetType[] = [
  "kpi", "gauge", "sparkline", "pareto",
  "map", "filledMap", "shapeMap", "matrix",
  "decompositionTree", "keyInfluencers", "smartNarrative", "qna", "rVisual", "pythonVisual",
];

function normFieldType(t: string): "number" | "date" | "boolean" | "text" {
  if (t === "number" || t === "integer" || t === "float") return "number";
  if (t === "date") return "date";
  if (t === "boolean" || t === "bool") return "boolean";
  return "text";
}

export function Inspector() {
  const { selected, updateConfig, updateWidget, removeWidget, duplicateWidget, pushMargin } = useBuilder();

  if (!selected) {
    return (
      <div className="absolute right-0 top-0 h-full w-72 z-30 border-l border-border bg-card p-4 text-xs text-muted-foreground overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        Sélectionnez un widget pour l'éditer.
      </div>
    );
  }
  const c = selected.config;
  const t = selected.type;
  const set = (patch: Partial<typeof c>) => updateConfig(selected.id, patch);

  const isTableGrid = t === "table-grid";
  const dataChartTypes = ["card", "funnel", "treemap", "waterfall", "scatter", "bubble", "stacked-bar", "stacked-area", "column", "stackedColumn", "stacked100Column", "stacked100Bar", "ribbon", "matrix", "map", "filledMap", "shapeMap", "decompositionTree", "keyInfluencers", "smartNarrative", "qna", "rVisual", "pythonVisual"];
  const hasValue = [...dataChartTypes, "table", "table-grid"].includes(t);
  const hasSubtitle = t === "donut";
  const hasTarget = dataChartTypes.includes(t);
  const hasScaler = [...dataChartTypes, "table"].includes(t);
  const hasAnalytics = ["funnel", "treemap", "waterfall", "scatter", "bubble", "stacked-bar", "stacked-area", "column", "stackedColumn", "stacked100Column", "stacked100Bar", "ribbon"].includes(t);

  const hasAccent = dataChartTypes.includes(t);
  const hasFontFamily = t !== "divider";
  const hasTypography = ["text", "table-grid"].includes(t);
  const hasBg = t !== "divider";
  const hasBgGradient = t !== "divider";
  const hasFg = t !== "divider";
  const hasBorder = true; // all widgets get border + radius controls
  const hasShowLabel = !["text", "divider"].includes(t);
  const hasShowBorder = true;
  const hasShadow = t !== "divider";
  const hasTransform = t !== "divider";
  const hasSpacing = t !== "divider";
  const hasDataTab = DATA_BINDABLE.includes(t);

  return (
    <div className="absolute right-0 top-0 h-full w-72 z-30 border-l border-border bg-card overflow-y-auto shadow-lg" onClick={(e) => e.stopPropagation()}>
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Type</div>
          <Select value={selected.type} onValueChange={(v) => {
            const newType = v as WidgetType;
            const size = DEFAULT_SIZE[newType];
            const defaults = DEFAULT_CONFIG_FOR[newType];
            const preserved: Record<string, unknown> = {};
            for (const key of STYLE_KEYS) {
              if (key in c) preserved[key] = c[key];
            }
            updateWidget(selected.id, { type: newType, w: size.w, h: size.h, config: { ...defaults, ...preserved } });
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
        <TabsList className={`w-full grid h-8 ${isTableGrid || hasDataTab ? "grid-cols-4" : "grid-cols-3"}`}>
          <TabsTrigger value="content" className="text-[11px]">Contenu</TabsTrigger>
          <TabsTrigger value="style" className="text-[11px]">Style</TabsTrigger>
          {hasDataTab && <TabsTrigger value="data" className="text-[11px]">Données</TabsTrigger>}
          <TabsTrigger value="layout" className="text-[11px]">Disposition</TabsTrigger>
          {isTableGrid && <TabsTrigger value="table" className="text-[11px]">Tableau</TabsTrigger>}
        </TabsList>

        {/* ─── TAB 1: CONTENT ─── */}
        <TabsContent value="content" className="space-y-2 pt-3">
          <Field label="Label">
            <Input value={c.label ?? ""} onChange={(e) => set({ label: e.target.value })} className="h-7 text-xs" />
          </Field>
          {hasShowLabel && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Taille label (px)">
                  <Input type="number" min={6} max={24} value={c.labelFontSize ?? 10}
                    onChange={(e) => set({ labelFontSize: Number(e.target.value) })} className="h-7 text-xs" />
                </Field>
                <Field label="Transform">
                  <Select value={c.labelTransform ?? "uppercase"} onValueChange={(v) => set({ labelTransform: v as "none" | "uppercase" | "lowercase" | "capitalize" })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["none", "uppercase", "lowercase", "capitalize"].map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Couleur label">
                  <ColorRow value={c.labelColor} onChange={(v) => set({ labelColor: v })} withNone />
                </Field>
                <Field label="Align label">
                  <AlignButtons value={c.labelAlign ?? "left"} onChange={(v) => set({ labelAlign: v as "left" | "center" | "right" })} />
                </Field>
              </div>
              <Field label="Position label">
                <Select value={c.labelPosition ?? "top"} onValueChange={(v) => set({ labelPosition: v as "top" | "bottom" | "inside" | "overlay" })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["top", "bottom", "inside", "overlay"] as const).map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
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

          {hasScaler && (
            <>
              <FieldSwitch label="Afficher valeur calculée" checked={c.showScaler !== false} onChange={(v) => set({ showScaler: v })} />
              {c.showScaler !== false && (
                <Field label="Mode de calcul">
                  <Select value={c.scalerAggregation ?? "Latest"} onValueChange={(v) => set({ scalerAggregation: v as WidgetConfig["scalerAggregation"] })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Latest", "First", "Sum", "Average", "Min", "Max", "Count"].map((a) => (
                        <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </>
          )}

          {hasAnalytics && (
            <>
              <SectionTitle>Analytics</SectionTitle>
              <FieldSwitch label="Ligne moyenne" checked={!!c.analyticsAverage} onChange={(v) => set({ analyticsAverage: v })} />
              <Field label="Ligne constante">
                <Input type="number" value={c.analyticsConstant ?? ""} onChange={(e) => set({ analyticsConstant: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-7 text-xs" placeholder="Optionnel" />
              </Field>
            </>
          )}

          {t === "matrix" && (
            <Field label="Groupe colonnes">
              <Input value={c.dataGroup ?? ""} onChange={(e) => set({ dataGroup: e.target.value })} className="h-7 text-xs" placeholder="Nom de la colonne (optionnel)" />
            </Field>
          )}

          {t === "image" && (
            <>
              <Field label="URL de l'image">
                <Input value={c.imageUrl ?? ""} onChange={(e) => set({ imageUrl: e.target.value })} className="h-7 text-xs" placeholder="https://…" />
              </Field>
              <Field label="Texte alternatif">
                <Input value={c.altText ?? ""} onChange={(e) => set({ altText: e.target.value })} className="h-7 text-xs" />
              </Field>
            </>
          )}

          {t === "button" && (
            <>
              <Field label="Texte du bouton">
                <Input value={c.buttonText ?? ""} onChange={(e) => set({ buttonText: e.target.value })} className="h-7 text-xs" />
              </Field>
              <Field label="Lien (optionnel)">
                <Input value={c.linkUrl ?? ""} onChange={(e) => set({ linkUrl: e.target.value })} className="h-7 text-xs" placeholder="https://…" />
              </Field>
            </>
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
              <Field label="Marges (T / D / B / G, px)">
                <div className="grid grid-cols-4 gap-1">
                  <MarginInput value={c.marginTop ?? 0} placeholder="T" onCommit={(v) => pushMargin(selected.id, "top", v)} />
                  <MarginInput value={c.marginRight ?? 0} placeholder="D" onCommit={(v) => pushMargin(selected.id, "right", v)} />
                  <MarginInput value={c.marginBottom ?? 0} placeholder="B" onCommit={(v) => pushMargin(selected.id, "bottom", v)} />
                  <MarginInput value={c.marginLeft ?? 0} placeholder="G" onCommit={(v) => pushMargin(selected.id, "left", v)} />
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

        {/* ─── TAB: DONNÉES ─── */}
        {hasDataTab && (
          <TabsContent value="data" className="space-y-3 pt-3">
            <DataBindingInspector c={c} set={set} singleValue={SINGLE_VALUE_WIDGETS.includes(t)} isMatrix={t === "matrix"} isScatter={t === "scatter" || t === "bubble"} />
          </TabsContent>
        )}

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
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ─── Sub-components ─── */

function MarginInput({ value, placeholder, onCommit }: {
  value: number; placeholder: string; onCommit: (v: number) => void;
}) {
  return (
    <Input
      type="number" min={0} placeholder={placeholder} value={value}
      onChange={(e) => onCommit(Math.max(0, Number(e.target.value) || 0))}
      className="h-7 text-[10px] text-center"
    />
  );
}

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

function TableGridInspector({ widgetId, t, onChange }: {
  widgetId: string;
  t: TableGrid;
  onChange: (t: TableGrid) => void;
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
    logActivity("table.cell.edit", {
      widget_id: widgetId,
      widget_type: "table-grid",
      detail: { cells: parsed.map(([r, c]) => `${r},${c}`), keys: Object.keys(patch) },
    }, { key: `${widgetId}:cell` });
  };

  const { tableCursor } = useBuilder();
  const cur = tableCursor[widgetId];

  const tgLog = (action: string, detail: Record<string, unknown> = {}) =>
    logActivity(action, { widget_id: widgetId, widget_type: "table-grid", detail });

  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Structure</div>

      {/* Insert at position */}
      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region} onClick={() => { if (region) { onChange(addRow(t, region.r1 - 1)); tgLog("table.row.add", { at: region.r1, position: "before" }); } }}>
          <Plus className="h-3 w-3 mr-1" /> Ligne ↑
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region} onClick={() => { if (region) { onChange(addRow(t, region.r1)); tgLog("table.row.add", { at: region.r1, position: "after" }); } }}>
          <Plus className="h-3 w-3 mr-1" /> Ligne ↓
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region} onClick={() => { if (region) { onChange(addCol(t, region.c1 - 1)); tgLog("table.col.add", { at: region.c1, position: "before" }); } }}>
          <Plus className="h-3 w-3 mr-1" /> Col. ←
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region} onClick={() => { if (region) { onChange(addCol(t, region.c1)); tgLog("table.col.add", { at: region.c1, position: "after" }); } }}>
          <Plus className="h-3 w-3 mr-1" /> Col. →
        </Button>
      </div>

      {/* Delete row/col */}
      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region} onClick={() => { if (region) { onChange(removeRow(t, region.r1)); tgLog("table.row.delete", { at: region.r1 }); } }}>
          <Minus className="h-3 w-3 mr-1" /> Suppr. ligne
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region} onClick={() => { if (region) { onChange(removeCol(t, region.c1)); tgLog("table.col.delete", { at: region.c1 }); } }}>
          <Minus className="h-3 w-3 mr-1" /> Suppr. col.
        </Button>
      </div>

      {/* Move row/col */}
      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region || region.r1 === 0}
          onClick={() => { if (region) { onChange(moveRow(t, region.r1, region.r1 - 1)); tgLog("table.row.move", { from: region.r1, to: region.r1 - 1 }); } }}>
          <ArrowUp className="h-3 w-3 mr-1" /> Monter ligne
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region || region.r1 >= t.rows - 1}
          onClick={() => { if (region) { onChange(moveRow(t, region.r1, region.r1 + 1)); tgLog("table.row.move", { from: region.r1, to: region.r1 + 1 }); } }}>
          <ArrowDown className="h-3 w-3 mr-1" /> Descendre ligne
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region || region.c1 === 0}
          onClick={() => { if (region) { onChange(moveCol(t, region.c1, region.c1 - 1)); tgLog("table.col.move", { from: region.c1, to: region.c1 - 1 }); } }}>
          <ArrowLeft className="h-3 w-3 mr-1" /> Reculer col.
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region || region.c1 >= t.cols - 1}
          onClick={() => { if (region) { onChange(moveCol(t, region.c1, region.c1 + 1)); tgLog("table.col.move", { from: region.c1, to: region.c1 + 1 }); } }}>
          <ArrowRight className="h-3 w-3 mr-1" /> Avancer col.
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!region || (region.r1 === region.r2 && region.c1 === region.c2)}
          onClick={() => { if (region) { onChange(mergeRegion(t, region.r1, region.c1, region.r2, region.c2)); clearSel(); tgLog("table.merge", { r1: region.r1, c1: region.c1, r2: region.r2, c2: region.c2 }); } }}>
          <Merge className="h-3 w-3 mr-1" /> Fusionner
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-[10px]"
          disabled={!parsed.length}
          onClick={() => { for (const [r, c] of parsed) onChange(unmergeAt(t, r, c)); clearSel(); tgLog("table.unmerge", { cells: parsed.map(([r, c]) => `${r},${c}`) }); }}>
          <Split className="h-3 w-3 mr-1" /> Séparer
        </Button>
      </div>

      <FieldSwitch label="En-tête de ligne" checked={!!t.headerRow} onChange={(v) => onChange({ ...t, headerRow: v })} />
      <FieldSwitch label="En-tête de colonne" checked={!!t.headerCol} onChange={(v) => onChange({ ...t, headerCol: v })} />
      <FieldSwitch label="Lignes alternées (zebra)" checked={!!t.zebra} onChange={(v) => onChange({ ...t, zebra: v })} />

      <div className="pt-2 border-t border-border mt-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
          {cur ? `Position: R${cur[0]+1} C${cur[1]+1}` : ""}
          {parsed.length === 0 ? (cur ? "" : "Aucune cellule sélectionnée") :
           parsed.length === 1 ? ` · Cellule ${parsed[0][0]+1},${parsed[0][1]+1}` :
           ` · ${parsed.length} cellules (shift+clic pour étendre)`}
        </div>
        {parsed.length > 0 && (
          <>
            <Field label="Contenu">
              <Input value={activeCell?.content ?? ""} onChange={(e) => patchActive({ content: e.target.value })} className="h-7 text-xs" />
            </Field>
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

function DataBindingInspector({ c, set, singleValue, isMatrix, isScatter }: {
  c: WidgetConfig;
  set: (patch: Partial<WidgetConfig>) => void;
  singleValue: boolean;
  isMatrix: boolean;
  isScatter: boolean;
}) {
  const { datasets, allMeasures, selected: widget, updateConfig } = useBuilder();
  const ds = datasets.find((d) => d.slug === c.datasetSlug);
  const dsColumns = ds?.columns ?? [];
  const axisFields = dsColumns.filter((col) => normFieldType(col.type) !== "number");

  const dsLabel = (d: (typeof datasets)[number]) => d.label || d.object || d.slug;
  // Number fields from every endpoint (grouped, labeled Dataset.Field) + global measures.
  const allValueOptions = datasets.flatMap((d) =>
    (d.columns ?? [])
      .filter((col) => normFieldType(col.type) === "number")
      .map((col) => ({ key: `${d.slug}::${col.name}`, slug: d.slug, name: col.name, label: `${dsLabel(d)}.${col.name}` })),
  );
  const measureOptions = allMeasures.map((m) => ({ key: `::${m.name}`, slug: undefined, name: m.name, label: `${m.name} (mesure)` }));

  type FieldOption = { key: string; name: string; label: string; ref: FieldRef };
  const dimOptions: FieldOption[] = axisFields.map((f) => ({
    key: f.name,
    name: f.name,
    label: f.name,
    ref: { table: ds?.slug ?? "", name: f.name, type: normFieldType(f.type), datasetSlug: ds?.slug },
  }));
  const valueOptions: FieldOption[] = [
    ...measureOptions.map((o) => ({ key: o.key, name: o.name, label: o.label, ref: { table: "Measures", name: o.name, type: "number" as const, measure: true } })),
    ...allValueOptions.map((o) => ({ key: o.key, name: o.name, label: o.label, ref: { table: o.slug, name: o.name, type: "number" as const, datasetSlug: o.slug } })),
  ];

  const boundValues = c.dataValues?.length ? c.dataValues : c.dataValue ? [c.dataValue] : [];
  const boundTips = c.dataTooltips ?? [];

  const bindRef = (ref: FieldRef, role: FieldRole) => {
    if (!widget) return;
    if (role === "values" && singleValue) {
      set({
        datasetSlug: ref.datasetSlug ?? c.datasetSlug,
        dataValue: ref.name,
        dataValues: [ref.name],
        dataValueSources: { ...c.dataValueSources, [ref.name]: ref.datasetSlug ?? c.datasetSlug ?? "" },
        scatterX: undefined, scatterY: undefined, scatterSize: undefined,
      });
      return;
    }
    bindFieldToRole(updateConfig, widget, ref, role);
  };
  const removeFrom = (role: FieldRole, name?: string) => {
    if (!widget) return;
    unbindFieldFromRole(updateConfig, widget, role, name);
  };
  const unset = () => set({ datasetSlug: undefined, dataAxis: undefined, dataValue: undefined, dataValues: undefined, dataValueSources: undefined, dataGroup: undefined, dataLegend: undefined, dataTooltips: undefined, scatterX: undefined, scatterY: undefined, scatterSize: undefined });

  const isScatterBound = !!(c.scatterX && c.scatterY);
  const primaryWells = isScatter ? "scatter" : "chart";

  return (
    <>
      <SectionTitle>Source de données</SectionTitle>
      <Field label="Endpoint / Dataset">
        <Select value={c.datasetSlug ?? "__none"} onValueChange={(v) => {
          const slug = v === "__none" ? undefined : v;
          // Multi-value widgets keep their value bindings (each value has its own source);
          // single-value widgets read dataValue directly, so their binding must reset.
          if (singleValue) {
            set({ datasetSlug: slug, dataAxis: undefined, dataValue: undefined, dataValues: undefined, dataValueSources: undefined, dataGroup: undefined, dataLegend: undefined, dataTooltips: undefined, scatterX: undefined, scatterY: undefined, scatterSize: undefined });
          } else {
            set({ datasetSlug: slug, dataAxis: undefined, dataGroup: undefined });
          }
        }}>
          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Sélectionner un dataset…" /></SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="__none" className="text-xs">— aucun —</SelectItem>
            {datasets.map((d) => (
              <SelectItem key={d.slug} value={d.slug} className="text-xs">
                {dsLabel(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {c.datasetSlug && (
        <>
          {primaryWells === "scatter" ? (
            <>
              <DropWell
                title="Axe (catégorie)"
                hint="Dimension optionnelle qui groupera les points"
                role="axis"
                bound={c.dataAxis ? [c.dataAxis] : []}
                eligible={(ref) => roleEligible(ref, "axis")}
                onBind={(ref) => bindRef(ref, "axis")}
                onRemove={() => removeFrom("axis")}
                options={dimOptions.filter((o) => o.name !== c.dataAxis)}
              />
              <div className="grid grid-cols-2 gap-2">
                <DropWell
                  title="X"
                  role="scatterX"
                  bound={c.scatterX ? [c.scatterX] : []}
                  eligible={(ref) => roleEligible(ref, "scatterX")}
                  onBind={(ref) => bindRef(ref, "scatterX")}
                  onRemove={() => removeFrom("scatterX")}
                  options={valueOptions.filter((o) => o.name !== c.scatterX)}
                  compact
                />
                <DropWell
                  title="Y"
                  role="scatterY"
                  bound={c.scatterY ? [c.scatterY] : []}
                  eligible={(ref) => roleEligible(ref, "scatterY")}
                  onBind={(ref) => bindRef(ref, "scatterY")}
                  onRemove={() => removeFrom("scatterY")}
                  options={valueOptions.filter((o) => o.name !== c.scatterY)}
                  compact
                />
              </div>
              <DropWell
                title="Taille (bubble)"
                hint="Valeur numérique optionnelle pour le rayon"
                role="scatterSize"
                bound={c.scatterSize ? [c.scatterSize] : []}
                eligible={(ref) => roleEligible(ref, "scatterSize")}
                onBind={(ref) => bindRef(ref, "scatterSize")}
                onRemove={() => removeFrom("scatterSize")}
                options={valueOptions.filter((o) => o.name !== c.scatterSize)}
              />
              {!isScatterBound && (
                <div className="rounded border border-amber-300/50 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">
                  Déposez une valeur dans <b>X</b> et <b>Y</b> pour afficher le nuage de points.
                </div>
              )}
            </>
          ) : (
            <>
              <DropWell
                title="Axe (catégorie)"
                hint="Déposez une dimension ici"
                role="axis"
                bound={c.dataAxis ? [c.dataAxis] : []}
                eligible={(ref) => roleEligible(ref, "axis")}
                onBind={(ref) => bindRef(ref, "axis")}
                onRemove={() => removeFrom("axis")}
                options={dimOptions.filter((o) => o.name !== c.dataAxis)}
              />
              <Field label={singleValue ? "Valeur" : "Valeurs"}>
                {boundValues.length === 0 ? (
                  <div className="rounded border border-dashed border-border px-2 py-1.5 text-[11px] text-muted-foreground">Déposez une valeur ici (nombre ou mesure)</div>
                ) : (
                  <div className="space-y-1.5">
                    {boundValues.map((v) => {
                      const source = c.dataValueSources?.[v] ?? c.datasetSlug;
                      const srcDs = datasets.find((d) => d.slug === source);
                      const foreign = !!source && source !== c.datasetSlug;
                      const chipLabel = foreign && srcDs ? `${dsLabel(srcDs)}.${v}` : v;
                      return (
                        <div key={v} className="flex items-center gap-1.5">
                          <span className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px]">
                            <span className={`truncate ${foreign ? "text-foreground" : ""}`}>{chipLabel}</span>
                            <button onClick={() => removeFrom("values", v)} className="ml-auto shrink-0 text-muted-foreground hover:text-destructive" title="Retirer">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                          <Select value={c.dataAggregations?.[v] ?? c.dataAggregation ?? "sum"} onValueChange={(a) => set({ dataAggregations: { ...c.dataAggregations, [v]: a as Agg } })}>
                            <SelectTrigger className="h-6 w-[6.5rem] text-[10px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["sum", "avg", "count", "min", "max", "distinct"].map((a) => (
                                <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Field>
              <DropWell
                title="+ Valeur"
                role="values"
                bound={[]}
                eligible={(ref) => roleEligible(ref, "values")}
                onBind={(ref) => bindRef(ref, "values")}
                onRemove={() => undefined}
                options={valueOptions.filter((o) => !boundValues.includes(o.name))}
                hideChips
              />
            </>
          )}

          <DropWell
            title="Légende"
            hint="Une dimension qui découpe la mesure en plusieurs séries"
            role="legend"
            bound={c.dataLegend ? [c.dataLegend] : []}
            eligible={(ref) => roleEligible(ref, "legend")}
            onBind={(ref) => bindRef(ref, "legend")}
            onRemove={() => removeFrom("legend")}
            options={dimOptions.filter((o) => o.name !== c.dataLegend)}
          />
          <DropWell
            title="Info-bulle"
            hint="Colonnes ou mesures ajoutées à l'infobulle"
            role="tooltip"
            bound={boundTips}
            eligible={(ref) => roleEligible(ref, "tooltip")}
            onBind={(ref) => bindRef(ref, "tooltip")}
            onRemove={(name) => removeFrom("tooltip", name)}
            options={[...dimOptions, ...valueOptions].filter((o) => !boundTips.includes(o.name))}
          />

          <Field label="Agrégation par défaut">
            <Select value={c.dataAggregation ?? "sum"} onValueChange={(v) => set({ dataAggregation: v as Agg })}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["sum", "avg", "count", "min", "max", "distinct"].map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Nombre max de catégories">
            <Input type="number" min={1} max={500} value={c.maxCategories ?? 50}
              onChange={(e) => set({ maxCategories: e.target.value === "" ? undefined : Math.max(1, Number(e.target.value)) })}
              className="h-7 text-xs" />
            <div className="text-[10px] text-muted-foreground">Au-delà, le reste est regroupé dans « Autres ».</div>
          </Field>

          {isMatrix && (
            <Field label="Groupe colonnes">
              <Select value={c.dataGroup ?? "__none"} onValueChange={(v) => set({ dataGroup: v === "__none" ? undefined : v })}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="__none" className="text-xs">— aucun —</SelectItem>
                  {axisFields.map((f) => (
                    <SelectItem key={f.name} value={f.name} className="text-xs">{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <button onClick={unset} className="w-full rounded border border-border px-2 py-1.5 text-[11px] text-destructive hover:bg-destructive/10">
            Effacer la liaison de données
          </button>
        </>
      )}
    </>
  );
}

function DropWell({ title, hint, bound, eligible, onBind, onRemove, options, compact, hideChips }: {
  title: string;
  hint?: string;
  role: FieldRole;
  bound: string[];
  eligible: (ref: FieldRef) => boolean;
  onBind: (ref: FieldRef) => void;
  onRemove: (name?: string) => void;
  options: { key: string; name: string; label: string; ref: FieldRef }[];
  compact?: boolean;
  hideChips?: boolean;
}) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const raw = e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { kind?: string; table?: string; name?: string; type?: string; measure?: boolean; datasetSlug?: string };
      if (parsed.kind !== "field" || !parsed.table || !parsed.name || !parsed.type) return;
      const ref: FieldRef = { table: parsed.table, name: parsed.name, type: parsed.type as FieldRef["type"], measure: parsed.measure, datasetSlug: parsed.datasetSlug };
      if (!eligible(ref)) return;
      onBind(ref);
    } catch { /* ignore invalid drops */ }
  };

  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center justify-between">
        <span>{title}</span>
        <Select value="__none" onValueChange={(v) => {
          if (v === "__none") return;
          const opt = options.find((o) => o.key === v);
          if (opt) onBind(opt.ref);
        }}>
          <SelectTrigger className="h-5 w-7 rounded px-0 text-center text-xs" title="Ajouter une colonne"><SelectValue>+</SelectValue></SelectTrigger>
          <SelectContent className="max-h-64">
            <SelectItem value="__none" className="text-xs">— choisir —</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.key} value={o.key} className="text-xs">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Label>
      {!hideChips && bound.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {bound.map((name) => (
            <span key={name} className="flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px]">
              <span className="truncate max-w-36">{name}</span>
              <button onClick={() => onRemove(name)} className="shrink-0 text-muted-foreground hover:text-destructive" title="Retirer">
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex items-center gap-1 rounded border px-2 py-1.5 text-[11px] transition-colors ${compact ? "h-7" : ""} ${dragging ? "border-primary bg-primary/10" : "border-dashed border-border text-muted-foreground"} ${hideChips && bound.length === 0 ? "h-8" : ""}`}
      >
        <span className="truncate">
          {hideChips ? "Déposez une valeur ici" : hint ?? "Déposez un champ ici"}
        </span>
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
