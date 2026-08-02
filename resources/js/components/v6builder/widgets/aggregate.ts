import type { Row } from "@/lib/v6/model";
import type { Agg, WidgetConfig } from "../types";

/** Bucket label for categories beyond the top-N cap (and legend values beyond the series cap). */
export const AUTRES_LABEL = "Autres";
export const MAX_LEGEND_VALUES = 20;
export const DEFAULT_MAX_CATEGORIES = 50;

export type AggregatedRow = { name: string; value: number; x: number; y: number };

export type MultiAggregatedRow = AggregatedRow & {
  /** One entry per value field, keyed by its unique key (source::name for foreign values). */
  values: Record<string, number>;
  /** Extra tooltip fields (config.dataTooltips), default-aggregated per axis group. */
  tips: Record<string, string | number>;
};

export type ValueField = {
  name: string;
  /** Unique key used to index `values`: plain name for primary/measure values, `source::name` for foreign ones. */
  key: string;
  label: string;
  isMeasure: boolean;
  /** Source dataset slug this value is resolved against (falls back to the widget dataset). */
  source: string;
  /** Measure validation error (invalid formula, deleted column…). */
  error?: string;
};

/** One series for a chart: a legend value (or a bound value field) drawn across the axis. */
export type LegendSeries = {
  name: string;
  label: string;
  color: string;
  data: { x: string; v: number }[];
};

/** A rendered scatter/bubble point. */
export type ScatterPoint = {
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
};

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

function numericValues(values: Row[], key: string): number[] {
  return values.map((row) => Number(row[key])).filter((number) => Number.isFinite(number));
}

/** Reduce a set of rows to a single scalar for a plain column using an Agg. Never throws. */
export function aggregateGroup(values: Row[], key: string, agg: Agg): number {
  const nums = numericValues(values, key);
  if (agg === "count") return nums.length;
  if (agg === "avg") return nums.length ? nums.reduce((sum, item) => sum + item, 0) / nums.length : 0;
  if (agg === "min") return nums.length ? Math.min(...nums) : 0;
  if (agg === "max") return nums.length ? Math.max(...nums) : 0;
  if (agg === "distinct") return new Set(nums).size;
  return nums.reduce((sum, item) => sum + item, 0);
}

/** Evaluate a compiled measure over a set of rows; invalid/unknown measures yield 0. */
export function measureValue(values: Row[], fn: ((rows: Row[]) => number) | null): number {
  if (!fn) return 0;
  const value = fn(values);
  return Number.isFinite(value) ? value : 0;
}

/** Single scalar for one bound field (measure fn wins, then the plain column aggregation). */
export function fieldValue(values: Row[], vf: ValueField, config: WidgetConfig, measureFns: Record<string, ((rows: Row[]) => number) | null>): number {
  return vf.isMeasure
    ? measureValue(values, measureFns[vf.name] ?? null)
    : aggregateGroup(values, vf.key, fieldAggregation(config, vf.name));
}

export function aggregateValues(
  values: Row[],
  config: WidgetConfig,
  measureFns: Record<string, ((rows: Row[]) => number) | null>,
  valueFields: ValueField[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const vf of valueFields) {
    out[vf.key] = fieldValue(values, vf, config, measureFns);
  }
  return out;
}

/** Primary contribution of a single row used for ordering categories/legend values. */
function rowValue(row: Row, valueFields: ValueField[], measureFns: Record<string, ((rows: Row[]) => number) | null>, config: WidgetConfig): number {
  const vf = valueFields[0];
  if (!vf) return 0;
  return fieldValue([row], vf, config, measureFns);
}

function axisKey(config: WidgetConfig, row: Row): string {
  return config.dataAxis ? String(row[config.dataAxis] ?? "(vide)") : "Total";
}

function groupRows(rows: Row[], keyFn: (row: Row) => string): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const arr = groups.get(key) ?? [];
    arr.push(row);
    groups.set(key, arr);
  }
  return groups;
}

function sortedKeys(groups: Map<string, Row[]>, weight: (key: string) => number): string[] {
  return [...groups.keys()].sort((a, b) => weight(b) - weight(a));
}

