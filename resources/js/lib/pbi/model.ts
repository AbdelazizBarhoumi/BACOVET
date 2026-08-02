// Data model, dataset tables and aggregation engine for the report canvas.

export type FieldType = 'number' | 'text' | 'date' | 'boolean';

export type Field = {
    table: string;
    name: string;
    type: FieldType;
    /** true for DAX measures */
    measure?: boolean;
    expression?: string;
    /** shared-library id (persisted via the measures API) */
    id?: string | number;
    /** folder / group, used to group measures in the fields pane */
    category?: string | null;
    description?: string | null;
};

export type Row = Record<string, string | number | boolean | null>;

export type Agg = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';

export type WellField = {
    table: string;
    name: string;
    agg: Agg;
    /** Optional friendly presentation name; never used for row lookup. */
    label?: string;
};

export type FieldReference = {
    table?: string | undefined;
    name: string;
};

const AGGREGATIONS: Agg[] = ['sum', 'avg', 'count', 'distinct', 'min', 'max'];

/** Converts drag metadata and legacy persisted values into a physical field reference. */
export function parseFieldReference(input: unknown, fallbackTable?: string): FieldReference | null {
    if (typeof input === 'string') {
        const value = input.trim();
        if (!value) return null;
        try {
            const parsed: unknown = JSON.parse(value);
            if (parsed && typeof parsed === 'object')
                return parseFieldReference(parsed, fallbackTable);
        } catch {
            // A normal column name is not JSON and is valid as-is. Values
            // that look like serialized metadata but are malformed are not.
            if (value.startsWith('{') || value.startsWith('[')) return null;
        }
        return { name: value, table: fallbackTable || undefined };
    }

    if (!input || typeof input !== 'object') return null;
    const value = input as Record<string, unknown>;
    const name = parseFieldReference(value.name, fallbackTable);
    if (!name) return null;
    const table = typeof value.table === 'string' && value.table.trim()
        ? value.table.trim()
        : name.table || fallbackTable;
    return { name: name.name, table: table || undefined };
}

export function normalizeWellField(input: unknown, fallbackTable?: string): WellField | null {
    if (!input || typeof input !== 'object') {
        const reference = parseFieldReference(input, fallbackTable);
        return reference ? { table: reference.table ?? '', name: reference.name, agg: 'sum' } : null;
    }

    const value = input as Record<string, unknown>;
    const reference = parseFieldReference(value.name, typeof value.table === 'string' ? value.table : fallbackTable);
    if (!reference) return null;
    const agg = AGGREGATIONS.includes(value.agg as Agg) ? (value.agg as Agg) : 'sum';
    const label = typeof value.label === 'string' && value.label.trim() ? value.label.trim() : undefined;
    return { table: reference.table ?? '', name: reference.name, agg, ...(label ? { label } : {}) };
}

export function fieldLabel(wf: Pick<WellField, 'name' | 'label'>): string {
    return wf.label?.trim() || wf.name;
}

export type VisualType =
    | 'column'
    | 'stackedColumn'
    | 'stacked100Column'
    | 'bar'
    | 'stackedBar'
    | 'stacked100Bar'
    | 'line'
    | 'area'
    | 'stackedArea'
    | 'combo'
    | 'ribbon'
    | 'waterfall'
    | 'pie'
    | 'donut'
    | 'treemap'
    | 'funnel'
    | 'scatter'
    | 'bubble'
    | 'card'
    | 'kpi'
    | 'gauge'
    | 'table'
    | 'matrix'
    | 'slicer'
    | 'buttonSlicer'
    | 'listSlicer'
    | 'inputSlicer'
    | 'dateSlicer'
    | 'map'
    | 'filledMap'
    | 'shapeMap'
    | 'decompositionTree'
    | 'keyInfluencers'
    | 'smartNarrative'
    | 'qna'
    | 'rVisual'
    | 'pythonVisual'
    | 'text'
    | 'image'
    | 'button';

export type AnalyticsLine = {
    kind: 'constant' | 'average' | 'trend' | 'forecast';
    value?: number;
    enabled: boolean;
};

