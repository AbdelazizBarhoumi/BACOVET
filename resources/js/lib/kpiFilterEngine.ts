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
  chart_config?: ChartConfig | null;
  extra_filters?: FilterConfig[] | null;
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
  label?: string;
}

export interface ChartConfig {
  x_axis_key?: string;
  y_axis_key?: string;
  legend_x?: string;
  legend_y?: string;
  value_key?: string;
  bar_color?: string;
  line_color?: string;
  gradient?: boolean;
  tooltip_format?: string;
  tooltip_keys?: string[];
  aggregation?: string;
  sort_by?: string;
  max_items?: number;
  show_reference_line?: boolean;
  reference_line_label?: string;
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
  chart_config?: ChartConfig | null;
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
 * When extraFilters is set, always returns array for row-by-row chart computation.
 */
function computeVariableValue(
  variable: KpiVariable,
  filteredRaw: Record<string, unknown>[],
  extraFilters?: FilterConfig[] | null,
): number | string | Record<string, unknown>[] | null {
  const vk = variable.variable_key;
  if (!vk) return null;

  if (variable.variable_type === "Direct") {
    if (!filteredRaw.length) return null;
    const val = filteredRaw[0][vk];
    return val != null ? String(val) : null;
  }

  // Complex type
  const values = filteredRaw.map((r) => r[vk]).filter((v) => v != null);

  if (variable.has_function) {
    return aggregate(values, variable.fn as AggFn) as number;
  }

  // has_function=false, no filter → return array (for charts etc.)
  if (!variable.filter_key || !values.length) {
    return values.map((v) => ({ [vk]: v }));
  }

  // has_function=false + has filter_key:
  // If extra filters exist → return full array (row-by-row chart needs per-row data)
  if (extraFilters?.length) {
    return filteredRaw.map((r) => ({ [vk]: r[vk] }));
  }

  // No extra filters → return scalar (latest value) for single-value display
  const last = values[values.length - 1];
  return typeof last === "number" ? last : Number(last) || null;
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

/**
 * Compute formula for a single row of scalar values (row-by-row path).
 */
function computeFormulaScalar(
  items: FormulaItem[],
  values: (number | string | null)[],
): number | string | null {
  let result: number | null = null;
  let operator: string | null = null;
  let varIndex = 0;

  for (const item of items) {
    if (item.type === "variable") {
      const rawVal = varIndex < values.length ? values[varIndex] : null;
      varIndex++;
      if (rawVal === null) return null;
      const numVal = typeof rawVal === "number" ? rawVal : Number(rawVal);
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

  // 1. For each variable: apply auto-generated filters → compute value
  // Extra filters are applied AFTER row-by-row computation (display-only).
  const computedValues: (number | string | Record<string, unknown>[] | null)[] = [];
  const filteredRawArrays: Record<string, unknown>[][] = [];

  // Build a set of columns already covered by extra filters (skip auto-generated for these)
  const extraFilterColumns = new Set(
    (kpi.extra_filters ?? []).map((ef) => ef.key).filter(Boolean),
  );

  for (const variable of variables) {
    if (!variable.variable_key) {
      computedValues.push(null);
      filteredRawArrays.push([]);
      continue;
    }

    let raw = variable.raw_data ?? [];

    // Apply per-variable auto-generated filter only
    // Skip if an extra filter already covers this column
    const varFk = variable.filter_key;
    if (varFk && !extraFilterColumns.has(varFk)) {
      const fv = activeFilters[varFk];
      if (fv && raw.length) {
        raw = raw.filter((row) => String(row[varFk] ?? "").trim() === fv);
      }
    }

    filteredRawArrays.push(raw);
    computedValues.push(computeVariableValue(variable, raw, kpi.extra_filters));
  }

  // 2. Apply formula or use first variable's value
  let finalValue: number | string | Record<string, unknown>[] | null = null;

  if (formula?.items?.length && computedValues.some((v) => v != null)) {
    const hasArrayVar = computedValues.some((v) => Array.isArray(v));

    if (hasArrayVar && filteredRawArrays.length >= 2) {
      // Row-by-row: JOIN raw_data arrays on shared keys, then compute formula per merged row
      // Find shared keys across all variables' raw_data (e.g., EmployeeNo, ProdGroup)
      const allKeys = filteredRawArrays.map((raw) =>
        raw.length > 0 ? Object.keys(raw[0] ?? {}) : [],
      );
      const sharedKeys = allKeys[0]?.filter((k) =>
        allKeys.every((keys) => keys.includes(k)),
      ) ?? [];
      // Use the first shared key as join key (e.g., EmployeeNo)
      // Prefer filter_key as join key (it uniquely identifies a row, e.g. EmployeeNo)
      // Fall back to first shared key that isn't a variable_key
      const joinKey = sharedKeys.find((k) =>
        variables.some((v) => v.filter_key === k),
      ) ?? sharedKeys.find((k) =>
        variables.every((v) => v.variable_key !== k),
      ) ?? sharedKeys[0];

      if (joinKey) {
        // Build lookup from first variable's raw_data (trim join key values)
        const lookup = new Map<string, Record<string, unknown>>();
        for (const row of filteredRawArrays[0]) {
          const key = String(row[joinKey] ?? "").trim();
          if (key) lookup.set(key, row);
        }
        // For each row in the last variable, find matching row and merge
        const rowResults: Record<string, unknown>[] = [];
        for (const row of filteredRawArrays[filteredRawArrays.length - 1]) {
          const key = String(row[joinKey] ?? "").trim();
          const match = lookup.get(key);
          if (!match) continue;

          // Extract each variable's value from the merged row
          const rowValues: (number | string | null)[] = [];
          for (const variable of variables) {
            const vk = variable.variable_key;
            const v = vk ? (match[vk] ?? row[vk]) : null;
            rowValues.push(v != null ? Number(v) : null);
          }

          const rowResult = computeFormulaScalar(formula.items, rowValues);
          // Build record: joinKey first (for chart X-axis label), then other shared keys, then value
          const record: Record<string, unknown> = {};
          // Join key first (EmployeeNo) — ensures detectLabelKey picks it for X-axis
          record[joinKey] = typeof match[joinKey] === "string" ? String(match[joinKey]).trim() : match[joinKey] ?? key;
          // Then other shared keys (ProdGroup, EmployeeName, etc.)
          for (const sk of sharedKeys) {
            if (sk === joinKey) continue;
            const v = match[sk] ?? row[sk];
            record[sk] = typeof v === "string" ? v.trim() : v;
          }
          record.value = rowResult;
          rowResults.push(record);
        }
        // Attach join key metadata for chart X-axis label
        (rowResults as any)._xKey = joinKey;
        finalValue = rowResults;
      } else {
        // No shared keys — fall back to index-based (same endpoint assumption)
        const rowCount = Math.max(...filteredRawArrays.map((r) => r.length));
        const rowResults: Record<string, unknown>[] = [];
        for (let i = 0; i < rowCount; i++) {
          const rowValues: (number | string | null)[] = [];
          for (let vi = 0; vi < variables.length; vi++) {
            const raw = filteredRawArrays[vi];
            const vk = variables[vi].variable_key;
            if (raw[i] && vk) {
              const v = raw[i][vk];
              rowValues.push(v != null ? Number(v) : null);
            } else {
              rowValues.push(null);
            }
          }
          const rowResult = computeFormulaScalar(formula.items, rowValues);
          const labelRow = filteredRawArrays[0][i] ?? {};
          const labelKey = Object.keys(labelRow).find((k) => k !== variables[0]?.variable_key) ?? "name";
          rowResults.push({
            [labelKey]: labelRow[labelKey] ?? `#${i + 1}`,
            value: rowResult,
          });
        }
        finalValue = rowResults;
      }
    } else {
      finalValue = computeFormula(formula.items, computedValues);
    }
  } else if (computedValues.some((v) => v != null)) {
    finalValue = computedValues[0];
  }

  // 3. Apply extra filters to the result (display-only, after computation)
  if (finalValue && Array.isArray(finalValue) && kpi.extra_filters?.length) {
    let filtered = finalValue;
    for (const ef of kpi.extra_filters) {
      const fv = activeFilters[ef.key];
      if (fv) {
        filtered = filtered.filter((row) => {
          const rowVal = (row as Record<string, unknown>)[ef.key];
          return rowVal != null && String(rowVal).trim() === fv;
        });
      }
    }
    finalValue = filtered;
  }

  // 4. Compute status
  const numericValue = typeof finalValue === "number" ? finalValue
    : typeof finalValue === "string" ? Number(finalValue)
    : null;

  const status = computeStatus(numericValue, target_operator, target_value);

  // 5. Build filter configs (from original raw data, unfiltered) — merge options across variables
  const filterConfigMap = new Map<string, { options: string[]; label?: string }>();
  for (const variable of variables) {
    if (variable.is_filtered && variable.filter_key) {
      const raw = variable.raw_data ?? [];
      if (raw.length && Object.keys(raw[0] ?? {}).includes(variable.filter_key)) {
        const opts = [...new Set(raw.map((r) => String(r[variable.filter_key!] ?? "").trim()).filter(Boolean))].sort();
        const existing = filterConfigMap.get(variable.filter_key);
        if (existing) {
          existing.options = [...new Set([...existing.options, ...opts])].sort();
        } else {
          filterConfigMap.set(variable.filter_key, { options: opts });
        }
      }
    }
  }
  const filterConfigs = [...filterConfigMap.entries()].map(([key, { options, label }]) => ({ key, options, label }));

  // 6. When extra_filters exist, suppress auto-generated filters for same keys
  if (kpi.extra_filters?.length) {
    const extraKeys = new Set(kpi.extra_filters.map((ef) => ef.key));
    // Remove auto-generated entries that extra filters already cover
    for (const ef of kpi.extra_filters) {
      const idx = filterConfigs.findIndex((fc) => fc.key === ef.key);
      if (idx !== -1) filterConfigs.splice(idx, 1);
    }
    // Add extra filters (with their own options from raw_data)
    for (const ef of kpi.extra_filters) {
      // Extract options from raw_data if not provided
      let options = ef.options ?? [];
      if (!options.length) {
        const allRaw = variables.flatMap((v) => v.raw_data ?? []);
        if (allRaw.length && ef.key) {
          options = [...new Set(allRaw.map((r) => String(r[ef.key] ?? "").trim()).filter(Boolean))].sort();
        }
      }
      filterConfigs.push({ key: ef.key, options, label: ef.label });
    }
  }

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
    chart_config: kpi.chart_config ?? null,
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
