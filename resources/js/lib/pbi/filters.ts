// Pure, unit-testable report filter engine. Row filtering for the report
// canvas lives here so the store's `tableRows` memo stays a thin wrapper.

import type { RelationGraph } from './graph';
import {
    aggregate,
    hasColumn,
    type Agg,
    type Row,
    type TableDef,
} from './model';

export type FilterType =
    | 'list'
    | 'dropdown'
    | 'search'
    | 'dateRange'
    | 'relativeDate'
    | 'topN';

export type RelativePreset =
    | 'today'
    | 'yesterday'
    | 'last7days'
    | 'last30days'
    | 'last90days'
    | 'thisMonth'
    | 'lastMonth'
    | 'thisYear'
    | 'lastYear'
    | 'ytd';

export type ReportFilter = {
    /** custom = grouped filter over multiple endpoint columns */
    kind?: 'custom';
    column: string;
    values: string[];
    /** page = current page only, report = all pages */
    scope: 'page' | 'report';
    pageId?: string | undefined;
    /** dataset table the column belongs to */
    table?: string | undefined;
    /** which control renders the filter */
    type: FilterType;
    /** search: substring query */
    query?: string;
    /** dateRange: inclusive ISO day bounds */
    from?: string;
    to?: string;
    /** relativeDate: preset */
    relative?: RelativePreset;
    /** topN */
    topN?: number;
    topNBy?: { table?: string; name: string; agg: Agg };
    /** custom filter label shown in the pane */
    label?: string;
    /** custom filter target columns */
    columns?: CustomFilterColumn[];
};

export type CustomFilterColumn = {
    table: string;
    column: string;
    values?: string[];
};

export type FilterCtx = {
    table: TableDef;
    activePageId: string;
    /** injectable clock for deterministic relative-date tests */
    now?: Date;
};

/** Normalized (trimmed, lowercased) form of a cell value used for matching. */
export function normValue(v: unknown): string {
    if (v === null || v === undefined) return '';
    return String(v).trim().toLowerCase();
}

function iso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

/**
 * Inclusive ISO day range for a relative-date preset. `now` is injectable for
 * deterministic tests and defaults to the local calendar today.
 */
export function relativeDateRange(
    preset: RelativePreset,
    now: Date = new Date(),
): { from: string; to: string } {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    switch (preset) {
        case 'today':
            return { from: iso(today), to: iso(today) };
        case 'yesterday': {
            const d = addDays(today, -1);
            return { from: iso(d), to: iso(d) };
        }
        case 'last7days':
            return { from: iso(addDays(today, -6)), to: iso(today) };
        case 'last30days':
            return { from: iso(addDays(today, -29)), to: iso(today) };
        case 'last90days':
            return { from: iso(addDays(today, -89)), to: iso(today) };
        case 'thisMonth':
            return {
                from: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
                to: iso(monthEnd),
            };
        case 'lastMonth': {
            const start = new Date(
                today.getFullYear(),
                today.getMonth() - 1,
                1,
            );
            const end = new Date(today.getFullYear(), today.getMonth(), 0);
            return { from: iso(start), to: iso(end) };
        }
        case 'thisYear':
            return {
                from: iso(new Date(today.getFullYear(), 0, 1)),
                to: iso(new Date(today.getFullYear(), 11, 31)),
            };
        case 'lastYear':
            return {
                from: iso(new Date(today.getFullYear() - 1, 0, 1)),
                to: iso(new Date(today.getFullYear() - 1, 11, 31)),
            };
        case 'ytd':
            return {
                from: iso(new Date(today.getFullYear(), 0, 1)),
                to: iso(today),
            };
    }
}

function dayOf(r: Row, col: string): string {
    return String(r[col] ?? '').slice(0, 10);
}

export function isCustomFilter(f: ReportFilter): boolean {
    return f.kind === 'custom' && Array.isArray(f.columns);
}