/**
 * Ordered axis categories: sorted by the primary value total, capped at
 * maxCategories (default 50); everything beyond the cap is replaced by the
 * single "Autres" bucket appended at the end.
 */
export function orderedCategories(
  rows: Row[],
  config: WidgetConfig,
  measureFns: Record<string, ((rows: Row[]) => number) | null>,
  valueFields: ValueField[],
): string[] {
  if (!valueFields.length) return [];
  const cap = Math.max(1, config.maxCategories ?? DEFAULT_MAX_CATEGORIES);
  const groups = groupRows(rows, (row) => axisKey(config, row));
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = axisKey(config, row);
    totals.set(key, (totals.get(key) ?? 0) + rowValue(row, valueFields, measureFns, config));
  }
  const weight = (key: string) => totals.get(key) ?? 0;
  const top = sortedKeys(groups, weight).slice(0, cap);
  return groups.size > cap ? [...top, AUTRES_LABEL] : top;
}

/** Ordered legend values, capped at MAX_LEGEND_VALUES with an "Autres" bucket appended. */
function orderedLegendValues(
  rows: Row[],
  legendField: string,
  config: WidgetConfig,
  measureFns: Record<string, ((rows: Row[]) => number) | null>,
  valueFields: ValueField[],
): string[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = String(row[legendField] ?? "(vide)");
    totals.set(key, (totals.get(key) ?? 0) + rowValue(row, valueFields, measureFns, config));
  }
  const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key);
  const top = sorted.slice(0, MAX_LEGEND_VALUES);
  return sorted.length > MAX_LEGEND_VALUES ? [...top, AUTRES_LABEL] : top;
}

/** Default aggregation for a tooltip field: measures/numbers sum, everything else = first non-empty value. */
function aggregateTips(
  values: Row[],
  config: WidgetConfig,
  measureFns: Record<string, ((rows: Row[]) => number) | null>,
  tipFields: string[],
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!values.length) return out;
  for (const field of tipFields) {
    const fn = measureFns[field];
    if (fn) {
      out[field] = measureValue(values, fn);
      continue;
    }
    const nums = numericValues(values, field);
    if (nums.length) {
      out[field] = nums.reduce((sum, item) => sum + item, 0);
    } else {
      const first = values.find((row) => row[field] != null && String(row[field]).trim() !== "");
      out[field] = first != null && first[field] != null ? String(first[field]) : "";
    }
  }
  return out;
}

/** Single-value aggregation: one { name, value, x, y, tips } row per axis group (with category cap + "Autres"). */
export function aggregateDatasetMulti(
  rows: Row[],
  config: WidgetConfig,
  measureFns: Record<string, ((rows: Row[]) => number) | null>,
  valueFields: ValueField[],
): MultiAggregatedRow[] {
  if (!valueFields.length) return [];
  const order = orderedCategories(rows, config, measureFns, valueFields);
  const inOrder = new Set(order);
  const groups = groupRows(rows, (row) => {
    const key = axisKey(config, row);
    return inOrder.has(key) ? key : AUTRES_LABEL;
  });
  const tipFields = config.dataTooltips ?? [];
  return order.map((name) => {
    const values = groups.get(name) ?? [];
    const perField = aggregateValues(values, config, measureFns, valueFields);
    const first = valueFields[0]!.key;
    return {
      name,
      value: perField[first] ?? 0,
      x: Number(name) || 0,
      y: perField[first] ?? 0,
      values: perField,
      tips: aggregateTips(values, config, measureFns, tipFields),
    };
  });
}

/** Legacy single-value alias of aggregateDatasetMulti (kept for existing callers). */
export function aggregateDataset(
  rows: Row[],
  config: WidgetConfig,
  measureFn: ((rows: Row[]) => number) | null,
): AggregatedRow[] {
  const value = config.dataValue ?? config.dataValues?.[0];
  if (!value) return [];
  const valueFields: ValueField[] = [{
    name: value,
    key: value,
    label: value,
    isMeasure: !!measureFn,
    source: config.datasetSlug ?? "",
  }];
  const measureFns: Record<string, ((rows: Row[]) => number) | null> = { [value]: measureFn };
  return aggregateDatasetMulti(rows, config, measureFns, valueFields).map(({ name, value, x, y }) => ({ name, value, x, y }));
}

