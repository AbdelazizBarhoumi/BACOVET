import {
  CalendarLtrRegular,
  NumberSymbolRegular,
  TextCaseTitleRegular,
  ToggleLeftRegular,
} from "@fluentui/react-icons";
import {
  ChevronRight,
  ChevronsRight,
  Database,
  FolderClosed,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sigma,
  Table2,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type EndpointDataset } from "@/lib/v6/datasets";
import {
  applySuggestion as applyDaxSuggestion,
  completeDax,
  daxSignature,
  type DaxSuggestion,
} from "@/lib/v6/dax";
import { MEASURES, type Field, type TableDef, validateMeasureExpression } from "@/lib/v6/model";
import { fieldBoundToWidget, toggleFieldOnWidget, type FieldRef } from "./field-binds";
import { useBuilder } from "./store";
import type { MeasureDefinition } from "./types";

function signatureLabel(signature: ReturnType<typeof daxSignature>) {
  if (!signature) return null;
  return `${signature.name}(${signature.args.map((arg, index) => (index === signature.activeArg ? `[${arg}]` : arg)).join(", ")})`;
}

type MeasureScope = "local" | "shared";

export type MeasureSavePayload = {
  name: string;
  expression: string;
  category?: string;
  scope: MeasureScope;
};

function MeasureDialog({
  open,
  onClose,
  datasets,
  existingMeasures,
  initialName,
  initialExpression,
  initialCategory = "",
  initialScope = "local",
  allColumnNames,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  datasets: TableDef[];
  existingMeasures: Field[];
  initialName: string;
  initialExpression: string;
  initialCategory?: string;
  initialScope?: MeasureScope;
  allColumnNames: string[];
  onSave: (payload: MeasureSavePayload) => Promise<boolean>;
}) {
  const [name, setName] = useState(initialName);
  const [expression, setExpression] = useState(initialExpression);
  const [category, setCategory] = useState(initialCategory);
  const [scope, setScope] = useState<MeasureScope>(initialScope);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cursor, setCursor] = useState(initialExpression.length);
  const [active, setActive] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      setName(initialName);
      setExpression(initialExpression);
      setCategory(initialCategory);
      setScope(initialScope);
      setCursor(initialExpression.length);
      setError("");
      setActive(0);
      setSaving(false);
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(initialExpression.length, initialExpression.length);
    });
  }, [open, initialName, initialExpression, initialCategory, initialScope]);

  const suggestions = useMemo(
    () => completeDax(expression, cursor, datasets, existingMeasures),
    [expression, cursor, datasets, existingMeasures],
  );
  const signature = useMemo(
    () => daxSignature(expression, cursor),
    [expression, cursor],
  );

  const quickColumns = useMemo(() => {
    const selectedDataset = datasets[0];
    return selectedDataset?.fields?.slice(0, 8) ?? [];
  }, [datasets]);

  const insertSuggestion = (suggestion: DaxSuggestion) => {
    const result = applyDaxSuggestion(expression, cursor, suggestions.from, suggestion.insert, suggestion.cursorAdjust ?? 0);
    setExpression(result.text);
    setCursor(result.cursor);
    setActive(0);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(result.cursor, result.cursor);
    });
  };

  const suggestFormula = (fn: string) => {
    const selectedDataset = datasets[0];
    const selectedColumn = selectedDataset?.fields.find((field) => field.type === "number") ?? selectedDataset?.fields[0];
    if (selectedDataset && selectedColumn) {
      const next = `${fn}(${selectedDataset.name}[${selectedColumn.name}])`;
      setName(`${selectedColumn.name} ${fn.toLowerCase()}`);
      setExpression(next);
      setCursor(next.length);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(next.length, next.length);
      });
    }
  };

  const save = async () => {
    const trimmedExpression = expression.trim();
    const eq = trimmedExpression.indexOf("=");
    const finalName = (name.trim() || (eq >= 0 ? trimmedExpression.slice(0, eq).trim() : ""));
    const finalExpression = trimmedExpression;

    if (!finalName) {
      setError("Le nom de la mesure est obligatoire.");
      return;
    }
    if (!finalExpression) {
      setError("L'expression est obligatoire.");
      return;
    }

    const measureNames = existingMeasures.map((m) => m.name);
    const validation = validateMeasureExpression(finalExpression, allColumnNames, measureNames);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setSaving(true);
    const ok = await onSave({
      name: finalName,
      expression: finalExpression,
      category: scope === "shared" ? category.trim() || undefined : undefined,
      scope,
    });
    setSaving(false);
    if (ok) onClose();
    else setError("Impossible d'enregistrer la mesure. Réessayez.");
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!suggestions.suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((value) => (value + 1) % suggestions.suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((value) => (value - 1 + suggestions.suggestions.length) % suggestions.suggestions.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertSuggestion(suggestions.suggestions[active]!);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Nouvelles mesures</DialogTitle>
          <DialogDescription>
            Crée une mesure intelligente à partir des colonnes disponibles dans la page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1 text-[11px]">
            <span className="py-1 text-muted-foreground">Démarrage rapide :</span>
            {[
              "SUM",
              "AVERAGE",
              "COUNTROWS",
              "DISTINCTCOUNT",
              "IF",
              "CALCULATE",
            ].map((fn) => (
              <button
                key={fn}
                onClick={() => suggestFormula(fn)}
                className="rounded-full border border-border px-2 py-1 font-mono hover:bg-accent"
              >
                {fn}()
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
              {(["local", "shared"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setScope(s)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${scope === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                >
                  {s === "local" ? "Locale à la page" : "Bibliothèque partagée"}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {scope === "shared" ? "Visible sur toutes les pages." : "Enregistrée dans cette page uniquement."}
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Nom
                  </div>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex. Total production"
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {scope === "shared" ? "Catégorie" : "Expression"}
                  </div>
                  {scope === "shared" ? (
                    <input
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      placeholder="Ex. Finance"
                      className="w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  ) : (
                    <div className="rounded border border-border bg-background px-3 py-2 text-[11px] text-muted-foreground">
                      {signatureLabel(signature) ?? "Écris une formule DAX simple ou utilise les suggestions."}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={expression}
                  onChange={(event) => {
                    setExpression(event.target.value);
                    setCursor(event.target.selectionStart ?? event.target.value.length);
                  }}
                  onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
                  onKeyDown={onKeyDown}
                  onClick={(event) => setCursor(event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
                  className="h-44 w-full resize-none rounded border border-border bg-background p-3 font-mono text-sm outline-none focus:border-primary"
                  spellCheck={false}
                  placeholder="New Measure = SUM(Table[Column])"
                />

                {suggestions.suggestions.length > 0 && (
                  <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded border border-border bg-card shadow-xl">
                    {suggestions.suggestions.slice(0, 12).map((suggestion, index) => (
                      <button
                        key={`${suggestion.kind}-${suggestion.insert}`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          insertSuggestion(suggestion);
                        }}
                        onMouseEnter={() => setActive(index)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] hover:bg-accent ${active === index ? "bg-accent" : ""}`}
                      >
                        <span className="w-6 shrink-0 font-mono text-muted-foreground">
                          {suggestion.kind === "function" ? "fx" : suggestion.kind === "table" ? "▦" : suggestion.kind === "measure" ? "Σ" : "abc"}
                        </span>
                        <span className="shrink-0 font-medium">{suggestion.label}</span>
                        <span className="ml-auto truncate text-muted-foreground">{suggestion.detail}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
            </div>

            <div className="space-y-3 rounded border border-border bg-muted/30 p-3 text-[11px]">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Colonnes disponibles
              </div>
              <div className="space-y-1">
                {quickColumns.length > 0 ? quickColumns.map((field) => (
                  <button
                    key={field.name}
                    onClick={() => {
                      const selectedDataset = datasets[0];
                      if (!selectedDataset) return;
                      const insert = `${selectedDataset.name}[${field.name}]`;
                      const next = `${name || "New Measure"} = ${insert}`;
                      setExpression(next);
                      setCursor(next.length);
                    }}
                    className="flex w-full items-center justify-between rounded border border-border bg-background px-2 py-1.5 text-left hover:bg-secondary/60"
                  >
                    <span className="truncate">{field.name}</span>
                    <span className="ml-2 shrink-0 font-mono text-[9px] text-muted-foreground">{field.type}</span>
                  </button>
                )) : <div className="text-muted-foreground">Aucune colonne disponible.</div>}
              </div>

              <div className="pt-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Mesures existantes
                </div>
                <div className="mt-1 space-y-1">
                  {existingMeasures.length > 0 ? existingMeasures.map((m) => (
                    <div key={m.name} className="rounded bg-background px-2 py-1 font-mono text-[10px] text-muted-foreground">
                      {m.name}
                    </div>
                  )) : <div className="text-muted-foreground">Aucune mesure.</div>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <button onClick={onClose} className="rounded border border-border px-3 py-2 text-sm">
            Annuler
          </button>
          <button onClick={() => void save()} disabled={saving} className="rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {saving ? "Enregistrement…" : scope === "shared" ? "Enregistrer dans la bibliothèque" : "Créer la mesure"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type FieldItem = {
  ref: FieldRef;
  label: string;
  ambiguous: boolean;
  isMeasure: boolean;
  custom: boolean;
  shared?: boolean;
  category?: string;
  expression?: string;
};

type FieldGroup = {
  name: string;
  fields: FieldItem[];
  meta?: { rows: number; synced: boolean; lastSyncedAt: string | null };
};

function FieldTypeIcon({ item }: { item: FieldItem }) {
  if (item.isMeasure) return <Sigma className="size-3 text-muted-foreground" />;
  switch (item.ref.type) {
    case "number":
      return <NumberSymbolRegular className="size-3 text-green-600" />;
    case "date":
      return <CalendarLtrRegular className="size-3 text-violet-600" />;
    case "boolean":
      return <ToggleLeftRegular className="size-3 text-sky-500" />;
    default:
      return <TextCaseTitleRegular className="size-3 text-orange-500" />;
  }
}

export function DataBanner() {
  const {
    measures,
    addMeasure,
    removeMeasure,
    sharedMeasures,
    saveSharedMeasure,
    removeSharedMeasure,
    selected: selectedWidget,
    updateConfig,
    datasets,
    datasetsLoading: loading,
    refreshDatasets,
    tableDefs,
  } = useBuilder();
  const [query, setQuery] = useState("");
  const [measureOpen, setMeasureOpen] = useState(false);
  const [editingMeasure, setEditingMeasure] = useState<{ name: string; expression: string; category?: string; scope: MeasureScope } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(false);

  const load = () => void refreshDatasets();

  const datasetByTable = useMemo(() => {
    const map = new Map<string, EndpointDataset>();
    for (const d of datasets) {
      const name = d.label || d.object || d.slug.split("/").pop() || d.slug;
      if (!map.has(name)) map.set(name, d);
    }
    return map;
  }, [datasets]);

  const allColumnNames = useMemo(
    () => tableDefs.flatMap((t) => t.fields.map((f) => f.name)),
    [tableDefs],
  );

  const customMeasureFields: Field[] = useMemo(
    () =>
      measures.map((measure) => ({
        table: "Measures",
        name: measure.name,
        type: "number" as const,
        measure: true,
        expression: measure.expression,
      })),
    [measures],
  );

  const measureFields: Field[] = useMemo(
    () => [
      ...MEASURES.filter((m) => !customMeasureFields.some((c) => c.name === m.name)),
      ...customMeasureFields,
    ],
    [customMeasureFields],
  );

  /** Shared-library measures, grouped into category folders for the sidebar. */
  const sharedGroups: FieldGroup[] = useMemo(() => {
    const byCategory = new Map<string, MeasureDefinition[]>();
    for (const m of sharedMeasures) {
      const key = (m.category ?? "").trim() || "Sans catégorie";
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push(m);
    }
    const groups: FieldGroup[] = [];
    for (const [category, list] of byCategory) {
      groups.push({
        name: category,
        fields: list.map((m) => ({
          ref: { table: "Measures", name: m.name, type: "number", measure: true },
          label: m.name,
          ambiguous: false,
          isMeasure: true,
          custom: false,
          shared: true,
          category,
          expression: m.expression,
        })),
      });
    }
    return groups;
  }, [sharedMeasures]);

  const groups: FieldGroup[] = useMemo(() => {
    const out: FieldGroup[] = [
      {
        name: "Measures",
        fields: measureFields.map((f) => ({
          ref: { table: "Measures", name: f.name, type: "number", measure: true },
          label: f.name,
          ambiguous: false,
          isMeasure: true,
          custom: !MEASURES.some((m) => m.name === f.name),
          expression: f.expression,
        })),
      },
    ];
    for (const t of tableDefs) {
      const ds = datasetByTable.get(t.name);
      out.push({
        name: t.name,
        fields: t.fields.map((f) => ({
          ref: {
            table: t.name,
            name: f.name,
            type: f.type,
            datasetSlug: ds?.slug,
          },
          label: f.name,
          ambiguous: tableDefs.some(
            (other) =>
              other.name !== t.name &&
              other.fields.some((field) => field.name === f.name),
          ),
          isMeasure: false,
          custom: false,
        })),
        meta: ds
          ? { rows: ds.row_count, synced: !!ds.last_synced_at, lastSyncedAt: ds.last_synced_at }
          : undefined,
      });
    }
    return out;
  }, [measureFields, tableDefs, datasetByTable]);

  const allGroups = useMemo(() => [...groups.slice(0, 1), ...sharedGroups, ...groups.slice(1)], [groups, sharedGroups]);

  const visibleGroups = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return allGroups;
    return allGroups
      .map((g) => ({
        ...g,
        fields: g.fields.filter((f) =>
          [f.label, g.name, `${g.name}.${f.label}`].some((value) =>
            value.toLowerCase().includes(text),
          ),
        ),
      }))
      .filter((g) => g.fields.length > 0);
  }, [allGroups, query]);

  const allMeasureNames = useMemo(
    () => [...measureFields.map((m) => m.name), ...sharedMeasures.map((m) => m.name)],
    [measureFields, sharedMeasures],
  );

  const dialogMeasures = useMemo<Field[]>(
    () => [
      ...measureFields,
      ...sharedMeasures
        .filter((m) => !measureFields.some((f) => f.name === m.name))
        .map((m) => ({ table: "Measures", name: m.name, type: "number" as const, measure: true, expression: m.expression })),
    ],
    [measureFields, sharedMeasures],
  );

  const measureErrorFor = (f: FieldItem): string | null => {
    if (!f.expression) return null;
    const res = validateMeasureExpression(f.expression, allColumnNames, allMeasureNames);
    return res.ok ? null : res.error;
  };

  const dragField = (e: React.DragEvent, item: FieldItem) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "field", ...item.ref }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const openMeasureModal = (measure?: { name: string; expression: string; category?: string; scope?: MeasureScope }) => {
    if (measure) {
      setEditingMeasure({ name: measure.name, expression: measure.expression, category: measure.category, scope: measure.scope ?? "local" });
    } else {
      const table = tableDefs[0];
      const preferredColumn = table?.fields.find((field) => field.type === "number") ?? table?.fields[0];
      const nextName = preferredColumn ? `${preferredColumn.name} total` : "New Measure";
      const nextExpression = table && preferredColumn
        ? `SUM(${preferredColumn.name})`
        : "SUM(Column)";
      setEditingMeasure({ name: nextName, expression: nextExpression, category: "", scope: "local" });
    }
    setMeasureOpen(true);
  };

  const saveMeasure = async (payload: MeasureSavePayload): Promise<boolean> => {
    const { name, expression, category, scope } = payload;
    if (scope === "shared") {
      const ok = await saveSharedMeasure({ name, expression, category });
      if (ok) setEditingMeasure(null);
      return ok;
    }
    const existing = measures.find((measure) => measure.name === name);
    if (editingMeasure && editingMeasure.name !== name) {
      removeMeasure(editingMeasure.name);
    } else if (existing && existing.expression !== expression) {
      removeMeasure(existing.name);
    }
    addMeasure({ name, expression });
    setEditingMeasure(null);
    return true;
  };

  if (collapsed) {
    return (
      <aside className="flex min-h-0 w-9 shrink-0 flex-col items-center border-l border-border bg-card/60 py-2" aria-label="Données disponibles">
        <button
          onClick={() => setCollapsed(false)}
          title="Data"
          className="rounded p-1.5 text-muted-foreground hover:bg-accent"
        >
          <Database className="size-4" />
        </button>
        <button
          onClick={() => setCollapsed(false)}
          title="Expand Data"
          className="mt-2 rounded px-1 py-1 font-bold text-[15px] leading-none text-muted-foreground hover:bg-accent [writing-mode:vertical-rl]"
        >
          Data
        </button>
        <button
          onClick={() => setCollapsed(false)}
          title="Expand"
          className="mt-auto rounded p-1 text-muted-foreground hover:bg-accent"
        >
          <ChevronsRight className="size-4 rotate-180" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 w-72 shrink-0 flex-col border-l border-border bg-card/60" aria-label="Données disponibles">
      <div className="flex items-center justify-between px-3 py-2">
        <h2 className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
          <Database className="size-3.5 text-primary" />
          Data
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => void load()}
            title="Actualiser les données"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            title="Collapse"
            className="rounded p-0.5 text-muted-foreground hover:bg-accent"
          >
            <ChevronsRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="px-2 pb-2">
        <div className="flex items-center gap-1 rounded border border-border bg-background px-2">
          <Search className="size-3 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent py-1 text-[11px] outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-1 pb-2">
        {!loading && datasets.length === 0 && (
          <div className="px-2 py-1 text-center text-[11px] text-muted-foreground">
            Aucun endpoint disponible.
          </div>
        )}

        {visibleGroups.map((g) => {
          const isOpen = !!open[g.name];
          const isSharedGroup = g.fields.length > 0 && !!g.fields[0].shared;
          return (
            <div key={g.name}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [g.name]: !isOpen }))}
                className="flex w-full items-center gap-1 rounded px-1 py-1 text-[12px] font-medium hover:bg-accent"
              >
                <ChevronRight
                  className={`size-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
                {isSharedGroup ? (
                  <FolderClosed className="size-3 text-violet-500" />
                ) : (
                  <Table2 className="size-3 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                {isSharedGroup ? (
                  <span className="pr-1 font-mono text-[9px] text-violet-500">
                    {g.fields.length} mesure{g.fields.length > 1 ? "s" : ""}
                  </span>
                ) : g.meta ? (
                  <span className="pr-1 font-mono text-[9px] text-muted-foreground">
                    {g.meta.rows.toLocaleString()} lignes
                  </span>
                ) : null}
              </button>
              {isOpen && (
                <div className="pb-1">
                  {g.fields.map((f) => {
                    const bound = fieldBoundToWidget(selectedWidget, f.ref);
                    const exprError = measureErrorFor(f);
                    return (
                      <div
                        key={`${g.name}.${f.ref.name}`}
                        draggable
                        onDragStart={(e) => dragField(e, f)}
                        title={
                          exprError ??
                          f.expression ??
                          (f.ambiguous
                            ? `${f.ref.table}[${f.ref.name}]`
                            : f.ref.name)
                        }
                        className="ml-5 flex cursor-grab items-center gap-2 rounded px-2 py-[3px] text-[11px] hover:bg-accent active:cursor-grabbing"
                      >
                        <input
                          type="checkbox"
                          checked={bound}
                          disabled={!selectedWidget}
                          onChange={() => {
                            if (!selectedWidget) return;
                            toggleFieldOnWidget(updateConfig, selectedWidget, f.ref);
                          }}
                          className="size-3 accent-[var(--brand)]"
                        />
                        <FieldTypeIcon item={f} />
                        <span className={`min-w-0 flex-1 truncate ${exprError ? "text-amber-600" : ""}`}>
                          {f.ambiguous ? `${g.name}.${f.ref.name}` : f.ref.name}
                        </span>
                        {exprError && (
                          <TriangleAlert className="size-3 shrink-0 text-amber-500" />
                        )}
                        {(f.custom || f.shared) && (
                          <span className="flex shrink-0 items-center gap-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openMeasureModal({ name: f.ref.name, expression: f.expression ?? "", category: f.category, scope: f.shared ? "shared" : "local" });
                              }}
                              className="rounded border border-border p-0.5 hover:bg-secondary"
                              title="Modifier"
                            >
                              <Pencil className="size-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (f.shared) void removeSharedMeasure(f.ref.name);
                                else removeMeasure(f.ref.name);
                              }}
                              className="rounded border border-border p-0.5 text-destructive hover:bg-secondary"
                              title="Supprimer"
                            >
                              <Trash2 className="size-2.5" />
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {g.name === "Measures" && (
                    <button
                      onClick={() => openMeasureModal()}
                      className="ml-5 mt-1 flex items-center gap-1.5 rounded bg-primary px-2 py-1 text-[10px] text-primary-foreground hover:opacity-90"
                    >
                      <Plus className="size-3" /> Nouvelles mesures
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingMeasure && (
        <MeasureDialog
          open={measureOpen}
          onClose={() => {
            setMeasureOpen(false);
            setEditingMeasure(null);
          }}
          datasets={tableDefs}
          existingMeasures={dialogMeasures}
          initialName={editingMeasure.name}
          initialExpression={editingMeasure.expression}
          initialCategory={editingMeasure.category}
          initialScope={editingMeasure.scope}
          allColumnNames={allColumnNames}
          onSave={saveMeasure}
        />
      )}
    </aside>
  );
}