export type Visual = {
    id: string;
    type: VisualType;
    /** Selection-pane display name */
    name: string;
    title: string;
    /** free-form pixel layout */
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    hidden: boolean;
    axis: WellField[];
    legend: WellField[];
    values: WellField[];
    tooltips: WellField[];
    smallMultiples: WellField[];
    drillFields: WellField[];
    text?: string | undefined;
    imageUrl?: string | undefined;
    showTitle: boolean;
    showLegend: boolean;
    showLabels: boolean;
    /** format pane */
    background: string;
    border: boolean;
    shadow: boolean;
    altText: string;
    colorIndex: number;
    /** analytics pane */
    analytics: AnalyticsLine[];
    /** conditional formatting for table/matrix + column charts */
    conditionalFormat: boolean;
    subtotals: boolean;
    /** drill level index into drillFields (hierarchy) */
    drillLevel: number;
    /** max categories rendered before the remainder rolls into an "Other" bucket */
    maxCategories: number;
    /** per-page tooltip */
    tooltipPageId?: string | undefined;
    /** drillthrough target page */
    drillthroughPageId?: string | undefined;
};

export type PageFormat = {
    /** canvas size preset name */
    preset: string;
    width: number;
    height: number;
    background: string;
    wallpaper: string;
    /** page is a tooltip page */
    tooltip: boolean;
    hidden: boolean;
};

export const PAGE_PRESETS: { name: string; width: number; height: number }[] = [
    { name: '16:9', width: 1280, height: 720 },
    { name: '4:3', width: 960, height: 720 },
    { name: 'Letter', width: 1100, height: 850 },
    { name: 'Tooltip', width: 320, height: 240 },
    { name: 'Custom', width: 1280, height: 720 },
];

export type Page = {
    id: string;
    name: string;
    visuals: Visual[];
    format: PageFormat;
    /** independent phone canvas: visualId -> layout */
    mobile: Record<
        string,
        { x: number; y: number; w: number; h: number; on: boolean }
    >;
    tabOrder: string[];
};

export type CrossFilter = {
    column: string;
    value: string;
    sourceId: string;
    table?: string;
} | null;

/** per-visual-pair interaction behaviour */
export type Interaction = 'filter' | 'highlight' | 'none';

/** A dataset table: a named set of fields backed by captured endpoint rows. */
export type TableDef = { name: string; fields: Field[]; rows: Row[] };

/* ------------------------------------------------------------------ */
/* Dataset tables — populated at runtime from the fetched endpoints.   */
/* ------------------------------------------------------------------ */

export let TABLES: TableDef[] = [];

export function setTables(tables: TableDef[]): void {
    TABLES = tables;
}

export const MEASURES: Field[] = [
    {
        table: 'Measures',
        name: 'Row Count',
        type: 'number',
        measure: true,
        expression: 'Row Count = COUNTROWS ( <table> )',
    },
];

export const MEASURE_IMPL: Record<string, (rows: Row[]) => number> = {
    'Row Count': (rows) => rows.length,
};

function numericValues(rows: Row[], col: string): number[] {
    return rows
        .map((row) => row[col])
        .filter((value): value is number | string =>
            value !== null && value !== undefined && value !== '',
        )
        .map(Number)
        .filter(Number.isFinite);
}

function sum(rows: Row[], col: string) {
    return numericValues(rows, col).reduce((total, value) => total + value, 0);
}

/* ------------------------------------------------------------------ */
/* Custom measure creation + lightweight DAX evaluation                */
/* ------------------------------------------------------------------ */

/** Splits a `Table[Column]` (or `'Table Name'[Column]`, `[Column]`, `Table`) ref. */
export function parseDaxRef(arg: string): {
    table?: string;
    column?: string;
} {
    const trimmed = arg.trim();
    const quoted =
        trimmed.match(/^(?:'([^']+)'\s*)?\[([^\]]+)\]$/) ??
        trimmed.match(/^([^[\]]+)\s*\[([^\]]+)\]$/);
    if (quoted)
        return {
            table: (quoted[1] ?? '').trim() || undefined,
            column: quoted[2]!.trim(),
        };
    if (/^[^[\]]+$/.test(trimmed) && trimmed) return { table: trimmed };
    return {};
}

/* ------------------------------------------------------------------ */
/* Measure expression parser / evaluator                                */
/*                                                                      */
/* Supports a small, safe subset of DAX plus the simplified Phase-3     */
/* forms: SUM(Sales), AVG(Price), COUNT(Customer), SUM(Sales)-SUM(Cost) */
/* Column refs may be bare (`Sales`) or qualified (`Sales[Amount]`).    */
/* ------------------------------------------------------------------ */

export type MeasureEvalError = Error;

class MeasureSyntaxError extends Error {}