/**
 * Legend-split aggregation (Power-BI style): when config.dataLegend is bound,
 * each value field becomes one series per legend value (capped at
 * MAX_LEGEND_VALUES), colored cyclically. The axis still respects the
 * maxCategories cap. When multiple value fields are bound, the series label
 * combines both so legend names stay unique.
 */
export function aggregateLegendSeries(
  rows: Row[],
  config: WidgetConfig,
  measureFns: Record<string, ((rows: Row[]) => number) | null>,
  valueFields: ValueField[],
  legendField: string,
  colors: string[],
): LegendSeries[] {
  if (!valueFields.length || !legendField) return [];
  const order = orderedCategories(rows, config, measureFns, valueFields);
  const inOrder = new Set(order);
  const legendKeys = orderedLegendValues(rows, legendField, config, measureFns, valueFields);
  const legendSet = new Set(legendKeys);

  const buckets = new Map<string, Map<string, Row[]>>();
  for (const row of rows) {
    const lk = legendSet.has(String(row[legendField] ?? "(vide)")) ? String(row[legendField] ?? "(vide)") : AUTRES_LABEL;
    const ck = inOrder.has(axisKey(config, row)) ? axisKey(config, row) : AUTRES_LABEL;
    for (const vf of valueFields) {
      const bKey = `${lk}::${vf.key}`;
      const m = buckets.get(bKey) ?? new Map<string, Row[]>();
      const arr = m.get(ck) ?? [];
      arr.push(row);
      m.set(ck, arr);
      buckets.set(bKey, m);
    }
  }

  const multipleValues = valueFields.length > 1;
  const out: LegendSeries[] = [];
  legendKeys.forEach((lk, li) => {
    for (const vf of valueFields) {
      const m = buckets.get(`${lk}::${vf.key}`) ?? new Map<string, Row[]>();
      out.push({
        name: `${lk}::${vf.key}`,
        label: multipleValues ? `${lk} · ${vf.label}` : lk,
        color: colors[li % colors.length],
        data: order.map((ck) => ({ x: ck, v: fieldValue(m.get(ck) ?? [], vf, config, measureFns) })),
      });
    }
  });
  return out;
}

/**
 * Scatter/bubble aggregation. Requires explicit X/Y bindings (config.scatterX /
 * config.scatterY); optional size (config.scatterSize) drives bubble radius and
 * an optional legend colors points by legend value. Rows are grouped by axis
 * (single "Total" group when no axis is bound).
 */
export function aggregateScatter(
  rows: Row[],
  config: WidgetConfig,
  measureFns: Record<string, ((rows: Row[]) => number) | null>,
  valueFields: ValueField[],
  colors: string[],
  legendField?: string,
): ScatterPoint[] {
  const xf = valueFields.find((v) => v.name === config.scatterX);
  const yf = valueFields.find((v) => v.name === config.scatterY);
  if (!xf || !yf) return [];
  const sf = config.scatterSize ? valueFields.find((v) => v.name === config.scatterSize) : undefined;

  const legendKeys = legendField ? orderedLegendValues(rows, legendField, config, measureFns, valueFields) : [];
  const legendSet = new Set(legendKeys);

  const groups = groupRows(rows, (row) => {
    const axis = config.dataAxis ? String(row[config.dataAxis] ?? "(vide)") : "Total";
    if (!legendField) return axis;
    const lk = legendSet.has(String(row[legendField] ?? "(vide)")) ? String(row[legendField] ?? "(vide)") : AUTRES_LABEL;
    return `${axis}::${lk}`;
  });

  const points: ScatterPoint[] = [];
  for (const [key, vals] of groups) {
    const [axis, legend] = legendField ? key.split("::") as [string, string] : [key, null];
    points.push({
      name: legend ? `${axis} · ${legend}` : axis,
      x: fieldValue(vals, xf, config, measureFns),
      y: fieldValue(vals, yf, config, measureFns),
      size: sf ? fieldValue(vals, sf, config, measureFns) : 60,
      color: legend ? colors[(legendKeys.indexOf(legend) + colors.length) % colors.length] : colors[0],
    });
  }
  return points;
}
