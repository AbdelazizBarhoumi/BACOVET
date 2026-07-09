import { PageHeader, FilterPill, FilterSelect, Filters, StatusFooter } from "@/components/v1/v1-shell";
import { Card, ReqLabel } from "@/components/v1/primitives";
import { ComboChart, GaugeChart, LineChart, AreaChart, TimelineChart, HBarChart, SparkCanvas } from "@/components/v1/canvas-charts";
import { useLiveData } from "@/hooks/use-live-data";
import { useFilters } from "@/context/FilterContext";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchProductionChainInfo,
  fetchProductionKpis,
  fetchProductionGauges,
  fetchProductionWipGauges,
  fetchProductionStoppages,
  fetchProductionTrend,
  fetchProductionTopOps,
  fetchProductionWip,
  fetchDepartage,
  type ChainInfo,
  type ProductionKpis,
  type GaugeItem,
  type StoppageItem,
  type TrendItem,
  type TopOpItem,
  type WipAreaItem,
} from "@/services/productionApi";
import { fetchMethodesKpis, fetchRespectTempsDetail, fetchTempsAcceptesDetail, type MethodsKpisResponse, type RespectTempsDetailItem, type TempsAcceptesDetailItem } from "@/services/methodsApi";
import type { BreakdownRow } from "@/types/production";

