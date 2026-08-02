import { useMemo } from "react";
import type { EndpointDataset } from "@/lib/v6/datasets";
import { compileMeasure, validateMeasureExpression, type Row } from "@/lib/v6/model";
import { useBuilder } from "../store";
import type { WidgetConfig } from "../types";
import {
  aggregateDataset,
  aggregateDatasetMulti,
  aggregateLegendSeries,
  aggregateScatter,
  fieldAggregation,
  valueFieldLabel,
  type AggregatedRow,
  type LegendSeries,
  type MultiAggregatedRow,
  type ScatterPoint,
  type ValueField,
} from "./aggregate";

export { aggregateDataset, aggregateDatasetMulti, valueFieldLabel, fieldAggregation } from "./aggregate";
export type { AggregatedRow, MultiAggregatedRow, LegendSeries, ScatterPoint, ValueField } from "./aggregate";

const COLORS = ["#3b82f6", "#22c55e", "#ec4899", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#14b8a6"];

/** Source dataset for a value field: per-field override, falling back to the widget dataset. */
function valueSource(config: WidgetConfig, name: string): string {
  return config.dataValueSources?.[name] ?? config.datasetSlug ?? "";
}

// ─── Cross-dataset joins (ported from V5's lib/pbi/joins.ts, built from the datasets' own columns) ───

export type JoinParticipant = { slug: string; name: string };

type JoinEntry = { type: string; participants: JoinParticipant[] };

/** canonical (trimmed, lowercased) column name -> shared join column present in >= 2 datasets. */
type JoinRegistry = Record<string, JoinEntry>;

function canonical(name: string): string {
  return name.trim().toLowerCase();
}

export function buildJoinRegistry(datasets: EndpointDataset[]): JoinRegistry {
  const byKey = new Map<string, JoinEntry>();
  for (const ds of datasets) {
    for (const col of ds.columns ?? []) {
      const key = canonical(col.name);
      if (!key) continue;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { type: col.type, participants: [] };
        byKey.set(key, entry);
      }
      if (!entry.participants.some((p) => p.slug === ds.slug)) {
        entry.participants.push({ slug: ds.slug, name: col.name });
      }
    }
  }
  const registry: JoinRegistry = {};
  for (const [key, entry] of byKey) {
    if (entry.participants.length >= 2) registry[key] = entry;
  }
  return registry;
}

/** First shared join column linking two datasets, or null when unrelated. */
export function findJoin(
  registry: JoinRegistry,
  slugA: string,
  slugB: string,
): { colInA: string; colInB: string } | null {
  for (const entry of Object.values(registry)) {
    const a = entry.participants.find((p) => p.slug === slugA);
    const b = entry.participants.find((p) => p.slug === slugB);
    if (a && b) return { colInA: a.name, colInB: b.name };
  }
  return null;
}

/**
 * Attach foreign values onto the primary dataset's rows for every bound value
 * whose source differs from the primary and that shares a join column. Values
 * are written under their unique key (source::name). Many-to-one (fact ->
 * dimension) joins resolve naturally; one-to-many collapses to the first
 * matching value; a row with no match gets null.
 */
function enrichRows(
  primaryRows: Row[],
  valueFields: ValueField[],
  filteredRowsBySlug: Record<string, Row[]>,
  primarySlug: string,
  registry: JoinRegistry,
): Row[] {
  if (!primaryRows.length || !primarySlug) return primaryRows;
  const targets: { field: ValueField; join: { colInA: string; colInB: string } }[] = [];
  for (const vf of valueFields) {
    if (vf.isMeasure || !vf.source || vf.source === primarySlug) continue;
    const foreign = filteredRowsBySlug[vf.source];
    if (!foreign?.length) continue;
    const join = findJoin(registry, primarySlug, vf.source);
    if (!join) continue;
    targets.push({ field: vf, join });
  }
  if (!targets.length) return primaryRows;

  const lookups = targets.map(({ field, join }) => {
    const lookup = new Map<string, string | number | boolean | null>();
    for (const tr of filteredRowsBySlug[field.source] ?? []) {
      const key = String(tr[join.colInB]);
      if (!lookup.has(key)) lookup.set(key, (tr[field.name] as string | number | boolean | null) ?? null);
    }
    return lookup;
  });

  return primaryRows.map((r) => {
    const out = { ...r };
    targets.forEach(({ field, join }, i) => {
      const key = String(r[join.colInA]);
      out[field.key] = lookups[i]!.get(key) ?? null;
    });
    return out;
  });
}

/**
 * Reads the shared (already slicer-filtered) rows for the widget's dataset from
 * the store, then applies the active cross-filter — unless this widget was the
 * one that triggered it. Values bound to a different dataset are enriched onto
 * the primary rows via a shared join column (V5-style multi-endpoint support).
 */
