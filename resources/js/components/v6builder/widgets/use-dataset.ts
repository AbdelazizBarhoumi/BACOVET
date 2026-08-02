import { useMemo } from "react";
import type { EndpointDataset } from "@/lib/pbi/datasets";
import { compileMeasure, type Row } from "@/lib/pbi/model";
import { useBuilder } from "../store";
import type { Agg, WidgetConfig } from "../types";

export type AggregatedRow = { name: string; value: number; x: number; y: number };

export type MultiAggregatedRow = AggregatedRow & {
  /** One entry per value field, keyed by its unique key (source::name for foreign values). */
  values: Record<string, number>;
};

export type ValueField = {
  name: string;
  /** Unique key used to index `values`: plain name for primary/measure values, `source::name` for foreign ones. */
  key: string;
  label: string;
  isMeasure: boolean;
  /** Source dataset slug this value is resolved against (falls back to the widget dataset). */
  source: string;
};

const COLORS = ["#3b82f6", "#22c55e", "#ec4899", "#f59e0b", "#a855f7", "#06b6d4", "#ef4444", "#14b8a6"];

const AGG_PREFIX: Record<string, string> = {
  sum: "Sum of",
  avg: "Average of",
  count: "Count of",
  distinct: "Distinct count of",
  min: "Min of",
  max: "Max of",
};

/** Display label for a value field: measures keep their name, columns get an aggregation prefix (like V5). */
export function valueFieldLabel(name: string, isMeasure: boolean, agg: string): string {
  if (isMeasure) return name;
  return `${AGG_PREFIX[agg] ?? "Sum of"} ${name}`;
}

/** Per-field aggregation override, falling back to the global config aggregation. */
export function fieldAggregation(config: WidgetConfig, name: string): Agg {
  return config.dataAggregations?.[name] ?? config.dataAggregation ?? "sum";
}

/** Source dataset for a value field: per-field override, falling back to the widget dataset. */
export function valueSource(config: WidgetConfig, name: string): string {
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

function aggregateValues(values: Row[], config: WidgetConfig, measureFns: Record<string, ((rows: Row[]) => number) | null>, valueFields: ValueField[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const vf of valueFields) {
    const agg = fieldAggregation(config, vf.name);
    const fn = measureFns[vf.name];
    if (fn) {
      out[vf.key] = fn(values) ?? 0;
      continue;
    }
    const numeric = values
      .map((row) => Number(row[vf.key]))
      .filter((number) => Number.isFinite(number));
    out[vf.key] = agg === "count"
      ? numeric.length
      : agg === "avg"
        ? (numeric.length ? numeric.reduce((sum, item) => sum + item, 0) / numeric.length : 0)
        : agg === "min"
          ? (numeric.length ? Math.min(...numeric) : 0)
          : agg === "max"
            ? (numeric.length ? Math.max(...numeric) : 0)
            : agg === "distinct"
              ? new Set(numeric).size
              : numeric.reduce((sum, item) => sum + item, 0);
  }
  return out;
}

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
    const agg = fieldAggregation(config, value);
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

/** Multi-value aggregation: one { name, values } row per axis group, with a value per bound field. */
export function aggregateDatasetMulti(rows: Row[], config: WidgetConfig, measureFns: Record<string, ((rows: Row[]) => number) | null>, valueFields: ValueField[]): MultiAggregatedRow[] {
  if (!valueFields.length) return [];
  const axis = config.dataAxis;
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = String(axis ? row[axis] ?? "(vide)" : "Total");
    const values = groups.get(key) ?? [];
    values.push(row);
    groups.set(key, values);
  }
  return [...groups.entries()].map(([name, values]) => {
    const perField = aggregateValues(values, config, measureFns, valueFields);
    const first = valueFields[0]!.key;
    return { name, value: perField[first] ?? 0, x: Number(name) || 0, y: perField[first] ?? 0, values: perField };
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
} {
  const { measures, filteredRowsBySlug, datasets, crossFilter } = useBuilder();

  const valueNames = useMemo(() => {
    if (c.dataValues?.length) return c.dataValues;
    return c.dataValue ? [c.dataValue] : [];
  }, [c.dataValues, c.dataValue]);

  const joinRegistry = useMemo(() => buildJoinRegistry(datasets), [datasets]);

  const valueFields = useMemo<ValueField[]>(() => {
    return valueNames.map((name) => {
      const source = valueSource(c, name);
      const ds = datasets.find((item) => item.slug === source);
      const isMeasure = measures.some((m) => m.name === name) || !ds?.columns?.some((col) => col.name === name);
      const key = isMeasure || !source || source === c.datasetSlug ? name : `${source}::${name}`;
      return { name, key, label: valueFieldLabel(name, isMeasure, fieldAggregation(c, name)), isMeasure, source };
    });
  }, [valueNames, measures, datasets, c]);

  const measureFns = useMemo(() => {
    const map: Record<string, ((rows: Row[]) => number) | null> = {};
    for (const name of valueNames) {
      const measureDef = measures.find((measure) => measure.name === name);
      map[name] = measureDef ? compileMeasure(measureDef.expression) : null;
    }
    return map;
  }, [measures, valueNames]);

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

  return { rows, data, multi, valueFields, loading: false, hasData: rows.length > 0 };
}

export { COLORS as DATASET_COLORS };
