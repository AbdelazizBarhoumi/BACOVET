import { useMemo } from "react";
import { compileMeasure, type Row } from "@/lib/pbi/model";
import { useBuilder } from "../store";
import type { WidgetConfig } from "../types";

export type AggregatedRow = { name: string; value: number; x: number; y: number };

const COLORS = ["#3b82f6", "#22c55e", "#ec4899", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#14b8a6"];

export function aggregateDataset(rows: Row[], config: WidgetConfig, measureFn: ((rows: Row[]) => number) | null): AggregatedRow[] {
  const axis = config.dataAxis;
  const value = config.dataValue!;
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = String(axis ? row[axis] ?? "(vide)" : "Total");
    const values = groups.get(key) ?? [];
    values.push(row);
    groups.set(key, values);
  }
  return [...groups.entries()].map(([name, values]) => {
    const agg = config.dataAggregation ?? "sum";
    const numericValues = measureFn
      ? [measureFn(values)]
      : values
          .map((row) => Number(row[value]))
          .filter((number) => Number.isFinite(number));
    const result = measureFn
      ? numericValues[0] ?? 0
      : agg === "count"
        ? numericValues.length
        : agg === "avg"
          ? (numericValues.length ? numericValues.reduce((sum, item) => sum + item, 0) / numericValues.length : 0)
          : agg === "min"
            ? (numericValues.length ? Math.min(...numericValues) : 0)
            : agg === "max"
              ? (numericValues.length ? Math.max(...numericValues) : 0)
              : agg === "distinct"
                ? new Set(numericValues).size
                : numericValues.reduce((sum, item) => sum + item, 0);
    return { name, value: result, x: Number(name) || 0, y: result };
  });
}

/**
 * Reads the shared (already slicer-filtered) rows for the widget's dataset from
 * the store, then applies the active cross-filter — unless this widget was the
 * one that triggered it.
 */
export function useDatasetData(c: WidgetConfig, widgetId?: string): {
  rows: Row[];
  data: AggregatedRow[];
  loading: boolean;
  hasData: boolean;
} {
  const { measures, filteredRowsBySlug, datasets, crossFilter } = useBuilder();

  const measureDef = useMemo(() => measures.find((measure) => measure.name === c.dataValue), [measures, c.dataValue]);
  const measureFn = useMemo(() => (measureDef ? compileMeasure(measureDef.expression) : null), [measureDef]);

  const rows = useMemo(() => {
    let out = filteredRowsBySlug[c.datasetSlug ?? ""] ?? [];
    if (crossFilter && crossFilter.sourceId !== widgetId && c.datasetSlug) {
      const ds = datasets.find((item) => item.slug === c.datasetSlug);
      if (ds?.columns?.some((col) => col.name === crossFilter.column)) {
        out = out.filter((row) => String(row[crossFilter.column]) === crossFilter.value);
      }
    }
    return out;
  }, [filteredRowsBySlug, c.datasetSlug, crossFilter, widgetId, datasets]);

  const data = useMemo(() => {
    if (rows.length && c.dataValue) return aggregateDataset(rows, c, measureFn);
    return [];
  }, [rows, c, measureFn]);

  return { rows, data, loading: false, hasData: rows.length > 0 };
}

export { COLORS as DATASET_COLORS };