/** Runtime context for a single measure evaluation. */
type EvalCtx = {
    errors?: string[];
    /** Other page measures, resolved by `[Name]` refs. */
    measures?: Record<string, ((rows: Row[]) => number) | null>;
};

type MeasureNode =
    | { kind: 'num'; value: number }
    | { kind: 'col'; table?: string; column: string }
    | { kind: 'func'; name: string; args: MeasureNode[] }
    | { kind: 'binop'; op: '+' | '-' | '*' | '/'; left: MeasureNode; right: MeasureNode }
    | { kind: 'ref'; name: string }
    | { kind: 'table'; name: string };

const AGGREGATION_FUNCS = new Set([
    'SUM', 'AVERAGE', 'AVERAGEA', 'AVG', 'COUNT', 'COUNTA',
    'DISTINCTCOUNT', 'MIN', 'MAX', 'MEDIAN', 'PRODUCT', 'COUNTROWS',
]);

type Token =
    | { type: 'num'; value: number }
    | { type: 'word'; value: string }
    | { type: 'qword'; value: string }
    | { type: 'bracket'; value: string }
    | { type: 'table'; value: string }
    | { type: 'lparen' | 'rparen' | 'comma' }
    | { type: 'op'; value: '+' | '-' | '*' | '/' };

function tokenize(src: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i]!;
        if (/\s/.test(c)) { i += 1; continue; }
        if (c === '[') {
            const end = src.indexOf(']', i + 1);
            if (end < 0) throw new MeasureSyntaxError('Crochet non fermé');
            tokens.push({ type: 'bracket', value: src.slice(i + 1, end).trim() });
            i = end + 1;
            continue;
        }
        if (c === '(') { tokens.push({ type: 'lparen' }); i += 1; continue; }
        if (c === ')') { tokens.push({ type: 'rparen' }); i += 1; continue; }
        if (c === ',') { tokens.push({ type: 'comma' }); i += 1; continue; }
        if (c === '+' || c === '-' || c === '*' || c === '/') {
            tokens.push({ type: 'op', value: c }); i += 1; continue;
        }
        if (c === "'") {
            const end = src.indexOf("'", i + 1);
            if (end < 0) throw new MeasureSyntaxError('Guillemet non fermé');
            tokens.push({ type: 'qword', value: src.slice(i + 1, end) });
            i = end + 1;
            continue;
        }
        if (c === '<') {
            const end = src.indexOf('>', i + 1);
            if (end < 0) throw new MeasureSyntaxError('Balise « < » non fermée');
            tokens.push({ type: 'table', value: src.slice(i + 1, end).trim() });
            i = end + 1;
            continue;
        }
        if (/[0-9]/.test(c)) {
            const m = src.slice(i).match(/^\d+(?:\.\d+)?/);
            if (!m) throw new MeasureSyntaxError('Nombre invalide');
            tokens.push({ type: 'num', value: Number(m[0]) });
            i += m[0].length;
            continue;
        }
        if (/[\p{L}_]/u.test(c)) {
            const m = src.slice(i).match(/^[\p{L}\p{N}_]+/u);
            if (!m) throw new MeasureSyntaxError('Identifiant invalide');
            tokens.push({ type: 'word', value: m[0] });
            i += m[0].length;
            continue;
        }
        throw new MeasureSyntaxError(`Caractère inattendu « ${c} »`);
    }
    return tokens;
}

type ParseState = { tokens: Token[]; pos: number };

function peekToken(t: ParseState): Token | undefined {
    return t.tokens[t.pos];
}

function takeToken(t: ParseState): Token | undefined {
    return t.tokens[t.pos++];
}

function expectToken(t: ParseState, type: Token['type']): Token {
    const tok = takeToken(t);
    if (!tok || tok.type !== type) throw new MeasureSyntaxError(`« ${type} » attendu`);
    return tok;
}

function parseExpr(t: ParseState): MeasureNode {
    let left = parseTerm(t);
    for (;;) {
        const tok = peekToken(t);
        if (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
            takeToken(t);
            const right = parseTerm(t);
            left = { kind: 'binop', op: tok.value, left, right };
        } else break;
    }
    return left;
}

function parseTerm(t: ParseState): MeasureNode {
    let left = parseFactor(t);
    for (;;) {
        const tok = peekToken(t);
        if (tok?.type === 'op' && (tok.value === '*' || tok.value === '/')) {
            takeToken(t);
            const right = parseFactor(t);
            left = { kind: 'binop', op: tok.value, left, right };
        } else break;
    }
    return left;
}

