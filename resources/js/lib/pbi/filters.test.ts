import { describe, expect, it } from 'vitest';
import {
    applyFilter,
    relativeDateRange,
    topNValues,
    type ReportFilter,
} from './filters';
import type { Row, TableDef } from './model';

const sales: TableDef = {
    name: 'Sales',
    fields: [
        { table: 'Sales', name: 'Region', type: 'text' },
        { table: 'Sales', name: 'Category', type: 'text' },
        { table: 'Sales', name: 'Date', type: 'date' },
        { table: 'Sales', name: 'Amount', type: 'number' },
    ],
    rows: [
        { Region: 'North', Category: 'A', Date: '2026-06-01', Amount: 10 },
        { Region: 'North', Category: 'B', Date: '2026-06-15', Amount: 20 },
        { Region: 'North', Category: 'A', Date: '2026-07-01', Amount: 30 },
        { Region: 'South', Category: 'B', Date: '2026-07-02', Amount: 40 },
        { Region: 'South', Category: 'C', Date: '2026-07-15', Amount: 50 },
    ],
};

const ctx = { table: sales, activePageId: 'p1' };

function filter(partial: Partial<ReportFilter>): ReportFilter {
    return {
        column: 'Region',
        values: [],
        scope: 'report',
        type: 'list',
        ...partial,
    };
}

describe('applyFilter — list / dropdown', () => {
    it('leaves rows untouched when no values are selected (clear)', () => {
        expect(applyFilter(sales.rows, filter({}), ctx)).toEqual(sales.rows);
    });

    it('filters rows to the selected values', () => {
        const out = applyFilter(
            sales.rows,
            filter({ values: ['North'] }),
            ctx,
        );
        expect(out).toHaveLength(3);
        expect(out.every((r) => r.Region === 'North')).toBe(true);
    });

    it('combines multiple values as OR within a single filter', () => {
        const out = applyFilter(
            sales.rows,
            filter({ values: ['North', 'South'] }),
            ctx,
        );
        expect(out).toHaveLength(5);
    });

    it('dropdown behaves like a single-value list', () => {
        const out = applyFilter(
            sales.rows,
            filter({ type: 'dropdown', values: ['South'] }),
            ctx,
        );
        expect(out).toHaveLength(2);
        expect(out.every((r) => r.Region === 'South')).toBe(true);
    });

    it('returns no rows for a bogus value (invalid value)', () => {
        expect(applyFilter(sales.rows, filter({ values: ['Nowhere'] }), ctx)).toEqual([]);
    });
});

describe('applyFilter — multiple filters combine correctly', () => {
    it('AND-combines two list filters', () => {
        const a = applyFilter(
            sales.rows,
            filter({ column: 'Region', values: ['North'] }),
            ctx,
        );
        const b = applyFilter(
            a,
            filter({ column: 'Category', values: ['A'] }),
            ctx,
        );
        expect(b).toHaveLength(2);
        expect(b.every((r) => r.Region === 'North' && r.Category === 'A')).toBe(
            true,
        );
    });

    it('order does not affect the combined result', () => {
        const ab = applyFilter(
            applyFilter(
                sales.rows,
                filter({ column: 'Region', values: ['North'] }),
                ctx,
            ),
            filter({ column: 'Category', values: ['B'] }),
            ctx,
        );
        const ba = applyFilter(
            applyFilter(
                sales.rows,
                filter({ column: 'Category', values: ['B'] }),
                ctx,
            ),
            filter({ column: 'Region', values: ['North'] }),
            ctx,
        );
        expect(ab).toEqual(ba);
    });

    it('scope page only applies on the matching active page', () => {
        const pageFilter = filter({
            values: ['North'],
            scope: 'page',
            pageId: 'p1',
        });
        expect(applyFilter(sales.rows, pageFilter, ctx)).toHaveLength(3);
        const otherPage = applyFilter(sales.rows, pageFilter, {
            table: sales,
            activePageId: 'p2',
        });
        expect(otherPage).toEqual(sales.rows);
    });

    it('ignores filters targeting a different table', () => {
        const out = applyFilter(sales.rows, filter({ table: 'Other' }), ctx);
        expect(out).toEqual(sales.rows);
    });
});

describe('applyFilter — search', () => {
    it('matches case-insensitive substring', () => {
        const out = applyFilter(
            sales.rows,
            filter({ type: 'search', query: 'nOR' }),
            ctx,
        );
        expect(out).toHaveLength(3);
        expect(out.every((r) => r.Region === 'North')).toBe(true);
    });

    it('no query is a no-op', () => {
        expect(
            applyFilter(sales.rows, filter({ type: 'search', query: '' }), ctx),
        ).toEqual(sales.rows);
    });
});

