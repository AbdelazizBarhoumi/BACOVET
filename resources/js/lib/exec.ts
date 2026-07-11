import type { DataMappingRow } from "@/services/dataMappingApi";

// -------- Types --------
export type AggFn = "Latest" | "First" | "Sum" | "Average" | "Min" | "Max" | "Count";
export type ExecState = "idle" | "loading" | "ok" | "error";

export const AGG_FNS: AggFn[] = ["Latest", "First", "Sum", "Average", "Min", "Max", "Count"];

// -------- Extract Records --------
export function extractRecords(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) return json as Record<string, unknown>[];
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>;
    for (const k of ["data", "items", "result", "results", "records", "rows", "value"]) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
    return [o];
  }
  return [];
}

// -------- Aggregate Selection --------
export function aggregateSelection(values: unknown[], projection: unknown[], fn: AggFn): unknown {
  const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
  switch (fn) {
    case "First": return values[0];
    case "Latest": return values[values.length - 1];
    case "Count": return values.length;
    case "Sum": return nums.reduce((a, b) => a + b, 0);
    case "Average": return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
    case "Min": return nums.length ? Math.min(...nums) : null;
    case "Max": return nums.length ? Math.max(...nums) : null;
  }
}

// -------- Get Value At Path --------
export function getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && !Array.isArray(current) && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

// -------- Stringify Result --------
export function stringifyResult(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

// -------- Compute Formula For Test --------
export function computeFormulaForTest(row: DataMappingRow, testValues: Record<number, string>): string {
  if (!row.formula || !row.formula.items || row.formula.items.length === 0) return "—";

  const items = row.formula.items;
  let expr = "";
  for (const item of items) {
    if (item.type === "variable" && item.ref != null) {
      const val = testValues[item.ref];
      if (val === undefined || val === "Erreur" || val === "") return "—";
      if (val === "null") {
        expr += "0";
      } else {
        const num = Number(val);
        if (isNaN(num)) return "—"; // non-numeric values can't be used in safe math
        expr += String(num);
      }
    } else if (item.type === "operator") {
      expr += ` ${item.op} `;
    } else if (item.type === "number") {
      expr += String(item.value);
    }
  }
  if (!expr) return "—";
  try {
    // Safe arithmetic parser — no eval, no new Function
    let pos = 0;
    const s = expr.replace(/\s+/g, "");
    function parseExpr(): number {
      let left = parseTerm();
      while (pos < s.length && (s[pos] === "+" || s[pos] === "-")) {
        const op = s[pos++];
        const right = parseTerm();
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }
    function parseTerm(): number {
      let left = parseFactor();
      while (pos < s.length && (s[pos] === "*" || s[pos] === "/")) {
        const op = s[pos++];
        const right = parseFactor();
        left = op === "*" ? left * right : left / right;
      }
      return left;
    }
    function parseFactor(): number {
      if (pos < s.length && s[pos] === "(") {
        pos++;
        const val = parseExpr();
        if (pos < s.length && s[pos] === ")") pos++;
        return val;
      }
      if (pos < s.length && s[pos] === "-") {
        pos++;
        return -parseFactor();
      }
      let start = pos;
      while (pos < s.length && ((s[pos] >= "0" && s[pos] <= "9") || s[pos] === ".")) {
        pos++;
      }
      if (start === pos) throw new Error("Unexpected character");
      return Number(s.slice(start, pos));
    }
    const result = parseExpr();
    if (pos !== s.length) throw new Error("Unexpected trailing characters");
    return Number.isInteger(result) ? String(result) : result.toFixed(2);
  } catch {
    return "Erreur";
  }
}

// -------- Validate Direct Key Type --------
export function validateDirectKeyType(records: Record<string, unknown>[], key: string): string | null {
  if (records.length === 0) return null;

  const values = records.map(r => getValueAtPath(r, key));

  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (Array.isArray(val)) {
      return `La clé "${key}" contient un tableau (enregistrement ${i + 1}). Utilisez le type Complex.`;
    }
    if (typeof val === "object" && val !== null && Object.keys(val as Record<string, unknown>).length > 1) {
      return `La clé "${key}" contient un objet avec plusieurs clés (enregistrement ${i + 1}). Utilisez le type Complex.`;
    }
  }

  const uniqueValues = new Set(values.map(v => JSON.stringify(v)));
  if (uniqueValues.size > 1) {
    return `La clé "${key}" a ${uniqueValues.size} valeurs différentes. Utilisez le type Complex.`;
  }

  return null;
}

// -------- Build Execution Result --------
export function buildExecutionResult(row: DataMappingRow, records: Record<string, unknown>[], directError?: string) {
  if (directError) {
    throw new Error(directError);
  }

  let filteredRecords = records;
  if (row.is_filtered && row.filter_key) {
    filteredRecords = filteredRecords.filter((r) => String(r[row.filter_key] ?? "") === row.filter_value);
  }

  if (row.variable_type === "Direct") {
    if (!row.variable_key) throw new Error("Variable JSON manquante");
    const projection = filteredRecords.map((r) => ({ [row.variable_key!]: getValueAtPath(r, row.variable_key!) }));
    const values = projection.map((item) => Object.values(item)[0]);
    if (row.has_function) {
      const out = aggregateSelection(values, projection, row.fn as AggFn);
      return { output: stringifyResult(out), detail: out };
    }
    const detail = values.length === 1 ? values[0] : values;
    return { output: stringifyResult(detail), detail };
  }

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function("r", `with(r){return (${row.variable_key || "null"});}`);
    const values = filteredRecords.map((r) => fn(r));
    if (row.has_function) {
      const out = aggregateSelection(values, values, row.fn as AggFn);
      return { output: stringifyResult(out), detail: out };
    }
    const detail = values.length === 1 ? values[0] : values;
    return { output: stringifyResult(detail), detail };
  } catch (e) {
    throw new Error(`Expression invalide: ${(e as Error).message}`);
  }
}

// -------- Execute Row --------
export async function executeRow(row: DataMappingRow, baseUrl: string, signal?: AbortSignal): Promise<string> {
  if (!row.endpoint) throw new Error("Endpoint manquant");
  const url = `${baseUrl.replace(/\/+$/, "")}/${row.endpoint.replace(/^\/+/, "")}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const records = extractRecords(json);
  return buildExecutionResult(row, records).output;
}
