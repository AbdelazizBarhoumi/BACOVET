import { useEffect, useRef, useState } from "react";
import { fetchKpiData } from "@/lib/kpi-rows";
import type { KpiDataMap } from "./widgets/shared";

const REFRESH_MS = 60_000;

export function useKpiData(kpiCodes: string[]): KpiDataMap {
  const [data, setData] = useState<KpiDataMap>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codesKey = [...new Set(kpiCodes)].sort().join(",");

  useEffect(() => {
    const codes = [...new Set(kpiCodes)];
    if (codes.length === 0) {
      setData(new Map());
      return;
    }

    let cancelled = false;

    async function load() {
      const result = await fetchKpiData(codes);
      if (cancelled) return;
      setData(new Map(Object.entries(result)));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codesKey]);

  return data;
}
