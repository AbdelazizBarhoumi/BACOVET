// Route registered in v1-main.tsx
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Download, Search, Database, Play, Loader2, Plus, Trash2, Save } from "lucide-react";
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

function aggregate(values: unknown[], fn: AggFn): unknown {
  const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  switch (fn) {
    case "First": return values[0];
    case "Latest": return values[values.length - 1];
    case "Count": return values.length;
    case "Sum": return nums.reduce((a, b) => a + b, 0);
    case "Average": return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case "Min": return nums.length ? Math.min(...nums) : null;
    case "Max": return nums.length ? Math.max(...nums) : null;
  }
}

async function executeRow(row: DataMappingRow, baseUrl: string): Promise<string> {
  if (!row.endpoint) throw new Error("Endpoint manquant");
  const url = `${baseUrl.replace(/\/+$/, "")}/${row.endpoint.replace(/^\/+/, "")}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  let records = extractRecords(json);
  if (row.is_filtered && row.filter_key) {
    records = records.filter((r) => String(r[row.filter_key] ?? "") === row.filter_value);
  }
  let values: unknown[];
  if (row.variable_type === "Direct") {
    if (!row.variable_key) throw new Error("Variable JSON manquante");
    values = records.map((r) => r[row.variable_key]);
  } else {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function("r", `with(r){return (${row.variable_key || "null"});}`);
      values = records.map((r) => fn(r));
    } catch (e) {
      throw new Error(`Expression invalide: ${(e as Error).message}`);
    }
  }
  const out = row.has_function ? aggregate(values, row.fn as AggFn) : (values.length === 1 ? values[0] : values);
  return typeof out === "object" ? JSON.stringify(out) : String(out);
}

function DataMappingPage() {
  const { dataEndpoints, endpointList, loading: endpointsLoading } = useNovacityEndpoints();
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

  // ---- Base URL + live exec state ----
  const [baseUrl, setBaseUrl] = useState("");

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
        <div className="flex items-center gap-2 border border-border bg-card rounded-md px-2 py-1">
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
          className="border border-border bg-card rounded-md px-2 py-1.5 text-sm"
        >
          {kpiGroups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <div className="flex items-center gap-2 border border-border bg-card rounded-md px-2 py-1">
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
              {["KPI", "Modules", "Name", "Variable", "Endpoint", "Type", "Clé JSON", "Filtré ?", "Filtre Clé", "Filtre Valeur", "Fonction ?", "Agrégation", "Exec", "Résultat", ""].map((h) => (
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
                <tr key={r.id} className={`border-b border-border/50 hover:bg-secondary/30 ${isDirty ? "bg-yellow-500/5" : ""} ${isFirstInKpi && i > 0 ? "border-t-2 border-t-border" : ""}`}>
                  {isFirstInKpi ? (
                    <td rowSpan={ks} className="px-2 py-1.5 font-mono text-[11px] whitespace-nowrap border-r border-border/30 align-top">
                      <input value={r.kpi} onChange={(e) => updateLocal(r.id, { kpi: e.target.value })}
                        className="w-24 bg-transparent border border-transparent hover:border-border rounded px-1 py-0.5" />
                    </td>
                  ) : null}
                  {isFirstInModule ? (
                    <td rowSpan={ms} className="px-2 py-1.5 border-r border-border/30 align-top">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                          {MODULES.map((mod) => (
                            <label key={mod} className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(r.modules ?? []).includes(mod)}
                                onChange={() => toggleModule(r.id, mod)}
                                className="h-3 w-3"
                              />
                              <span className="text-[10px]">{MODULE_LABELS[mod]}</span>
                            </label>
                          ))}
                        </div>
                        {(r.modules ?? []).includes("production") && (
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5 pl-2 border-l-2 border-primary/20 mt-0.5">
                            {PROD_SUBS.map((sub) => (
                              <label key={sub} className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                type="checkbox"
                                checked={(r.modules ?? []).includes(`production:${sub}`)}
                                onChange={() => toggleModule(r.id, `production:${sub}`)}
                                className="h-3 w-3"
                              />
                              <span className="text-[10px] text-muted-foreground">{MODULE_LABELS[sub]}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  ) : null}
                  {isFirstInName ? (
                    <td rowSpan={ns} className="px-2 py-1.5 border-r border-border/30 align-top">
                      <input value={r.name} onChange={(e) => updateLocal(r.id, { name: e.target.value })}
                        className="w-52 bg-transparent border border-transparent hover:border-border rounded px-1 py-0.5" />
                    </td>
                  ) : null}
                  <td className="px-2 py-1.5 text-muted-foreground italic">
                    <input value={r.variable} onChange={(e) => updateLocal(r.id, { variable: e.target.value })}
                      className="w-56 bg-transparent border border-transparent hover:border-border rounded px-1 py-0.5" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.endpoint ?? ""} onChange={(e) => updateImmediate(r.id, { endpoint: e.target.value || null, variable_key: "" })}
                      className="w-64 bg-card border border-border rounded px-1.5 py-1">
                      <option value="">— sélectionner —</option>
                      {endpointList.map((ep) => <option key={ep} value={ep}>{ep}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.variable_type} onChange={(e) => updateImmediate(r.id, { variable_type: e.target.value as VarType })}
                      className="bg-card border border-border rounded px-1.5 py-1">
                      <option>Direct</option>
                      <option>Complex</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    {r.variable_type === "Direct" ? (
                      <select value={r.variable_key ?? ""} onChange={(e) => updateImmediate(r.id, { variable_key: e.target.value })}
                        disabled={!r.endpoint}
                        className="w-56 bg-card border border-border rounded px-1.5 py-1 disabled:opacity-40">
                        <option value="">{r.endpoint ? "— clé JSON —" : "sélectionner endpoint d'abord"}</option>
                        {keys.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    ) : (
                      <input value={r.variable_key ?? ""} onChange={(e) => updateLocal(r.id, { variable_key: e.target.value })}
                        placeholder="ex: SUM(a)/COUNT(b)"
                        className="w-56 bg-card border border-border rounded px-1.5 py-1 font-mono text-[11px]" />
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={r.is_filtered} onChange={(e) => updateImmediate(r.id, { is_filtered: e.target.checked })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.filter_key ?? ""} disabled={!r.is_filtered || !r.endpoint}
                      onChange={(e) => updateImmediate(r.id, { filter_key: e.target.value })}
                      className="w-44 bg-card border border-border rounded px-1.5 py-1 disabled:opacity-40">
                      <option value="">{r.endpoint ? "— clé JSON —" : "endpoint requis"}</option>
                      {keys.map((k) => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={r.filter_value ?? ""} disabled={!r.is_filtered}
                      onChange={(e) => updateLocal(r.id, { filter_value: e.target.value })}
                      placeholder="ex: CH01"
                      className="w-44 bg-card border border-border rounded px-1.5 py-1 disabled:opacity-40 font-mono text-[11px]" />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={r.has_function} onChange={(e) => updateImmediate(r.id, { has_function: e.target.checked })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.fn} disabled={!r.has_function}
                      onChange={(e) => updateImmediate(r.id, { fn: e.target.value as AggFn })}
                      className="bg-card border border-border rounded px-1.5 py-1 disabled:opacity-40">
                      {AGG_FNS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => runRow(r)}
                      disabled={!r.endpoint || !baseUrl || execState[r.id]?.s === "loading"}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40"
                    >
                      {execState[r.id]?.s === "loading"
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Play className="h-3 w-3" />}
                      Exec
                    </button>
                  </td>
                  <td className="px-2 py-1.5 font-mono text-[11px] max-w-[280px]">
                    {(() => {
                      const st = execState[r.id];
                      if (!st) return <span className="text-muted-foreground">—</span>;
                      if (st.s === "loading") return <span className="text-muted-foreground">chargement…</span>;
                      if (st.s === "error") return <span className="text-destructive truncate block" title={st.msg}>⚠ {st.msg}</span>;
                      return <span className="text-green-500 truncate block" title={st.msg}>{st.msg}</span>;
                    })()}
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => remove(r.id)} className="text-destructive hover:bg-destructive/10 rounded p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={15} className="text-center text-muted-foreground py-8">Aucune ligne.</td></tr>
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
    </div>
  );
}
