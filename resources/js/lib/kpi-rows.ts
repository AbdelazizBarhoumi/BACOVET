export type KpiSeed = {
  kpi: string;
  name: string;
  variable: string;
  variables?: { variable: string; endpoint: string; variable_key?: string; fn?: string }[];
  formula?: { items: { type: string; ref?: number; label?: string; op?: string; value?: number }[] };
  formula_readable?: string;
  cible_operator?: string;
  cible_value?: number | null;
  cible_is_percentage?: boolean;
  refresh_frequency?: string;
  module?: string;
};

let cachedKpis: KpiSeed[] | null = null;

export async function fetchKpiList(): Promise<KpiSeed[]> {
  if (cachedKpis) return cachedKpis as KpiSeed[];
  try {
    const res = await fetch("/api/builder-kpis", {
      credentials: "include",
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const all = data.map((k: Record<string, unknown>) => ({
      kpi: k.kpi as string,
      name: k.name as string,
      variable: (k.variables as Record<string, unknown>[] | undefined)?.[0]?.variable as string ?? "",
      variables: (k.variables as Record<string, unknown>[] | undefined)?.map((v) => ({
        variable: v.variable as string,
        endpoint: v.endpoint as string,
        variable_key: v.variable_key as string | undefined,
        fn: v.fn as string | undefined,
      })),
      formula: k.formula as KpiSeed['formula'],
      formula_readable: k.formula_readable as string | undefined,
      cible_operator: k.target_operator as string | undefined,
      cible_value: k.target_value as number | null | undefined,
      cible_is_percentage: k.target_is_percentage as boolean | undefined,
      refresh_frequency: k.refresh_frequency as string | undefined,
      module: k.module as string | undefined,
    }));
    // Deduplicate by kpi code
    const seen = new Set<string>();
    cachedKpis = all.filter((k: KpiSeed) => {
      if (seen.has(k.kpi)) return false;
      seen.add(k.kpi);
      return true;
    });
    return cachedKpis!;
  } catch {
    return [];
  }
}

export type KpiDataResponse = {
  scalar_value: number | null;
  status: string;
  mapped_rows: Record<string, unknown>[] | null;
  filter_options: Record<string, string[]>;
  computed_at: string | null;
};

export async function fetchKpiData(codes: string[]): Promise<Record<string, KpiDataResponse>> {
  if (codes.length === 0) return {};
  try {
    const res = await fetch(`/api/builder-kpis/data?codes=${encodeURIComponent(codes.join(","))}`, {
      credentials: "include",
      headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}
