import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SparkCanvas } from "@/components/v1/canvas-charts";
import { Card, ReqLabel, BarKpi, Sparkline, DonutMulti } from "@/components/v1/primitives";
import { PageHeader, FilterPill, Filters, StatusFooter } from "@/components/v1/v1-shell";
import { useFilters } from "@/context/FilterContext";
import { useLiveData } from "@/hooks/use-live-data";
import {
  fetchProductionChainInfo,
  fetchProductionWipGauges,
  type ChainInfo,
  type GaugeItem,
} from "@/services/productionApi";

const STATUS_COLOR: Record<string, string> = {
  "Excellent": "#22c55e", "Bon": "#16a34a",
  "À surveiller": "#eab308", "À améliorer": "#f97316", "Critique": "#ef4444",
};
function statusBar(eff: number) {
  if (eff >= 90) return STATUS_COLOR["Excellent"];
  if (eff >= 85) return STATUS_COLOR["Bon"];
  if (eff >= 80) return STATUS_COLOR["À surveiller"];
  if (eff >= 75) return STATUS_COLOR["À améliorer"];
  return STATUS_COLOR["Critique"];
}

const STATUS_GRADIENT: Record<string, [string, string]> = {
  "Excellent": ["#4ade80", "#16a34a"],
  "Bon": ["#22c55e", "#15803d"],
  "À surveiller": ["#facc15", "#ca8a04"],
  "À améliorer": ["#fb923c", "#ea580c"],
  "Critique": ["#f87171", "#dc2626"],
};
function statusGradient(eff: number): [string, string] {
  if (eff >= 90) return STATUS_GRADIENT["Excellent"];
  if (eff >= 85) return STATUS_GRADIENT["Bon"];
  if (eff >= 80) return STATUS_GRADIENT["À surveiller"];
  if (eff >= 75) return STATUS_GRADIENT["À améliorer"];
  return STATUS_GRADIENT["Critique"];
}

type ComparisonRow = {
  n: number;
  name: string;
  eff: number;
  sot: number;
  sam: number;
  wip: number;
  status: string;
};

type ComparisonData = {
  effMoyenne: number;
  sotMoyen: number;
  samMoyen: number;
  wipMoyen: number;
  commandes: number;
  prodJour: number;
  rows: ComparisonRow[];
};

function computeStatus(eff: number): string {
  if (eff >= 90) return "Excellent";
  if (eff >= 85) return "Bon";
  if (eff >= 80) return "À surveiller";
  if (eff >= 75) return "À améliorer";
  return "Critique";
}

function toNum(v: number | string | undefined | null): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