describe('applyFilter — date range', () => {
    it('filters rows within an inclusive from/to range', () => {
        const out = applyFilter(
            sales.rows,
            filter({
                type: 'dateRange',
                column: 'Date',
                from: '2026-07-01',
                to: '2026-07-15',
            }),
            ctx,
        );
        expect(out).toHaveLength(3);
        expect(out.every((r) => String(r.Date) >= '2026-07-01')).toBe(true);
    });

    it('a missing column is a no-op (invalid filter value)', () => {
        expect(
            applyFilter(
                sales.rows,
                filter({ type: 'dateRange', column: 'Missing', from: '2026-01-01' }),
                ctx,
            ),
        ).toEqual(sales.rows);
    });

    it('non-date text column is treated as day strings', () => {
        const out = applyFilter(
            sales.rows,
            filter({ type: 'dateRange', column: 'Category', from: 'B', to: 'C' }),
            ctx,
        );
        expect(out).toHaveLength(3);
    });

    it('empty range is a no-op', () => {
        expect(
            applyFilter(
                sales.rows,
                filter({ type: 'dateRange', column: 'Date' }),
                ctx,
            ),
        ).toEqual(sales.rows);
    });
});

describe('applyFilter — relative date', () => {
    const now = new Date(2026, 6, 20);
    const asRelative = (relative: NonNullable<ReportFilter['relative']>) =>
        applyFilter(
            sales.rows,
            filter({ type: 'relativeDate', column: 'Date', relative }),
            { table: sales, activePageId: 'p1', now },
        );

    it('today matches only today rows', () => {
        const out = applyFilter(
            sales.rows,
            filter({ type: 'relativeDate', column: 'Date', relative: 'today' }),
            { table: sales, activePageId: 'p1', now },
        );
        expect(out).toEqual([]);
    });

    it('last30days covers a month window', () => {
        const range = relativeDateRange('last30days', now);
        expect(range).toEqual({ from: '2026-06-21', to: '2026-07-20' });
        const out = asRelative('last30days');
        expect(out).toHaveLength(3);
    });

    it('thisMonth matches rows inside the current month', () => {
        const range = relativeDateRange('thisMonth', now);
        expect(range).toEqual({ from: '2026-07-01', to: '2026-07-31' });
        const out = asRelative('thisMonth');
        expect(out).toHaveLength(3);
        expect(out.every((r) => String(r.Date).startsWith('2026-07'))).toBe(
            true,
        );
    });

    it('ytd starts at Jan 1', () => {
        expect(relativeDateRange('ytd', now)).toEqual({
            from: '2026-01-01',
            to: '2026-07-20',
        });
    });
});

describe('applyFilter — top N', () => {
    it('keeps the top N categories by SUM', () => {
        const out = applyFilter(
            sales.rows,
            filter({
                type: 'topN',
                column: 'Category',
                topN: 2,
                topNBy: { name: 'Amount', agg: 'sum' },
            }),
            ctx,
        );
        const cats = new Set(out.map((r) => r.Category));
        expect(cats).toEqual(new Set(['B', 'C']));
        expect(out).toHaveLength(3);
    });

    it('topN by count', () => {
        const out = applyFilter(
            sales.rows,
            filter({
                type: 'topN',
                column: 'Region',
                topN: 1,
                topNBy: { name: 'Amount', agg: 'count' },
            }),
            ctx,
        );
        expect(out.every((r) => r.Region === 'North')).toBe(true);
    });

    it('missing by field yields no filtering (invalid config)', () => {
        expect(
            applyFilter(
                sales.rows,
                filter({ type: 'topN', column: 'Category', topN: 2 }),
                ctx,
            ),
        ).toEqual(sales.rows);
    });

    it('non-positive N filters everything out', () => {
        expect(
            applyFilter(
                sales.rows,
                filter({
                    type: 'topN',
                    column: 'Category',
                    topN: 0,
                    topNBy: { name: 'Amount', agg: 'sum' },
                }),
                ctx,
            ),
        ).toEqual([]);
    });
});

describe('topNValues', () => {
    it('ranks distinct values by aggregate descending', () => {
        const set = topNValues(
            sales.rows,
            'Category',
            { name: 'Amount', agg: 'sum' },
            2,
        );
        expect([...set]).toEqual(['B', 'C']);
    });

    it('empty rows yields an empty set', () => {
        expect(
            topNValues([], 'Category', { name: 'Amount', agg: 'sum' }, 3),
        ).toEqual(new Set());
    });
});

describe('large dataset filtering', () => {
    it('filters 100k rows correctly and quickly', () => {
        const rows: Row[] = [];
        for (let i = 0; i < 100_000; i++) {
            rows.push({
                Region: i % 2 ? 'North' : 'South',
                Category: String(i % 100),
                Date: `2026-${String((i % 12) + 1).padStart(2, '0')}-15`,
                Amount: i,
            });
        }
        const bigCtx = { table: { ...sales, rows }, activePageId: 'p1' };
        const start = performance.now();
        const out = applyFilter(
            rows,
            filter({ values: ['North'] }),
            bigCtx,
        );
        const top = applyFilter(
            out,
            filter({
                type: 'topN',
                column: 'Category',
                topN: 5,
                topNBy: { name: 'Amount', agg: 'sum' },
            }),
            bigCtx,
        );
        const elapsed = performance.now() - start;
        expect(out).toHaveLength(50_000);
        expect(new Set(top.map((r) => r.Category)).size).toBeLessThanOrEqual(5);
        expect(elapsed).toBeLessThan(1000);
    });
});
