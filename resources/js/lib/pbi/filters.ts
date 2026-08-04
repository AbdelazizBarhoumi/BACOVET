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
    if (f.table && f.table !== ctx.table.name) return rows;
    if (!hasColumn(ctx.table, f.column)) return rows;
    if (f.scope === 'page' && f.pageId && f.pageId !== ctx.activePageId)
        return rows;

    switch (f.type) {
        case 'list':
        case 'dropdown':
            if (!f.values.length) return rows;
            return rows.filter((r) => f.values.includes(String(r[f.column])));
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
 * neighbours in turn. Seeds are never constrained back, so an explicit
 * selection stays authoritative. Intersections are monotonic (row counts only
 * decrease) so the process terminates; a safety cap guards against
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

    while (queue.length && steps < cap) {
        steps += 1;
        const t = queue.shift()!;
        const tArr = current.get(t);
        if (!tArr) continue;
        for (const e of graph.edges) {
            let neighbor: string;
            let colSelf: string;
            let colNeighbor: string;
            if (e.a === t) {
                neighbor = e.b;
                colSelf = e.colA;
                colNeighbor = e.colB;
            } else if (e.b === t) {
                neighbor = e.a;
                colSelf = e.colB;
                colNeighbor = e.colA;
            } else {
                continue;
            }
            if (seeds.has(neighbor)) continue;
            const nArr = current.get(neighbor);
            if (!nArr) continue;
            const allowed = new Set<string>();
            for (const r of tArr) {
                const v = normValue(r[colSelf]);
                if (v) allowed.add(v);
            }
            const next = nArr.filter((r) =>
                allowed.has(normValue(r[colNeighbor])),
            );
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