export function customFilterColumnsForTable(
    f: ReportFilter,
    table: TableDef,
): CustomFilterColumn[] {
    if (!isCustomFilter(f)) return [];
    const cols = f.columns ?? [];
    const names = new Set(table.fields.map((field) => field.name));
    return cols
        .filter((c) => c.table === table.name && names.has(c.column))
        .map((c) => ({
            ...c,
            values: Array.isArray(c.values) ? c.values : [],
        }));
}

export function distinctValuesForTableColumn(
    tables: TableDef[],
    tableName: string,
    column: string,
): string[] {
    const table = tables.find((t) => t.name === tableName);
    if (!table) return [];
    if (!hasColumn(table, column)) return [];
    const out = new Set<string>();
    for (const row of table.rows) {
        const value = row[column];
        if (value === null || value === undefined) continue;
        out.add(String(value));
    }
    return [...out].sort((a, b) => a.localeCompare(b));
}

function columnRows(
    tables: TableDef[],
    rows: Record<string, Row[]> | undefined,
    tableName: string,
): Row[] {
    if (rows && rows[tableName]) return rows[tableName];
    return tables.find((t) => t.name === tableName)?.rows ?? [];
}

/**
 * One consolidated, de-duplicated, sorted value list pooled across every column
 * a custom filter targets. When `rows` is provided (e.g. the currently filtered
 * `tableRows`) the pool reflects the visible "stripped" result; otherwise it is
 * built from the raw table rows. Selecting from this single list drives
 * "affect all related" consistency in the filter pane.
 */
export function customFilterPooledValues(
    f: ReportFilter,
    tables: TableDef[],
    rows?: Record<string, Row[]>,
): string[] {
    if (!isCustomFilter(f)) return [];
    const seen = new Map<string, string>();
    for (const col of f.columns ?? []) {
        if (!col.table || !col.column) continue;
        for (const row of columnRows(tables, rows, col.table)) {
            const value = row[col.column];
            if (value === null || value === undefined) continue;
            const display = String(value);
            const key = normValue(display);
            if (key && !seen.has(key)) seen.set(key, display);
        }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

/**
 * The subset of a custom filter's columns whose current distinct-value list
 * contains `value`. Used to consolidate a pooled selection onto every related
 * column that actually holds the value (never onto unrelated domains).
 */
export function customFilterColumnsContainingValue(
    f: ReportFilter,
    tables: TableDef[],
    value: string,
): CustomFilterColumn[] {
    if (!isCustomFilter(f)) return [];
    const pool = customFilterPooledValues(f, tables);
    if (!pool.some((v) => normValue(v) === normValue(value))) return [];
    return (f.columns ?? []).filter((c) =>
        c.table && c.column
            ? distinctValuesForTableColumn(tables, c.table, c.column).some(
                  (v) => normValue(v) === normValue(value),
              )
            : false,
    );
}

/** Distinct selected values held in any column of a custom filter (pooled). */
export function customFilterSelectedValues(f: ReportFilter): string[] {
    if (!isCustomFilter(f)) return [];
    const out = new Map<string, string>();
    for (const col of f.columns ?? []) {
        for (const value of Array.isArray(col.values) ? col.values : []) {
            const key = normValue(value);
            if (key && !out.has(key)) out.set(key, value);
        }
    }
    return [...out.values()];
}

function applyCustomFilter(
    rows: Row[],
    f: ReportFilter,
    ctx: FilterCtx,
): Row[] {
    const columns = customFilterColumnsForTable(f, ctx.table);
    if (!columns.length) return rows;
    if (f.scope === 'page' && f.pageId && f.pageId !== ctx.activePageId)
        return rows;

    if (f.type === 'search') {
        const q = (f.query ?? '').trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            columns.some((col) =>
                String(r[col.column] ?? '')
                    .toLowerCase()
                    .includes(q),
            ),
        );
    }

    if (f.type !== 'list' && f.type !== 'dropdown') return rows;
    // The merged-list selection is pooled across every column the filter
    // targets, so a selected value applies to all related tables carrying one
    // of those keys — even when a particular table's key never holds it (that
    // table simply filters down to nothing). A row passes when any of this
    // table's key columns matches the pooled selection.
    const selected = customFilterSelectedValues(f);
    if (!selected.length) return rows;
    const allowed = new Set(selected.map(normValue));
    return rows.filter((r) =>
        columns.some((col) => allowed.has(normValue(r[col.column]))),
    );
}

/**
 * Distinct values of `column` ranked by an aggregate of `by`, keeping the top
 * `n`. Ranking uses SUM of the `by` column per distinct value of `column`.
 */
export function topNValues(
    rows: Row[],
    column: string,
    by: { table?: string; name: string; agg: Agg },
    n: number,
): Set<string> {
    if (n <= 0) return new Set();
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
        const key = String(r[column]);
        if (key === 'null' && r[column] === null) continue;
        if (key === 'undefined' && r[column] === undefined) continue;
        const arr = groups.get(key);
        if (arr) arr.push(r);
        else groups.set(key, [r]);
    }
    const wf = { table: by.table ?? '', name: by.name, agg: by.agg };
    const scored = [...groups.entries()]
        .map(([key, group]) => ({ key, score: aggregate(group, wf) }))
        .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
        .slice(0, n);
    return new Set(scored.map((s) => s.key));
}