export default function Page() {
  const { getFilterParams, setFilter } = useFilters();
  const { refreshIntervalSec, recordFetchSuccess, recordFetchError } = useLiveData();

  const [chains, setChains] = useState<ChainInfo[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>("");
  const [kpis, setKpis] = useState<ProductionKpis | null>(null);
  const [gauges, setGauges] = useState<GaugeItem[]>([]);
  const [wipGauges, setWipGauges] = useState<GaugeItem[]>([]);
  const [stoppages, setStoppages] = useState<StoppageItem[]>([]);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [topOps, setTopOps] = useState<TopOpItem[]>([]);
  const [allOps, setAllOps] = useState<TopOpItem[]>([]);
  const [wipData, setWipData] = useState<WipAreaItem[]>([]);
  const [departage, setDepartage] = useState<BreakdownRow[]>([]);
  const [vignettes, setVignettes] = useState<BreakdownRow[]>([]);
  const [methodsKpis, setMethodsKpis] = useState<MethodsKpisResponse | null>(null);
  const [respectDetail, setRespectDetail] = useState<RespectTempsDetailItem[]>([]);
  const [acceptDetail, setAcceptDetail] = useState<TempsAcceptesDetailItem[]>([]);
  const [loading, setLoading] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleChainChange = useCallback((chainId: string) => {
    setSelectedChain(chainId);
    setFilter("ligne", chainId);
  }, [setFilter]);

  const fetchData = useCallback(async () => {
    try {
      const filters = getFilterParams();
      const results = await Promise.allSettled([
        fetchProductionChainInfo(filters),
        fetchProductionKpis(filters),
        fetchProductionGauges(filters),
        fetchProductionWipGauges(filters),
        fetchProductionStoppages(filters),
        fetchProductionTrend(filters),
        fetchProductionTopOps(filters),
        fetchProductionTopOps({ ...filters, all: "1" }),
        fetchProductionWip(filters),
        fetchDepartage("OP221", filters),
        fetchDepartage("OP213", filters),
        fetchMethodesKpis(),
        fetchRespectTempsDetail(),
        fetchTempsAcceptesDetail(),
      ]);

      const r = (i: number) => results[i];

      if (r(0).status === "fulfilled") {
        const d = r(0).value as { data: ChainInfo[] };
        setChains(d.data);
      }
      if (r(1).status === "fulfilled") setKpis(r(1).value as ProductionKpis);
      if (r(2).status === "fulfilled") setGauges((r(2).value as { data: GaugeItem[] }).data);
      if (r(3).status === "fulfilled") setWipGauges((r(3).value as { data: GaugeItem[] }).data);
      if (r(4).status === "fulfilled") setStoppages((r(4).value as { data: StoppageItem[] }).data);
      if (r(5).status === "fulfilled") setTrend((r(5).value as { data: TrendItem[] }).data);
      if (r(6).status === "fulfilled") setTopOps((r(6).value as { data: TopOpItem[] }).data);
      if (r(7).status === "fulfilled") setAllOps((r(7).value as { data: TopOpItem[] }).data);
      if (r(8).status === "fulfilled") setWipData((r(8).value as { data: WipAreaItem[] }).data);
      if (r(9).status === "fulfilled") setDepartage((r(9).value as { data: BreakdownRow[] }).data);
      if (r(10).status === "fulfilled") setVignettes((r(10).value as { data: BreakdownRow[] }).data);
      if (r(11).status === "fulfilled") setMethodsKpis(r(11).value as MethodsKpisResponse);
      if (r(12).status === "fulfilled") setRespectDetail((r(12).value as { data: RespectTempsDetailItem[] }).data);
      if (r(13).status === "fulfilled") setAcceptDetail((r(13).value as { data: TempsAcceptesDetailItem[] }).data);

      const criticalFailed = [r(0), r(1)].some((x) => x.status === "rejected");
      if (criticalFailed) recordFetchError();
      else recordFetchSuccess();
    } catch {
      recordFetchError();
    } finally {
      setLoading(false);
    }
  }, [getFilterParams, recordFetchError, recordFetchSuccess]);

  useEffect(() => {
    setChains([]);
    setKpis(null);
    setGauges([]);
    setWipGauges([]);
    setStoppages([]);
    setTrend([]);
    setTopOps([]);
    setAllOps([]);
    setWipData([]);
    setDepartage([]);
    setVignettes([]);
    setMethodsKpis(null);
    setRespectDetail([]);
    setAcceptDetail([]);
    setLoading(true);

    fetchData();
    intervalRef.current = setInterval(fetchData, refreshIntervalSec * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData, refreshIntervalSec]);

  const chain = chains.find((c) => c.id === selectedChain) ?? chains[0];
  const chainOptions = [
    { value: "", label: "Toutes les chaînes" },
    ...chains.map((c) => ({ value: c.id, label: `Chaîne ${c.id}` })),
  ];
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

  const oweVal = kpis?.avg_owe?.value;
  const wipVal = kpis?.total_wip?.value;

  const samVal = typeof chain?.sam === "number" ? chain.sam : null;
  const sotVal = typeof chain?.sot === "number" ? chain.sot : null;
  const effectifVal = chain?.effectif != null ? Number(chain.effectif) : null;
  const articleVal = chain?.article ?? "—";
  const designationVal = chain?.designation ?? "—";

  const opNames = allOps.map((o) => o.nom);
  const opEffs = allOps.map((o) => o.eff);

  const gaugeVals = gauges.map((g) => Number(g.efficience_pct ?? 0));
  const avgEffFromGauges =
    gaugeVals.length > 0
      ? Math.round((gaugeVals.reduce((a, b) => a + b, 0) / gaugeVals.length) * 10) / 10
      : null;

  const trendVals = trend.map((t) => t.eff);
  const trendLabels = trend.map((t) => t.jour);

  const wipOptSortie = wipData.map((w) => w.sortie);

  const stopTimeline = stoppages.map((s) => ({
    time: `${Math.floor(s.start)}h${String(Math.round((s.start % 1) * 60)).padStart(2, "0")}`,
    min: Math.round(s.duration * 60),
  }));

  const depVals = departage.map((d) => d.eff ?? 0);
  const depLabels = departage.map((d) => d.employe ?? d.chaine ?? "");

  const vigVals = vignettes.map((v) => v.eff ?? 0);
  const vigLabels = vignettes.map((v) => v.employe ?? v.chaine ?? "");

  const topNames = topOps.map((o) => o.nom);
  const topEffs = topOps.map((o) => o.eff);

  const archivageVal = methodsKpis?.f_req_216?.value ?? 0;
  const fiabiliteVal = methodsKpis?.f_req_217?.value ?? 0;
  const respectVal = methodsKpis?.f_req_218?.value ?? 0;
  const acceptesVal = methodsKpis?.f_req_219?.value ?? 0;

  const oweSparkline = gaugeVals.filter((v) => v > 0);
  const respectSparkline = respectDetail.map((d) => d.difference);
  const acceptSparkline = acceptDetail.map((d) => d.taux_pct ?? 0);

  if (loading && !kpis) {
    return (
      <>
        <PageHeader
          title="PERFORMANCE DE PRODUCTION & FLUX (SÉRIE 200)"
          subtitle="CHARGEMENT..."
        />
        <div className="p-3 space-y-3">
          <div className="grid gap-3" style={{ gridTemplateColumns: "1.2fr repeat(5, 1fr)" }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="rounded-sm h-28 animate-pulse" />
            ))}
          </div>
        </div>
        <StatusFooter />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="PERFORMANCE DE PRODUCTION & FLUX (SÉRIE 200)"
        subtitle={`CHAÎNE DE PRODUCTION N°1 – CONFECTION TEXTILE${chain ? ` · ${chain.of}` : ""}`}
        filters={
          <>
            <FilterPill label="Période" value={dateStr} icon={Filters.Calendar} />
            <FilterSelect
              label="Ligne"
              value={selectedChain}
              options={chainOptions}
              onChange={handleChainChange}
              icon={Filters.Layers}
            />
            <FilterPill label="Atelier" value="Confection" icon={Filters.Factory} />
            <FilterPill label="Shift" value="Jour 07:00 - 19:00" icon={Filters.Users} />
          </>
        }
      />
      <div className="p-3 space-y-3">
        {/* Row 1 — Header KPIs */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "1.2fr repeat(5, 1fr)" }}>
          <Card className="rounded-sm relative overflow-hidden">
            <ReqLabel id="F-REQ-204" title="OWE (Overall Work Efficiency) par chaîne" />
            <div className="text-3xl font-black text-[var(--status-green)]">
              {oweVal != null ? `${oweVal.toFixed(1).replace(".", ",")} %` : "—"}
            </div>
            <div>Objectif : &gt; 70 %</div>
            <SparkCanvas values={oweSparkline.length > 0 ? oweSparkline : undefined} />
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#2a46bd]/15 !border-[#2a46bd]/30 flex flex-col">
            <ReqLabel id="F-REQ-211" title="SAM (Temps standard alloué) par chaîne" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">
                  {samVal != null ? samVal.toLocaleString() : "—"}{" "}
                  <span className="text-lg font-normal text-muted-foreground">min</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#2a46bd" d="M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#822abd]/15 !border-[#822abd]/30 flex flex-col">
            <ReqLabel id="F-REQ-212" title="SOT (Temps article fournisseur)" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">
                  {sotVal != null ? sotVal.toLocaleString() : "—"}{" "}
                  <span className="text-lg font-normal text-muted-foreground">min</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 64 64">
                <path d="M0 0h64v64H0z" fill="none" />
                <path fill="#822abd" d="m50.332 22.833l1.264-1.254l.984.976l2.976-2.952a1.495 1.495 0 0 0 0-2.125l-2.679-2.656a1.52 1.52 0 0 0-2.141 0l-2.977 2.952l.984.976l-1.264 1.253a24 24 0 0 0-14.053-5.576v-1.182c2.488-.631 4.332-2.864 4.332-5.53C37.76 4.558 35.181 2 32 2s-5.761 2.558-5.761 5.714c0 2.667 1.843 4.898 4.332 5.53v1.182a24 24 0 0 0-14.053 5.577l-1.264-1.254l.982-.976l-2.976-2.952a1.523 1.523 0 0 0-2.141 0l-2.678 2.656a1.494 1.494 0 0 0 0 2.125l2.977 2.954l.983-.977l1.263 1.254C10.134 26.98 8 32.337 8 38.19C8 51.342 18.746 62 32 62s24-10.658 24-23.81c0-5.853-2.135-11.211-5.668-15.357" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#6685f6]/15 !border-[#6685f6]/30 flex flex-col">
            <ReqLabel id="F-REQ-213" title="Effectif par chaîne" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-3xl font-black text-foreground">{effectifVal ?? "—"}</div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 512 512">
                <path d="M0 0h512v512H0z" fill="none" />
                <circle cx="152" cy="184" r="72" fill="#6685f6" />
                <path fill="#6685f6" d="M234 296c-28.16-14.3-59.24-20-82-20c-44.58 0-136 27.34-136 82v42h150v-16.07c0-19 8-38.05 22-53.93c11.17-12.68 26.81-24.45 46-34" />
                <path fill="#6685f6" d="M340 288c-52.07 0-156 32.16-156 96v48h312v-48c0-63.84-103.93-96-156-96" />
                <circle cx="340" cy="168" r="88" fill="#6685f6" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#40ced2]/15 !border-[#40ced2]/30 flex flex-col">
            <ReqLabel id="F-REQ-214" title="Code article par chaîne" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-2xl font-black text-foreground">{articleVal}</div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 24 24">
                <path d="M0 0h24v24H0z" fill="none" />
                <path fill="#40ced2" fillRule="evenodd" d="M3.207 14.207a1 1 0 0 1 0-1.414l9.5-9.5A1 1 0 0 1 13.414 3H20a1 1 0 0 1 1 1v6.586a1 1 0 0 1-.293.707l-9.5 9.5a1 1 0 0 1-1.414 0zM16 10a2 2 0 1 0 0-4a2 2 0 0 0 0 4" />
              </svg>
            </div>
          </Card>

          <Card className="rounded-sm relative overflow-hidden !bg-[#03ce06]/15 !border-[#03ce06]/30 flex flex-col">
            <ReqLabel id="F-REQ-215" title="Désignation d'article" />
            <div className="flex items-center justify-between mt-auto">
              <div>
                <div className="text-xl font-black text-foreground">{designationVal}</div>
                <div className="text-sm text-muted-foreground mt-1">Temps réel</div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="3em" height="3em" viewBox="0 0 640 640">
                <path d="M0 0h640v640H0z" fill="none" />
                <path fill="#03ce06" d="M320.2 176c44.2 0 80-35.8 80-80h53.5c17 0 33.3 6.7 45.3 18.7l118.6 118.7c12.5 12.5 12.5 32.8 0 45.3l-50.7 50.7c-12.5 12.5-32.8 12.5-45.3 0L480.2 288v224c0 35.3-28.7 64-64 64h-192c-35.3 0-64-28.7-64-64V288l-41.4 41.4c-12.5 12.5-32.8 12.5-45.3 0l-50.6-50.8c-12.5-12.5-12.5-32.8 0-45.3l118.6-118.6c12-12 28.3-18.7 45.3-18.7h53.5c0 44.2 35.8 80 80 80z" />
              </svg>
            </div>
          </Card>
        </div>

        {/* Row 2 — Efficience + Gauges + WIP */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "1.4fr 15% 1.05fr 15%" }}>
          <Card className="rounded-sm tall">
            <ReqLabel id="F-REQ-201" title="Efficience par opérateur par chaîne" />
            {opEffs.length > 0 ? (
              <ComboChart values={opEffs} target={90} labels={opNames} />
            ) : (
              <div className="flex h-[170px] items-center justify-center text-xs text-muted-foreground">Aucune donnée</div>
            )}
          </Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-202" title="Efficience par chaîne" />
            {avgEffFromGauges != null ? (
              <GaugeChart value={avgEffFromGauges} target="> 85 %" />
            ) : (
              <div className="flex h-[210px] items-center justify-center text-xs text-muted-foreground">—</div>
            )}
          </Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-203" title="Efficience cumulée par chaîne" />
            {trendVals.length > 0 ? (
              <LineChart values={trendVals} target={85} timeLabels={trendLabels} />
            ) : (
              <div className="flex h-[210px] items-center justify-center text-xs text-muted-foreground">Aucune donnée tendance</div>
            )}
          </Card>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-205" title="WIP par chaîne" />
            {wipVal != null ? (
              <GaugeChart value={Number(wipVal)} target="≤ 1/2 cadence" color="orange" />
            ) : (
              <div className="flex h-[210px] items-center justify-center text-xs text-muted-foreground">—</div>
            )}
          </Card>
        </div>

        {/* Row 3 — WIP Optimal + Arrêts + Départage + Vignettes */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-206" title="WIP Optimal" />
            {wipOptSortie.length > 0 ? (
              <AreaChart values={wipOptSortie} />
            ) : (
              <div className="flex h-[220px] items-center justify-center text-xs text-muted-foreground">Aucune donnée WIP</div>
            )}
          </Card>

          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-207" title="Arrêts non planifiés par chaîne (Lost Time)" />
            {stopTimeline.length > 0 ? (
              <>
                <TimelineChart points={stopTimeline} />
                <table className="w-full border-collapse text-[10.5px]">
                  <thead>
                    <tr className="text-muted-foreground bg-muted/50">
                      <th className="border-b border-border px-2 text-left">Heure début</th>
                      <th className="border-b border-border px-2 text-left">Durée</th>
                      <th className="border-b border-border px-2 text-left">Motif</th>
                      <th className="border-b border-border px-2 text-left">Chaîne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stoppages.slice(0, 5).map((s, i) => (
                      <tr key={i}>
                        <td className="border-b border-border px-2">{s.start.toFixed(2).replace(".", "h")}</td>
                        <td className="border-b border-border px-2">{Math.round(s.duration * 60)} min</td>
                        <td className="border-b border-border px-2">{s.motif}</td>
                        <td className="border-b border-border px-2 font-bold">{s.chaine}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="flex h-[150px] items-center justify-center text-xs text-muted-foreground">Aucun arrêt</div>
            )}
          </Card>

          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-208" title="Efficience Départage par opératrice" />
            {depVals.length > 0 ? (
              <ComboChart values={depVals} target={85} labels={depLabels} />
            ) : (
              <div className="flex h-[170px] items-center justify-center text-xs text-muted-foreground">Aucune donnée départage</div>
            )}
          </Card>

          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-209" title="Efficience Vignettes par opératrice" />
            {vigVals.length > 0 ? (
              <ComboChart values={vigVals} target={85} labels={vigLabels} />
            ) : (
              <div className="flex h-[170px] items-center justify-center text-xs text-muted-foreground">Aucune donnée vignettes</div>
            )}
          </Card>
        </div>

        {/* Row 4 — Top Ops + Archivage + Fiabilité + Respect + Acceptés */}
        <div className="grid gap-3" style={{ gridTemplateColumns: "1.5fr repeat(2, 15%) repeat(2, 1fr)" }}>
          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-210" title="Top opérateurs coupe" />
            {topEffs.length > 0 ? (
              <HBarChart names={topNames} values={topEffs} target={90} />
            ) : (
              <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">Aucun opérateur</div>
            )}
          </Card>

          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-216" title="Taux d'archivage des OF" />
            <GaugeChart value={archivageVal} target="85 %" color="orange" />
          </Card>

          <Card className="rounded-sm">
            <ReqLabel id="F-REQ-217" title="Taux de fiabilité des données par OF" />
            <GaugeChart value={fiabiliteVal} target="95 %" />
          </Card>

          <Card className="rounded-sm flex flex-col overflow-hidden">
            <ReqLabel id="F-REQ-218" title="Taux de respect du temps estimé par article" />
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-6xl font-black text-[var(--status-green)]">
                {respectVal != null ? `${respectVal.toFixed(1).replace(".", ",")} %` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Objectif : 90 %</div>
            </div>
            <SparkCanvas fullWidth values={respectSparkline.length > 0 ? respectSparkline : undefined} />
          </Card>

          <Card className="rounded-sm flex flex-col overflow-hidden">
            <ReqLabel id="F-REQ-219" title="Taux des temps acceptés dès la première version" />
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-6xl font-black text-[var(--status-green)]">
                {acceptesVal != null ? `${acceptesVal.toFixed(1).replace(".", ",")} %` : "—"}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Objectif : ≥ 80 %</div>
            </div>
            <SparkCanvas fullWidth values={acceptSparkline.length > 0 ? acceptSparkline : undefined} />
          </Card>
        </div>
      </div>
      <StatusFooter />
    </>
  );
}