export function useDatasetData(c: WidgetConfig, widgetId?: string): {
  rows: Row[];
  data: AggregatedRow[];
  multi: MultiAggregatedRow[];
  valueFields: ValueField[];
  loading: boolean;
  hasData: boolean;
  measureError: string | null;
  /** Legend-split series when config.dataLegend is bound (empty otherwise). */
  legendSeries: LegendSeries[];
  /** Scatter/bubble points when config.scatterX/scatterY are bound (empty otherwise). */
  scatterPoints: ScatterPoint[];
} {
  const { allMeasures, filteredRowsBySlug, rowsBySlug, datasets, crossFilter } = useBuilder();

  const valueNames = useMemo(() => {
    if (c.scatterX && c.scatterY) {
      const names = [c.scatterX, c.scatterY];
      if (c.scatterSize) names.push(c.scatterSize);
      return names;
    }
    if (c.dataValues?.length) return c.dataValues;
    return c.dataValue ? [c.dataValue] : [];
  }, [c.scatterX, c.scatterY, c.scatterSize, c.dataValues, c.dataValue]);

  const joinRegistry = useMemo(() => buildJoinRegistry(datasets), [datasets]);

  const valueFields = useMemo<ValueField[]>(() => {
    const names = allMeasures.map((m) => m.name);
    return valueNames.map((name) => {
      const source = valueSource(c, name);
      const ds = datasets.find((item) => item.slug === source);
      const isMeasure = allMeasures.some((m) => m.name === name) || !ds?.columns?.some((col) => col.name === name);
      const key = isMeasure || !source || source === c.datasetSlug ? name : `${source}::${name}`;
      let error: string | undefined;
      if (isMeasure) {
        const def = allMeasures.find((m) => m.name === name);
        if (def) {
          const columns = (ds?.columns ?? []).map((col) => col.name);
          const res = validateMeasureExpression(def.expression, columns, names);
          if (!res.ok) error = `${name}: ${res.error}`;
        }
      }
      return { name, key, label: valueFieldLabel(name, isMeasure, fieldAggregation(c, name)), isMeasure, source, error };
    });
  }, [valueNames, allMeasures, datasets, c]);

  /** First validation error across the bound measure fields (invalid formula, deleted column…). */
  const measureError = valueFields.find((vf) => vf.error)?.error ?? null;

  const measureFns = useMemo(() => {
    const map: Record<string, ((rows: Row[]) => number) | null> = {};
    for (const name of [...valueNames, ...(c.dataTooltips ?? [])]) {
      const measureDef = allMeasures.find((measure) => measure.name === name);
      map[name] = measureDef ? compileMeasure(measureDef.expression) : null;
    }
    return map;
  }, [allMeasures, valueNames, c.dataTooltips]);

  const rows = useMemo(() => {
    const base = (c.ignoreFilters ? rowsBySlug : filteredRowsBySlug)[c.datasetSlug ?? ""] ?? [];
    if (crossFilter?.mode !== "filter") return base;
    if (crossFilter.sourceId === widgetId || !c.datasetSlug) return base;
    const ds = datasets.find((item) => item.slug === c.datasetSlug);
    if (!ds?.columns?.some((col) => col.name === crossFilter.column)) return base;
    return base.filter((row) => String(row[crossFilter.column]) === crossFilter.value);
  }, [rowsBySlug, filteredRowsBySlug, c.ignoreFilters, c.datasetSlug, crossFilter, widgetId, datasets]);

  const enrichedRows = useMemo(
    () => enrichRows(rows, valueFields, filteredRowsBySlug, c.datasetSlug ?? "", joinRegistry),
    [rows, valueFields, filteredRowsBySlug, c.datasetSlug, joinRegistry],
  );

  const data = useMemo(() => {
    if (rows.length && c.dataValue) return aggregateDataset(rows, c, measureFns[c.dataValue] ?? null);
    return [];
  }, [rows, c, measureFns]);

  const multi = useMemo(() => {
    if (enrichedRows.length && valueNames.length) {
      return aggregateDatasetMulti(enrichedRows, c, measureFns, valueFields);
    }
    return [];
  }, [enrichedRows, c, valueNames, valueFields, measureFns]);

  const legendSeries = useMemo(() => {
    if (!enrichedRows.length || !c.dataLegend || !valueFields.length) return [];
    return aggregateLegendSeries(enrichedRows, c, measureFns, valueFields, c.dataLegend, COLORS);
  }, [enrichedRows, c, measureFns, valueFields]);

  const scatterPoints = useMemo(() => {
    if (!enrichedRows.length) return [];
    return aggregateScatter(enrichedRows, c, measureFns, valueFields, COLORS, c.dataLegend);
  }, [enrichedRows, c, measureFns, valueFields]);

  return { rows, data, multi, valueFields, loading: false, hasData: rows.length > 0, measureError, legendSeries, scatterPoints };
}

export { COLORS as DATASET_COLORS };