/**
 * Apply a single filter to `rows`. Filters silently no-op when they target a
 * different table, the active page scope does not match, or the column is
 * missing from the table (invalid filter values never throw).
 */
export function applyFilter(
    rows: Row[],
    f: ReportFilter,
    ctx: FilterCtx,
): Row[] {
    if (isCustomFilter(f)) return applyCustomFilter(rows, f, ctx);
    if (f.table && f.table !== ctx.table.name) return rows;
    if (!hasColumn(ctx.table, f.column)) return rows;
    if (f.scope === 'page' && f.pageId && f.pageId !== ctx.activePageId)
        return rows;

    switch (f.type) {
        case 'list':
        case 'dropdown': {
            if (!f.values.length) return rows;
            const allowed = new Set(f.values.map(normValue));
            return rows.filter((r) => allowed.has(normValue(r[f.column])));
        }
        case 'search': {
            const q = (f.query ?? '').toLowerCase();
            if (!q) return rows;
            return rows.filter((r) =>
                String(r[f.column] ?? '')
                    .toLowerCase()
                    .includes(q),
            );
        }
        case 'dateRange': {
            const from = f.from;
            const to = f.to;
            if (!from && !to) return rows;
            return rows.filter((r) => {
                const day = dayOf(r, f.column);
                return !!day && (!from || day >= from) && (!to || day <= to);
            });
        }
        case 'relativeDate': {
            const range = relativeDateRange(
                f.relative ?? 'last7days',
                ctx.now ?? new Date(),
            );
            return rows.filter((r) => {
                const day = dayOf(r, f.column);
                return !!day && day >= range.from && day <= range.to;
            });
        }
        case 'topN': {
            const by = f.topNBy;
            if (!by) return rows;
            const allowed = topNValues(rows, f.column, by, f.topN ?? 10);
            return rows.filter((r) => allowed.has(String(r[f.column])));
        }
        default:
            return rows;
    }
}

/**
 * Fixed-point semi-join propagation for network (smart) filtering.
 *
 * Only tables actually reduced by a filter, slicer, drillthrough or
 * cross-filter are seeds. A seed constrains its neighbours outward through
 * the relationship graph; a derived (shrunken) table constrains its other
 * neighbours in turn. Explicit seed tables may intersect one another (multiple
 * filters are AND), but derived tables do not erase an explicit seed. Row
 * counts only decrease, so the process terminates; a safety cap guards against
 * pathological graphs.
 *
 * With no seeds the map is returned unchanged, which makes toggling network
 * filtering ON with zero filters a safe no-op instead of wiping every visual.
 */
