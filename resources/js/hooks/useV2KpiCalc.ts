/**
 * useV2KpiCalc — Hook that computes KPI values from raw data + active filters.
 * All computation happens on the frontend. No API calls when filters change.
 */
import { useMemo } from "react";
import { computeAllKpis, type KpiConfig, type ComputedKpi } from "@/lib/kpiFilterEngine";

/**
 * Transform the raw API response into KpiConfig[] for the filter engine.
 * The backend returns variables[] with raw_data per variable.
 */
export function toKpiConfigs(apiData: Record<string, unknown>[]): KpiConfig[] {
  return apiData.map((item) => {
    const variables = (item.variables as Record<string, unknown>[]) ?? [];
    return {
      kpi_code: String(item.kpi_code ?? ""),
      name: String(item.name ?? ""),
      variables: variables.map((v) => ({
        variable_key: (v.variable_key as string) ?? null,
        variable_type: String(v.variable_type ?? "Direct"),
        has_function: Boolean(v.has_function),
        fn: String(v.fn ?? "Latest"),
        endpoint: (v.endpoint as string) || null,
        is_filtered: Boolean(v.is_filtered),
        filter_key: (v.filter_key as string) || null,
        raw_data: (v.raw_data as Record<string, unknown>[] | null) ?? null,
      })),
      formula: (item.formula as { items: Record<string, unknown>[] } | null) ?? null,
      formula_readable: (item.formula_readable as string) ?? null,
      target_operator: (item.target_operator as string) ?? null,
      target_value: (item.target_value as number) ?? null,
      target_is_percentage: Boolean(item.target_is_percentage),
      target_readable: (item.target_readable as string) ?? null,
      graph_types: (item.graph_types as string[]) ?? null,
      highlight_color: (item.highlight_color as string) ?? null,
      filter_configs: [],
      raw_data: (item.raw_data as Record<string, unknown>[] | null) ?? null,
    } as KpiConfig;
  });
}

/**
 * Main hook: takes API KPI configs + active filters, returns computed KPIs.
 */
export function useV2KpiCalc(
  apiData: Record<string, unknown>[] | null,
  activeFilters: Record<string, string>,
): {
  computedKpis: ComputedKpi[];
  bigNumbers: ComputedKpi[];
  chartKpis: ComputedKpi[];
  allFilterConfigs: { key: string; options: string[] }[];
} {
  const kpiConfigs = useMemo(
    () => (apiData ? toKpiConfigs(apiData) : []),
    [apiData],
  );

  const computedKpis = useMemo(
    () => computeAllKpis(kpiConfigs, activeFilters),
    [kpiConfigs, activeFilters],
  );

  const { bigNumbers, chartKpis } = useMemo(() => {
    const bn: ComputedKpi[] = [];
    const ck: ComputedKpi[] = [];
    const seen = new Set<string>();
    for (const item of computedKpis) {
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
  }, [computedKpis]);

  const allFilterConfigs = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of computedKpis) {
      for (const fc of item.filter_configs) {
        if (fc.options.length) {
          const existing = map.get(fc.key) ?? [];
          map.set(fc.key, [...new Set([...existing, ...fc.options])].sort());
        }
      }
    }
    return Array.from(map.entries()).map(([key, options]) => ({ key, options }));
  }, [computedKpis]);

  return { computedKpis, bigNumbers, chartKpis, allFilterConfigs };
}
