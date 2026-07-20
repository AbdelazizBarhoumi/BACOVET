/**
 * KPI Filter Engine — pure functions for frontend-side filtering, aggregation, and computation.
 * No side effects. No API calls. All logic is deterministic given inputs.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type AggFn = "Latest" | "First" | "Sum" | "Average" | "Min" | "Max" | "Count";

export interface KpiVariable {
  variable_key: string | null;
  variable_type: string;
  has_function: boolean;
  fn: string;
  endpoint: string | null;
  is_filtered: boolean;
  filter_key: string | null;
  raw_data: Record<string, unknown>[] | null;
}

export interface KpiConfig {
  kpi_code: string;
  name: string;
  variables: KpiVariable[];
  formula: { items: FormulaItem[] } | null;
  formula_readable: string | null;
  target_operator: string | null;
  target_value: number | null;
  target_is_percentage: boolean;
  target_readable: string | null;
  graph_types: string[] | null;
  highlight_color: string | null;
  filter_configs: FilterConfig[];
  raw_data: Record<string, unknown>[] | null;
}

export interface FormulaItem {
  type: "variable" | "operator" | "number";
  ref?: number;
  op?: string;
  value?: number;
}

export interface FilterConfig {
  key: string;
  options: string[];
}

export interface ComputedKpi {
  kpi_code: string;
  name: string;
  value: number | string | Record<string, unknown>[] | null;
  status: string;
  target_operator: string | null;
  target_value: number | null;
  target_is_percentage: boolean;
  target_readable: string | null;
  graph_types: string[] | null;
  highlight_color: string | null;
  filter_configs: FilterConfig[];
  raw_data: Record<string, unknown>[] | null;
  filter_key: string | null;
  filter_options: string[] | null;
  filters: FilterConfig[];
}

// ── Aggregation ────────────────────────────────────────────────────────────

export function aggregate(values: unknown[], fn: AggFn): unknown {
  const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  switch (fn) {
    case "First": return values[0] ?? null;
    case "Latest": return values[values.length - 1] ?? null;
    case "Count": return values.length;
    case "Sum": return nums.reduce((a, b) => a + b, 0);
    case "Average": return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case "Min": return nums.length ? Math.min(...nums) : null;
    case "Max": return nums.length ? Math.max(...nums) : null;
    default: return values[values.length - 1] ?? null;
  }
}

// ── Filter Application ─────────────────────────────────────────────────────

/**
 * Apply active filter to a variable's raw data.
 * Each variable is standalone — it filters its own raw_data using its own filter_key.
 * No cross-variable joins.
 */
export function applyFilters(
  variable: KpiVariable,
  activeFilters: Record<string, string>,
): Record<string, unknown>[] {
  const raw = variable.raw_data ?? [];
  if (!raw.length) return raw;

  const fk = variable.filter_key;
  if (!fk) return raw;

  const fv = activeFilters[fk];
  if (!fv) return raw;

  return raw.filter((row) => String(row[fk] ?? "") === fv);
}

// ── Value Computation ──────────────────────────────────────────────────────

/**
 * Compute a single variable's value from its raw data.
 * Returns a scalar (if has_function) or an array.
 */
function computeVariableValue(
  variable: KpiVariable,
  filteredRaw: Record<string, unknown>[],
): number | string | Record<string, unknown>[] | null {
  const vk = variable.variable_key;
  if (!vk) return null;

  if (variable.variable_type === "Direct") {
    // For Direct type, take first row's value
    if (!filteredRaw.length) return null;
    const val = filteredRaw[0][vk];
    return val != null ? String(val) : null;
  }

  // Complex type
  const values = filteredRaw.map((r) => r[vk]).filter((v) => v != null);

  if (variable.has_function) {
    return aggregate(values, variable.fn as AggFn) as number;
  }

  // has_function=false but has filter_key → return scalar (latest value)
  // This handles KPIs like F-REQ-211 where the config lacks has_function
  // but the card needs a single number, not an array
  if (variable.filter_key && values.length > 0) {
    const last = values[values.length - 1];
    return typeof last === "number" ? last : Number(last) || null;
  }

  // has_function=false, no filter → return array (for charts etc.)
  return values.map((v) => ({ [vk]: v }));
}

// ── Formula Computation ────────────────────────────────────────────────────

/**
 * Compute formula value from items and variable values.
 * Variables are matched positionally to the config variables array.
 */
