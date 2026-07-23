import { useEffect, useMemo, useRef, useState } from "react";
import { fetchKpiData } from "@/lib/kpi-rows";
import type { KpiDataMap } from "./widgets/shared";

const REFRESH_MS = 60_000;

type UseKpiDataResult = {
  data: KpiDataMap;
  loading: boolean;
};

export function useKpiData(kpiCodes: string[], refreshKey: number = 0): UseKpiDataResult {
  const [data, setData] = useState<KpiDataMap>(new Map());
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codesKey = useMemo(() => [...new Set(kpiCodes)].sort().join(","), [kpiCodes]);

  useEffect(() => {
    const codes = [...new Set(kpiCodes)];
    if (codes.length === 0) {
      setData(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await fetchKpiData(codes);
      if (cancelled) return;
      setData(new Map(Object.entries(result)));
      setLoading(false);
    }

    load();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [codesKey, refreshKey]);

  return { data, loading };
}
