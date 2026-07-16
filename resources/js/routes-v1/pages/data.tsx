// Route registered in v1-main.tsx
import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Download, Search, Database, Play, Loader2, Plus, Trash2, Save, Info, CheckCircle2, AlertTriangle, FileJson } from "lucide-react";
import { toast } from "sonner";
import { useNovacityEndpoints } from "@/lib/data-endpoints";
import { PageHeader, StatusFooter, BacovetLogo } from "@/components/v1/v1-shell";
import { exportToCsv } from "@/lib/export";
import { cn } from "@/lib/utils";
import { LightDropdown, LightDropdownItem } from "@/components/LightDropdown";
import {
  fetchMappings,
  createMapping,
  deleteMapping,
  batchUpdateMappings,
  seedMappings,
  type DataMappingRow,
  type DataMappingPayload,
  type FormulaDef,
  type FormulaItem,
  fetchSampleData,
  fetchAllSamples,
  type AllEndpointRecord,
} from "@/services/dataMappingApi";
import DataMappingAuditLog from "@/components/DataMappingAuditLog";

import {
  extractRecords,
  aggregateSelection,
  getValueAtPath,
  stringifyResult,
  computeFormulaForTest,
  validateDirectKeyType,
  buildExecutionResult,
  executeRow,
  AGG_FNS,
  type AggFn,
  type ExecState,
} from "@/lib/exec";

export default DataMappingPage;

// -------- Batch fetch helper --------
const BATCH_SIZE = 8;
async function fetchInBatches<T>(items: T[], batchSize: number, fn: (item: T, signal?: AbortSignal) => Promise<void>, signal?: AbortSignal) {
  for (let i = 0; i < items.length; i += batchSize) {
    if (signal?.aborted) return;
    await Promise.allSettled(items.slice(i, i + batchSize).map((item) => fn(item, signal)));
  }
}

type VarType = "Direct" | "Complex";

const MODULES = ["quality", "production", "methodes", "development", "logistics"] as const;
const PROD_SUBS = ["coupe", "confection", "flux"] as const;
const MODULE_LABELS: Record<string, string> = {
  quality: "Qualité",
  production: "Production",
  methodes: "Méthodes",
  development: "Développement",
  logistics: "Logistique & Planning",
  coupe: "Coupe",
  confection: "Confection",
  flux: "Sérigraphie",
};

// -------- Shared cell styles --------
// Inline text fields (KPI / Name / Variable / free-form expressions): invisible until
// touched, then clearly editable — hover previews the field, focus commits to it.
const fieldBase =
  "bg-transparent border border-transparent rounded px-1.5 py-1 w-full transition-colors duration-150 cursor-text " +
  "hover:border-border hover:bg-muted/40 " +
  "focus:outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 " +
  "placeholder:text-muted-foreground/50 placeholder:italic";

// Auto-size textarea to fit content
function autoSize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// Truncate long preview values (arrays, long strings) for compact display in FormulaBuilder chips
function formatPreviewValue(val: string): string {
  if (!val) return val;
  if (val.startsWith("[") && val.endsWith("]")) {
    try {
      const arr = JSON.parse(val);
      if (Array.isArray(arr)) {
        return arr.length <= 3 ? val : `[${arr.length} valeurs]`;
      }
    } catch {
      return val.length > 40 ? val.slice(0, 37) + "…" : val;
    }
  }
  return val.length > 40 ? val.slice(0, 37) + "…" : val;
}

// -------- Graph Type Picker --------
const GRAPH_TYPE_OPTIONS = [
  "Big Number avec couleur",
  "Line Chart (Courbe)",
  "Gauge Chart (Jauge)",
  "Combo Bar/Line",
  "Pareto Chart (Interactif)",
  "Horizontal Bar Chart",
  "Area Chart (Graph. aires)",
  "Chronologie (Timeline)",
  "Bar Chart (par chaîne)",
  "Donut Chart (Anneau)",
  "Jauge Radiale",
  "Pie Chart (Secteurs)",
  "Podium ou Top 3 List",
  "Scatter Plot (Nuage)",
  "Line Chart mensuel",
  "Liste de OF en cours non soldés",
  "Not specified",
];

