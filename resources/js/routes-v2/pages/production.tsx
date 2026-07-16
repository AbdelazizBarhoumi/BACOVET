import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductionKpiCard } from "@/components/production/ProductionKpiCard";
import V2KpiDetailModal from "@/components/v2/V2KpiDetailModal";
import { V2ChartType } from "@/components/v2/V2ChartTypes";
import { fetchProductionBreakdown } from "@/services/productionApi";
import { fetchV2ProductionKpis, type V2KpiItem } from "@/services/v2ProductionApi";
import type { BreakdownData } from "@/types/production";
import { useFilters } from "@/context/FilterContext";
import type { Status } from "@/lib/mock";

type Tab = "confection" | "coupe" | "flux";

const TAB_MODULE: Record<Tab, string> = {
  confection: "production:confection",
  coupe: "production:coupe",
  flux: "production:flux",
};

function formatValue(item: V2KpiItem): number | string {
  const val = item.value;
  if (val == null) return "–";
  if (Array.isArray(val)) {
    // Array from row-by-row formula — show count of entries
    return val.length;
  }
  return val;
}

function statusFromKpi(item: V2KpiItem): Status {
  const s = item.status;
  if (s === "ok" || s === "green") return "green";
  if (s === "warning" || s === "orange") return "orange";
  if (s === "error" || s === "red") return "red";
  if (s === "pending" || s === "inactive") return "grey";
  return s as Status;
}

function syncLabel(item: V2KpiItem): string {
  return item.last_valid_synced_at
    ? `Sync: ${new Date(item.last_valid_synced_at).toLocaleString('fr-FR', { timeZone: 'UTC', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
    : "Sync: jamais";
}

export default function Production() {
  const [activeTab, setActiveTab] = useState<Tab>("confection");
  const [kpis, setKpis] = useState<V2KpiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<V2KpiItem | null>(null);
  const [breakdownData, setBreakdownData] = useState<BreakdownData | null>(null);
  const { getFilterParams } = useFilters();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchData = useCallback(async () => {
    try {
      const filters = getFilterParams();
      const res = await fetchV2ProductionKpis(TAB_MODULE[activeTab], filters);
      setKpis(res.data);
    } catch (e) {
      console.error("Failed to fetch V2 KPIs:", e);
    } finally {
      setLoading(false);
    }
  }, [getFilterParams, activeTab]);

  useEffect(() => {
    setLoading(true);
    setKpis([]);
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  const handleKpiClick = useCallback(
    async (kpiCode: string) => {
      const v2Item = kpis.find((k) => k.kpi_code === kpiCode) ?? null;
      setSelectedKpi(v2Item);
      setBreakdownData(null);
      try {
        const filters = { ...getFilterParams(), atelier: activeTab };
        const res = await fetchProductionBreakdown(kpiCode, filters);
        setBreakdownData(res);
      } catch (e) {
        console.error("Failed to fetch breakdown:", e);
      }
    },
    [getFilterParams, activeTab, kpis],
  );

  const { bigNumbers, chartKpis } = useMemo(() => {
    const bn: V2KpiItem[] = [];
    const ck: V2KpiItem[] = [];
    const seen = new Set<string>();
    for (const item of kpis) {
      const types = item.graph_types?.length ? item.graph_types : ["Not specified"];
      const hasBigNumber = types.includes("Big Number avec couleur");
      const hasChart = types.some((t) => t !== "Big Number avec couleur");
      if (hasBigNumber && !seen.has(item.kpi_code + ":bn")) {
        bn.push(item);
        seen.add(item.kpi_code + ":bn");
      }
      if (hasChart && !seen.has(item.kpi_code + ":chart")) {
        ck.push(item);
        seen.add(item.kpi_code + ":chart");
      }
    }
    return { bigNumbers: bn, chartKpis: ck };
  }, [kpis]);

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={(t) => setActiveTab(t as Tab)}>
        <TabsList>
          <TabsTrigger value="confection" className="text-xs tracking-wider uppercase">Confection</TabsTrigger>
          <TabsTrigger value="coupe" className="text-xs tracking-wider uppercase">Coupe</TabsTrigger>
          <TabsTrigger value="flux" className="text-xs tracking-wider uppercase">Flux</TabsTrigger>
        </TabsList>

        {(["confection", "coupe", "flux"] as Tab[]).map((tab) => (
          <TabsContent key={tab} value={tab}>
            {/* Big Numbers — always first */}
            <div className="mb-6">
              {loading ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProductionKpiCard key={i} label="" value="" isLoading />
                  ))}
                </div>
              ) : bigNumbers.length === 0 && chartTypes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-6 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Aucune donnée KPI disponible
                </div>
              ) : bigNumbers.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {bigNumbers.map((item) => (
                    <ProductionKpiCard
                      key={item.kpi_code}
                      label={item.name}
                      value={formatValue(item)}
                      unit={item.target_is_percentage ? "%" : ""}
                      target={item.target_readable ?? undefined}
                      freq={syncLabel(item)}
                      status={statusFromKpi(item)}
                      isLoading={loading}
                      onClick={() => handleKpiClick(item.kpi_code)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {/* Charts — all in one continuous grid */}
            {chartKpis.length > 0 && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {chartKpis.map((item) => (
                  <div
                    key={item.kpi_code}
                    className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                    onClick={() => handleKpiClick(item.kpi_code)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] text-muted-foreground uppercase">{item.kpi_code}</span>
                      <span className="text-[10px] text-muted-foreground">{syncLabel(item)}</span>
                    </div>
                    <div className="text-xs font-bold mb-2 truncate">{item.name}</div>
                    <V2ChartType kpi={item} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <V2KpiDetailModal
        kpi={selectedKpi}
        breakdownData={breakdownData}
        onClose={() => setSelectedKpi(null)}
      />
    </div>
  );
}