export function propagateNetwork(
    tables: TableDef[],
    rows: Record<string, Row[]>,
    graph: RelationGraph,
    smartNetwork: boolean,
): Record<string, Row[]> {
    if (!smartNetwork || graph.edges.length === 0) return rows;

    const seeds = new Set<string>();
    for (const t of tables) {
        if ((rows[t.name] ?? []).length < t.rows.length) seeds.add(t.name);
    }
    if (seeds.size === 0) return rows;

    const current = new Map(Object.entries(rows));
    const cap = graph.edges.length * 2 + 4;
    const queue = [...seeds];
    let steps = 0;

    const tupleKey = (r: Row, cols: string[]): string | null => {
        const parts: string[] = [];
        for (const col of cols) {
            const v = normValue(r[col]);
            if (!v) return null;
            parts.push(v);
        }
        return parts.join('\u0001');
    };

    while (queue.length && steps < cap) {
        steps += 1;
        const t = queue.shift()!;
        const tArr = current.get(t);
        if (!tArr) continue;
        for (const e of graph.edges) {
            let neighbor: string;
            let selfCols: string[];
            let neighborCols: string[];
            if (e.a === t) {
                neighbor = e.b;
                selfCols = e.columns.map((pair) => pair.colA);
                neighborCols = e.columns.map((pair) => pair.colB);
            } else if (e.b === t) {
                neighbor = e.a;
                selfCols = e.columns.map((pair) => pair.colB);
                neighborCols = e.columns.map((pair) => pair.colA);
            } else {
                continue;
            }
            if (seeds.has(neighbor) && !seeds.has(t)) continue;
            // A table that became empty — seed or derived — must not cascade
            // that emptiness onto its neighbours: an empty row set expresses
            // no join keys, so wiping neighbours would collapse the whole
            // report to "Aucune donnée". Only non-empty rows may constrain.
            if (tArr.length === 0) continue;
            const nArr = current.get(neighbor);
            if (!nArr) continue;
            const allowed = new Set<string>();
            for (const r of tArr) {
                const key = tupleKey(r, selfCols);
                if (key) allowed.add(key);
            }
            // A non-empty seed whose rows can't express a complete key on this
            // edge's columns (e.g. an empty composite member like `LogDate: []`)
            // cannot constrain the neighbour, so don't wipe it to empty.
            if (allowed.size === 0 && tArr.length > 0) continue;
            const next = nArr.filter((r) => {
                const key = tupleKey(r, neighborCols);
                return key !== null && allowed.has(key);
            });
            if (next.length < nArr.length) {
                current.set(neighbor, next);
                queue.push(neighbor);
            }
        }
    }

    return Object.fromEntries(current);
}

/**
 * Filter every table by `filters`, then propagate reductions across the
 * relationship network (when a graph is supplied). Keeps the store's
 * `tableRows` derivation a thin wrapper over the pure engine.
 */
export function filterTableRows(
    tables: TableDef[],
    filters: ReportFilter[],
    graph?: RelationGraph,
    ctx?: FilterCtx,
    smartNetwork = true,
): Record<string, Row[]> {
    const map: Record<string, Row[]> = {};
    for (const t of tables) {
        let out = t.rows;
        for (const f of filters) {
            if (f.table && f.table !== t.name) continue;
            out = applyFilter(out, f, {
                table: t,
                activePageId: ctx?.activePageId ?? '',
                ...(ctx?.now ? { now: ctx.now } : {}),
            });
        }
        map[t.name] = out;
    }
    return graph ? propagateNetwork(tables, map, graph, smartNetwork) : map;
}

/**
 * Rebuild `tables` with the row sets from `rows` (keyed by table name),
 * preserving table identity (`slug`/`label`/`object`) and field schemas. Used
 * to feed the store's filtered `tableRows` back into the measure engine so DAX
 * measures evaluate against the same rows the visuals render. Tables with no
 * entry in `rows` keep their full row set.
 */
export function applyTableRows(
    tables: TableDef[],
    rows: Record<string, Row[]>,
): TableDef[] {
    return tables.map((t) => ({
        ...t,
        rows: rows[t.name] ?? t.rows,
    }));
}
