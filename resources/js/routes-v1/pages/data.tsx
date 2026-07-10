// Route registered in v1-main.tsx
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Download, Search, Database, Play, Loader2, Plus, Trash2, Save, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { useNovacityEndpoints } from "@/lib/data-endpoints";
import { PageHeader, StatusFooter, BacovetLogo } from "@/components/v1/v1-shell";
import { exportToCsv } from "@/lib/export";
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
} from "@/services/dataMappingApi";

export default DataMappingPage;

type VarType = "Direct" | "Complex";
type AggFn = "Latest" | "First" | "Sum" | "Average" | "Min" | "Max" | "Count";
type ExecState = "idle" | "loading" | "ok" | "error";

const AGG_FNS: AggFn[] = ["Latest", "First", "Sum", "Average", "Min", "Max", "Count"];

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
  "bg-transparent border border-transparent rounded px-1.5 py-1 w-full transition-colors duration-150 " +
  "hover:border-border hover:bg-muted/40 " +
  "focus:outline-none focus:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 " +
  "placeholder:text-muted-foreground/50 placeholder:italic";

// Dropdowns: consistent hover/focus affordance, clear disabled state.
const selectBase =
  "bg-card border border-border rounded px-1.5 py-1 transition-colors duration-150 cursor-pointer " +
  "hover:border-primary/50 " +
  "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border";

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

