import { describe, expect, it } from 'vitest';
import {
    applyFilter,
    applyTableRows,
    customFilterColumnsContainingValue,
    customFilterPooledValues,
    customFilterSelectedValues,
    distinctValuesForTableColumn,
    filterTableRows,
    propagateNetwork,
    relativeDateRange,
    topNValues,
    type ReportFilter,
} from './filters';
import type { RelationGraph } from './graph';
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

    it('matches values case-insensitively and after trimming whitespace', () => {
        const rows = [
            { ProdGroup: ' CH14 ' },
            { ProdGroup: 'ch14' },
            { ProdGroup: 'CH15' },
        ];
        const prodCtx = {
            table: {
                ...sales,
                name: 'Prod',
                fields: [
                    {
                        table: 'Prod',
                        name: 'ProdGroup',
                        type: 'text' as const,
                    },
                ],
                rows,
            },
            activePageId: 'p1',
        };
        const out = applyFilter(
            rows,
            filter({ column: 'ProdGroup', values: ['ch14'] }),
            prodCtx,
        );
        expect(out).toEqual([{ ProdGroup: ' CH14 ' }, { ProdGroup: 'ch14' }]);
    });

    it('filters rows to the selected values', () => {
        const out = applyFilter(sales.rows, filter({ values: ['North'] }), ctx);
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
        expect(
            applyFilter(sales.rows, filter({ values: ['Nowhere'] }), ctx),
        ).toEqual([]);
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
                filter({
                    type: 'dateRange',
                    column: 'Missing',
                    from: '2026-01-01',
                }),
                ctx,
            ),
        ).toEqual(sales.rows);
    });

    it('non-date text column is treated as day strings', () => {
        const out = applyFilter(
            sales.rows,
            filter({
                type: 'dateRange',
                column: 'Category',
                from: 'B',
                to: 'C',
            }),
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
        const out = applyFilter(rows, filter({ values: ['North'] }), bigCtx);
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

describe('propagateNetwork', () => {
    const products: TableDef = {
        name: 'Products',
        fields: [{ table: 'Products', name: 'Id', type: 'text' }],
        rows: [{ Id: 'P1' }, { Id: 'P2' }, { Id: 'P3' }, { Id: 'P4' }],
    };
    const orders: TableDef = {
        name: 'Orders',
        fields: [
            { table: 'Orders', name: 'ProductRef', type: 'text' },
            { table: 'Orders', name: 'Amount', type: 'number' },
        ],
        rows: [
            { ProductRef: 'P1', Amount: 10 },
            { ProductRef: 'P1', Amount: 20 },
            { ProductRef: 'P2', Amount: 30 },
            { ProductRef: 'P3', Amount: 40 },
        ],
    };
    const graph: RelationGraph = {
        edges: [
            {
                a: 'Orders',
                b: 'Products',
                columns: [{ colA: 'ProductRef', colB: 'Id' }],
                kind: 'fk_pk',
                confidence: 1,
            },
        ],
    };

    it('returns the same map when smartNetwork is off', () => {
        const map = {
            Products: [products.rows[0]],
            Orders: orders.rows.slice(0, 2),
        };
        expect(propagateNetwork([products, orders], map, graph, false)).toBe(
            map,
        );
    });

    it('returns the same map when the graph has no edges', () => {
        const map = {
            Products: [products.rows[0]],
            Orders: orders.rows.slice(0, 2),
        };
        expect(
            propagateNetwork([products, orders], map, { edges: [] }, true),
        ).toBe(map);
    });

    it('is a no-op with no reduced tables (bug: ON with no filters must not wipe)', () => {
        const map = { Products: products.rows, Orders: orders.rows };
        expect(propagateNetwork([products, orders], map, graph, true)).toBe(
            map,
        );
    });

    it('propagates a reduced seed outward to its neighbour', () => {
        const out = propagateNetwork(
            [products, orders],
            { Products: [products.rows[0]], Orders: orders.rows },
            graph,
            true,
        );
        expect(out.Products).toHaveLength(1);
        expect(out.Orders).toHaveLength(2);
        expect(out.Orders.every((r) => r.ProductRef === 'P1')).toBe(true);
    });

    it('keeps an orphan seed and empties the unrelated fact table', () => {
        // P4 appears in Products but in no Orders row.
        const out = propagateNetwork(
            [products, orders],
            { Products: [products.rows[3]], Orders: orders.rows },
            graph,
            true,
        );
        expect(out.Products).toEqual([products.rows[3]]);
        expect(out.Orders).toEqual([]);
    });

    it('enforces composite tuples and excludes phantom cross-product matches', () => {
        const itemTrx: TableDef = {
            name: 'ItemTrxEnq',
            fields: [
                { table: 'ItemTrxEnq', name: 'TerminalNo', type: 'text' },
                { table: 'ItemTrxEnq', name: 'ShiftCode', type: 'text' },
                { table: 'ItemTrxEnq', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                {
                    TerminalNo: 'T5',
                    ShiftCode: 'Morning',
                    ProdGroup: 'LineA',
                },
                { TerminalNo: 'T5', ShiftCode: 'Night', ProdGroup: 'LineB' },
                {
                    TerminalNo: 'T9',
                    ShiftCode: 'Morning',
                    ProdGroup: 'LineC',
                },
            ],
        };
        const defects: TableDef = {
            name: 'EmpDefectEff',
            fields: [
                { table: 'EmpDefectEff', name: 'ShiftCode', type: 'text' },
                { table: 'EmpDefectEff', name: 'ProdGroup', type: 'text' },
            ],
            rows: [
                { ShiftCode: 'Morning', ProdGroup: 'LineA' },
                { ShiftCode: 'Morning', ProdGroup: 'LineB' },
                { ShiftCode: 'Night', ProdGroup: 'LineC' },
            ],
        };
        const composite: RelationGraph = {
            edges: [
                {
                    a: 'ItemTrxEnq',
                    b: 'EmpDefectEff',
                    columns: [
                        { colA: 'ShiftCode', colB: 'ShiftCode' },
                        { colA: 'ProdGroup', colB: 'ProdGroup' },
                    ],
                    kind: 'shared',
                    confidence: 1,
                },
            ],
        };

        const out = propagateNetwork(
            [itemTrx, defects],
            {
                ItemTrxEnq: itemTrx.rows.filter(
                    (row) => row.TerminalNo === 'T5',
                ),
                EmpDefectEff: defects.rows,
            },
            composite,
            true,
        );

        expect(out.EmpDefectEff).toEqual([
            { ShiftCode: 'Morning', ProdGroup: 'LineA' },
        ]);
    });

    it('does not wipe neighbours when composite keys are unexpressible', () => {
        // Real endpoints: wip_chaine (ProdGroup, 36 trailing spaces) links to
        // EmpDefectEff via a plain ProdGroup edge; EmpDefectEff and Production
        // link by the [shiftcode, prodgroup, logdate] composite. The captured
        // sample stores `LogDate: ''` (empty array), so no composite row can
        // form a key. Constraining must leave neighbours untouched rather than
        // collapse them to empty and cascade back through the cycle.
        const wipPad = (v: string) => `${v}${' '.repeat(36)}`;
        const pad = (v: string) => `${v}${' '.repeat(6)}`;
        const wipChaine: TableDef = {
            name: 'WipChaine',
            fields: [{ table: 'WipChaine', name: 'ProdGroup', type: 'text' }],
            rows: [
                { ProdGroup: wipPad('CH14') },
                { ProdGroup: wipPad('CH16') },
            ],
        };
        const empDefectEff: TableDef = {
            name: 'EmpDefectEff',
            fields: [
                { table: 'EmpDefectEff', name: 'ShiftCode', type: 'text' },
                { table: 'EmpDefectEff', name: 'ProdGroup', type: 'text' },
                { table: 'EmpDefectEff', name: 'LogDate', type: 'text' },
            ],
            rows: [
                {
                    ShiftCode: 'JOUR      ',
                    ProdGroup: pad('CH14'),
                    LogDate: '',
                },
                {
                    ShiftCode: 'JOUR      ',
                    ProdGroup: pad('CH16'),
                    LogDate: '',
                },
            ],
        };
        const production: TableDef = {
            name: 'Production',
            fields: [
                { table: 'Production', name: 'ShiftCode', type: 'text' },
                { table: 'Production', name: 'ProdGroup', type: 'text' },
                { table: 'Production', name: 'LogDate', type: 'text' },
            ],
            rows: [
                {
                    ShiftCode: 'JOUR      ',
                    ProdGroup: pad('CH14'),
                    LogDate: '',
                },
                {
                    ShiftCode: 'JOUR      ',
                    ProdGroup: pad('CH99'),
                    LogDate: '',
                },
            ],
        };
        const net: RelationGraph = {
            edges: [
                {
                    a: 'WipChaine',
                    b: 'EmpDefectEff',
                    columns: [{ colA: 'ProdGroup', colB: 'ProdGroup' }],
                    kind: 'shared',
                    confidence: 1,
                },
                {
                    a: 'EmpDefectEff',
                    b: 'Production',
                    columns: [
                        { colA: 'ShiftCode', colB: 'ShiftCode' },
                        { colA: 'ProdGroup', colB: 'ProdGroup' },
                        { colA: 'LogDate', colB: 'LogDate' },
                    ],
                    kind: 'shared',
                    confidence: 1,
                },
                {
                    a: 'Production',
                    b: 'EmpDefectEff',
                    columns: [
                        { colA: 'ShiftCode', colB: 'ShiftCode' },
                        { colA: 'ProdGroup', colB: 'ProdGroup' },
                        { colA: 'LogDate', colB: 'LogDate' },
                    ],
                    kind: 'shared',
                    confidence: 1,
                },
            ],
        };
        const out = propagateNetwork(
            [wipChaine, empDefectEff, production],
            {
                WipChaine: [wipChaine.rows[0]],
                EmpDefectEff: empDefectEff.rows,
                Production: production.rows,
            },
            net,
            true,
        );
        expect(out.EmpDefectEff).toEqual([
            { ShiftCode: 'JOUR      ', ProdGroup: pad('CH14'), LogDate: '' },
        ]);
        expect(out.Production).toEqual(production.rows);
    });

    it('does not cascade emptiness from an orphaned table onto the target chart', () => {
        // Mirrors the real report: wip_chaine + EmpDefectEff charts, plus the
        // other loaded endpoints that share ProdGroup but contain no CH14 rows
        // (ItemTrxEnq, Production, minutes_presence...). Those tables become
        // empty (orphans) and must not wipe the related chart tables back to
        // "Aucune donnée".
        const wipPad = (v: string) => `${v}${' '.repeat(36)}`;
        const pad = (v: string) => `${v}${' '.repeat(6)}`;
        const wipChaine: TableDef = {
            name: 'WipChaine',
            fields: [{ table: 'WipChaine', name: 'ProdGroup', type: 'text' }],
            rows: [
                { ProdGroup: wipPad('CH14') },
                { ProdGroup: wipPad('CH16') },
            ],
        };
        const empDefectEff: TableDef = {
            name: 'EmpDefectEff',
            fields: [
                { table: 'EmpDefectEff', name: 'ProdGroup', type: 'text' },
            ],
            rows: [{ ProdGroup: pad('CH14') }, { ProdGroup: pad('CH16') }],
        };
        const orphan: TableDef = {
            name: 'ItemTrxEnq',
            fields: [{ table: 'ItemTrxEnq', name: 'ProdGroup', type: 'text' }],
            rows: [{ ProdGroup: pad('CH05') }, { ProdGroup: pad('CH08') }],
        };
        const graph: RelationGraph = {
            edges: [
                {
                    a: 'WipChaine',
                    b: 'EmpDefectEff',
                    columns: [{ colA: 'ProdGroup', colB: 'ProdGroup' }],
                    kind: 'shared',
                    confidence: 1,
                },
                {
                    a: 'WipChaine',
                    b: 'ItemTrxEnq',
                    columns: [{ colA: 'ProdGroup', colB: 'ProdGroup' }],
                    kind: 'shared',
                    confidence: 1,
                },
                {
                    a: 'ItemTrxEnq',
                    b: 'EmpDefectEff',
                    columns: [{ colA: 'ProdGroup', colB: 'ProdGroup' }],
                    kind: 'shared',
                    confidence: 1,
                },
            ],
        };
        const out = propagateNetwork(
            [wipChaine, empDefectEff, orphan],
            {
                WipChaine: [wipChaine.rows[0]],
                EmpDefectEff: empDefectEff.rows,
                ItemTrxEnq: orphan.rows,
            },
            graph,
            true,
        );
        expect(out.WipChaine).toEqual([{ ProdGroup: wipPad('CH14') }]);
        expect(out.EmpDefectEff).toEqual([{ ProdGroup: pad('CH14') }]);
        expect(out.ItemTrxEnq).toEqual([]);
    });

    it('does not let an empty seed wipe its neighbours (CH01 vs Chaine)', () => {
        // Mirrors the real report: a custom filter merges ProdGroup (which
        // holds CH01) with Chaine (whose domain is only SRG). Selecting CH01
        // empties the Chaine-keyed table directly, but that emptiness must not
        // cascade outward and wipe the neighbouring serigraphie table.
        const qte: TableDef = {
            name: 'Qte',
            fields: [
                { table: 'Qte', name: 'Chaine', type: 'text' },
                { table: 'Qte', name: 'OF_No', type: 'text' },
            ],
            rows: [{ Chaine: 'SRG', OF_No: 'OF1' }],
        };
        const sortie: TableDef = {
            name: 'Sortie',
            fields: [{ table: 'Sortie', name: 'Commande', type: 'text' }],
            rows: [{ Commande: 'OF1' }, { Commande: 'OF2' }],
        };
        const net: RelationGraph = {
            edges: [
                {
                    a: 'Qte',
                    b: 'Sortie',
                    columns: [{ colA: 'OF_No', colB: 'Commande' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
            ],
        };
        const out = propagateNetwork(
            [qte, sortie],
            { Qte: [], Sortie: sortie.rows },
            net,
            true,
        );
        expect(out.Qte).toEqual([]);
        expect(out.Sortie).toEqual(sortie.rows);
    });

    it('empty seed still allows its non-empty neighbour to constrain onward', () => {
        // qte becomes empty (no CH01), but a full chain exists and must still
        // propagate its constraint through the graph without being erased by
        // the empty sibling.
        const chain: TableDef = {
            name: 'Chain',
            fields: [{ table: 'Chain', name: 'Commande', type: 'text' }],
            rows: [{ Commande: 'OF1' }, { Commande: 'OF2' }],
        };
        const qte: TableDef = {
            name: 'Qte',
            fields: [
                { table: 'Qte', name: 'Chaine', type: 'text' },
                { table: 'Qte', name: 'OF_No', type: 'text' },
            ],
            rows: [{ Chaine: 'SRG', OF_No: 'OF1' }],
        };
        const sortie: TableDef = {
            name: 'Sortie',
            fields: [{ table: 'Sortie', name: 'Commande', type: 'text' }],
            rows: [{ Commande: 'OF1' }, { Commande: 'OF2' }],
        };
        const net: RelationGraph = {
            edges: [
                {
                    a: 'Qte',
                    b: 'Sortie',
                    columns: [{ colA: 'OF_No', colB: 'Commande' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
                {
                    a: 'Sortie',
                    b: 'Chain',
                    columns: [{ colA: 'Commande', colB: 'Commande' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
            ],
        };
        const out = propagateNetwork(
            [chain, qte, sortie],
            {
                Chain: chain.rows,
                Qte: [],
                Sortie: [{ Commande: 'OF1' }],
            },
            net,
            true,
        );
        expect(out.Chain).toEqual([{ Commande: 'OF1' }]);
    });

    it('does not constrain a seed back through a cyclic graph', () => {
        const a: TableDef = {
            name: 'A',
            fields: [{ table: 'A', name: 'Id', type: 'text' }],
            rows: [{ Id: 'x' }, { Id: 'y' }],
        };
        const b: TableDef = {
            name: 'B',
            fields: [{ table: 'B', name: 'Id', type: 'text' }],
            rows: [{ Id: 'x' }, { Id: 'y' }, { Id: 'z' }],
        };
        const cyclic: RelationGraph = {
            edges: [
                {
                    a: 'A',
                    b: 'B',
                    columns: [{ colA: 'Id', colB: 'Id' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
                {
                    a: 'B',
                    b: 'A',
                    columns: [{ colA: 'Id', colB: 'Id' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
            ],
        };
        const out = propagateNetwork(
            [a, b],
            { A: [a.rows[0]], B: b.rows },
            cyclic,
            true,
        );
        expect(out.A).toEqual([a.rows[0]]);
        expect(out.B).toEqual([b.rows[0]]);
    });
});

describe('filterTableRows', () => {
    const products: TableDef = {
        name: 'Products',
        fields: [{ table: 'Products', name: 'Id', type: 'text' }],
        rows: [{ Id: 'P1' }, { Id: 'P2' }, { Id: 'P3' }],
    };
    const orders: TableDef = {
        name: 'Orders',
        fields: [
            { table: 'Orders', name: 'ProductRef', type: 'text' },
            { table: 'Orders', name: 'Amount', type: 'number' },
        ],
        rows: [
            { ProductRef: 'P1', Amount: 10 },
            { ProductRef: 'P2', Amount: 30 },
        ],
    };
    const graph: RelationGraph = {
        edges: [
            {
                a: 'Orders',
                b: 'Products',
                columns: [{ colA: 'ProductRef', colB: 'Id' }],
                kind: 'fk_pk',
                confidence: 1,
            },
        ],
    };

    it('applies per-table filters then propagates reductions across the network', () => {
        const out = filterTableRows(
            [products, orders],
            [
                {
                    column: 'Id',
                    table: 'Products',
                    values: ['P1'],
                    scope: 'report',
                    type: 'list',
                },
            ],
            graph,
        );
        expect(out.Products).toHaveLength(1);
        expect(out.Orders).toHaveLength(1);
        expect(out.Orders[0]!.ProductRef).toBe('P1');
    });

    it('propagates a normalized ProdGroup filter across a shared join edge', () => {
        const pad = (value: string) => `${value}${' '.repeat(12)}`;
        const wipChaine: TableDef = {
            name: 'WipChaine',
            fields: [{ table: 'WipChaine', name: 'ProdGroup', type: 'text' }],
            rows: [{ ProdGroup: pad('CH14') }, { ProdGroup: pad('CH16') }],
        };
        const empDefectEff: TableDef = {
            name: 'EmpDefectEff',
            fields: [
                { table: 'EmpDefectEff', name: 'ProdGroup', type: 'text' },
                { table: 'EmpDefectEff', name: 'ShiftCode', type: 'text' },
            ],
            rows: [
                { ProdGroup: 'CH14', ShiftCode: 'JOUR' },
                { ProdGroup: 'CH16', ShiftCode: 'JOUR' },
            ],
        };
        const graph: RelationGraph = {
            edges: [
                {
                    a: 'WipChaine',
                    b: 'EmpDefectEff',
                    columns: [{ colA: 'ProdGroup', colB: 'ProdGroup' }],
                    kind: 'shared',
                    confidence: 1,
                },
            ],
        };

        const out = filterTableRows(
            [wipChaine, empDefectEff],
            [
                {
                    column: 'ProdGroup',
                    table: 'WipChaine',
                    values: ['CH14'],
                    scope: 'report',
                    type: 'list',
                },
            ],
            graph,
        );

        expect(out.WipChaine).toEqual([{ ProdGroup: pad('CH14') }]);
        expect(out.EmpDefectEff).toEqual([
            { ProdGroup: 'CH14', ShiftCode: 'JOUR' },
        ]);
    });

    it('without a graph it only filters the targeted table', () => {
        const out = filterTableRows(
            [products, orders],
            [
                {
                    column: 'Id',
                    table: 'Products',
                    values: ['P1'],
                    scope: 'report',
                    type: 'list',
                },
            ],
        );
        expect(out.Products).toHaveLength(1);
        expect(out.Orders).toHaveLength(2);
    });

    it('custom filters keep distinct values scoped per table column', () => {
        expect(
            distinctValuesForTableColumn([products, orders], 'Products', 'Id'),
        ).toEqual(['P1', 'P2', 'P3']);
        expect(
            distinctValuesForTableColumn(
                [products, orders],
                'Orders',
                'ProductRef',
            ),
        ).toEqual(['P1', 'P2']);
    });
    it('custom filters apply selected values per selected column', () => {
        const out = filterTableRows(
            [products, orders],
            [
                filter({
                    kind: 'custom',
                    column: 'Product',
                    label: 'Product',
                    values: [],
                    columns: [
                        {
                            table: 'Products',
                            column: 'Id',
                            values: ['P1'],
                        },
                        {
                            table: 'Orders',
                            column: 'ProductRef',
                            values: ['P1'],
                        },
                    ],
                }),
            ],
            graph,
        );
        expect(out.Products).toEqual([{ Id: 'P1' }]);
        expect(out.Orders).toEqual([{ ProductRef: 'P1', Amount: 10 }]);
    });

    it('custom filter values are OR per column and AND with other filters', () => {
        const out = filterTableRows(
            [products, orders],
            [
                filter({
                    kind: 'custom',
                    column: 'Product',
                    label: 'Product',
                    values: [],
                    columns: [
                        {
                            table: 'Products',
                            column: 'Id',
                            values: ['P1', 'P2'],
                        },
                        {
                            table: 'Orders',
                            column: 'ProductRef',
                            values: ['P1', 'P2'],
                        },
                    ],
                }),
                {
                    column: 'Amount',
                    table: 'Orders',
                    values: [],
                    scope: 'report',
                    type: 'topN',
                    topN: 1,
                    topNBy: { name: 'Amount', agg: 'sum' },
                },
            ],
            graph,
        );
        expect(out.Products).toEqual([{ Id: 'P2' }]);
        expect(out.Orders).toEqual([{ ProductRef: 'P2', Amount: 30 }]);
    });

    it('propagates custom filters across a multi-hop relationship path', () => {
        const families: TableDef = {
            name: 'Families',
            fields: [{ table: 'Families', name: 'FamilyId', type: 'text' }],
            rows: [{ FamilyId: 'F1' }, { FamilyId: 'F2' }],
        };
        const productFamilies: TableDef = {
            name: 'ProductFamilies',
            fields: [
                { table: 'ProductFamilies', name: 'FamilyRef', type: 'text' },
                { table: 'ProductFamilies', name: 'ProductId', type: 'text' },
            ],
            rows: [
                { FamilyRef: 'F1', ProductId: 'P1' },
                { FamilyRef: 'F2', ProductId: 'P2' },
            ],
        };
        const salesByProduct: TableDef = {
            name: 'SalesByProduct',
            fields: [
                { table: 'SalesByProduct', name: 'ProductRef', type: 'text' },
                { table: 'SalesByProduct', name: 'Amount', type: 'number' },
            ],
            rows: [
                { ProductRef: 'P1', Amount: 10 },
                { ProductRef: 'P2', Amount: 20 },
            ],
        };
        const multiHop: RelationGraph = {
            edges: [
                {
                    a: 'Families',
                    b: 'ProductFamilies',
                    columns: [{ colA: 'FamilyId', colB: 'FamilyRef' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
                {
                    a: 'ProductFamilies',
                    b: 'SalesByProduct',
                    columns: [{ colA: 'ProductId', colB: 'ProductRef' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
            ],
        };
        const out = filterTableRows(
            [families, productFamilies, salesByProduct],
            [
                filter({
                    kind: 'custom',
                    column: 'Family',
                    label: 'Family',
                    values: [],
                    columns: [
                        {
                            table: 'Families',
                            column: 'FamilyId',
                            values: ['F1'],
                        },
                    ],
                }),
            ],
            multiHop,
        );
        expect(out.Families).toEqual([{ FamilyId: 'F1' }]);
        expect(out.ProductFamilies).toEqual([
            { FamilyRef: 'F1', ProductId: 'P1' },
        ]);
        expect(out.SalesByProduct).toEqual([{ ProductRef: 'P1', Amount: 10 }]);
    });
});

describe('custom filter pooled values (consolidated single list)', () => {
    const products: TableDef = {
        name: 'Products',
        fields: [{ table: 'Products', name: 'Id', type: 'text' }],
        rows: [{ Id: 'P1' }, { Id: 'P2' }, { Id: 'P3' }],
    };
    const orders: TableDef = {
        name: 'Orders',
        fields: [{ table: 'Orders', name: 'ProductRef', type: 'text' }],
        rows: [
            { ProductRef: 'P1' },
            { ProductRef: 'P2' },
            { ProductRef: 'P3' },
        ],
    };
    const custom = (
        columns: { table: string; column: string }[],
    ): ReportFilter =>
        filter({
            kind: 'custom',
            column: 'Produit',
            label: 'Produit',
            values: [],
            columns: columns.map((c) => ({ ...c, values: [] })),
        });

    it('pools distinct values across columns into one sorted list', () => {
        const out = customFilterPooledValues(
            custom([
                { table: 'Products', column: 'Id' },
                { table: 'Orders', column: 'ProductRef' },
            ]),
            [products, orders],
        );
        expect(out).toEqual(['P1', 'P2', 'P3']);
    });

    it('removes duplicates across columns (shared values overlap)', () => {
        const out = customFilterPooledValues(
            custom([
                { table: 'Products', column: 'Id' },
                { table: 'Orders', column: 'ProductRef' },
            ]),
            [products, orders],
        );
        expect(out).toEqual(['P1', 'P2', 'P3']);
    });

    it('merges disjoint value domains into a single flat list', () => {
        const regions: TableDef = {
            name: 'Regions',
            fields: [{ table: 'Regions', name: 'Name', type: 'text' }],
            rows: [{ Name: 'North' }, { Name: 'South' }],
        };
        const out = customFilterPooledValues(
            custom([
                { table: 'Products', column: 'Id' },
                { table: 'Regions', column: 'Name' },
            ]),
            [products, regions],
        );
        expect(out).toEqual(['North', 'P1', 'P2', 'P3', 'South']);
    });

    it('respects the provided (filtered) rows for the stripped result', () => {
        const out = customFilterPooledValues(
            custom([{ table: 'Products', column: 'Id' }]),
            [products, orders],
            { Products: [{ Id: 'P2' }] },
        );
        expect(out).toEqual(['P2']);
    });

    it('returns empty for non-custom filters', () => {
        expect(
            customFilterPooledValues(
                { column: 'Id', values: [], scope: 'report', type: 'list' },
                [products],
            ),
        ).toEqual([]);
    });

    it('reports only the columns that actually contain a value', () => {
        const f = custom([
            { table: 'Products', column: 'Id' },
            { table: 'Orders', column: 'ProductRef' },
        ]);
        expect(
            customFilterColumnsContainingValue(f, [products, orders], 'P1').map(
                (c) => `${c.table}.${c.column}`,
            ),
        ).toEqual(['Products.Id', 'Orders.ProductRef']);
        expect(
            customFilterColumnsContainingValue(
                f,
                [products, orders],
                'Nowhere',
            ),
        ).toEqual([]);
    });

    it('gathers the distinct selected pooled values across columns', () => {
        const f: ReportFilter = {
            kind: 'custom',
            column: 'Produit',
            label: 'Produit',
            values: [],
            scope: 'report',
            type: 'list',
            columns: [
                { table: 'Products', column: 'Id', values: ['P1', 'P2'] },
                { table: 'Orders', column: 'ProductRef', values: ['P2', 'P3'] },
            ],
        };
        expect(customFilterSelectedValues(f)).toEqual(['P1', 'P2', 'P3']);
    });

    it('consolidates the pooled selection onto every containing column then narrows related endpoints', () => {
        const graph: RelationGraph = {
            edges: [
                {
                    a: 'Orders',
                    b: 'Products',
                    columns: [{ colA: 'ProductRef', colB: 'Id' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
            ],
        };
        // Simulate the store's pooled toggle: value applied to every column
        // that contains it (here P1 lives in both tables' value pools).
        const f: ReportFilter = {
            kind: 'custom',
            column: 'Produit',
            label: 'Produit',
            values: [],
            scope: 'report',
            type: 'list',
            columns: [
                { table: 'Products', column: 'Id', values: ['P1'] },
                { table: 'Orders', column: 'ProductRef', values: ['P1'] },
            ],
        };
        const out = filterTableRows([products, orders], [f], graph);
        expect(out.Products).toEqual([{ Id: 'P1' }]);
        expect(out.Orders).toEqual([{ ProductRef: 'P1' }]);
    });

    it('applies the pooled selection to every selected key column, emptying tables whose key never holds the value', () => {
        // Simulates the user's CH01/SRG scenario: one endpoint's ProdGroup
        // only carries SRG, another carries CH01. The store's pooled toggle
        // stores CH01 only on the column that contains it, but the filter must
        // still constrain the SRG-only table down to nothing.
        const wip: TableDef = {
            name: 'wip',
            fields: [
                { table: 'wip', name: 'ProdGroup', type: 'text' },
                { table: 'wip', name: 'Rows', type: 'number' },
            ],
            rows: [
                { ProdGroup: 'CH01', Rows: 1 },
                { ProdGroup: 'SRG', Rows: 2 },
            ],
        };
        const eff: TableDef = {
            name: 'eff',
            fields: [
                { table: 'eff', name: 'ProdGroup', type: 'text' },
                { table: 'eff', name: 'Rows', type: 'number' },
            ],
            rows: [{ ProdGroup: 'SRG', Rows: 3 }],
        };
        const f: ReportFilter = {
            kind: 'custom',
            column: 'Prod',
            label: 'Prod',
            values: [],
            scope: 'report',
            type: 'list',
            columns: [
                // Pooled toggle only wrote CH01 onto the column containing it.
                { table: 'wip', column: 'ProdGroup', values: ['CH01'] },
                { table: 'eff', column: 'ProdGroup', values: [] },
            ],
        };
        const out = filterTableRows([wip, eff], [f]);
        expect(out.wip).toEqual([{ ProdGroup: 'CH01', Rows: 1 }]);
        expect(out.eff).toEqual([]);
    });

    it('keeps matching rows in every selected endpoint that contains the pooled value', () => {
        const wip: TableDef = {
            name: 'wip',
            fields: [
                { table: 'wip', name: 'ProdGroup', type: 'text' },
                { table: 'wip', name: 'Rows', type: 'number' },
            ],
            rows: [
                { ProdGroup: 'CH01', Rows: 1 },
                { ProdGroup: 'SRG', Rows: 2 },
            ],
        };
        const eff: TableDef = {
            name: 'eff',
            fields: [
                { table: 'eff', name: 'ProdGroup', type: 'text' },
                { table: 'eff', name: 'Rows', type: 'number' },
            ],
            rows: [{ ProdGroup: 'CH01', Rows: 3 }],
        };
        const f: ReportFilter = {
            kind: 'custom',
            column: 'Prod',
            label: 'Prod',
            values: [],
            scope: 'report',
            type: 'list',
            columns: [
                { table: 'wip', column: 'ProdGroup', values: ['CH01'] },
                { table: 'eff', column: 'ProdGroup', values: ['CH01'] },
            ],
        };
        const out = filterTableRows([wip, eff], [f]);
        expect(out.wip).toEqual([{ ProdGroup: 'CH01', Rows: 1 }]);
        expect(out.eff).toEqual([{ ProdGroup: 'CH01', Rows: 3 }]);
    });

    it('matches a row when any of its key columns holds a pooled value (OR across columns)', () => {
        const wip: TableDef = {
            name: 'wip',
            fields: [
                { table: 'wip', name: 'ProdGroup', type: 'text' },
                { table: 'wip', name: 'Chaine', type: 'text' },
                { table: 'wip', name: 'Rows', type: 'number' },
            ],
            rows: [
                { ProdGroup: 'CH01', Chaine: 'C2', Rows: 1 },
                { ProdGroup: 'SRG', Chaine: 'CH01', Rows: 2 },
                { ProdGroup: 'SRG', Chaine: 'C3', Rows: 3 },
            ],
        };
        const f: ReportFilter = {
            kind: 'custom',
            column: 'Prod',
            label: 'Prod',
            values: [],
            scope: 'report',
            type: 'list',
            columns: [
                { table: 'wip', column: 'ProdGroup', values: ['CH01'] },
                { table: 'wip', column: 'Chaine', values: [] },
            ],
        };
        const out = filterTableRows([wip], [f]);
        expect(out.wip).toEqual([
            { ProdGroup: 'CH01', Chaine: 'C2', Rows: 1 },
            { ProdGroup: 'SRG', Chaine: 'CH01', Rows: 2 },
        ]);
    });

    it('applies the pooled multi-value selection across every key column', () => {
        const wip: TableDef = {
            name: 'wip',
            fields: [
                { table: 'wip', name: 'ProdGroup', type: 'text' },
                { table: 'wip', name: 'Rows', type: 'number' },
            ],
            rows: [
                { ProdGroup: 'CH01', Rows: 1 },
                { ProdGroup: 'SRG', Rows: 2 },
            ],
        };
        const eff: TableDef = {
            name: 'eff',
            fields: [
                { table: 'eff', name: 'ProdGroup', type: 'text' },
                { table: 'eff', name: 'Rows', type: 'number' },
            ],
            rows: [
                { ProdGroup: 'SRG', Rows: 3 },
                { ProdGroup: 'CH02', Rows: 4 },
            ],
        };
        const f: ReportFilter = {
            kind: 'custom',
            column: 'Prod',
            label: 'Prod',
            values: [],
            scope: 'report',
            type: 'list',
            columns: [
                { table: 'wip', column: 'ProdGroup', values: ['CH01', 'SRG'] },
                { table: 'eff', column: 'ProdGroup', values: ['SRG'] },
            ],
        };
        const out = filterTableRows([wip, eff], [f]);
        expect(out.wip).toEqual([
            { ProdGroup: 'CH01', Rows: 1 },
            { ProdGroup: 'SRG', Rows: 2 },
        ]);
        expect(out.eff).toEqual([{ ProdGroup: 'SRG', Rows: 3 }]);
    });
});

describe('applyTableRows', () => {
    it('replaces rows per table while preserving identity and schema', () => {
        const tables: TableDef[] = [
            { ...sales, slug: 'sales/1', label: 'Sales', object: 'sales' },
            {
                name: 'Empty',
                fields: [{ table: 'Empty', name: 'X', type: 'number' }],
                rows: [{ X: 1 }],
                slug: 'empty/1',
            },
        ];
        const out = applyTableRows(tables, {
            Sales: [sales.rows[0]!],
            Empty: [],
        });
        expect(out[0]).toEqual({
            ...tables[0],
            rows: [sales.rows[0]],
        });
        expect(out[0]!.slug).toBe('sales/1');
        expect(out[1]!.rows).toEqual([]);
    });

    it('keeps the full row set for tables with no filtered entry', () => {
        const out = applyTableRows([sales], {});
        expect(out[0]!.rows).toEqual(sales.rows);
    });

    it('keeps field schemas intact after filtering rows', () => {
        const out = applyTableRows([sales], {
            Sales: sales.rows.slice(0, 2),
        });
        expect(out[0]!.fields).toEqual(sales.fields);
        expect(out[0]!.rows).toEqual(sales.rows.slice(0, 2));
    });
});