function computeFormula(
  items: FormulaItem[],
  variableValues: (number | string | Record<string, unknown>[] | null)[],
): number | string | null {
  let result: number | null = null;
  let operator: string | null = null;
  let varIndex = 0;

  for (const item of items) {
    if (item.type === "variable") {
      let rawVal = varIndex < variableValues.length ? variableValues[varIndex] : null;
      varIndex++;

      if (rawVal === null) return null;
      let numVal: number;
      if (Array.isArray(rawVal)) {
        // Row-by-row: for scalar formula, use first element
        const first = rawVal.length > 0 ? rawVal[0] : null;
        if (first === null || typeof first !== "object") return null;
        const firstVal = Object.values(first as Record<string, unknown>)[0];
        numVal = firstVal != null ? Number(firstVal) : NaN;
      } else {
        numVal = typeof rawVal === "number" ? rawVal : Number(rawVal);
      }
      if (isNaN(numVal)) return null;

      if (result === null) {
        result = numVal;
      } else if (operator !== null) {
        switch (operator) {
          case "+": result = result + numVal; break;
          case "-": result = result - numVal; break;
          case "*": result = result * numVal; break;
          case "/": result = numVal !== 0 ? result / numVal : null; break;
        }
        operator = null;
      }
    } else if (item.type === "operator") {
      operator = item.op ?? null;
    } else if (item.type === "number") {
      const numVal = item.value ?? 0;
      if (operator !== null && result !== null) {
        switch (operator) {
          case "+": result = result + numVal; break;
          case "-": result = result - numVal; break;
          case "*": result = result * numVal; break;
          case "/": result = numVal !== 0 ? result / numVal : null; break;
        }
        operator = null;
      } else if (result === null) {
        result = numVal;
      }
    }
  }

  return result;
}

// ── Status Computation ─────────────────────────────────────────────────────

export function computeStatus(
  value: number | string | null,
  targetOperator: string | null,
  targetValue: number | null,
): string {
  if (value == null || targetOperator == null || targetValue == null) return "grey";
  const val = typeof value === "number" ? value : Number(value);
  if (isNaN(val)) return "grey";
  const tgt = targetValue;

  switch (targetOperator) {
    case "<=": return val <= tgt ? "green" : val <= tgt * 1.1 ? "orange" : "red";
    case ">=": return val >= tgt ? "green" : val >= tgt * 0.9 ? "orange" : "red";
    case "<": return val < tgt ? "green" : "red";
    case ">": return val > tgt ? "green" : "red";
    case "=": return val === tgt ? "green" : "red";
    default: return "grey";
  }
}

// ── Main Computation Pipeline ──────────────────────────────────────────────

/**
 * Compute a single KPI's value from its config + raw data + active filters.
 * This is the main entry point for the frontend calculation engine.
 */
export function computeKpi(
  kpi: KpiConfig,
  activeFilters: Record<string, string>,
): ComputedKpi {
  const { variables, formula, target_operator, target_value } = kpi;

  // 1. For each variable: apply filters → compute value
  const computedValues: (number | string | Record<string, unknown>[] | null)[] = [];
  const filteredRawArrays: Record<string, unknown>[][] = [];

  for (const variable of variables) {
    if (!variable.variable_key) {
      computedValues.push(null);
      filteredRawArrays.push([]);
      continue;
    }

    const filteredRaw = applyFilters(variable, activeFilters);
    filteredRawArrays.push(filteredRaw);
    computedValues.push(computeVariableValue(variable, filteredRaw));
  }

  // 2. Apply formula or use first variable's value
  let finalValue: number | string | Record<string, unknown>[] | null = null;

  if (formula?.items?.length && computedValues.some((v) => v != null)) {
    // Check for row-by-row computation
    const hasArrayVar = computedValues.some((v) => Array.isArray(v));

    if (hasArrayVar && filteredRawArrays.length >= 2) {
      // Row-by-row: for now, fall back to first variable's value
      // TODO: implement full row-by-row formula computation
      finalValue = computedValues[0];
    } else {
      finalValue = computeFormula(formula.items, computedValues);
    }
  } else if (computedValues.some((v) => v != null)) {
    finalValue = computedValues[0];
  }

  // 3. Compute status
  const numericValue = typeof finalValue === "number" ? finalValue
    : typeof finalValue === "string" ? Number(finalValue)
    : null;

  const status = computeStatus(numericValue, target_operator, target_value);

  // 4. Build filter configs (from original raw data, unfiltered) — merge options across variables
  const filterConfigMap = new Map<string, string[]>();
  for (const variable of variables) {
    if (variable.is_filtered && variable.filter_key) {
      const raw = variable.raw_data ?? [];
      if (raw.length && Object.keys(raw[0] ?? {}).includes(variable.filter_key)) {
        const opts = [...new Set(raw.map((r) => String(r[variable.filter_key!] ?? "")).filter(Boolean))].sort();
        const existing = filterConfigMap.get(variable.filter_key) ?? [];
        filterConfigMap.set(variable.filter_key, [...new Set([...existing, ...opts])].sort());
      }
    }
  }
  const filterConfigs = [...filterConfigMap.entries()].map(([key, options]) => ({ key, options }));

  return {
    kpi_code: kpi.kpi_code,
    name: kpi.name,
    value: finalValue,
    status,
    target_operator,
    target_value,
    target_is_percentage: kpi.target_is_percentage,
    target_readable: kpi.target_readable,
    graph_types: kpi.graph_types,
    highlight_color: kpi.highlight_color,
    filter_configs: filterConfigs,
    raw_data: filteredRawArrays[0]?.length ? filteredRawArrays[0] : kpi.raw_data,
    filter_key: filterConfigs[0]?.key ?? null,
    filter_options: filterConfigs[0]?.options ?? null,
    filters: filterConfigs,
  };
}

/**
 * Compute all KPIs for a module.
 */
export function computeAllKpis(
  kpis: KpiConfig[],
  activeFilters: Record<string, string>,
): ComputedKpi[] {
  return kpis.map((kpi) => computeKpi(kpi, activeFilters));
}