function parseFactor(t: ParseState): MeasureNode {
    const tok = takeToken(t);
    if (!tok) throw new MeasureSyntaxError('Expression incomplète');
    if (tok.type === 'num') return { kind: 'num', value: tok.value };
    if (tok.type === 'op' && tok.value === '-') {
        const inner = parseFactor(t);
        return { kind: 'binop', op: '-', left: { kind: 'num', value: 0 }, right: inner };
    }
    if (tok.type === 'lparen') {
        const inner = parseExpr(t);
        expectToken(t, 'rparen');
        return inner;
    }
    if (tok.type === 'bracket') return { kind: 'ref', name: tok.value };
    if (tok.type === 'table') return { kind: 'table', name: tok.value };
    if (tok.type === 'word') {
        if (peekToken(t)?.type === 'lparen') {
            takeToken(t);
            const args: MeasureNode[] = [];
            if (peekToken(t)?.type !== 'rparen') {
                args.push(parseExpr(t));
                while (peekToken(t)?.type === 'comma') {
                    takeToken(t);
                    args.push(parseExpr(t));
                }
            }
            expectToken(t, 'rparen');
            return { kind: 'func', name: tok.value, args };
        }
        if (peekToken(t)?.type === 'bracket') {
            const column = takeToken(t) as { type: 'bracket'; value: string };
            return { kind: 'col', table: tok.value, column: column.value };
        }
        return { kind: 'col', column: tok.value };
    }
    if (tok.type === 'qword') {
        if (peekToken(t)?.type === 'bracket') {
            const column = takeToken(t) as { type: 'bracket'; value: string };
            return { kind: 'col', table: tok.value, column: column.value };
        }
        return { kind: 'col', column: tok.value };
    }
    throw new MeasureSyntaxError(`Syntaxe inattendue (${tok.type})`);
}

function walkNode(node: MeasureNode, visit: (n: MeasureNode) => void): void {
    visit(node);
    if (node.kind === 'func') for (const a of node.args) walkNode(a, visit);
    else if (node.kind === 'binop') {
        walkNode(node.left, visit);
        walkNode(node.right, visit);
    }
}

function tryCompile(
    expression: string,
): { ok: true; node: MeasureNode } | { ok: false; error: string } {
    const eq = expression.indexOf('=');
    const rhs = (eq >= 0 ? expression.slice(eq + 1) : expression).trim();
    if (!rhs) return { ok: false, error: 'Expression vide.' };
    try {
        const tokens = tokenize(rhs);
        if (!tokens.length) return { ok: false, error: 'Expression vide.' };
        const state: ParseState = { tokens, pos: 0 };
        const node = parseExpr(state);
        if (state.pos < tokens.length) {
            return { ok: false, error: `Caractère inattendu à la fin de l'expression.` };
        }
        return { ok: true, node };
    } catch (e) {
        return {
            ok: false,
            error: e instanceof MeasureSyntaxError ? e.message : 'Expression invalide.',
        };
    }
}

/** Column values from rows, flagging references to columns that no longer exist. */
function resolveColumn(
    column: string,
    rows: Row[],
    ctx: EvalCtx,
): (string | number | boolean | null)[] {
    const sample = rows[0];
    if (sample && !(column in sample)) {
        const message = `Colonne « ${column} » introuvable.`;
        ctx.errors?.push(message);
        throw new MeasureSyntaxError(message);
    }
    return rows.map((r) => r[column] ?? null);
}

function numericOf(values: (string | number | boolean | null)[]): number[] {
    return values
        .filter((v) => v !== null && v !== undefined && v !== '')
        .map(Number)
        .filter(Number.isFinite);
}

/** The column a value-aggregation is applied to (a column or a `[Name]` ref). */
function columnNameOf(node: MeasureNode): string {
    if (node.kind === 'col') return node.column;
    if (node.kind === 'ref') return node.name;
    throw new MeasureSyntaxError('Une colonne est attendue en argument.');
}

