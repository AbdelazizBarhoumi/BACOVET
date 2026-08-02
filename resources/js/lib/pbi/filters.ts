// Pure, unit-testable report filter engine. Row filtering for the report
// canvas lives here so the store's `tableRows` memo stays a thin wrapper.

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
            const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
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
                return (
                    !!day && (!from || day >= from) && (!to || day <= to)
                );
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