function GraphTypePicker({ value, onChange }: { value: string[]; onChange: (types: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggle = (type: string) => {
    const next = value.includes(type) ? value.filter((t) => t !== type) : [...value, type];
    onChange(next);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left bg-card border border-border rounded px-2 py-1 text-[11px] hover:border-primary/50 transition-colors cursor-pointer min-h-[28px]"
      >
        {value.length === 0 ? (
          <span className="text-muted-foreground italic">Aucun</span>
        ) : value.length <= 2 ? (
          value.join(", ")
        ) : (
          <span>{value[0]} +{value.length - 1}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 max-h-60 overflow-auto bg-card border border-border rounded-md shadow-lg p-2">
          {GRAPH_TYPE_OPTIONS.map((type) => (
            <label key={type} className="flex items-center gap-2 py-1 px-1 text-[11px] hover:bg-muted/50 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={value.includes(type)}
                onChange={() => toggle(type)}
                className="h-3 w-3 rounded border-border"
              />
              {type}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// Dropdowns: consistent hover/focus affordance, clear disabled state.
const selectBase =
  "bg-card border border-border rounded-md px-2.5 py-1.5 text-xs transition-colors cursor-pointer " +
  "hover:border-primary/50 hover:bg-muted/20 " +
  "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:bg-transparent disabled:text-muted-foreground disabled:border-dashed";

// Formula builder selects: smaller variant.
const formulaSelectBase =
  "bg-card border border-border rounded px-1.5 py-0.5 text-[10px] transition-colors " +
  "hover:border-primary/50 focus:outline-none focus:border-primary";

// -------- Custom Dropdown wrapper --------
const DataSelect = LightDropdown;

// -------- Dropdown Item --------
const DataSelectItem = LightDropdownItem;

// Checkboxes: native element, themed via accent-color + a visible keyboard-focus ring.
const checkboxBase =
  "h-3.5 w-3.5 rounded accent-primary cursor-pointer " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 " +
  "disabled:cursor-not-allowed disabled:opacity-40";

// -------- Result Badge --------
// Used by the Test / Preview / Exec columns so every computed value reads the same way:
// a color-coded, icon-led pill instead of bare colored text. Green background wash keeps
// the eye anchored down a dense column and lets errors pop by contrast.
type ResultState = "idle" | "loading" | "ok" | "error";

const ResultBadge = React.memo(function ResultBadge({
  state,
  value,
  loadingLabel = "calcul…",
  emptyLabel = "—",
  onInfoClick,
}: {
  state: ResultState;
  value?: string;
  loadingLabel?: string;
  emptyLabel?: string;
  onInfoClick?: () => void;
}) {
  if (state === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
        <span className="text-[10px]">{loadingLabel}</span>
      </span>
    );
  }
  if (state === "idle" || !value) {
    return <span className="text-muted-foreground/40">{emptyLabel}</span>;
  }
  const isError = state === "error";
  const colorClasses = isError
    ? "bg-destructive/10 text-destructive border-destructive/20"
    : "bg-green-500/10 text-green-600 border-green-500/20";
  return (
    <span className="inline-flex items-center gap-1 max-w-full">
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[10.5px] min-w-0 max-w-[200px] max-h-[40px] overflow-auto ${colorClasses}`}
        title={value}
      >
        {isError ? <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" /> : <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0" />}
        <span className="break-all">{value}</span>
      </span>
      {onInfoClick && <TraceBtn onClick={onInfoClick} />}
    </span>
  );
});

// -------- Trace Modal --------
const TraceModal = React.memo(function TraceModal({ open, title, content, onClose, highlight }: { open: boolean; title: string; content: unknown; onClose: () => void; highlight?: string }) {
  if (!open) return null;

  const jsonStr = content === null ? "Aucune donnée" : JSON.stringify(content, null, 2);

  const renderContent = () => {
    if (!highlight || highlight.trim() === "" || jsonStr === "Aucune donnée") {
      return <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-foreground bg-muted/30 rounded p-3">{jsonStr}</pre>;
    }
    const escaped = highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = jsonStr.split(new RegExp(`(${escaped})`, "gi"));
    return (
      <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-foreground bg-muted/30 rounded p-3">
        {parts.map((part, i) =>
          part.toLowerCase() === highlight.toLowerCase()
            ? <mark key={i} className="bg-yellow-300/70 text-foreground rounded-sm px-0.5">{part}</mark>
            : part
        )}
      </pre>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg cursor-pointer">×</button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
});

// -------- Trace Button --------
const TraceBtn = React.memo(function TraceBtn({ onClick, isLoading }: { onClick: () => void; isLoading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground ml-1 flex-shrink-0 transition-colors hover:bg-primary/15 hover:text-primary disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isLoading ? "cursor-wait" : "cursor-pointer"}`}
      title="Voir le détail"
      aria-label="Voir le détail"
    >
      {isLoading ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Info className="h-2.5 w-2.5" />}
    </button>
  );
});

// -------- JSON Preview Modal (all endpoints with search + highlight) --------
function JsonPreviewModal({ open, onClose, allData }: { open: boolean; onClose: () => void; allData: Record<string, { name: string; method: string; endpoint: string; status: number | null; fields: string[]; response: Record<string, unknown>[] }> }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const entries = useMemo(() => {
    const list = Object.entries(allData);
    if (!debouncedSearch.trim()) return list;
    const needle = debouncedSearch.toLowerCase();
    return list.filter(([slug, rec]) => {
      if (slug.toLowerCase().includes(needle)) return true;
      if (rec.name.toLowerCase().includes(needle)) return true;
      if (rec.method.toLowerCase().includes(needle)) return true;
      if (rec.fields.some((f) => f.toLowerCase().includes(needle))) return true;
      // Search in response data
      const jsonStr = JSON.stringify(rec.response).toLowerCase();
      if (jsonStr.includes(needle)) return true;
      return false;
    });
  }, [allData, debouncedSearch]);

  const highlightText = (text: string, needle: string) => {
    if (!needle.trim()) return text;
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escaped})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === needle.toLowerCase()
        ? <mark key={i} className="bg-yellow-300/70 text-foreground rounded-sm px-0.5">{part}</mark>
        : part
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Tous les endpoints JSON</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 border border-border bg-card rounded-md px-2 py-1 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Search className="h-3 w-3 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher dans les JSON..."
                className="bg-transparent outline-none text-xs w-48 cursor-text"
                autoFocus
              />
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg cursor-pointer">×</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {entries.length === 0 ? (
            <div className="text-center text-muted-foreground text-xs py-8">Aucun endpoint trouvé</div>
          ) : (
            <div className="space-y-2">
              {entries.map(([slug, rec]) => {
                const isExpanded = expandedSlug === slug;
                const jsonStr = JSON.stringify(rec.response, null, 2);
                return (
                  <div key={slug} className="border border-border rounded-md overflow-hidden">
                    <button
                      onClick={() => setExpandedSlug(isExpanded ? null : slug)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{rec.method}</span>
                      <span className="text-xs font-medium truncate flex-1">{highlightText(slug, debouncedSearch)}</span>
                      <span className="text-[10px] text-muted-foreground">{rec.name}</span>
                      <span className="text-[10px] text-muted-foreground">{rec.response.length} records</span>
                      <span className={`text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}>▸</span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 p-3 max-h-80 overflow-auto">
                        {debouncedSearch.trim() ? (
                          // Show individual matching records
                          (() => {
                            const needle = debouncedSearch.toLowerCase();
                            const matchingRecords = rec.response.filter((record) =>
                              JSON.stringify(record).toLowerCase().includes(needle)
                            );
                            if (matchingRecords.length === 0) {
                              return <div className="text-[10px] text-muted-foreground">Aucun record ne correspond</div>;
                            }
                            return (
                              <div className="space-y-2">
                                <div className="text-[10px] text-muted-foreground mb-1">{matchingRecords.length} record(s) correspondant(s)</div>
                                {matchingRecords.map((record, ri) => {
                                  const recordJson = JSON.stringify(record, null, 2);
                                  const escaped = debouncedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                                  const parts = recordJson.split(new RegExp(`(${escaped})`, "gi"));
                                  return (
                                    <pre key={ri} className="text-[10px] font-mono whitespace-pre-wrap break-words text-foreground bg-background/50 rounded p-2 border border-border/50">
                                      {parts.map((part, i) =>
                                        part.toLowerCase() === debouncedSearch.toLowerCase()
                                          ? <mark key={i} className="bg-yellow-300/70 text-foreground rounded-sm px-0.5">{part}</mark>
                                          : part
                                      )}
                                    </pre>
                                  );
                                })}
                              </div>
                            );
                          })()
                        ) : (
                          <pre className="text-[10px] font-mono whitespace-pre-wrap break-words text-foreground">
                            {jsonStr}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
          {entries.length} endpoint(s) affiché(s) sur {Object.keys(allData).length}
        </div>
      </div>
    </div>
  );
}

// -------- Formula Builder --------
// Safe arithmetic parser — supports +, -, *, /, parentheses, decimal numbers, unary minus
function safeMathEval(expr: string): number {
  let pos = 0;
  const s = expr.replace(/\s+/g, "");

  function parseExpr(): number {
    let left = parseTerm();
    while (pos < s.length && (s[pos] === "+" || s[pos] === "-")) {
      const op = s[pos++];
      const right = parseTerm();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < s.length && (s[pos] === "*" || s[pos] === "/")) {
      const op = s[pos++];
      const right = parseFactor();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function parseFactor(): number {
    if (pos < s.length && s[pos] === "(") {
      pos++; // skip (
      const val = parseExpr();
      if (pos < s.length && s[pos] === ")") pos++; // skip )
      return val;
    }
    // Unary minus
    if (pos < s.length && s[pos] === "-") {
      pos++;
      return -parseFactor();
    }
    // Number
    let start = pos;
    while (pos < s.length && (s[pos] >= "0" && s[pos] <= "9" || s[pos] === ".")) {
      pos++;
    }
    if (start === pos) throw new Error("Unexpected character");
    return Number(s.slice(start, pos));
  }

  const result = parseExpr();
  if (pos !== s.length) throw new Error("Unexpected trailing characters");
  return result;
}

function computeFormula(items: FormulaItem[], previewValues: Record<number, string>): string {
  // Build arithmetic expression from items
  let expr = "";
  for (const item of items) {
    if (item.type === "variable" && item.ref != null) {
      const val = previewValues[item.ref];
      if (val === undefined || val === "Erreur" || val === "") return "—";
      const num = Number(val);
      if (isNaN(num)) return "—"; // non-numeric values can't be used in safe math
      expr += String(num);
    } else if (item.type === "operator") {
      expr += ` ${item.op} `;
    } else if (item.type === "number") {
      expr += String(item.value);
    }
  }
  if (!expr) return "—";
  try {
    const result = safeMathEval(expr);
    return Number.isInteger(result) ? String(result) : result.toFixed(2);
  } catch {
    return "Erreur";
  }
}

const FormulaBuilder = React.memo(function FormulaBuilder({ kpi, groupRows, previewValues, formula, onFormulaChange }: {
  kpi: string;
  groupRows: DataMappingRow[];
  previewValues: Record<number, string>;
  formula: FormulaDef | null;
  onFormulaChange: (f: FormulaDef) => void;
}) {
  const items: FormulaItem[] = formula?.items ?? [];

  const addItem = (item: FormulaItem) => {
    const newItems = [...items, item];
    onFormulaChange({ items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    onFormulaChange({ items: newItems });
  };

  const updateItem = (index: number, patch: Partial<FormulaItem>) => {
    const newItems = items.map((it, i) => i === index ? { ...it, ...patch } as FormulaItem : it);
    onFormulaChange({ items: newItems });
  };

  const result = computeFormula(items, previewValues);

  return (
    <div className="text-[10px] min-w-[200px]  bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-2.5 py-1.5 bg-muted/30 border-b border-border/50 flex items-center gap-1.5">
        <span className="font-semibold text-muted-foreground uppercase tracking-wide text-[9px]">Formule</span>
        {items.length > 0 && (
          <>
            <span className="text-[9px] text-muted-foreground font-mono">{items.length} terme{items.length > 1 ? "s" : ""}</span>
            <button onClick={() => onFormulaChange({ items: [] })} className="ml-auto text-[9px] text-destructive/70 hover:text-destructive cursor-pointer" title="Tout supprimer">Effacer</button>
          </>
        )}
      </div>
      {/* Body */}
      <div className="p-2 flex flex-col gap-2">
        {/* Variable chips */}
        <div className="flex flex-wrap gap-1 items-center">
          {groupRows.map((gr) => (
            <span key={gr.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium w-auto overflow-hidden text-ellipsis whitespace-nowrap">
              {gr.variable || gr.name || `Var ${gr.id}`}
              {previewValues[gr.id] && (
                <span className="text-muted-foreground font-mono text-[9px] shrink-0">={formatPreviewValue(previewValues[gr.id])}</span>
              )}
            </span>
          ))}
        </div>
        {/* Divider */}
        {items.length > 0 && <div className="border-t border-border/30" />}
        {/* Formula expression */}
        <div className="flex flex-wrap gap-1 items-center min-h-[24px]">
          {items.map((item, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 group/item">
              {item.type === "variable" && (
                <DataSelect
                  value={String(item.ref)}
                  onValueChange={(val) => updateItem(i, { ref: Number(val), label: groupRows.find((gr) => gr.id === Number(val))?.variable || "" })}
                  className={`${formulaSelectBase} min-h-[22px] py-0.5 px-1.5 text-[10px]`}
                >
                  {groupRows.map((gr) => (
                    <DataSelectItem key={gr.id} value={String(gr.id)}>{gr.variable || gr.name || `Var ${gr.id}`}</DataSelectItem>
                  ))}
                </DataSelect>
              )}
              {item.type === "operator" && (
                <DataSelect
                  value={item.op}
                  onValueChange={(val) => updateItem(i, { op: val })}
                  className={`${formulaSelectBase} w-10 text-center font-bold bg-muted/30 text-primary min-h-[22px] py-0.5 px-1 text-[10px]`}
                >
                  {["+", "-", "*", "/"].map((op) => <DataSelectItem key={op} value={op}>{op}</DataSelectItem>)}
                </DataSelect>
              )}
              {item.type === "number" && (
                <input
                  type="number"
                  value={item.value}
                  onChange={(e) => updateItem(i, { value: Number(e.target.value) })}
                  className="border border-border rounded px-1.5 py-0.5 text-[10px] bg-card w-16 font-mono cursor-text focus:outline-none focus:border-primary"
                />
              )}
              <button onClick={() => removeItem(i)} className="text-muted-foreground/40 hover:text-destructive text-[10px] leading-none cursor-pointer opacity-0 group-hover/item:opacity-100 transition-opacity" title="Supprimer">×</button>
            </span>
          ))}
        </div>
        {/* Divider */}
        <div className="border-t border-border/30" />
        {/* Add buttons */}
        <div className="flex gap-1">
          <DataSelect
            value={undefined}
            onValueChange={(val) => { if (val) addItem({ type: "operator", op: val }); }}
            className="w-10 text-center font-bold text-[10px]"
            placeholder="+"
          >
            {["+", "-", "*", "/"].map((op) => <DataSelectItem key={op} value={op}>{op}</DataSelectItem>)}
          </DataSelect>
          <DataSelect
            value={undefined}
            onValueChange={(val) => { if (val) addItem({ type: "variable", ref: Number(val), label: groupRows.find((gr) => gr.id === Number(val))?.variable || "" }); }}
            className="text-[10px]"
            placeholder="+ Variable"
          >
            {groupRows
              .filter((gr) => !items.some((it) => it.type === "variable" && it.ref === gr.id))
              .map((gr) => (
                <DataSelectItem key={gr.id} value={String(gr.id)}>{gr.variable || gr.name || `Var ${gr.id}`}</DataSelectItem>
              ))}
          </DataSelect>
          <button
            onClick={() => addItem({ type: "number", value: 0 })}
            className="border border-dashed border-primary/30 rounded-full px-2 py-0.5 text-[10px] bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors font-medium cursor-pointer"
          >
            + Nombre
          </button>
        </div>
        {/* Result */}
        {items.length > 0 && (
          <div className={`px-2.5 py-1.5 rounded-md border font-mono font-bold text-[11px] ${result === "Erreur" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-green-500/10 border-green-500/20 text-green-600"}`}>
            <span className="text-muted-foreground text-[9px] font-sans font-normal mr-1">=</span>
            {result}
          </div>
        )}
      </div>
    </div>
  );
});

// -------- Nested Key Selector --------
const NestedKeySelector = React.memo(function NestedKeySelector({
  keys,
  sampleData,
  value,
  onChange,
  disabled,
}: {
  keys: string[];
  sampleData: Record<string, unknown> | null;
  value: string;
  onChange: (path: string) => void;
  disabled: boolean;
}) {
  const segments = value ? value.split('.') : [];

  // Get value at a given path from sample data
  const getValueAtPathLocal = (path: string): unknown => {
    if (!sampleData) return undefined;
    const parts = path.split('.');
    let current: unknown = sampleData;
    for (const part of parts) {
      if (current && typeof current === 'object' && !Array.isArray(current) && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return current;
  };

  // Get keys at a given path
  const getKeysAtPath = (path: string): string[] => {
    if (!path) return keys;
    const val = getValueAtPathLocal(path);
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.keys(val as Record<string, unknown>);
    }
    return [];
  };

  // Check if a path points to an object
  const isObjectPath = (path: string): boolean => {
    const val = getValueAtPathLocal(path);
    return val !== null && val !== undefined && typeof val === 'object' && !Array.isArray(val);
  };

  // Build the select elements
  const selects: React.JSX.Element[] = [];

  // First select: top-level keys
  selects.push(
    <DataSelect
      key="0"
      value={segments[0] || undefined}
      onValueChange={(val) => {
        if (val) {
          const newPath = val;
          onChange(newPath);
        } else {
          onChange('');
        }
      }}
      disabled={disabled}
      className={`${selectBase} w-44`}
      placeholder="— clé JSON —"
    >
      {keys.map((k) => (
        <DataSelectItem key={k} value={k}>{k}</DataSelectItem>
      ))}
    </DataSelect>
  );

  // Additional selects for nested objects
  for (let i = 0; i < segments.length; i++) {
    const currentPath = segments.slice(0, i + 1).join('.');
    if (isObjectPath(currentPath)) {
      const nestedKeys = getKeysAtPath(currentPath);
      selects.push(
        <DataSelect
          key={i + 1}
          value={segments[i + 1] || undefined}
          onValueChange={(val) => {
            if (val) {
              const newPath = `${currentPath}.${val}`;
              onChange(newPath);
            } else {
              onChange(currentPath);
            }
          }}
          disabled={disabled}
          className={`${selectBase} w-44`}
          placeholder="— sélectionner —"
        >
          {nestedKeys.map((k) => (
            <DataSelectItem key={k} value={k}>{k}</DataSelectItem>
          ))}
        </DataSelect>
      );
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {selects}
    </div>
  );
});

// -------- Endpoint Selector (self-contained, local search state) --------
// Extracted from DataMappingPage so that typing in the search input does NOT
// trigger a full page re-render (which would recreate all 350+ Select portals).
const EndpointSelector = React.memo(function EndpointSelector({
  row,
  endpointList,
  dataEndpoints,
  endpointMeta,
  onEndpointChange,
  traceLoading,
  onTrace,
}: {
  row: DataMappingRow;
  endpointList: string[];
  dataEndpoints: Record<string, string[]>;
  endpointMeta: Record<string, { name: string; method: string; fields: string[] }>;
  onEndpointChange: (newEndpoint: string | null) => void;
  traceLoading: boolean;
  onTrace: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = endpointList.filter(
    (ep) => !debouncedSearch || ep.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );

  return (
    <>
      <DataSelect
        value={row.endpoint ?? undefined}
        onValueChange={(val) => onEndpointChange(val || null)}
        className={`w-64 ${!row.endpoint ? "text-muted-foreground border-dashed" : ""}`}
        placeholder="— sélectionner —"
        allowDeselect
      >
        <div className="px-2 py-1" role="presentation">
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full bg-transparent border-b border-border px-1 py-0.5 text-xs outline-none placeholder:text-muted-foreground/50"
          />
        </div>
        {filtered.map((ep) => (
          <DataSelectItem key={ep} value={ep}>{ep}</DataSelectItem>
        ))}
      </DataSelect>
      {row.endpoint && (
        <TraceBtn isLoading={traceLoading} onClick={onTrace} />
      )}
    </>
  );
});

function DataMappingPage() {
  const { dataEndpoints, endpointMeta, endpointList, loading: endpointsLoading } = useNovacityEndpoints();
  const [rows, setRows] = useState<DataMappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filterKpi, setFilterKpi] = useState("Tous");

  // Dirty tracking
  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("");
  const dirtyRef = useRef<Set<number>>(new Set());
  const rowsRef = useRef<DataMappingRow[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [scrollToId, setScrollToId] = useState<number | null>(null);

  // Audit log refresh trigger
  const [auditRefreshKey, setAuditRefreshKey] = useState(0);

  // Preview values: row id → computed value string
  const [previewValues, setPreviewValues] = useState<Record<number, string>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<number, boolean>>({});

  // Test Exec values: row id → computed value from data.json
  const [testValues, setTestValues] = useState<Record<number, string>>({});
  const [testLoading, setTestLoading] = useState<Record<number, boolean>>({});
  const fetchingRef = useRef<Set<number>>(new Set());

  // Sample data for each row (for NestedKeySelector)
  const [sampleDataCache, setSampleDataCache] = useState<Record<number, Record<string, unknown> | null>>({});

  // Live exec state for Test Live column
  // (removed: replaced by liveFormulaResults + liveFormulaLoading)

  // Live formula results (per KPI group leader)
  const [liveFormulaResults, setLiveFormulaResults] = useState<Record<number, string>>({});
  const [liveFormulaLoading, setLiveFormulaLoading] = useState<Record<number, boolean>>({});

  const runLiveKpiGroup = async (groupRows: DataMappingRow[], leaderId: number) => {
    setLiveFormulaLoading((m) => ({ ...m, [leaderId]: true }));
    setLiveFormulaResults((m) => ({ ...m, [leaderId]: "" }));

    const results = await Promise.allSettled(
      groupRows.map(async (row) => {
        try {
          const out = await executeRow(row, effectiveBaseUrl);
          return { id: row.id, value: out };
        } catch (e) {
          return { id: row.id, value: `Erreur: ${(e as Error).message}` };
        }
      })
    );

    // Build testValues-like map from live results
    const liveTestValues: Record<number, string> = {};
    for (const r of results) {
      if (r.status === "fulfilled") {
        liveTestValues[r.value.id] = r.value.value;
      }
    }

    // Apply formula using the leader row
    const leader = groupRows[0];
    const formulaResult = computeFormulaForTest(leader, liveTestValues);

    setLiveFormulaResults((m) => ({ ...m, [leaderId]: formulaResult }));
    setLiveFormulaLoading((m) => ({ ...m, [leaderId]: false }));
  };

  // Direct type validation errors
  const [directErrors, setDirectErrors] = useState<Record<number, string>>({});

  // Health check state
  const [healthState, setHealthState] = useState<"idle" | "loading" | "healthy" | "error">("idle");
  const [healthMsg, setHealthMsg] = useState("");

  // Exec All / Export loading states
  const [execAllLoading, setExecAllLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Trace button loading states (per-row, per-trace-type)
  const [traceLoading, setTraceLoading] = useState<Record<number, Record<string, boolean>>>({});

  // Variable key validation loading
  const [validatingKeys, setValidatingKeys] = useState<Record<number, boolean>>({});

  // Confirm reset dialog
  const [confirmReset, setConfirmReset] = useState(false);

  const runHealthCheck = async () => {
    if (!effectiveBaseUrl) return;
    setHealthState("loading");
    setHealthMsg("");
    try {
      const url = `${effectiveBaseUrl.replace(/\/+$/, "")}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        headers: { Accept: "application/json", ...authHeaders },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        setHealthState("healthy");
        setHealthMsg(`HTTP ${res.status} — API accessible`);
      } else {
        setHealthState("error");
        setHealthMsg(`HTTP ${res.status} — ${res.statusText}`);
      }
    } catch (e) {
      setHealthState("error");
      setHealthMsg((e as Error).name === "AbortError" ? "Timeout (10s)" : (e as Error).message);
    }
  };

  // Trace modal
  const [traceModal, setTraceModal] = useState<{ open: boolean; title: string; content: unknown }>({ open: false, title: "", content: null });

  // JSON preview modal (for Aperçu JSON column)
  const [jsonPreview, setJsonPreview] = useState<{ open: boolean; title: string; content: unknown; highlight?: string }>({ open: false, title: "", content: null });

  // All endpoint data (for JSON preview column + search)
  const [allEndpointData, setAllEndpointData] = useState<Record<string, AllEndpointRecord>>({});
  const allEndpointDataRef = useRef(allEndpointData);
  allEndpointDataRef.current = allEndpointData;
  const [allDataLoading, setAllDataLoading] = useState(false);
  const [allEndpointsModalOpen, setAllEndpointsModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAllSamples().then((data) => {
      if (!cancelled) setAllEndpointData(data);
    }).finally(() => {
      if (!cancelled) setAllDataLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Keep refs in sync
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  // Scroll to newly added row
  useEffect(() => {
    if (scrollToId === null) return;
    const timer = setTimeout(() => {
      const el = tableScrollRef.current?.querySelector(`[data-row-id="${scrollToId}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrollToId(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [scrollToId, rows]);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMappings();
      if (data.length === 0) {
        await seedMappings();
        const seeded = await fetchMappings();
        setRows(seeded);
      } else {
        setRows(data);
      }
      setDirtyIds(new Set());
      dirtyRef.current = new Set();
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRows(); }, [loadRows]);

  // Auto-fetch preview values for all rows with endpoints
  const [baseUrl, setBaseUrl] = useState("");
  const [debouncedBaseUrl, setDebouncedBaseUrl] = useState("");

  // Novacity connection config (base URL, API key, JWT)
  const [novacityConfig, setNovacityConfig] = useState<{ base_url: string; api_key: string; token: string } | null>(null);
  useEffect(() => {
    fetch("/novacity-config", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setNovacityConfig(data); })
      .catch(() => {});
  }, []);

  // User role for page-only RBAC (temporary — remove with this block)
  const [userRole, setUserRole] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem("data_auth_user") || "{}");
      return user.role || "";
    } catch { return ""; }
  });
  const isSuperadmin = userRole === "it";
  const isAdmin = userRole === "direction" || isSuperadmin;
  const isNormal = !isAdmin;

  // Fetch saved base URL from DB (used for API calls by all users)
  const [savedBaseUrl, setSavedBaseUrl] = useState("");
  useEffect(() => {
    fetch("/api/settings/novacity_base_url", { headers: { Accept: "application/json" } })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.value) setSavedBaseUrl(d.value); })
      .catch(() => {});
  }, []);

  // Superadmin: also load saved URL into input field on mount
  useEffect(() => {
    if (!isSuperadmin || !savedBaseUrl) return;
    setBaseUrl(savedBaseUrl);
  }, [isSuperadmin, savedBaseUrl]);

  // Effective base URL for API calls: superadmin uses input > saved > config; non-superadmin uses saved > static
  const effectiveBaseUrl = isSuperadmin
    ? (baseUrl || savedBaseUrl || novacityConfig?.base_url || "")
    : (savedBaseUrl || "http://192.168.2.17:4100");

  // Auth headers for live API calls
  const authHeaders = useMemo(() => {
    if (!novacityConfig) return {};
    const h: Record<string, string> = {};
    if (novacityConfig.api_key) h["x-api-key"] = novacityConfig.api_key;
    if (novacityConfig.token) h["Authorization"] = `Bearer ${novacityConfig.token}`;
    return h;
  }, [novacityConfig]);

  // Debounce baseUrl for preview fetching (400ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBaseUrl(baseUrl), 400);
    return () => clearTimeout(timer);
  }, [baseUrl]);

  // Save base URL to DB when it changes (debounced)
  useEffect(() => {
    if (!debouncedBaseUrl) return;
    const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    const token = xsrf ? decodeURIComponent(xsrf[1]) : "";
    const controller = new AbortController();
    fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
        "X-XSRF-TOKEN": token,
      },
      body: JSON.stringify({ key: "novacity_base_url", value: debouncedBaseUrl }),
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [debouncedBaseUrl]);

  // Effective debounced base URL for preview fetching
  const effectiveDebouncedBaseUrl = debouncedBaseUrl || savedBaseUrl || novacityConfig?.base_url || "";
  const effectiveDebouncedBaseUrlRef = useRef(effectiveDebouncedBaseUrl);
  effectiveDebouncedBaseUrlRef.current = effectiveDebouncedBaseUrl;

  const fetchPreview = useCallback(async (row: DataMappingRow, signal?: AbortSignal) => {
    const url = effectiveDebouncedBaseUrlRef.current;
    if (!row.endpoint || !url) return;
    React.startTransition(() => setPreviewLoading((m) => ({ ...m, [row.id]: true })));
    try {
      const val = await executeRow(row, url, signal);
      React.startTransition(() => {
        setPreviewValues((m) => ({ ...m, [row.id]: val }));
        setPreviewLoading((m) => ({ ...m, [row.id]: false }));
      });
    } catch {
      if (!signal?.aborted) {
        React.startTransition(() => {
          setPreviewValues((m) => ({ ...m, [row.id]: "Erreur" }));
          setPreviewLoading((m) => ({ ...m, [row.id]: false }));
        });
      }
    }
  }, []);

  // Fetch all previews when rows change (batched)
  // Only re-fetch rows whose endpoint+variable_key signature changed
  const prevPreviewSigRef = useRef<Record<number, string>>({});

  // Clear preview signatures when user types a new base URL (forces re-fetch)
  useEffect(() => {
    if (debouncedBaseUrl) prevPreviewSigRef.current = {};
  }, [debouncedBaseUrl]);
  useEffect(() => {
    if (!effectiveDebouncedBaseUrlRef.current || rows.length === 0) return;
    const controller = new AbortController();
    const targets = rows.filter((r) => {
      if (!r.endpoint || !r.variable_key) return false;
      const sig = `${r.endpoint}|${r.variable_key}`;
      const prev = prevPreviewSigRef.current[r.id];
      if (sig === prev) return false;
      prevPreviewSigRef.current[r.id] = sig;
      return true;
    });
    if (targets.length > 0) {
      fetchInBatches(targets, BATCH_SIZE, fetchPreview, controller.signal);
    }
    return () => controller.abort();
  }, [rows, fetchPreview]);

  // Track previous aggregation settings to only recompute changed rows
  const prevAggSettingsRef = useRef<Record<number, string>>({});

  // Auto-fetch test values from data.json samples (batched)
  useEffect(() => {
    if (rows.length === 0) return;
    const controller = new AbortController();
    const targets = rows.filter((r) => {
      if (!r.endpoint || !r.variable_key) return false;
      const aggSignature = `${r.variable_type}-${r.has_function}-${r.fn}-${r.is_filtered}-${r.filter_key}-${r.filter_value}-${directErrors[r.id] || ''}`;
      const prevSignature = prevAggSettingsRef.current[r.id];
      const needsRecompute = !testValues[r.id] || testLoading[r.id] || aggSignature !== prevSignature || testValues[r.id] === "Erreur" || testValues[r.id] === "Pas de sample";
      prevAggSettingsRef.current[r.id] = aggSignature;
      return needsRecompute && !fetchingRef.current.has(r.id);
    });

    fetchInBatches(targets, BATCH_SIZE, async (r, signal) => {
      fetchingRef.current.add(r.id);
      React.startTransition(() => setTestLoading((m) => ({ ...m, [r.id]: true })));
      try {
        const sampleData = await fetchSampleData(r.endpoint!, signal);
        if (!sampleData) {
          React.startTransition(() => {
            setTestValues((m) => ({ ...m, [r.id]: "Pas de sample" }));
            setTestLoading((m) => ({ ...m, [r.id]: false }));
          });
          return;
        }
        const records = extractRecords(sampleData);

        // Validate Direct type BEFORE computing
        if (r.variable_type === "Direct") {
          const directError = validateDirectKeyType(records, r.variable_key!);
          if (directError) {
            React.startTransition(() => {
              setDirectErrors((m) => ({ ...m, [r.id]: directError }));
              setTestValues((m) => ({ ...m, [r.id]: directError }));
              setTestLoading((m) => ({ ...m, [r.id]: false }));
            });
            return;
          } else {
            setDirectErrors((m) => {
              const next = { ...m };
              delete next[r.id];
              return next;
            });
          }
        }

        const result = buildExecutionResult(r, records);
        React.startTransition(() => {
          setTestValues((m) => ({ ...m, [r.id]: result.output }));
          setTestLoading((m) => ({ ...m, [r.id]: false }));
        });
      } catch (e) {
        if (signal?.aborted) {
          React.startTransition(() => setTestLoading((m) => ({ ...m, [r.id]: false })));
          return;
        }
        React.startTransition(() => {
          setTestValues((m) => ({ ...m, [r.id]: (e as Error).message || "Erreur" }));
          setTestLoading((m) => ({ ...m, [r.id]: false }));
        });
      } finally {
        fetchingRef.current.delete(r.id);
      }
    }, controller.signal);
    return () => {
      controller.abort();
      for (const r of targets) {
        fetchingRef.current.delete(r.id);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, directErrors]);

  // Flush dirty rows to API
  const flushDirty = useCallback(async () => {
    const ids = Array.from(dirtyRef.current);
    if (ids.length === 0) return;

    const mappings: DataMappingPayload[] = ids.map((id) => {
      const row = rowsRef.current.find((r) => r.id === id);
      if (!row) return null;
      return {
        id: row.id,
        kpi: row.kpi,
        name: row.name,
        variable: row.variable,
        endpoint: row.endpoint,
        variable_type: row.variable_type,
        variable_key: row.variable_key,
        is_filtered: row.is_filtered,
        filter_key: row.filter_key,
        filter_value: row.filter_value,
        has_function: row.has_function,
        fn: row.fn,
        modules: row.modules ?? [],
        formula: row.formula ?? null,
        highlight_color: row.highlight_color ?? null,
        cible_operator: row.cible_operator ?? '=',
        cible_value: row.cible_value ?? null,
        cible_is_percentage: row.cible_is_percentage ?? false,
        refresh_frequency: row.refresh_frequency ?? 'instant',
      };
    }).filter(Boolean) as DataMappingPayload[];

    if (mappings.length === 0) return;

    setSaving(true);
    try {
      await batchUpdateMappings(mappings);
      setDirtyIds(new Set());
      dirtyRef.current = new Set();
      setLastSaved(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      setAuditRefreshKey((k) => k + 1);
    } catch {
      // Keep dirty state so user can retry
    } finally {
      setSaving(false);
    }
  }, []);

  // Debounced auto-save (500ms after last edit)
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => { flushDirty(); }, 500);
  }, [flushDirty]);

  // Cleanup timer
  useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

  const toggleModule = useCallback((id: number, mod: string) => {
    // Find the KPI of the row being toggled
    const targetRow = rowsRef.current.find((r) => r.id === id);
    if (!targetRow) return;
    const targetKpi = targetRow.kpi;

    setRows((rs) => rs.map((r) => {
      if (r.kpi !== targetKpi) return r;
      const current = r.modules ?? [];
      const next = current.includes(mod)
        ? current.filter((m) => m !== mod)
        : [...current, mod];
      if (mod === "production" && current.includes("production")) {
        return { ...r, modules: next.filter((m) => !m.startsWith("production:")) };
      }
      return { ...r, modules: next };
    }));

    // Mark all rows with same KPI as dirty
    setDirtyIds((prev) => {
      const next = new Set(prev);
      for (const r of rowsRef.current) {
        if (r.kpi === targetKpi) next.add(r.id);
      }
      return next;
    });
    for (const r of rowsRef.current) {
      if (r.kpi === targetKpi) dirtyRef.current.add(r.id);
    }
    scheduleSave();
  }, [scheduleSave, rows]);

  const kpiGroups = useMemo(() => ["Tous", ...Array.from(new Set(rows.map((r) => r.kpi)))], [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const result = rows.filter((r) => {
      if (filterKpi !== "Tous" && r.kpi !== filterKpi) return false;
      if (!needle) return true;
      return (
        r.kpi.toLowerCase().includes(needle) ||
        r.name.toLowerCase().includes(needle) ||
        r.variable.toLowerCase().includes(needle) ||
        (r.endpoint ?? "").toLowerCase().includes(needle) ||
        (r.variable_key ?? "").toLowerCase().includes(needle) ||
        (() => {
          const meta = r.endpoint ? endpointMeta[r.endpoint] : null;
          if (meta) {
            if (meta.name.toLowerCase().includes(needle)) return true;
            if (meta.method.toLowerCase().includes(needle)) return true;
            if (meta.fields.some((f) => f.toLowerCase().includes(needle))) return true;
          }
          // Also search in full endpoint data (response content)
          const rec = r.endpoint ? allEndpointData[r.endpoint] : null;
          if (rec) {
            if (rec.name.toLowerCase().includes(needle)) return true;
            if (rec.method.toLowerCase().includes(needle)) return true;
            if (rec.fields.some((f) => f.toLowerCase().includes(needle))) return true;
            const responseStr = JSON.stringify(rec.response).toLowerCase();
            if (responseStr.includes(needle)) return true;
          }
          return false;
        })()
      );
    });
    result.sort((a, b) => a.kpi.localeCompare(b.kpi) || a.name.localeCompare(b.name));
    return result;
  }, [rows, q, filterKpi, endpointMeta, allEndpointData]);

  // Compute rowspan spans for KPI, Name, and Modules columns
  const spans = useMemo(() => {
    const kpiSpan: number[] = [];
    const nameSpan: number[] = [];
    const moduleSpan: number[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const r = filtered[i];
      // KPI span
      if (i > 0 && filtered[i - 1].kpi === r.kpi) {
        kpiSpan.push(0);
      } else {
        let count = 1;
        while (i + count < filtered.length && filtered[i + count].kpi === r.kpi) count++;
        kpiSpan.push(count);
      }
      // Module span — same as KPI (shared across KPI group)
      if (i > 0 && filtered[i - 1].kpi === r.kpi) {
        moduleSpan.push(0);
      } else {
        let count = 1;
        while (i + count < filtered.length && filtered[i + count].kpi === r.kpi) count++;
        moduleSpan.push(count);
      }
      // Name span (within same KPI group)
      const sameKpi = i > 0 && filtered[i - 1].kpi === r.kpi;
      if (sameKpi && filtered[i - 1].name === r.name) {
        nameSpan.push(0);
      } else {
        let count = 1;
        while (
          i + count < filtered.length &&
          filtered[i + count].kpi === r.kpi &&
          filtered[i + count].name === r.name
        ) count++;
        nameSpan.push(count);
      }
    }
    return { kpiSpan, nameSpan, moduleSpan };
  }, [filtered]);

  // Text input edit — local state only + mark dirty + debounce save
  const updateLocal = useCallback((id: number, patch: Partial<DataMappingRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirtyIds((prev) => { const next = new Set(prev); next.add(id); return next; });
    dirtyRef.current.add(id);
    scheduleSave();
  }, [scheduleSave]);

  // Discrete change (select/checkbox) — save immediately
  const updateImmediate = useCallback(async (id: number, patch: Partial<DataMappingRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirtyIds((prev) => { const next = new Set(prev); next.add(id); return next; });
    dirtyRef.current.add(id);
    scheduleSave();
  }, [scheduleSave]);

  const remove = useCallback(async (id: number) => {
    let removedRow: DataMappingRow | undefined;
    setRows((rs) => {
      const idx = rs.findIndex((r) => r.id === id);
      if (idx !== -1) removedRow = rs[idx];
      return rs.filter((r) => r.id !== id);
    });
    dirtyRef.current.delete(id);
    try {
      await deleteMapping(id);
      toast.success("Ligne supprimée");
      setAuditRefreshKey((k) => k + 1);
    } catch {
      if (removedRow) {
        setRows((rs) => [...rs, removedRow!]);
        toast.error("Échec de la suppression — ligne restaurée");
      }
    }
  }, []);

  const addRow = useCallback(async () => {
    try {
      const mapping = await createMapping({
        kpi: "F-REQ-XXX",
        name: "",
        variable: "",
        endpoint: null,
        variable_type: "Direct",
        variable_key: "",
        is_filtered: false,
        filter_key: "",
        filter_value: "",
        has_function: false,
        fn: "Latest",
        cible_operator: "=",
        cible_value: null,
        cible_is_percentage: false,
        refresh_frequency: "instant",
      });
      setRows((rs) => [...rs, mapping]);
      setScrollToId(mapping.id);
      toast.success("Ligne ajoutée");
      setAuditRefreshKey((k) => k + 1);
    } catch {
      toast.error("Erreur lors de l'ajout de la ligne");
    }
  }, []);

  const resetAll = useCallback(async () => {
    try {
      setSaving(true);
      for (const r of rowsRef.current) {
        await deleteMapping(r.id);
      }
      await seedMappings();
      const data = await fetchMappings();
      setRows(data);
      setDirtyIds(new Set());
      dirtyRef.current = new Set();
      setLastSaved(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      loadRows();
    } finally {
      setSaving(false);
    }
  }, [loadRows]);

  const exportRows = async () => {
    setExporting(true);
    try {
      const exportData = filtered.map((r) => {
        let mods: string[] = [];
        if (Array.isArray(r.modules)) {
          mods = r.modules;
        } else if (typeof r.modules === "string" && r.modules) {
          try { mods = JSON.parse(r.modules); } catch { mods = [r.modules]; }
        }
        return {
          "KPI": r.kpi,
          "Nom": r.name,
          "Variable": r.variable,
          "Endpoint": r.endpoint ?? "",
          "Type": r.variable_type,
          "Clé JSON": r.variable_key,
          "Filtré": r.is_filtered ? "Oui" : "Non",
          "Clé filtre": r.filter_key,
          "Valeur filtre": r.filter_value,
          "Fonction": r.has_function ? "Oui" : "Non",
          "Agrégation": r.fn,
          "Modules": mods.join(", "),
          "Couleur": r.highlight_color ?? "",
          "Opérateur cible": r.cible_operator ?? "=",
          "Cible": r.cible_value ?? "",
          "Cible %": r.cible_is_percentage ? "Oui" : "Non",
          "Fréquence": r.refresh_frequency ?? "",
        };
      });
      await exportToCsv("bacovet-mapping-kpis", exportData as Record<string, unknown>[]);
      toast.success("Export terminé");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  // ---- Live exec state ----
  const [execState, setExecState] = useState<Record<number, { s: ExecState; msg: string }>>({});

  const runRow = async (row: DataMappingRow) => {
    setExecState((m) => ({ ...m, [row.id]: { s: "loading", msg: "…" } }));
    try {
      const out = await executeRow(row, effectiveBaseUrl);
      setExecState((m) => ({ ...m, [row.id]: { s: "ok", msg: out } }));
    } catch (e) {
      setExecState((m) => ({ ...m, [row.id]: { s: "error", msg: (e as Error).message } }));
    }
  };

  const runAll = async () => {
    setExecAllLoading(true);
    try {
      for (const r of filtered) await runRow(r);
    } finally {
      setExecAllLoading(false);
    }
  };

  const stats = useMemo(() => {
    const mapped = rows.filter((r) => r.endpoint && r.variable_key).length;
    return { total: rows.length, mapped, pending: rows.length - mapped };
  }, [rows]);

  // Keep latest updateLocal and filtered in refs for stable formula callbacks
  const updateLocalRef = useRef(updateLocal);
  updateLocalRef.current = updateLocal;
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  // Stable refs for row callbacks — prevents child re-renders
  const updateImmediateRef = useRef(updateImmediate);
  updateImmediateRef.current = updateImmediate;
  const toggleModuleRef = useRef(toggleModule);
  toggleModuleRef.current = toggleModule;
  const runRowRef = useRef(runRow);
  runRowRef.current = runRow;
  const removeRef = useRef(remove);
  removeRef.current = remove;
  const setTestValuesRef = useRef(setTestValues);
  setTestValuesRef.current = setTestValues;
  const setDirectErrorsRef = useRef(setDirectErrors);
  setDirectErrorsRef.current = setDirectErrors;
  const setSampleDataCacheRef = useRef(setSampleDataCache);
  setSampleDataCacheRef.current = setSampleDataCache;
  const setTraceModalRef = useRef(setTraceModal);
  setTraceModalRef.current = setTraceModal;
  const setTraceLoadingRef = useRef(setTraceLoading);
  setTraceLoadingRef.current = setTraceLoading;
  const setValidatingKeysRef = useRef(setValidatingKeys);
  setValidatingKeysRef.current = setValidatingKeys;
  const setExecStateRef = useRef(setExecState);
  setExecStateRef.current = setExecState;

  // Memoize formula callbacks per KPI group to prevent FormulaBuilder re-renders
  const formulaCallbacksRef = useRef<Map<string, (f: FormulaDef) => void>>(new Map());

  // Pre-compute formula results for all KPI group leaders (avoids eval() per render per group)
  const formulaResults = useMemo(() => {
    const map: Record<number, string> = {};
    for (let i = 0; i < filtered.length; i++) {
      if (spans.kpiSpan[i] > 0) {
        map[filtered[i].id] = computeFormulaForTest(filtered[i], testValues);
      }
    }
    return map;
  }, [filtered, testValues, spans.kpiSpan]);

  if (loading || endpointsLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Chargement des données…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      <PageHeader
        title="Mapping KPIs ↔ Endpoints"
        subtitle="Configuration des variables et agrégations par endpoint Novacity"
        filters={
          <>
            <div className="rounded-md border border-border bg-card px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Total</div>
              <div className="text-sm font-bold">{stats.total}</div>
            </div>
            <div className="rounded-md border border-border bg-card px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Mappés</div>
              <div className="text-sm font-bold text-green-500">{stats.mapped}</div>
            </div>
            <div className="rounded-md border border-border bg-card px-3 py-1.5">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">À faire</div>
              <div className="text-sm font-bold text-orange-500">{stats.pending}</div>
            </div>
          </>
        }
      />
      <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5 border border-border bg-card rounded-md px-2 py-1 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shrink-0">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher…"
            className="bg-transparent outline-none text-xs w-36 cursor-text"
          />
        </div>
        <DataSelect
          value={filterKpi}
          onValueChange={(val) => setFilterKpi(val)}
          className="text-xs shrink-0 w-28"
        >
          {kpiGroups.map((g) => <DataSelectItem key={g} value={g}>{g}</DataSelectItem>)}
        </DataSelect>
        {isSuperadmin ? (
          <div className="flex items-center gap-1.5 border border-border bg-card rounded-md px-2 py-1 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 min-w-[180px] flex-1">
            <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="Base URL API"
              className="bg-transparent outline-none text-xs min-w-0 flex-1 cursor-text"
            />
            {healthState !== "idle" && (
              <span className={`text-[10px] shrink-0 ${healthState === "healthy" ? "text-green-500" : healthState === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                {healthMsg}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 border border-border/50 bg-muted/30 rounded-md px-2 py-1 min-w-[180px] flex-1">
            <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">http://192.168.2.17:4100</span>
          </div>
        )}
        <button onClick={addRow} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-border bg-card hover:bg-secondary cursor-pointer shrink-0">
          <Plus className="h-3 w-3" /> Ajouter
        </button>
        <button
          onClick={flushDirty}
          disabled={dirtyIds.size === 0 || saving}
          className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-green-500/40 bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-40 shrink-0 ${saving ? "cursor-wait" : "cursor-pointer"}`}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save{dirtyIds.size > 0 ? ` (${dirtyIds.size})` : ""}
        </button>
        <button
          onClick={runHealthCheck}
          disabled={!effectiveBaseUrl || healthState === "loading"}
          className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border disabled:opacity-40 shrink-0 ${
            healthState === "loading" ? "cursor-wait" : "cursor-pointer"
          } ${
            healthState === "healthy"
              ? "border-green-500/40 bg-green-500/10 text-green-600 hover:bg-green-500/20"
              : healthState === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "border-border bg-card hover:bg-secondary"
          }`}
          title={healthMsg || "Tester la connexion à l'API"}
        >
          {healthState === "loading" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : healthState === "healthy" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : healthState === "error" ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <Database className="h-3 w-3" />
          )}
          {healthState === "healthy" ? "OK" : healthState === "error" ? "Error" : "Health"}
        </button>
        <button
          onClick={runAll}
          disabled={!effectiveBaseUrl || execAllLoading}
          className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 shrink-0 ${execAllLoading ? "cursor-wait" : "cursor-pointer"}`}
        >
          {execAllLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
          {execAllLoading ? "Running…" : "Exec All"}
        </button>
        <button
          onClick={exportRows}
          disabled={exporting}
          className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-border bg-card hover:bg-secondary disabled:opacity-40 shrink-0 ${exporting ? "cursor-wait" : "cursor-pointer"}`}
        >
          {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          {exporting ? "Export…" : "Excel"}
        </button>
        {isSuperadmin && (
          <button
            onClick={() => setConfirmReset(true)}
            disabled={saving}
            className={`text-[11px] px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10 disabled:opacity-40 shrink-0 ${saving ? "cursor-wait" : "cursor-pointer"}`}
          >
            Reset
          </button>
        )}
      </div>
      {lastSaved && (
        <div className="px-4 py-1 text-[10px] text-muted-foreground border-b border-border/50">
          Dernière sauvegarde : {lastSaved}
        </div>
      )}
      <div ref={tableScrollRef} className="flex-1 overflow-auto p-3">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {["", "KPI", "Modules", "Name", "Variable", "Aperçu JSON", "Endpoint", "Type", "Clé JSON", "Filtré ?", "Filtre Clé", "Filtre Valeur", "Fonction ?", "Agrégation", "Test", "Exec", "Résultat", "Formula", "Formula Result", "Cible", "Fréquence", "Type de graphique", "Test Live", ""].map((h, i) => (
                <th key={`th-${i}`} className="text-left font-semibold px-2 py-2 border-b border-border whitespace-nowrap">
                  {h === "Aperçu JSON" ? (
                    <span className="inline-flex items-center gap-1">
                      {h}
                      <button
                        onClick={() => setAllEndpointsModalOpen(true)}
                        className="inline-flex items-center justify-center h-4 w-4 rounded bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                        title="Voir tous les endpoints JSON"
                      >
                        <FileJson className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ) : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => {
              const keys = r.endpoint ? (dataEndpoints[r.endpoint] ?? []) : [];
              const isDirty = dirtyIds.has(r.id);
              const ks = spans.kpiSpan[i];
              const ns = spans.nameSpan[i];
              const isFirstInKpi = ks > 0;
              const isFirstInName = ns > 0;
              const ms = spans.moduleSpan[i];
              const isFirstInModule = ms > 0;
              return (
                <tr key={r.id} data-row-id={r.id} style={r.highlight_color ? { backgroundColor: r.highlight_color + "30" } : undefined} className={`border-b border-border/50 hover:bg-secondary/30 ${isDirty ? "bg-amber-500/5" : ""} ${isFirstInKpi && i > 0 ? "border-t-2 border-t-border" : ""}`}>
                  {/* Color picker */}
                  <td className="px-1.5 py-1.5 w-8">
                    <div className="relative group flex items-center justify-center">
                      {isDirty && (
                        <span className="absolute -top-1 -left-1 h-1.5 w-1.5 rounded-full bg-amber-500 ring-2 ring-background" title="Modification non sauvegardée" />
                      )}
                      <div
                        className="w-4 h-4 rounded-full border border-border cursor-pointer transition-shadow ring-0 ring-primary/40 group-hover:ring-2"
                        style={
                          r.highlight_color
                            ? { backgroundColor: r.highlight_color }
                            : {
                                backgroundImage:
                                  "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
                                backgroundSize: "6px 6px",
                                backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0px",
                              }
                        }
                        title="Surligner cette ligne"
                      />
                      <input
                        type="color"
                        value={r.highlight_color ?? "#3b82f6"}
                        onChange={(e) => updateImmediate(r.id, { highlight_color: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        aria-label="Choisir une couleur de surlignage"
                      />
                      {r.highlight_color && (
                        <button
                          onClick={() => updateImmediate(r.id, { highlight_color: null })}
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-destructive text-white text-[9px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80 cursor-pointer"
                          title="Effacer la couleur"
                          aria-label="Effacer la couleur"
                        >×</button>
                      )}
                    </div>
                  </td>
                  {isFirstInKpi ? (
                    <td rowSpan={ks} className="px-2 py-1.5 font-mono text-[11px] border-r border-border/30 align-top min-w-[100px]">
                      <input value={r.kpi}
                        onChange={isNormal ? undefined : (e) => updateLocal(r.id, { kpi: e.target.value })}
                        placeholder="F-REQ-XXX"
                        title={r.kpi}
                        readOnly={isNormal}
                        tabIndex={isNormal ? -1 : undefined}
                        className={isNormal
                          ? "bg-transparent border border-transparent rounded px-1.5 py-1 w-full text-muted-foreground cursor-default"
                          : fieldBase} />
                    </td>
                  ) : null}
                  {isFirstInModule ? (
  <td rowSpan={ms} className="px-2 py-1.5 border-r border-border/30 align-top">
    <div className="flex flex-wrap gap-x-2.5 gap-y-1 items-start">
      {MODULES.map((mod) => {
        const checked = (r.modules ?? []).includes(mod);
        const isProduction = mod === "production";
        return (
          <div key={mod} className="flex flex-col gap-1">
            <label
              className={`inline-flex items-center gap-1 cursor-pointer rounded px-0.5 -mx-0.5 transition-colors ${
                checked ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleModule(r.id, mod)}
                className={checkboxBase}
              />
              <span className="text-[10px] font-medium">{MODULE_LABELS[mod]}</span>
            </label>

            {isProduction && checked && (
              <div className="flex flex-wrap gap-x-2 gap-y-1 pl-2 border-l-2 border-primary/25">
                {PROD_SUBS.map((sub) => {
                  const subChecked = (r.modules ?? []).includes(`production:${sub}`);
                  return (
                    <label
                      key={sub}
                      className={`inline-flex items-center gap-1 cursor-pointer transition-colors ${
                        subChecked ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={subChecked}
                        onChange={() => toggleModule(r.id, `production:${sub}`)}
                        className={checkboxBase}
                      />
                      <span className="text-[10px]">{MODULE_LABELS[sub]}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </td>
) : null}
                  {isFirstInName ? (
                    <td rowSpan={ns} className="px-2 py-1.5 border-r border-border/30 align-top min-w-[160px]">
                      <textarea value={r.name}
                        onChange={isNormal ? undefined : (e) => updateLocal(r.id, { name: e.target.value })}
                        placeholder="Nom du KPI"
                        title={r.name}
                        rows={1}
                        readOnly={isNormal}
                        tabIndex={isNormal ? -1 : undefined}
                        className={isNormal
                          ? "bg-transparent border border-transparent rounded px-1.5 py-1 w-full text-muted-foreground cursor-default resize-none overflow-hidden min-h-[28px] leading-snug"
                          : `${fieldBase} resize-none overflow-hidden min-h-[28px] leading-snug`}
                        ref={autoSize}
                        onInput={isNormal ? undefined : (e) => autoSize(e.currentTarget)}
                      />
                    </td>
                  ) : null}
                  <td className="px-2 py-1.5 text-muted-foreground italic min-w-[160px]">
                    <textarea value={r.variable}
                      onChange={isNormal ? undefined : (e) => updateLocal(r.id, { variable: e.target.value })}
                      placeholder="nom.variable"
                      title={r.variable}
                      rows={1}
                      readOnly={isNormal}
                      tabIndex={isNormal ? -1 : undefined}
                      className={isNormal
                        ? "bg-transparent border border-transparent rounded px-1.5 py-1 w-full text-muted-foreground italic cursor-default resize-none overflow-hidden min-h-[28px] leading-snug"
                        : `${fieldBase} resize-none overflow-hidden min-h-[28px] leading-snug`}
                      ref={autoSize}
                      onInput={isNormal ? undefined : (e) => autoSize(e.currentTarget)}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => setAllEndpointsModalOpen(true)}
                      className="inline-flex items-center justify-center h-7 w-10 rounded-md bg-muted text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
                      title="Voir tous les endpoints JSON"
                      aria-label="Voir tous les endpoints JSON"
                    >
                      <FileJson className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center">
                      <EndpointSelector
                        row={r}
                        endpointList={endpointList}
                        dataEndpoints={dataEndpoints}
                        endpointMeta={endpointMeta}
                        onEndpointChange={(newEndpoint) => {
                          updateImmediate(r.id, { endpoint: newEndpoint, variable_key: "" });
                          // Clear test value and errors when endpoint changes
                          setTestValues((m) => {
                            const next = { ...m };
                            delete next[r.id];
                            return next;
                          });
                          setDirectErrors((m) => {
                            const next = { ...m };
                            delete next[r.id];
                            return next;
                          });
                          setTestLoading((m) => ({ ...m, [r.id]: false }));
                          // Fetch sample data for NestedKeySelector
                          if (newEndpoint) {
                            fetchSampleData(newEndpoint).then((sample) => {
                              if (sample) {
                                const records = extractRecords(sample);
                                setSampleDataCache((m) => ({ ...m, [r.id]: records[0] ?? null }));
                              } else {
                                setSampleDataCache((m) => ({ ...m, [r.id]: null }));
                              }
                            });
                          } else {
                            setSampleDataCache((m) => {
                              const next = { ...m };
                              delete next[r.id];
                              return next;
                            });
                          }
                        }}
                        traceLoading={!!traceLoading[r.id]?.endpoint}
                        onTrace={async () => {
                          setTraceLoading((m) => ({ ...m, [r.id]: { ...m[r.id], endpoint: true } }));
                          try {
                            const ep = r.endpoint!;
                            const sample = await fetchSampleData(ep);
                            const records = extractRecords(sample);
                            setTraceModal({
                              open: true,
                              title: `Endpoint: ${ep}`,
                              content: {
                                slug: ep,
                                name: endpointMeta[ep]?.name ?? ep,
                                method: endpointMeta[ep]?.method ?? "GET",
                                fields: dataEndpoints[ep] ?? [],
                                total_records: records.length,
                                all_records: records,
                              },
                            });
                          } finally {
                            setTraceLoading((m) => ({ ...m, [r.id]: { ...m[r.id], endpoint: false } }));
                          }
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <DataSelect value={r.variable_type} onValueChange={(val) => {
                      const newType = val as VarType;
                      const patch: Partial<DataMappingRow> = { variable_type: newType };
                      if (newType === "Direct") {
                        patch.is_filtered = false;
                        patch.filter_key = "";
                        patch.filter_value = "";
                        patch.has_function = false;
                        patch.fn = "Latest";
                      }
                      updateImmediate(r.id, patch);

                      // Clear direct errors when switching to Complex (errors only apply to Direct)
                      if (newType === "Complex") {
                        setDirectErrors((m) => {
                          const next = { ...m };
                          delete next[r.id];
                          return next;
                        });
                      }

                      // Validate Direct type immediately
                      if (newType === "Direct" && r.variable_key && r.endpoint) {
                        (async () => {
                          const sample = await fetchSampleData(r.endpoint!);
                          if (sample) {
                            const records = extractRecords(sample);
                            const error = validateDirectKeyType(records, r.variable_key!);
                            setDirectErrors((m) => {
                              const next = { ...m };
                              if (error) {
                                next[r.id] = error;
                              } else {
                                delete next[r.id];
                              }
                              return next;
                            });
                            // Clear test value if there's an error
                            if (error) {
                              setTestValues((m) => ({ ...m, [r.id]: error }));
                            }
                          }
                        })();
                      }
                    }}
                      className={selectBase}>
                      <DataSelectItem value="Direct">Direct</DataSelectItem>
                      <DataSelectItem value="Complex">Complex</DataSelectItem>
                    </DataSelect>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center">
                      <NestedKeySelector
                        keys={keys}
                        sampleData={sampleDataCache[r.id] ?? null}
                        value={r.variable_key ?? ""}
                        onChange={async (path) => {
                          updateImmediate(r.id, { variable_key: path });
                          if (r.variable_type === "Direct" && path && r.endpoint) {
                            setValidatingKeys((m) => ({ ...m, [r.id]: true }));
                            try {
                              const sample = await fetchSampleData(r.endpoint);
                              if (sample) {
                                const records = extractRecords(sample);
                                const error = validateDirectKeyType(records, path);
                                setDirectErrors((m) => {
                                  const next = { ...m };
                                  if (error) {
                                    next[r.id] = error;
                                  } else {
                                    delete next[r.id];
                                  }
                                  return next;
                                });
                              }
                            } finally {
                              setValidatingKeys((m) => ({ ...m, [r.id]: false }));
                            }
                          } else {
                            setDirectErrors((m) => {
                              const next = { ...m };
                              delete next[r.id];
                              return next;
                            });
                          }
                        }}
                        disabled={!r.endpoint}
                      />
                      {r.variable_key && (
                        <TraceBtn
                          isLoading={traceLoading[r.id]?.variableKey}
                          onClick={async () => {
                            setTraceLoading((m) => ({ ...m, [r.id]: { ...m[r.id], variableKey: true } }));
                            try {
                              if (!r.endpoint) { setTraceModal({ open: true, title: `Clé: ${r.variable_key}`, content: "Pas d'endpoint sélectionné" }); return; }
                              const sample = await fetchSampleData(r.endpoint);
                              if (!sample) { setTraceModal({ open: true, title: `Clé: ${r.variable_key}`, content: "Pas de sample data" }); return; }
                              const records = extractRecords(sample);
                              const projected = records.map((rec) => ({ [r.variable_key!]: getValueAtPath(rec, r.variable_key!) }));
                              setTraceModal({
                                open: true,
                                title: `Clé: ${r.variable_key}`,
                                content: {
                                  variable_key: r.variable_key,
                                  total_records: records.length,
                                  values: projected,
                                },
                              });
                            } finally {
                              setTraceLoading((m) => ({ ...m, [r.id]: { ...m[r.id], variableKey: false } }));
                            }
                          }}
                        />
                      )}
                      {validatingKeys[r.id] && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-1" />
                      )}
                    </div>
                    {directErrors[r.id] && (
                      <div className="text-[10px] mt-1">
                        {r.variable_type === "Complex" ? (
                          <span className="text-muted-foreground italic">
                            Filtre et agrégation indisponibles pour cette clé. Utilisez le type Direct.
                          </span>
                        ) : (
                          <span className="text-destructive">{directErrors[r.id]}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={r.is_filtered}
                      disabled={r.variable_type === "Direct" || !!directErrors[r.id]}
                      onChange={(e) => updateImmediate(r.id, { is_filtered: e.target.checked })}
                      className={checkboxBase} />
                  </td>
                  <td className="px-2 py-1.5">
                    <DataSelect value={r.filter_key ?? undefined} disabled={!r.is_filtered || !r.endpoint || r.variable_type === "Direct" || !!directErrors[r.id]}
                      onValueChange={(val) => updateImmediate(r.id, { filter_key: val })}
                      className={`w-44`}
                      placeholder={r.endpoint ? "— clé JSON —" : "endpoint requis"}>
                      {keys.map((k) => <DataSelectItem key={k} value={k}>{k}</DataSelectItem>)}
                    </DataSelect>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center">
                      <input value={r.filter_value ?? ""} disabled={!r.is_filtered || r.variable_type === "Direct" || !!directErrors[r.id]}
                        onChange={(e) => updateLocal(r.id, { filter_value: e.target.value })}
                        placeholder="ex: CH01"
                        className="w-44 bg-card border border-border rounded px-1.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-[11px] cursor-text transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:enabled:border-primary/40" />
                      {r.is_filtered && r.filter_key && r.filter_value && (
                        <TraceBtn
                          isLoading={traceLoading[r.id]?.filter}
                          onClick={async () => {
                            setTraceLoading((m) => ({ ...m, [r.id]: { ...m[r.id], filter: true } }));
                            try {
                              if (!r.endpoint) return;
                              const sample = await fetchSampleData(r.endpoint);
                              if (!sample) return;
                              const records = extractRecords(sample);
                              const filtered = records.filter((rec) => String(rec[r.filter_key] ?? "") === r.filter_value);
                              const projected = r.variable_key
                                ? filtered.map((rec) => ({ [r.variable_key!]: rec[r.variable_key!] }))
                                : filtered;
                              setTraceModal({
                                open: true,
                                title: `Filtre: ${r.filter_key} = ${r.filter_value}`,
                                content: {
                                  filter_key: r.filter_key,
                                  filter_value: r.filter_value,
                                  variable_key: r.variable_key ?? null,
                                  total_records: records.length,
                                  filtered_count: filtered.length,
                                  filtered_values: projected,
                                },
                              });
                            } finally {
                              setTraceLoading((m) => ({ ...m, [r.id]: { ...m[r.id], filter: false } }));
                            }
                          }}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={r.has_function}
                      disabled={r.variable_type === "Direct" || !!directErrors[r.id]}
                      onChange={(e) => updateImmediate(r.id, { has_function: e.target.checked })}
                      className={checkboxBase} />
                  </td>
                  <td className="px-2 py-1.5">
                    <DataSelect value={r.fn} disabled={!r.has_function || r.variable_type === "Direct" || !!directErrors[r.id]}
                      onValueChange={(val) => updateImmediate(r.id, { fn: val as AggFn })}>
                      {AGG_FNS.map((f) => <DataSelectItem key={f} value={f}>{f}</DataSelectItem>)}
                    </DataSelect>
                  </td>
                  {/* Test column (from data.json samples) */}
                  <td className="px-2 py-1.5 min-w-[240px]">
                    <ResultBadge
                      state={testLoading[r.id] ? "loading" : testValues[r.id] ? (testValues[r.id].startsWith("Erreur") || testValues[r.id] === "Pas de sample" ? "error" : "ok") : "idle"}
                      value={testValues[r.id]}
                      loadingLabel="test…"
                      onInfoClick={testValues[r.id] ? async () => {
                        if (!r.endpoint) return;
                        const sample = await fetchSampleData(r.endpoint);
                        if (!sample) return;
                        const records = extractRecords(sample);
                        let filteredRecords = records;
                        if (r.is_filtered && r.filter_key) {
                          filteredRecords = records.filter((rec) => String(rec[r.filter_key] ?? "") === r.filter_value);
                        }
                        const projected = filteredRecords.map((rec) => ({ [r.variable_key!]: rec[r.variable_key!] }));
                        const values = projected.map((item) => Object.values(item)[0]);

                        let aggregatedResult = null;
                        if (r.has_function) {
                          aggregatedResult = aggregateSelection(values, projected, r.fn as AggFn);
                        }

                        // For Test: show values array without aggregation, or just the value with aggregation
                        const testResult = r.has_function
                          ? (aggregatedResult !== null && typeof aggregatedResult === 'object' && !Array.isArray(aggregatedResult)
                              ? Object.values(aggregatedResult)[0]
                              : aggregatedResult)
                          : values;

                        setTraceModal({
                          open: true,
                          title: `Test: ${r.name || r.variable}`,
                          content: {
                            filter_key: r.filter_key || null,
                            filter_value: r.filter_value || null,
                            variable_key: r.variable_key,
                            total_records: records.length,
                            filtered_count: filteredRecords.length,
                            values: testResult,
                          },
                        });
                      } : undefined}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    {(() => {
                      const st = execState[r.id]?.s;
                      const toneClasses =
                        st === "error"
                          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : st === "ok"
                          ? "border-green-500/40 bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20";
                      return (
                        <button
                          onClick={() => runRow(r)}
                          disabled={!r.endpoint || !effectiveBaseUrl || st === "loading"}
                          title={!r.endpoint || !effectiveBaseUrl ? "Renseignez un endpoint et une base URL" : "Exécuter cette ligne"}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${st === "loading" ? "cursor-wait" : "cursor-pointer"} ${toneClasses}`}
                        >
                          {st === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Exec
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-1.5 min-w-[120px]">
                    <ResultBadge
                      state={execState[r.id]?.s ?? "idle"}
                      value={execState[r.id]?.msg}
                      loadingLabel="exécution…"
                    />
                  </td>
                  {/* Formula column — only on first row of KPI group */}
                  {isFirstInKpi ? (() => {
                    const groupKey = `${r.kpi}-${i}`;
                    const groupRows = filtered.slice(i, i + ks);
                    if (!formulaCallbacksRef.current.has(groupKey)) {
                      formulaCallbacksRef.current.set(groupKey, (f: FormulaDef) => {
                        for (const gr of filteredRef.current.slice(i, i + ks)) {
                          updateLocalRef.current(gr.id, { formula: f });
                        }
                      });
                    }
                    return (
                      <td rowSpan={ks} className="px-2 py-1.5 border-l border-border/30 align-top">
                        <FormulaBuilder
                          kpi={r.kpi}
                          groupRows={groupRows}
                          previewValues={testValues}
                          formula={r.formula}
                          onFormulaChange={formulaCallbacksRef.current.get(groupKey)!}
                        />
                      </td>
                    );
                  })() : null}
                  {/* Formula Result column — shows computed formula from local test values */}
                  {isFirstInKpi ? (
                    <td rowSpan={ks} className="px-2 py-1.5 min-w-[120px]">
                      <ResultBadge
                        state={testValues[r.id] ? "ok" : "idle"}
                        value={formulaResults[r.id] ?? "—"}
                        loadingLabel="calcul…"
                      />
                    </td>
                  ) : null}
                  {/* Cible column */}
                  {isFirstInKpi ? (
                    <td rowSpan={ks} className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <DataSelect value={r.cible_operator ?? "="}
                          onValueChange={(val) => updateImmediate(r.id, { cible_operator: val })}
                          className={`w-12`}>
                          <DataSelectItem value="<">&lt;</DataSelectItem>
                          <DataSelectItem value=">">&gt;</DataSelectItem>
                          <DataSelectItem value=">=">&gt;=</DataSelectItem>
                          <DataSelectItem value="<=">&lt;=</DataSelectItem>
                          <DataSelectItem value="=">=</DataSelectItem>
                        </DataSelect>
                        <input type="number" value={r.cible_value ?? ""}
                          onChange={(e) => updateLocal(r.id, { cible_value: e.target.value ? Number(e.target.value) : null })}
                          placeholder="0"
                          className="w-20 bg-card border border-border rounded px-1.5 py-1 font-mono text-[11px] cursor-text transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/40" />
                        <label className="inline-flex items-center gap-0.5 cursor-pointer">
                          <input type="checkbox" checked={r.cible_is_percentage ?? false}
                            onChange={(e) => updateImmediate(r.id, { cible_is_percentage: e.target.checked })}
                            className={checkboxBase} />
                          <span className="text-[10px]">%</span>
                        </label>
                      </div>
                    </td>
                  ) : null}
                  {/* Fréquence d'actualisation column */}
                  {isFirstInKpi ? (
                    <td rowSpan={ks} className="px-2 py-1.5">
                      <DataSelect value={r.refresh_frequency ?? "instant"}
                        onValueChange={(val) => updateImmediate(r.id, { refresh_frequency: val })}
                        className={`w-28`}>
                        <DataSelectItem value="instant">Instant</DataSelectItem>
                        <DataSelectItem value="daily">Quotidien</DataSelectItem>
                        <DataSelectItem value="weekly">Hebdomadaire</DataSelectItem>
                        <DataSelectItem value="monthly">Mensuel</DataSelectItem>
                        <DataSelectItem value="yearly">Annuel</DataSelectItem>
                      </DataSelect>
                    </td>
                  ) : null}
                  {/* Type de graphique column */}
                  {isFirstInKpi ? (
                    <td rowSpan={ks} className="px-2 py-1.5 min-w-[180px]">
                      <GraphTypePicker
                        value={r.graph_types ?? []}
                        onChange={(types) => updateImmediate(r.id, { graph_types: types })}
                      />
                    </td>
                  ) : null}
                  {/* Test Live column — one button per KPI group, formula result */}
                  {isFirstInKpi ? (() => {
                    const groupRows = filtered.slice(i, i + ks);
                    const isLoading = liveFormulaLoading[r.id];
                    return (
                      <td rowSpan={ks} className="px-2 py-1.5">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => runLiveKpiGroup(groupRows, r.id)}
                            disabled={!effectiveBaseUrl || isLoading}
                            title={!effectiveBaseUrl ? "Renseignez une base URL" : "Exécuter toutes les lignes du KPI en live"}
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isLoading ? "cursor-wait border-primary/40 bg-primary/10 text-primary" : "cursor-pointer border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"}`}
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                            Test Live
                          </button>
                          <ResultBadge
                            state={isLoading ? "loading" : liveFormulaResults[r.id] ? "ok" : "idle"}
                            value={liveFormulaResults[r.id]}
                            loadingLabel="exécution…"
                          />
                        </div>
                      </td>
                    );
                  })() : null}
                  {!isNormal ? (
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => { if (confirm("Supprimer cette ligne ? Cette action est irréversible.")) remove(r.id); }}
                        title="Supprimer cette ligne"
                        aria-label="Supprimer cette ligne"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isNormal ? 22 : 23} className="py-12">
                  <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                    <Search className="h-5 w-5 opacity-40" />
                    <span className="text-xs">Aucune ligne ne correspond à ces filtres.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-border bg-card/40 flex items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5" /> {endpointList.length} endpoints</div>
        {dirtyIds.size > 0 && <div className="text-orange-500">{dirtyIds.size} modification(s) non sauvegardée(s)</div>}
        {lastSaved && <div>Sauvegardé à {lastSaved}</div>}
        <div className="ml-auto flex items-center gap-2"><BacovetLogo /></div>
      </div>
      <StatusFooter user="MAPPING" />
      <DataMappingAuditLog refreshKey={auditRefreshKey} />
      <TraceModal open={traceModal.open} title={traceModal.title} content={traceModal.content} onClose={() => setTraceModal({ open: false, title: "", content: null })} />
      <TraceModal open={jsonPreview.open} title={jsonPreview.title} content={jsonPreview.content} highlight={jsonPreview.highlight} onClose={() => setJsonPreview({ open: false, title: "", content: null })} />
      <JsonPreviewModal open={allEndpointsModalOpen} onClose={() => setAllEndpointsModalOpen(false)} allData={allEndpointData} />
      {/* Confirm Reset Dialog */}
      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setConfirmReset(false)}>
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Réinitialiser tout ?</h3>
            <p className="text-xs text-muted-foreground mb-4">Toutes les lignes seront supprimées et remplacées par les données par défaut. Cette action est irréversible.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmReset(false)} className="text-xs px-3 py-1.5 rounded border border-border hover:bg-secondary cursor-pointer">Annuler</button>
              <button onClick={() => { setConfirmReset(false); resetAll(); }} className="text-xs px-3 py-1.5 rounded border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 cursor-pointer">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}