function evalFunction(node: Extract<MeasureNode, { kind: 'func' }>, rows: Row[], ctx: EvalCtx): number {
    const name = node.name.toUpperCase();
    const arg = node.args[0];

    if (name === 'COUNTROWS') return rows.length;

    if (!AGGREGATION_FUNCS.has(name)) {
        throw new MeasureSyntaxError(`Fonction « ${node.name} » non supportée.`);
    }
    if (!arg) throw new MeasureSyntaxError(`${name}() attend une colonne.`);

    const column = columnNameOf(arg);
    const values = resolveColumn(column, rows, ctx);

    switch (name) {
        case 'SUM':
            return numericOf(values).reduce((total, value) => total + value, 0);
        case 'AVERAGE':
        case 'AVERAGEA':
        case 'AVG': {
            const nums = numericOf(values);
            return nums.length ? nums.reduce((total, value) => total + value, 0) / nums.length : 0;
        }
        case 'COUNT':
            return values.filter((v) => v !== null && v !== undefined && v !== '').length;
        case 'COUNTA':
            return values.filter((v) => v !== null && v !== undefined).length;
        case 'DISTINCTCOUNT':
            return new Set(values.filter((v) => v !== null && v !== undefined && v !== '')).size;
        case 'MIN': {
            const nums = numericOf(values);
            return nums.length ? Math.min(...nums) : 0;
        }
        case 'MAX': {
            const nums = numericOf(values);
            return nums.length ? Math.max(...nums) : 0;
        }
        case 'MEDIAN': {
            const nums = numericOf(values).sort((a, b) => a - b);
            if (!nums.length) return 0;
            const mid = Math.floor(nums.length / 2);
            return nums.length % 2 ? nums[mid]! : (nums[mid - 1]! + nums[mid]!) / 2;
        }
        case 'PRODUCT':
            return numericOf(values).reduce((total, value) => total * value, 1);
        default:
            return 0;
    }
}

function evalNode(node: MeasureNode, rows: Row[], ctx: EvalCtx): number {
    switch (node.kind) {
        case 'num':
            return node.value;
        case 'col':
            return numericOf(resolveColumn(node.column, rows, ctx)).reduce(
                (total, value) => total + value,
                0,
            );
        case 'ref': {
            const fn = ctx.measures?.[node.name];
            if (fn) return fn(rows) ?? 0;
            return numericOf(resolveColumn(node.name, rows, ctx)).reduce(
                (total, value) => total + value,
                0,
            );
        }
        case 'table':
            return 0;
        case 'binop': {
            const left = evalNode(node.left, rows, ctx);
            const right = evalNode(node.right, rows, ctx);
            if (node.op === '+') return left + right;
            if (node.op === '-') return left - right;
            if (node.op === '*') return left * right;
            if (node.op === '/') return right === 0 ? 0 : left / right;
            return 0;
        }
        case 'func':
            return evalFunction(node, rows, ctx);
    }
}

/**
 * Compiles a measure expression into a row aggregator. Unsupported or
 * malformed expressions compile to a function that always returns 0, so
 * existing callers keep working; use `validateMeasureExpression` /
 * `evaluateMeasure` to surface errors.
 */
export function compileMeasure(expression: string): (rows: Row[]) => number {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return () => 0;
    const node = compiled.node;
    return (rows) => {
        const ctx: EvalCtx = {};
        try {
            return evalNode(node, rows, ctx);
        } catch {
            return 0;
        }
    };
}

export type MeasureValidation = { ok: true } | { ok: false; error: string };

/**
 * Validates a measure expression. When `columns` is given, every referenced
 * column must exist in it (catches deleted-column dependencies). When
 * `measures` is given, `[Name]` refs may resolve to those measure names.
 */
export function validateMeasureExpression(
    expression: string,
    columns?: string[],
    measures?: string[],
): MeasureValidation {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return compiled;

    const knownColumns = new Set((columns ?? []).map((c) => c.trim().toLowerCase()));
    const knownMeasures = new Set((measures ?? []).map((m) => m.trim().toLowerCase()));

    let missing: string | null = null;
    walkNode(compiled.node, (node) => {
        if (missing) return;
        if (node.kind === 'func' && !AGGREGATION_FUNCS.has(node.name.toUpperCase())) {
            missing = `Fonction « ${node.name} » non supportée.`;
        } else if (node.kind === 'col' && knownColumns.size > 0 && node.column) {
            if (!knownColumns.has(node.column.trim().toLowerCase())) {
                missing = `Colonne « ${node.column} » introuvable.`;
            }
        } else if (node.kind === 'ref' && node.name) {
            const key = node.name.trim().toLowerCase();
            if (knownMeasures.has(key)) return;
            if (knownColumns.size > 0 && knownColumns.has(key)) return;
            if (knownColumns.size > 0 || knownMeasures.size > 0) {
                missing = `Référence « ${node.name} » introuvable.`;
            }
        }
    });
    if (missing) return { ok: false, error: missing };
    return { ok: true };
}

