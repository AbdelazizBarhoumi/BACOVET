import { useCallback, useEffect, useRef, useState } from "react";
import { LightDropdown, LightDropdownItem } from "@/components/LightDropdown";
import { ProductionKpiCard } from "@/components/production/ProductionKpiCard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { V2ChartType } from "@/components/v2/V2ChartTypes";
import V2KpiDetailModal from "@/components/v2/V2KpiDetailModal";
import { useFilters } from "@/context/FilterContext";
import { useV2KpiCalc } from "@/hooks/useV2KpiCalc";
import type { ComputedKpi } from "@/lib/kpiFilterEngine";
import type { Status } from "@/lib/mock";
import { fetchProductionBreakdown } from "@/services/productionApi";
import { fetchV2ProductionKpisRaw } from "@/services/v2ProductionApi";
import type { V2KpiItem } from "@/services/v2ProductionApi";
import type { BreakdownData } from "@/types/production";

type Tab = "confection" | "coupe" | "flux";

const TAB_MODULE: Record<Tab, string> = {
  confection: "production:confection",
  coupe: "production:coupe",
  flux: "production:flux",
};

function formatValue(item: ComputedKpi): number | string {
  const val = item.value;
  if (val == null) return "–";
  if (Array.isArray(val)) {
    // For single-item arrays with a value property, extract the scalar
    if (val.length === 1 && typeof val[0] === "object" && val[0] !== null && "value" in val[0]) {
      const v = (val[0] as Record<string, unknown>).value;
      return typeof v === "number" ? v : String(v ?? "–");
    }
    return val.length;
  }
  return val;
}

function statusFromKpi(item: ComputedKpi): Status {
  const s = item.status;
  if (s === "green") return "green";
  if (s === "orange") return "orange";
  if (s === "red") return "red";
  return "grey";
}

export default function Production() {
  const [activeTab, setActiveTab] = useState<Tab>("confection");
  const [rawApiData, setRawApiData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKpi, setSelectedKpi] = useState<ComputedKpi | null>(null);
  const [breakdownData, setBreakdownData] = useState<BreakdownData | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const { getFilterParams } = useFilters();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  // Fetch raw data from backend (only on tab change or periodic refresh)
  const fetchData = useCallback(async () => {
    try {
      const filters = getFilterParams();
      const res = await fetchV2ProductionKpisRaw(TAB_MODULE[activeTab], filters);
      setRawApiData(res.data);
    } catch (e) {
      console.error("Failed to fetch V2 KPIs:", e);
    } finally {
      setLoading(false);
    }
  }, [getFilterParams, activeTab]);

  useEffect(() => {
    setLoading(true);
    setRawApiData(null);
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  // Compute KPIs from raw data + active filters (ALL frontend, no API call)
  const { bigNumbers, chartKpis, allFilterConfigs } = useV2KpiCalc(rawApiData, activeFilters);

  // Reset filters when tab changes
  useEffect(() => {
    setActiveFilters({});
  }, [activeTab]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setActiveFilters((prev) => {
      const next = { ...prev };
      if (!value) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  const handleKpiClick = useCallback(
    async (kpiCode: string) => {
      const item = bigNumbers.find((k) => k.kpi_code === kpiCode)
        ?? chartKpis.find((k) => k.kpi_code === kpiCode)
        ?? null;
      setSelectedKpi(item);
      setBreakdownData(null);
      try {
        const filters = { ...getFilterParams(), atelier: activeTab };
        const res = await fetchProductionBreakdown(kpiCode, filters);
        setBreakdownData(res);
      } catch (e) {
        console.error("Failed to fetch breakdown:", e);
      }
    },
    [getFilterParams, activeTab, bigNumbers, chartKpis],
  );

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
            {/* Global filter dropdowns — instant, no API call */}
            {!loading && allFilterConfigs.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-3">
                {allFilterConfigs.map(({ key, options, label }) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label ?? key}:</label>
                    <LightDropdown
                      value={activeFilters[key] ?? ""}
                      onValueChange={(v) => handleFilterChange(key, v)}
                      placeholder="Tous"
                      allowDeselect
                    >
                      {options.map((o) => (
                        <LightDropdownItem key={o} value={o}>{o}</LightDropdownItem>
                      ))}
                    </LightDropdown>
                  </div>
                ))}
              </div>
            )}

            {/* Big Numbers */}
            <div className="mb-6">
              {loading ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProductionKpiCard key={i} label="" value="" isLoading />
                  ))}
                </div>
              ) : bigNumbers.length === 0 && chartKpis.length === 0 ? (
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
                      status={statusFromKpi(item)}
                      isLoading={loading}
                      onClick={() => handleKpiClick(item.kpi_code)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {/* Charts */}
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
                    </div>
                    <div className="text-xs font-bold mb-2 truncate">{item.name}</div>
                    <V2ChartType kpi={item as unknown as V2KpiItem} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <V2KpiDetailModal
        kpi={selectedKpi as unknown as V2KpiItem | null}
        breakdownData={breakdownData}
        onClose={() => setSelectedKpi(null)}
      />
    </div>
  );
}