export default function Page() {
  const { getFilterParams } = useFilters();
  const { refreshIntervalSec, recordFetchSuccess, recordFetchError } = useLiveData();

  const [chainInfo, setChainInfo] = useState<ChainInfo[]>([]);
  const [wipGauges, setWipGauges] = useState<GaugeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const filters = getFilterParams();
      const results = await Promise.allSettled([
        fetchProductionChainInfo(filters),
        fetchProductionWipGauges(filters),
      ]);

      if (results[0].status === "fulfilled") {
        setChainInfo(results[0].value.data);
      }
      if (results[1].status === "fulfilled") {
        setWipGauges(results[1].value.data);
      }

      const criticalFailed = results[0].status === "rejected";
      if (criticalFailed) recordFetchError();
      else recordFetchSuccess();
    } catch {
      recordFetchError();
    } finally {
      setLoading(false);
    }
  }, [getFilterParams, recordFetchError, recordFetchSuccess]);

  useEffect(() => {
    setChainInfo([]);
    setWipGauges([]);
    setLoading(true);
    fetchData();
    intervalRef.current = setInterval(fetchData, refreshIntervalSec * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, refreshIntervalSec]);

  const ch = useMemo<ComparisonData>(() => {
    const wipMap = new Map<string, number>();
    for (const g of wipGauges) {
      wipMap.set(g.chaine, g.wip ?? 0);
    }

    const rows: ComparisonRow[] = chainInfo.map((c, i) => {
      const eff = toNum(c.eff);
      const sot = toNum(c.sot);
      const sam = toNum(c.sam);
      const wip = wipMap.get(c.id) ?? 0;
      return {
        n: i + 1,
        name: c.id,
        eff,
        sot,
        sam,
        wip: Math.round(wip * 10) / 10,
        status: c.status || computeStatus(eff),
      };
    });

    const count = rows.length || 1;
    const effMoyenne = Math.round((rows.reduce((s, r) => s + r.eff, 0) / count) * 10) / 10;
    const sotMoyen = Math.round(rows.reduce((s, r) => s + r.sot, 0) / count);
    const samMoyen = Math.round(rows.reduce((s, r) => s + r.sam, 0) / count);
    const wipMoyen = Math.round((rows.reduce((s, r) => s + r.wip, 0) / count) * 10) / 10;

    return {
      effMoyenne,
      sotMoyen,
      samMoyen,
      wipMoyen,
      commandes: 100.0,
      prodJour: 0,
      rows,
    };
  }, [chainInfo, wipGauges]);

  const top5 = useMemo(() => [...ch.rows].sort((a, b) => b.eff - a.eff).slice(0, 5), [ch.rows]);
  const bottom5 = useMemo(() => [...ch.rows].sort((a, b) => a.eff - b.eff).slice(0, 5).reverse(), [ch.rows]);
  const statusCounts = useMemo(
    () =>
      Object.keys(STATUS_COLOR).map((status) => ({
        status,
        color: STATUS_COLOR[status],
        count: ch.rows.filter((r) => r.status === status).length,
      })),
    [ch.rows],
  );

  const WIP_RANGES = [
    { label: "≤ 30 %", color: "#22c55e", min: -Infinity, max: 30 },
    { label: "30 - 50 %", color: "#3b82f6", min: 30, max: 50 },
    { label: "50 - 60 %", color: "#f59e0b", min: 50, max: 60 },
    { label: "> 60 %", color: "#ef4444", min: 60, max: Infinity },
  ];
  const wipCounts = WIP_RANGES.map((range) => ({
    ...range,
    count: ch.rows.filter((r) => r.wip > range.min && r.wip <= range.max).length,
  }));

  if (loading) {
    return (
      <>
        <PageHeader
          title="COMPARAISON PERFORMANCE – CHAÎNES"
          subtitle="CHAÎNE DE PRODUCTION – CONFECTION TEXTILE"
          filters={<>
            <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
            <FilterPill label="Ligne" value="Toutes" icon={Filters.Layers} />
            <FilterPill label="Atelier" value="Tous" icon={Filters.Factory} />
            <FilterPill label="Shift" value="Jour (07:00 - 19:00)" icon={Filters.Users} />
          </>}
        />
        <div className="p-3 space-y-3">
          <div className="grid gap-3" style={{ gridTemplateColumns: '1.2fr repeat(5, 1fr)' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="rounded-sm h-28 animate-pulse bg-secondary/30" />
            ))}
          </div>
          <div className="grid grid-cols-12 gap-3">
            <Card className="col-span-5 h-80 animate-pulse bg-secondary/30" />
            <div className="col-span-7 space-y-3">
              <Card className="h-56 animate-pulse bg-secondary/30" />
              <div className="grid grid-cols-2 gap-3">
                <Card className="h-48 animate-pulse bg-secondary/30" />
                <Card className="h-48 animate-pulse bg-secondary/30" />
              </div>
            </div>
          </div>
        </div>
        <StatusFooter />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="COMPARAISON PERFORMANCE – CHAÎNES"
        subtitle="CHAÎNE DE PRODUCTION – CONFECTION TEXTILE"
        filters={<>
          <FilterPill label="Période" value="Aujourd'hui" icon={Filters.Calendar} />
          <FilterPill label="Ligne" value="Toutes" icon={Filters.Layers} />
          <FilterPill label="Atelier" value="Tous" icon={Filters.Factory} />
          <FilterPill label="Shift" value="Jour (07:00 - 19:00)" icon={Filters.Users} />
        </>}
      />
      <div className="p-3 space-y-3">
        <div className="grid gap-3" style={{ gridTemplateColumns: '1.2fr repeat(5, 1fr)' }}>
          <Card className="rounded-sm relative overflow-hidden !bg-[#22c55e]/15 !border-[#22c55e]/30 flex flex-col">
            <ReqLabel id="" title="EFFICACITÉ MOYENNE" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">{ch.effMoyenne.toString().replace(".", ",")} %</div>
                <div className="text-sm text-muted-foreground mt-1">Objectif : ≥ 85 %</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#22c55e" d="M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z" />
              </svg>
            </div>
            <SparkCanvas />
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#a855f7]/15 !border-[#a855f7]/30 flex flex-col">
            <ReqLabel id="" title="SOT MOYEN (min/pièce)" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">{ch.sotMoyen.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">min</span></div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#a855f7" d="M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#ec4899]/15 !border-[#ec4899]/30 flex flex-col">
            <ReqLabel id="" title="SAM MOYEN (min/pièce)" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">{ch.samMoyen.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">min</span></div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#ec4899" d="M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#f59e0b]/15 !border-[#f59e0b]/30 flex flex-col">
            <ReqLabel id="" title="WIP MOYEN" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">{ch.wipMoyen} %</div>
                <div className="text-sm text-muted-foreground mt-1">Objectif : ≤ 1/2 cadence</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#f59e0b" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16m1-13h-2v6l5.25 3.15.75-1.23-4-2.42z" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#22c55e]/15 !border-[#22c55e]/30 flex flex-col">
            <ReqLabel id="" title="COMMANDES COMPLÉTÉES" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">{ch.commandes.toFixed(2).replace(".", ",")} %</div>
                <div className="text-sm text-muted-foreground mt-1">Complétées</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#22c55e" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#3b82f6]/15 !border-[#3b82f6]/30 flex flex-col">
            <ReqLabel id="" title="PRODUCTION DU JOUR" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">{ch.prodJour.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">pce</span></div>
                <div className="text-sm text-muted-foreground mt-1">Objectif : ≥ 85 %</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#3b82f6" d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2z" />
              </svg>
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-5 !p-0 overflow-hidden">
            <div className="px-3 py-2 text-xs font-bold uppercase border-b border-border">Performance par Chaîne ({ch.rows.length})</div>
            <table className="w-full text-[10px]">
              <thead className="bg-secondary/40 uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">#</th><th className="text-left">Chaîne</th>
                  <th>Efficacité (%)</th><th>Objectif (%)</th><th>SOT (min/pièce)</th>
                  <th>SAM (min/pièce)</th><th>WIP (%)</th><th>Statut</th><th>Tendance</th>
                </tr>
              </thead>
              <tbody>
                {ch.rows.map((r) => (
                  <tr key={r.n} className="border-t border-border">
                    <td className="px-2 py-1">{r.n}</td>
                    <td>{r.name}</td>
                    <td className="text-center text-white font-bold" style={{ backgroundColor: statusBar(r.eff) }}>{r.eff} %</td>
                    <td className="text-center text-muted-foreground">≥ 85 %</td>
                    <td className="text-center">{r.sot.toString().replace(".", ",")}</td>
                    <td className="text-center">{r.sam.toString().replace(".", ",")}</td>
                    <td className="text-center">{r.wip} %</td>
                    <td className="text-center font-semibold" style={{ color: STATUS_COLOR[r.status] }}>{r.status}</td>
                    <td className="w-16"><div className="h-4"><Sparkline data={[r.eff - 2, r.eff - 1, r.eff + 1, r.eff, r.eff + 0.5, r.eff]} color={statusBar(r.eff)} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <div className="col-span-7 space-y-3">
            <Card>
              <ReqLabel id="" title="EFFICACITÉ PAR CHAÎNE (%)" />
              <BarKpi
                data={ch.rows.map((r) => ({
                  x: String(r.n).padStart(2, "0"),
                  v: r.eff,
                  color: statusGradient(r.eff),
                }))}
                color="#3b82f6"
                target={85}
                height={200}
              />
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <ReqLabel id="" title="SOT PAR CHAÎNE (min/pièce)" />
                <BarKpi data={ch.rows.map((r) => ({ x: String(r.n).padStart(2, "0"), v: r.sot }))} color="#a855f7" height={170} />
              </Card>
              <Card>
                <ReqLabel id="" title="SAM PAR CHAÎNE (min/pièce)" />
                <BarKpi data={ch.rows.map((r) => ({ x: String(r.n).padStart(2, "0"), v: r.sam }))} color="#ec4899" height={170} />
              </Card>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-3">
          <Card>
            <ReqLabel id="" title="WIP PAR CHAÎNE (%)" />
            <DonutMulti
              segments={wipCounts.map((w) => ({ value: w.count, color: w.color }))}
              centerLabel="Moyenne"
            />
            <ul className="text-[10px] mt-2 space-y-0.5">
              {wipCounts.map((w) => (
                <li key={w.label} className="flex justify-between">
                  <span><span className="inline-block h-2 w-2 mr-1" style={{ backgroundColor: w.color }} />{w.label}</span>
                  <span>({w.count} chaînes)</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <ReqLabel id="" title="RÉPARTITION PAR STATUT" />
            <DonutMulti
              segments={statusCounts.map((s) => ({ value: s.count, color: s.color }))}
              centerLabel="Chaînes"
            />
            <ul className="text-[10px] mt-2 space-y-0.5">
              {statusCounts.map((s) => (
                <li key={s.status} className="flex justify-between">
                  <span><span className="inline-block h-2 w-2 mr-1" style={{ backgroundColor: s.color }} />{s.status}</span>
                  <span>({s.count})</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <ReqLabel id="" title="TOP 5 MEILLEURES CHAÎNES" />
            <ul className="space-y-1.5 mt-1">
              {top5.map((r, i) => (
                <li key={r.n} className="flex items-center gap-2">
                  <span className="h-5 w-5 grid place-items-center bg-[#22c55e] text-white text-[10px] font-bold rounded">{i + 1}</span>
                  <span className="text-[11px] flex-1">{r.name}</span>
                  <div className="flex-1 h-2.5 bg-secondary rounded overflow-hidden"><div className="h-full bg-[#22c55e]" style={{ width: `${r.eff}%` }} /></div>
                  <span className="text-[11px] font-bold w-12 text-right">{r.eff}%</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <ReqLabel id="" title="TOP 5 À AMÉLIORER" />
            <ul className="space-y-1.5 mt-1">
              {bottom5.map((r) => (
                <li key={r.n} className="flex items-center gap-2">
                  <span className="h-5 w-5 grid place-items-center bg-[#ef4444] text-white text-[10px] font-bold rounded">{r.n}</span>
                  <span className="text-[11px] flex-1">{r.name}</span>
                  <div className="flex-1 h-2.5 bg-secondary rounded overflow-hidden"><div className="h-full bg-[#ef4444]" style={{ width: `${r.eff}%` }} /></div>
                  <span className="text-[11px] font-bold w-12 text-right">{r.eff}%</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="col-span-2">
            <ReqLabel id="" title="RÉSUMÉ GLOBAL" />
            <ul className="space-y-2 mt-1">
              <Row icon="✓" label="Efficacité moyenne" value={`${ch.effMoyenne} %`} color="#22c55e" />
              <Row icon="⏱" label="SOT moyen" value={`${ch.sotMoyen.toLocaleString()} min`} color="#a855f7" />
              <Row icon="⏱" label="SAM moyen" value={`${ch.samMoyen.toLocaleString()} min`} color="#ec4899" />
              <Row icon="⚙" label="WIP moyen" value={`${ch.wipMoyen} %`} color="#f59e0b" />
              <Row icon="✓" label="Commandes complétées" value={`${ch.commandes.toFixed(2).replace(".", ",")} %`} color="#22c55e" />
            </ul>
          </Card>
        </div>
      </div>
      <StatusFooter />
    </>
  );
}
function Row({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      <span className="text-base" style={{ color }}>{icon}</span>
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-bold" style={{ color }}>{value}</span>
    </li>
  );
}