/**
 * Evaluates a measure expression against rows, reporting the first error
 * (missing column, unknown function, malformed expression) instead of
 * silently returning 0. Division by zero yields 0 (DAX BLANK semantics).
 */
export function evaluateMeasure(
    expression: string,
    rows: Row[],
    measures?: Record<string, ((rows: Row[]) => number) | null>,
): { value: number; error?: string } {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return { value: 0, error: compiled.error };
    const errors: string[] = [];
    const ctx: EvalCtx = { errors, measures };
    try {
        const value = evalNode(compiled.node, rows, ctx);
        if (errors.length) return { value: 0, error: errors[0]! };
        return { value };
    } catch (e) {
        const message =
            e instanceof MeasureSyntaxError || e instanceof TypeError
                ? e.message
                : String(e);
        return { value: 0, error: message };
    }
}

/**
 * Makes a measure usable by the aggregation engine. Custom measures live in
 * the PBI state; this only wires the evaluator so `isMeasure` and `aggregate`
 * resolve them like the built-in ones. The expression is validated against
 * the currently loaded tables (and other registered measures); any problem is
 * recorded in `MEASURE_ERRORS` so the UI can flag broken measures.
 */
export const MEASURE_ERRORS: Record<string, string> = {};

export function measureError(name: string): string | undefined {
    return MEASURE_ERRORS[name];
}

function availableColumns(): string[] {
    const columns: string[] = [];
    for (const t of TABLES) for (const f of t.fields) columns.push(f.name);
    return columns;
}

function knownMeasureNames(): string[] {
    return Object.keys(MEASURE_IMPL);
}

export function registerMeasure(
    name: string,
    expression: string,
    impl?: (rows: Row[]) => number,
): void {
    MEASURE_IMPL[name] = impl ?? compileMeasure(expression);
    const validation = validateMeasureExpression(
        expression,
        availableColumns(),
        knownMeasureNames(),
    );
    if (validation.ok) delete MEASURE_ERRORS[name];
    else MEASURE_ERRORS[name] = validation.error;
}

/** Removes a custom measure (and any recorded error) from the engine. */
export function unregisterMeasure(name: string): void {
    delete MEASURE_IMPL[name];
    delete MEASURE_ERRORS[name];
}

/* ------------------------------------------------------------------ */
/* Aggregation engine                                                  */
/* ------------------------------------------------------------------ */

export function isMeasure(name: string) {
    return name in MEASURE_IMPL;
}

/** First table that exposes a column with the given name. */
export function findTableForField(name: string): string {
    for (const t of TABLES) {
        if (t.fields.some((f) => f.name === name)) return t.name;
    }
    return '';
}

export function fieldType(name: string, table?: string): FieldType {
    if (isMeasure(name)) return 'number';
    if (table) {
        for (const t of TABLES) {
            if (t.name !== table) continue;
            const f = t.fields.find((x) => x.name === name);
            if (f) return f.type;
        }
    }
    for (const t of TABLES) {
        const f = t.fields.find((x) => x.name === name);
        if (f) return f.type;
    }
    return 'text';
}

export function hasColumn(table: TableDef, name: string): boolean {
    return table.fields.some((f) => f.name === name);
}

/**
 * Returns a human-readable reason a field cannot be resolved against the
 * loaded dataset, or `null` when it is fine. Used to surface "incorrect
 * field assignment" warnings (badge + tooltip) in the wells UI.
 */
export function fieldIssue(f: WellField): string | null {
    if (isMeasure(f.name)) return null;
    if (f.table && !TABLES.some((t) => t.name === f.table)) {
        return `Table « ${f.table} » introuvable dans le jeu de données.`;
    }
    if (TABLES.length) {
        const found = TABLES.some((t) =>
            t.fields.some((x) => x.name === f.name),
        );
        if (!found) {
            return `Colonne « ${f.name} » introuvable dans les données chargées.`;
        }
    }
    return null;
}

/** Returns a reason when a field is text but used where a number is expected. */
export function fieldNumericIssue(f: WellField): string | null {
    if (isMeasure(f.name)) return null;
    if (fieldType(f.name, f.table) === 'number') return null;
    return `« ${fieldLabel(f)} » est un champ texte.`;
}

