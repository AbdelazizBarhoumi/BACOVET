import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, Download, Search, Database } from "lucide-react";
import { DATA_ENDPOINTS, ENDPOINT_LIST } from "@/lib/data-endpoints";
import { KPI_SEED } from "@/lib/kpi-rows";
import { PageHeader, StatusFooter, BacovetLogo } from "@/components/v1/v1-shell";
import { exportToCsv } from "@/lib/export";
export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "BACOVET — Mapping des KPIs" },
      { name: "description", content: "Table de mapping KPIs ↔ endpoints Novacity (variables, filtres, agrégations)." },
    ],
  }),
  component: DataMappingPage,
});
type VarType = "Direct" | "Complex";
type AggFn = "Latest" | "First" | "Sum" | "Average" | "Min" | "Max" | "Count";
type Row = {
  id: string;
  kpi: string;
  name: string;
  variable: string;      // auto (pre-mapped label from kpi)
  endpoint: string;      // selected
  variableType: VarType;
  variableKey: string;   // JSON key extracted from endpoint sample
  isFiltered: boolean;
  filter: string;
  hasFunction: boolean;
  fn: AggFn;
};
const STORAGE_KEY = "bacovet-data-mapping";
const AGG_FNS: AggFn[] = ["Latest", "First", "Sum", "Average", "Min", "Max", "Count"];
function makeInitialRows(): Row[] {
  return KPI_SEED.map((s, i) => ({
    id: `${s.kpi}-${i}`,
    kpi: s.kpi,
    name: s.name,
    variable: s.variable,
    endpoint: "",
    variableType: "Direct",
    variableKey: "",
    isFiltered: false,
    filter: "",
    hasFunction: false,
    fn: "Latest",
  }));
}
function DataMappingPage() {
  const [rows, setRows] = useState<Row[]>(() => {
    if (typeof window === "undefined") return makeInitialRows();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return makeInitialRows();
  });
  const [q, setQ] = useState("");
  const [filterKpi, setFilterKpi] = useState("Tous");
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);
  const kpiGroups = useMemo(() => ["Tous", ...Array.from(new Set(KPI_SEED.map((r) => r.kpi)))], []);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterKpi !== "Tous" && r.kpi !== filterKpi) return false;
      if (!needle) return true;
      return (
        r.kpi.toLowerCase().includes(needle) ||
        r.name.toLowerCase().includes(needle) ||
        r.variable.toLowerCase().includes(needle) ||
        r.endpoint.toLowerCase().includes(needle) ||
        r.variableKey.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, filterKpi]);
  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const addRow = () => {
    const id = `custom-${Date.now()}`;
    setRows((rs) => [...rs, {
      id, kpi: "F-REQ-XXX", name: "", variable: "", endpoint: "",
      variableType: "Direct", variableKey: "", isFiltered: false, filter: "", hasFunction: false, fn: "Latest",
    }]);
  };
  const resetAll = () => setRows(makeInitialRows());
  const exportRows = () => exportToCsv("bacovet-mapping-kpis", filtered);
  const stats = useMemo(() => {
    const mapped = rows.filter((r) => r.endpoint && r.variableKey).length;
    return { total: rows.length, mapped, pending: rows.length - mapped };
  }, [rows]);
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
        <div className="ml-auto flex items-center gap-2">
          <button onClick={addRow} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-card hover:bg-secondary">
            <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
          </button>
          <button onClick={exportRows} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border bg-card hover:bg-secondary">
            <Download className="h-3.5 w-3.5" /> Exporter CSV
          </button>
          <button onClick={resetAll} className="text-xs px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10">
            Réinitialiser
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-3">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {["KPI", "Name", "Variable (auto)", "Endpoint", "Type", "Variable JSON", "Filtré ?", "Filtre", "Fonction ?", "Agrégation", ""].map((h) => (
                <th key={h} className="text-left font-semibold px-2 py-2 border-b border-border whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const keys = r.endpoint ? (DATA_ENDPOINTS[r.endpoint] ?? []) : [];
              return (
                <tr key={r.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-2 py-1.5 font-mono text-[11px] whitespace-nowrap">
                    <input value={r.kpi} onChange={(e) => update(r.id, { kpi: e.target.value })}
                      className="w-24 bg-transparent border border-transparent hover:border-border rounded px-1 py-0.5" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })}
                      className="w-52 bg-transparent border border-transparent hover:border-border rounded px-1 py-0.5" />
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground italic">
                    <input value={r.variable} onChange={(e) => update(r.id, { variable: e.target.value })}
                      className="w-56 bg-transparent border border-transparent hover:border-border rounded px-1 py-0.5" />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.endpoint} onChange={(e) => update(r.id, { endpoint: e.target.value, variableKey: "" })}
                      className="w-64 bg-card border border-border rounded px-1.5 py-1">
                      <option value="">— sélectionner —</option>
                      {ENDPOINT_LIST.map((ep) => <option key={ep} value={ep}>{ep}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.variableType} onChange={(e) => update(r.id, { variableType: e.target.value as VarType })}
                      className="bg-card border border-border rounded px-1.5 py-1">
                      <option>Direct</option>
                      <option>Complex</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    {r.variableType === "Direct" ? (
                      <select value={r.variableKey} onChange={(e) => update(r.id, { variableKey: e.target.value })}
                        disabled={!r.endpoint}
                        className="w-56 bg-card border border-border rounded px-1.5 py-1 disabled:opacity-40">
                        <option value="">{r.endpoint ? "— clé JSON —" : "sélectionner endpoint d'abord"}</option>
                        {keys.map((k) => <option key={k} value={k}>{k}</option>)}
                      </select>
                    ) : (
                      <input value={r.variableKey} onChange={(e) => update(r.id, { variableKey: e.target.value })}
                        placeholder="ex: SUM(a)/COUNT(b)"
                        className="w-56 bg-card border border-border rounded px-1.5 py-1 font-mono text-[11px]" />
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={r.isFiltered} onChange={(e) => update(r.id, { isFiltered: e.target.checked })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input value={r.filter} disabled={!r.isFiltered}
                      onChange={(e) => update(r.id, { filter: e.target.value })}
                      placeholder="ex: ProdGroup = CH01"
                      className="w-44 bg-card border border-border rounded px-1.5 py-1 disabled:opacity-40 font-mono text-[11px]" />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input type="checkbox" checked={r.hasFunction} onChange={(e) => update(r.id, { hasFunction: e.target.checked })} />
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={r.fn} disabled={!r.hasFunction}
                      onChange={(e) => update(r.id, { fn: e.target.value as AggFn })}
                      className="bg-card border border-border rounded px-1.5 py-1 disabled:opacity-40">
                      {AGG_FNS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
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
              <tr><td colSpan={11} className="text-center text-muted-foreground py-8">Aucune ligne.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-border bg-card/40 flex items-center gap-4 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2"><Database className="h-3.5 w-3.5" /> {ENDPOINT_LIST.length} endpoints disponibles</div>
        <div className="ml-auto flex items-center gap-2"><BacovetLogo /></div>
      </div>
      <StatusFooter user="MAPPING" />
    </div>
  );
}