function ResultBadge({
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
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-mono text-[10.5px] truncate max-w-[160px] ${colorClasses}`}
        title={value}
      >
        {isError ? <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" /> : <CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0" />}
        <span className="truncate">{value}</span>
      </span>
      {onInfoClick && <TraceBtn onClick={onInfoClick} />}
    </span>
  );
}

// -------- Executor --------
function extractRecords(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    for (const k of ["data", "items", "result", "results", "records", "rows", "value"]) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
    return [o];
  }
  return [];
}

function aggregateSelection(values: unknown[], projection: unknown[], fn: AggFn): unknown {
  const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  switch (fn) {
    case "First": return projection[0];
    case "Latest": return projection[projection.length - 1];
    case "Count": return projection;
    case "Sum": return nums.reduce((a, b) => a + b, 0);
    case "Average": return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case "Min": return nums.length ? Math.min(...nums) : null;
    case "Max": return nums.length ? Math.max(...nums) : null;
  }
}

function stringifyResult(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function computeFormulaForTest(row: DataMappingRow, testValues: Record<number, string>): string {
  if (!row.formula || !row.formula.items || row.formula.items.length === 0) return "—";

  const items = row.formula.items;
  let expr = "";
  for (const item of items) {
    if (item.type === "variable" && item.ref != null) {
      const val = testValues[item.ref];
      if (val === undefined || val === "Erreur" || val === "") return "—";
      const num = Number(val);
      expr += isNaN(num) ? `("${val}")` : String(num);
    } else if (item.type === "operator") {
      expr += ` ${item.op} `;
    } else if (item.type === "number") {
      expr += String(item.value);
    }
  }
  if (!expr) return "—";
  try {
    // eslint-disable-next-line no-eval
    const result = eval(expr);
    return typeof result === "number" ? (Number.isInteger(result) ? String(result) : result.toFixed(2)) : String(result);
  } catch {
    return "Erreur";
  }
}

function buildExecutionResult(row: DataMappingRow, records: Record<string, unknown>[]) {
  let filteredRecords = records;
  if (row.is_filtered && row.filter_key) {
    filteredRecords = filteredRecords.filter((r) => String(r[row.filter_key] ?? "") === row.filter_value);
  }

  if (row.variable_type === "Direct") {
    if (!row.variable_key) throw new Error("Variable JSON manquante");
    const projection = filteredRecords.map((r) => ({ [row.variable_key!]: r[row.variable_key!] }));
    const values = projection.map((item) => Object.values(item)[0]);
    if (row.has_function) {
      const out = aggregateSelection(values, projection, row.fn as AggFn);
      return { output: stringifyResult(out), detail: out };
    }
    const detail = projection.length === 1 ? projection[0] : projection;
    return { output: stringifyResult(detail), detail };
  }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("r", `with(r){return (${row.variable_key || "null"});}`);
    const values = filteredRecords.map((r) => fn(r));
    if (row.has_function) {
      const out = aggregateSelection(values, values, row.fn as AggFn);
      return { output: stringifyResult(out), detail: out };
    }
    const detail = values.length === 1 ? values[0] : values;
    return { output: stringifyResult(detail), detail };
  } catch (e) {
    throw new Error(`Expression invalide: ${(e as Error).message}`);
  }
}

async function executeRow(row: DataMappingRow, baseUrl: string): Promise<string> {
  if (!row.endpoint) throw new Error("Endpoint manquant");
  const url = `${baseUrl.replace(/\/+$/, "")}/${row.endpoint.replace(/^\/+/, "")}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const records = extractRecords(json);
  return buildExecutionResult(row, records).output;
}

// -------- Trace Modal --------
function TraceModal({ open, title, content, onClose }: { open: boolean; title: string; content: unknown; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg">×</button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-[11px] font-mono whitespace-pre-wrap break-words text-foreground bg-muted/30 rounded p-3">
            {content === null ? "Aucune donnée" : JSON.stringify(content, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

// -------- Trace Button --------
function TraceBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground ml-1 flex-shrink-0 transition-colors hover:bg-primary/15 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      title="Voir le détail"
      aria-label="Voir le détail"
    >
      <Info className="h-2.5 w-2.5" />
    </button>
  );
}

// -------- Formula Builder --------
function computeFormula(items: FormulaItem[], previewValues: Record<number, string>): string {
  // Build expression string from items
  let expr = "";
  for (const item of items) {
    if (item.type === "variable" && item.ref != null) {
      const val = previewValues[item.ref];
      if (val === undefined || val === "Erreur" || val === "") return "—";
      const num = Number(val);
      expr += isNaN(num) ? `("${val}")` : String(num);
    } else if (item.type === "operator") {
      expr += ` ${item.op} `;
    } else if (item.type === "number") {
      expr += String(item.value);
    }
  }
  if (!expr) return "—";
  try {
    // Safe eval for simple math
    // eslint-disable-next-line no-eval
    const result = eval(expr);
    return typeof result === "number" ? (Number.isInteger(result) ? String(result) : result.toFixed(2)) : String(result);
  } catch {
    return "Erreur";
  }
}

function FormulaBuilder({ kpi, groupRows, previewValues, formula, onFormulaChange }: {
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
    <div className="text-[10px] flex flex-col gap-1.5 min-w-[170px] bg-muted/20 border border-border/50 rounded-md p-2">
      <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[9px]">Formule</div>
      {/* Variable chips */}
      <div className="flex flex-wrap gap-1 items-center">
        {groupRows.map((gr) => (
          <span key={gr.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            {gr.variable || gr.name || `Var ${gr.id}`}
            {previewValues[gr.id] && (
              <span className="text-muted-foreground font-mono">={previewValues[gr.id]}</span>
            )}
          </span>
        ))}
      </div>
      {/* Formula items */}
      <div className="flex flex-wrap gap-1 items-center mt-1">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-0.5">
            {item.type === "variable" && (
              <select
                value={item.ref}
                onChange={(e) => updateItem(i, { ref: Number(e.target.value), label: groupRows.find((gr) => gr.id === Number(e.target.value))?.variable || "" })}
                className="border border-border rounded px-1 py-0.5 text-[10px] bg-card"
              >
                {groupRows.map((gr) => (
                  <option key={gr.id} value={gr.id}>{gr.variable || gr.name || `Var ${gr.id}`}</option>
                ))}
              </select>
            )}
            {item.type === "operator" && (
              <select
                value={item.op}
                onChange={(e) => updateItem(i, { op: e.target.value })}
                className="border border-border rounded px-1 py-0.5 text-[10px] bg-card w-10 text-center font-bold"
              >
                {["+", "-", "*", "/"].map((op) => <option key={op} value={op}>{op}</option>)}
              </select>
            )}
            {item.type === "number" && (
              <input
                type="number"
                value={item.value}
                onChange={(e) => updateItem(i, { value: Number(e.target.value) })}
                className="border border-border rounded px-1 py-0.5 text-[10px] bg-card w-16 font-mono"
              />
            )}
            <button onClick={() => removeItem(i)} className="text-destructive hover:text-destructive/80 ml-0.5">×</button>
          </span>
        ))}
      </div>
      {/* Add buttons */}
      <div className="flex gap-1 mt-1">
        <select
          onChange={(e) => { if (e.target.value) { addItem({ type: "operator", op: e.target.value }); e.target.value = ""; } }}
          className="border border-border rounded px-1 py-0.5 text-[10px] bg-card w-10 text-center font-bold"
          defaultValue=""
        >
          <option value="" disabled>+</option>
          {["+", "-", "*", "/"].map((op) => <option key={op} value={op}>{op}</option>)}
        </select>
        <select
          onChange={(e) => { if (e.target.value) { addItem({ type: "variable", ref: Number(e.target.value), label: groupRows.find((gr) => gr.id === Number(e.target.value))?.variable || "" }); e.target.value = ""; } }}
          className="border border-border rounded px-1 py-0.5 text-[10px] bg-card"
          defaultValue=""
        >
          <option value="" disabled>+ Variable</option>
          {groupRows.map((gr) => (
            <option key={gr.id} value={gr.id}>{gr.variable || gr.name || `Var ${gr.id}`}</option>
          ))}
        </select>
        <button
          onClick={() => addItem({ type: "number", value: 0 })}
          className="border border-border rounded px-1.5 py-0.5 text-[10px] bg-card hover:bg-secondary"
        >
          + Nombre
        </button>
      </div>
      {/* Result */}
      {items.length > 0 && (
        <div className={`mt-0.5 px-2 py-1 rounded border font-mono font-bold ${result === "Erreur" ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-green-500/10 border-green-500/20 text-green-600"}`}>
          = {result}
        </div>
      )}
    </div>
  );
}

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

  // Preview values: row id → computed value string
  const [previewValues, setPreviewValues] = useState<Record<number, string>>({});
  const [previewLoading, setPreviewLoading] = useState<Record<number, boolean>>({});

  // Test Exec values: row id → computed value from data.json
  const [testValues, setTestValues] = useState<Record<number, string>>({});
  const [testLoading, setTestLoading] = useState<Record<number, boolean>>({});

  // Live exec state for Test Live column
  const [liveExecState, setLiveExecState] = useState<Record<number, { s: ExecState; msg: string }>>({});

  const runLiveRow = async (row: DataMappingRow) => {
    setLiveExecState((m) => ({ ...m, [row.id]: { s: "loading", msg: "…" } }));
    try {
      const out = await executeRow(row, baseUrl);
      setLiveExecState((m) => ({ ...m, [row.id]: { s: "ok", msg: out } }));
    } catch (e) {
      setLiveExecState((m) => ({ ...m, [row.id]: { s: "error", msg: (e as Error).message } }));
    }
  };

  // Trace modal
  const [traceModal, setTraceModal] = useState<{ open: boolean; title: string; content: unknown }>({ open: false, title: "", content: null });

  // Keep refs in sync
  useEffect(() => { rowsRef.current = rows; }, [rows]);

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

  const fetchPreview = useCallback(async (row: DataMappingRow) => {
    if (!row.endpoint || !baseUrl) return;
    setPreviewLoading((m) => ({ ...m, [row.id]: true }));
    try {
      const val = await executeRow(row, baseUrl);
      setPreviewValues((m) => ({ ...m, [row.id]: val }));
    } catch {
      setPreviewValues((m) => ({ ...m, [row.id]: "Erreur" }));
    } finally {
      setPreviewLoading((m) => ({ ...m, [row.id]: false }));
    }
  }, [baseUrl]);

  // Fetch all previews when rows or baseUrl change
  useEffect(() => {
    if (!baseUrl || rows.length === 0) return;
    for (const r of rows) {
      if (r.endpoint && r.variable_key) {
        fetchPreview(r);
      }
    }
  }, [rows, baseUrl, fetchPreview]);

  // Auto-fetch test values from data.json samples
  useEffect(() => {
    if (rows.length === 0) return;
    for (const r of rows) {
      if (r.endpoint && r.variable_key && !testValues[r.id] && !testLoading[r.id]) {
        (async () => {
          setTestLoading((m) => ({ ...m, [r.id]: true }));
          try {
            const sampleData = await fetchSampleData(r.endpoint!);
            if (!sampleData) { setTestValues((m) => ({ ...m, [r.id]: "Pas de sample" })); setTestLoading((m) => ({ ...m, [r.id]: false })); return; }
            const records = extractRecords(sampleData);
            const result = buildExecutionResult(r, records);
            setTestValues((m) => ({ ...m, [r.id]: result.output }));
          } catch {
            setTestValues((m) => ({ ...m, [r.id]: "Erreur" }));
          } finally {
            setTestLoading((m) => ({ ...m, [r.id]: false }));
          }
        })();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

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
      };
    }).filter(Boolean) as DataMappingPayload[];

    if (mappings.length === 0) return;

    setSaving(true);
    try {
      await batchUpdateMappings(mappings);
      setDirtyIds(new Set());
      dirtyRef.current = new Set();
      setLastSaved(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
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
        (r.variable_key ?? "").toLowerCase().includes(needle)
      );
    });
    result.sort((a, b) => a.kpi.localeCompare(b.kpi) || a.name.localeCompare(b.name));
    return result;
  }, [rows, q, filterKpi]);

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
    await flushDirty();
  }, [flushDirty]);

  const remove = useCallback(async (id: number) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    dirtyRef.current.delete(id);
    try {
      await deleteMapping(id);
    } catch {
      // Row already removed from UI, will resync on next load
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
      });
      setRows((rs) => [...rs, mapping]);
    } catch {
      // Silently fail — user can retry
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

  const exportRows = () => {
    const exportData = filtered.map((r) => ({
      ...r,
      modules: (r.modules ?? []).join(", "),
    }));
    exportToCsv("bacovet-mapping-kpis", exportData as unknown as Record<string, unknown>[]);
  };

  // ---- Live exec state ----
  const [execState, setExecState] = useState<Record<number, { s: ExecState; msg: string }>>({});

  const runRow = async (row: DataMappingRow) => {
    setExecState((m) => ({ ...m, [row.id]: { s: "loading", msg: "…" } }));
    try {
      const out = await executeRow(row, baseUrl);
      setExecState((m) => ({ ...m, [row.id]: { s: "ok", msg: out } }));
    } catch (e) {
      setExecState((m) => ({ ...m, [row.id]: { s: "error", msg: (e as Error).message } }));
    }
  };

  const runAll = async () => { for (const r of filtered) await runRow(r); };

  const stats = useMemo(() => {
    const mapped = rows.filter((r) => r.endpoint && r.variable_key).length;
    return { total: rows.length, mapped, pending: rows.length - mapped };
  }, [rows]);

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
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2 border border-border bg-card rounded-md px-2 py-1 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher KPI, variable, endpoint…"
            className="bg-transparent outline-none text-sm w-72"
          />
        </div>
        <select
          value={filterKpi}
          onChange={(e) => setFilterKpi(e.target.value)}
          className="border border-border bg-card rounded-md px-2 py-1.5 text-sm cursor-pointer transition-colors hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {kpiGroups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <div className="flex items-center gap-2 border border-border bg-card rounded-md px-2 py-1 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
          <Database className="h-4 w-4 text-muted-foreground" />
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Base URL API (ex: https://novacity.local)"
            className="bg-transparent outline-none text-sm w-72"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={addRow} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-card hover:bg-secondary">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
          <button
            onClick={flushDirty}
            disabled={dirtyIds.size === 0 || saving}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-green-500/40 bg-green-500/10 text-green-600 hover:bg-green-500/20 disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Sauvegarder{dirtyIds.size > 0 ? ` (${dirtyIds.size})` : ""}
          </button>
          <button onClick={runAll} disabled={!baseUrl} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40">
            <Play className="h-3.5 w-3.5" /> Exécuter tout
          </button>
          <button onClick={exportRows} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-card hover:bg-secondary">
            <Download className="h-3.5 w-3.5" /> Exporter CSV
          </button>
          <button onClick={resetAll} className="text-xs px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10">
            Réinitialiser
          </button>
        </div>
      </div>
      {lastSaved && (
        <div className="px-4 py-1 text-[10px] text-muted-foreground border-b border-border/50">
          Dernière sauvegarde : {lastSaved}
        </div>
      )}
      <div className="flex-1 overflow-auto p-3">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {["", "KPI", "Modules", "Name", "Variable", "Endpoint", "Type", "Clé JSON", "Filtré ?", "Filtre Clé", "Filtre Valeur", "Fonction ?", "Agrégation", "Test", "Exec", "Résultat", "Formula", "Formula Result", "Test Live", ""].map((h) => (
                <th key={h} className="text-left font-semibold px-2 py-2 border-b border-border whitespace-nowrap">{h}</th>
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
                <tr key={r.id} style={r.highlight_color ? { backgroundColor: r.highlight_color + "30" } : undefined} className={`border-b border-border/50 hover:bg-secondary/30 transition-colors duration-150 ${isDirty ? "bg-amber-500/5" : ""} ${isFirstInKpi && i > 0 ? "border-t-2 border-t-border" : ""}`}>
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
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-destructive text-white text-[9px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80"
                          title="Effacer la couleur"
                          aria-label="Effacer la couleur"
                        >×</button>
                      )}
                    </div>
                  </td>
                  {isFirstInKpi ? (
                    <td rowSpan={ks} className="px-2 py-1.5 font-mono text-[11px] whitespace-nowrap border-r border-border/30 align-top">
                      <input value={r.kpi} onChange={(e) => updateLocal(r.id, { kpi: e.target.value })}
                        placeholder="F-REQ-XXX"
                        className={`${fieldBase} w-24`} />
                    </td>
                  ) : null}
                  {isFirstInModule ? (
                    <td rowSpan={ms} className="px-2 py-1.5 border-r border-border/30 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                          {MODULES.map((mod) => {
                            const checked = (r.modules ?? []).includes(mod);
                            return (
                              <label key={mod} className={`inline-flex items-center gap-1 cursor-pointer rounded px-0.5 -mx-0.5 transition-colors ${checked ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleModule(r.id, mod)}
                                  className={checkboxBase}
                                />
                                <span className="text-[10px] font-medium">{MODULE_LABELS[mod]}</span>
                              </label>
                            );
                          })}
                        </div>
                        {(r.modules ?? []).includes("production") && (
                          <div className="flex flex-wrap gap-x-2.5 gap-y-1 pl-2 border-l-2 border-primary/25">
                            {PROD_SUBS.map((sub) => {
                              const checked = (r.modules ?? []).includes(`production:${sub}`);
                              return (
                                <label key={sub} className={`inline-flex items-center gap-1 cursor-pointer transition-colors ${checked ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
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
                    </td>
                  ) : null}
                  {isFirstInName ? (
                    <td rowSpan={ns} className="px-2 py-1.5 border-r border-border/30 align-top">
                      <input value={r.name} onChange={(e) => updateLocal(r.id, { name: e.target.value })}
                        placeholder="Nom du KPI"
                        className={`${fieldBase} w-52`} />
                    </td>
                  ) : null}
                  <td className="px-2 py-1.5 text-muted-foreground italic">
                    <input value={r.variable} onChange={(e) => updateLocal(r.id, { variable: e.target.value })}
                      placeholder="nom.variable"
                      className={`${fieldBase} w-56`} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center">
                      <select value={r.endpoint ?? ""} onChange={(e) => updateImmediate(r.id, { endpoint: e.target.value || null, variable_key: "" })}
                        className={`${selectBase} w-64 ${!r.endpoint ? "text-muted-foreground border-dashed" : ""}`}>
                        <option value="">— sélectionner —</option>
                        {endpointList.map((ep) => <option key={ep} value={ep}>{ep}</option>)}
                      </select>
                      {r.endpoint && (
                        <TraceBtn onClick={async () => {
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
                        }} />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.variable_type} onChange={(e) => updateImmediate(r.id, { variable_type: e.target.value as VarType })}
                      className={selectBase}>
                      <option>Direct</option>
                      <option>Complex</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center">
                      {r.variable_type === "Direct" ? (
                        <select value={r.variable_key ?? ""} onChange={(e) => updateImmediate(r.id, { variable_key: e.target.value })}
                          disabled={!r.endpoint}
                          className={`${selectBase} w-56`}>
                          <option value="">{r.endpoint ? "— clé JSON —" : "sélectionner endpoint d'abord"}</option>
                          {keys.map((k) => <option key={k} value={k}>{k}</option>)}
                        </select>
                      ) : (
                        <input value={r.variable_key ?? ""} onChange={(e) => updateLocal(r.id, { variable_key: e.target.value })}
                          placeholder="ex: SUM(a)/COUNT(b)"
                          className="w-56 bg-card border border-border rounded px-1.5 py-1 font-mono text-[11px] transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/40" />
                      )}
                      {r.variable_key && (
                        <TraceBtn onClick={async () => {
                          if (!r.endpoint) { setTraceModal({ open: true, title: `Clé: ${r.variable_key}`, content: "Pas d'endpoint sélectionné" }); return; }
                          const sample = await fetchSampleData(r.endpoint);
                          if (!sample) { setTraceModal({ open: true, title: `Clé: ${r.variable_key}`, content: "Pas de sample data" }); return; }
                          const records = extractRecords(sample);

                          // ONLY project the selected key from ALL records - NO filter
                          const projected = records.map((rec) => ({ [r.variable_key!]: rec[r.variable_key!] }));

                          setTraceModal({
                            open: true,
                            title: `Clé: ${r.variable_key}`,
                            content: {
                              variable_key: r.variable_key,
                              total_records: records.length,
                              values: projected,
                            },
                          });
                        }} />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={r.is_filtered} onChange={(e) => updateImmediate(r.id, { is_filtered: e.target.checked })} className={checkboxBase} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.filter_key ?? ""} disabled={!r.is_filtered || !r.endpoint}
                      onChange={(e) => updateImmediate(r.id, { filter_key: e.target.value })}
                      className={`${selectBase} w-44`}>
                      <option value="">{r.endpoint ? "— clé JSON —" : "endpoint requis"}</option>
                      {keys.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center">
                      <input value={r.filter_value ?? ""} disabled={!r.is_filtered}
                        onChange={(e) => updateLocal(r.id, { filter_value: e.target.value })}
                        placeholder="ex: CH01"
                        className="w-44 bg-card border border-border rounded px-1.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed font-mono text-[11px] transition-colors focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 hover:enabled:border-primary/40" />
                      {r.is_filtered && r.filter_key && r.filter_value && (
                        <TraceBtn onClick={async () => {
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
                        }} />
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={r.has_function} onChange={(e) => updateImmediate(r.id, { has_function: e.target.checked })} className={checkboxBase} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.fn} disabled={!r.has_function}
                      onChange={(e) => updateImmediate(r.id, { fn: e.target.value as AggFn })}
                      className={selectBase}>
                      {AGG_FNS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </td>
                  {/* Test column (from data.json samples) */}
                  <td className="px-2 py-1.5 max-w-[180px]">
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
                          disabled={!r.endpoint || !baseUrl || st === "loading"}
                          title={!r.endpoint || !baseUrl ? "Renseignez un endpoint et une base URL" : "Exécuter cette ligne"}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneClasses}`}
                        >
                          {st === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Exec
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-1.5 max-w-[280px]">
                    <ResultBadge
                      state={execState[r.id]?.s ?? "idle"}
                      value={execState[r.id]?.msg}
                      loadingLabel="exécution…"
                    />
                  </td>
                  {/* Formula column — only on first row of KPI group */}
                  {isFirstInKpi ? (
                    <td rowSpan={ks} className="px-2 py-1.5 border-l border-border/30 align-top">
                      <FormulaBuilder
                        kpi={r.kpi}
                        groupRows={filtered.slice(i, i + ks)}
                        previewValues={testValues}
                        formula={r.formula}
                        onFormulaChange={(f) => {
                          for (const gr of filtered.slice(i, i + ks)) {
                            updateLocal(gr.id, { formula: f });
                          }
                        }}
                      />
                    </td>
                  ) : null}
                  {/* Formula Result column — shows computed formula from local test values */}
                  {isFirstInKpi ? (
                    <td rowSpan={ks} className="px-2 py-1.5 max-w-[180px]">
                      <ResultBadge
                        state={testValues[r.id] ? "ok" : "idle"}
                        value={computeFormulaForTest(r, testValues)}
                        loadingLabel="calcul…"
                      />
                    </td>
                  ) : null}
                  {/* Test Live column — manual live API execution */}
                  <td className="px-2 py-1.5">
                    {(() => {
                      const st = liveExecState[r.id]?.s;
                      const toneClasses =
                        st === "error"
                          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                          : st === "ok"
                          ? "border-green-500/40 bg-green-500/10 text-green-600 hover:bg-green-500/20"
                          : "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20";
                      return (
                        <button
                          onClick={() => runLiveRow(r)}
                          disabled={!r.endpoint || !baseUrl || st === "loading"}
                          title={!r.endpoint || !baseUrl ? "Renseignez un endpoint et une base URL" : "Exécuter en live"}
                          className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${toneClasses}`}
                        >
                          {st === "loading" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          Test Live
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-1.5 max-w-[280px]">
                    <ResultBadge
                      state={liveExecState[r.id]?.s ?? "idle"}
                      value={liveExecState[r.id]?.msg}
                      loadingLabel="exécution…"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => remove(r.id)}
                      title="Supprimer cette ligne"
                      aria-label="Supprimer cette ligne"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={20} className="py-12">
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
      <TraceModal open={traceModal.open} title={traceModal.title} content={traceModal.content} onClose={() => setTraceModal({ open: false, title: "", content: null })} />
    </div>
  );
}