export function aggregate(rows: Row[], wf: WellField): number {
    if (isMeasure(wf.name)) return MEASURE_IMPL[wf.name]!(rows);
    const col = wf.name;
    switch (wf.agg) {
        case 'count':
            return rows.filter(
                (row) => row[col] !== null && row[col] !== undefined,
            ).length;
        case 'distinct':
            return new Set(rows.map((r) => r[col])).size;
        case 'avg': {
            const values = numericValues(rows, col);
            return values.length
                ? values.reduce((total, value) => total + value, 0) /
                      values.length
                : 0;
        }
        case 'min':
            {
                const values = numericValues(rows, col);
                return values.length ? Math.min(...values) : 0;
            }
        case 'max':
            {
                const values = numericValues(rows, col);
                return values.length ? Math.max(...values) : 0;
            }
        default:
            return sum(rows, col);
    }
}

export function measureLabel(wf: WellField) {
    if (isMeasure(wf.name)) return wf.name;
    if (wf.label?.trim()) return wf.label.trim();
    if (fieldType(wf.name, wf.table) === 'number') {
        const p =
            wf.agg === 'sum'
                ? 'Sum of'
                : wf.agg === 'avg'
                  ? 'Average of'
                  : wf.agg === 'count'
                    ? 'Count of'
                    : wf.agg === 'distinct'
                      ? 'Distinct count of'
                      : wf.agg === 'min'
                        ? 'Min of'
                        : 'Max of';
        return `${p} ${fieldLabel(wf)}`;
    }
    return `Count of ${fieldLabel(wf)}`;
}

export function buildChartData(
    rows: Row[],
    axis: WellField[],
    legend: WellField[],
    values: WellField[],
    tooltips: WellField[] = [],
    maxCategories?: number,
) {
    const axisCol = axis[0]?.name;
    const legendCol = legend[0]?.name;

    const withTooltips = (item: Record<string, string | number>, groupRows: Row[]) => {
        for (const t of tooltips) {
            item[`tt:${t.name}`] = aggregate(groupRows, t);
        }
        return item;
    };

    if (!axisCol) {
        const single: Record<string, string | number> = { category: 'Total' };
        values.forEach((v) => (single[measureLabel(v)] = aggregate(rows, v)));
        return {
            data: [withTooltips(single, rows)],
            series: values.map(measureLabel),
        };
    }

    const groups = new Map<string, Row[]>();
    for (const r of rows) {
        const k = String(r[axisCol]);
        const arr = groups.get(k);
        if (arr) arr.push(r);
        else groups.set(k, [r]);
    }

    const cap = maxCategories && maxCategories > 0 ? maxCategories : Infinity;
    const capped = cap < groups.size;
    const entries = [...groups.entries()];

    if (capped) {
        entries.sort((a, b) => {
            const av = values[0]
                ? aggregate(a[1], values[0])
                : a[1].length;
            const bv = values[0]
                ? aggregate(b[1], values[0])
                : b[1].length;
            return Number(bv) - Number(av);
        });
    }

    const kept = capped ? entries.slice(0, cap) : entries;

    const seriesSet = new Set<string>();
    const data: Record<string, string | number>[] = kept.map(([key, groupRows]) => {
        const item: Record<string, string | number> = { category: key };
        if (legendCol) {
            const byLegend = new Map<string, Row[]>();
            for (const r of groupRows) {
                const lk = String(r[legendCol]);
                const arr = byLegend.get(lk);
                if (arr) arr.push(r);
                else byLegend.set(lk, [r]);
            }
            for (const [lk, lrows] of byLegend) {
                seriesSet.add(lk);
                item[lk] = values[0]
                    ? aggregate(lrows, values[0])
                    : lrows.length;
            }
        } else {
            values.forEach((v) => {
                seriesSet.add(measureLabel(v));
                item[measureLabel(v)] = aggregate(groupRows, v);
            });
        }
        return withTooltips(item, groupRows);
    });

    if (capped) {
        const rest = entries.slice(cap);
        const other: Record<string, string | number> = { category: 'Other' };
        const otherRows: Row[] = [];
        for (const [, groupRows] of rest) otherRows.push(...groupRows);
        if (legendCol) {
            const byLegend = new Map<string, Row[]>();
            for (const r of otherRows) {
                const lk = String(r[legendCol]);
                const arr = byLegend.get(lk);
                if (arr) arr.push(r);
                else byLegend.set(lk, [r]);
            }
            for (const [lk, lrows] of byLegend) {
                seriesSet.add(lk);
                other[lk] = values[0]
                    ? aggregate(lrows, values[0])
                    : lrows.length;
            }
        } else {
            values.forEach((v) => {
                seriesSet.add(measureLabel(v));
                other[measureLabel(v)] = aggregate(otherRows, v);
            });
        }
        data.push(withTooltips(other, otherRows));
    }

    if (fieldType(axisCol, axis[0]?.table) === 'number') {
        data.sort((a, b) => Number(a['category']) - Number(b['category']));
    } else if (values.length && !legendCol && !capped) {
        const key = measureLabel(values[0]!);
        data.sort((a, b) => Number(b[key]) - Number(a[key]));
    }

    return { data, series: [...seriesSet] };
}

export type ScatterPoint = {
    x: number;
    y: number;
    z?: number;
    category?: string;
    raw: Row;
};

/**
 * Builds scatter/bubble points directly from rows: one point per row using
 * raw numeric X/Y (and optional Z for bubble size) values. Rows without a
 * finite X or Y are skipped. When the axis field is not numeric, falls back
 * to the category-grouped chart data so categorical scatters keep working.
 */
export function buildScatterData(
    rows: Row[],
    xWell: WellField | undefined,
    yWell: WellField | undefined,
    zWell: WellField | undefined,
): { points: ScatterPoint[]; numeric: boolean } {
    const xCol = xWell?.name;
    const yCol = yWell?.name;
    const zCol = zWell?.name;

    if (!xCol || !yCol) return { points: [], numeric: false };
    const xNumeric = fieldType(xCol, xWell?.table) === 'number';
    const yNumeric = fieldType(yCol, yWell?.table) === 'number';
    if (!xNumeric || !yNumeric) return { points: [], numeric: false };

    const points: ScatterPoint[] = [];
    for (const r of rows) {
        const xv = r[xCol];
        const yv = r[yCol];
        if (xv === null || xv === undefined || xv === '') continue;
        if (yv === null || yv === undefined || yv === '') continue;
        const x = Number(xv);
        const y = Number(yv);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const point: ScatterPoint = { x, y, raw: r };
        if (zCol) {
            const zv = r[zCol];
            if (zv !== null && zv !== undefined && zv !== '') {
                const z = Number(zv);
                if (Number.isFinite(z)) point.z = z;
            }
        }
        points.push(point);
    }
    return { points, numeric: true };
}

export function distinctValues(col: string, rows: Row[]) {
    const s = new Set<string>();
    for (const r of rows) s.add(String(r[col]));
    return [...s].sort();
}

/** Table backing a visual — resolved from its first populated well. */
export function visualTable(
    v: Pick<
        Visual,
        | 'axis'
        | 'legend'
        | 'values'
        | 'drillFields'
        | 'smallMultiples'
        | 'tooltips'
    >,
): string {
    const wells = [
        v.axis,
        v.legend,
        v.values,
        v.drillFields,
        v.smallMultiples,
        v.tooltips,
    ];
    for (const well of wells) {
        if (well[0]?.table) return well[0].table;
    }
    return '';
}

export function formatNumber(n: number, compact = true) {
    if (!isFinite(n)) return '—';
    if (Math.abs(n) < 1 && n !== 0) return `${(n * 100).toFixed(1)}%`;
    if (!compact)
        return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatValue(
    value: unknown,
    type: FieldType = 'text',
): string {
    if (value === null || value === undefined) return '—';
    if (type === 'number' && typeof value === 'number')
        return formatNumber(value);
    if (type === 'boolean')
        return value === true ? 'Yes' : value === false ? 'No' : String(value);
    if (type === 'date') {
        const parsed = value instanceof Date ? value : new Date(String(value));
        if (!Number.isNaN(parsed.getTime()))
            return parsed.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
            });
    }
    return String(value);
}

/* ------------------------------------------------------------------ */
/* Column type inference                                               */
/* ------------------------------------------------------------------ */

function isDateString(v: string): boolean {
    const trimmed = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(trimmed)) return false;
    return !Number.isNaN(Date.parse(trimmed.slice(0, 10)));
}

export function inferFieldType(values: unknown[]): FieldType {
    let numbers = 0;
    let dates = 0;
    let booleans = 0;
    let texts = 0;
    for (const v of values) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'boolean') booleans++;
        else if (typeof v === 'number') numbers++;
        else if (typeof v === 'string') {
            if (isDateString(v)) dates++;
            else texts++;
        } else texts++;
    }
    const total = numbers + dates + booleans + texts;
    if (!total) return 'text';
    if (numbers === total) return 'number';
    if (booleans === total) return 'boolean';
    if (dates === total) return 'date';
    if (numbers >= total * 0.8) return 'number';
    return 'text';
}
