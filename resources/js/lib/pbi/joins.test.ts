import { describe, expect, it } from 'vitest';
import type { SchemaAnalysis } from '@/services/endpointManagerApi';
import {
    buildJoinRegistry,
    canonical,
    crossFilterRows,
    enrichRows,
    findJoin,
    resolveJoinField,
} from './joins';
import { aggregate, type TableDef, type Visual } from './model';

const sales: TableDef = {
    name: 'Sales',
    fields: [
        { table: 'Sales', name: 'ProdGroup', type: 'text' },
        { table: 'Sales', name: 'Amount', type: 'number' },
    ],
    rows: [
        { ProdGroup: 'A', Amount: 10 },
        { ProdGroup: 'A', Amount: 20 },
        { ProdGroup: 'B', Amount: 30 },
        { ProdGroup: 'X', Amount: 40 },
    ],
};

const targets: TableDef = {
    name: 'Targets',
    fields: [
        { table: 'Targets', name: 'prodgroup', type: 'text' },
        { table: 'Targets', name: 'Target', type: 'number' },
    ],
    rows: [
        { prodgroup: 'A', Target: 100 },
        { prodgroup: 'B', Target: 200 },
    ],
};

const unrelated: TableDef = {
    name: 'Unrelated',
    fields: [{ table: 'Unrelated', name: 'Label', type: 'text' }],
    rows: [{ Label: 'x' }],
};

const schema: SchemaAnalysis = {
    entries: [],
    columns: [
        {
            name: 'ProdGroup',
            type: 'string',
            endpoint_count: 2,
            sources: [],
            endpoints: [],
            distinct_values: ['A', 'B'],
        },
        {
            name: 'Solo',
            type: 'string',
            endpoint_count: 1,
            sources: [],
            endpoints: [],
            distinct_values: [],
        },
    ],
    foreign_keys: [],
    generated_at: '',
};

function makeVisual(partial: Partial<Visual>): Visual {
    return {
        id: 'v1',
        type: 'column',
        name: 'v',
        title: '',
        x: 0,
        y: 0,
        w: 100,
        h: 100,
        z: 0,
        hidden: false,
        axis: [],
        legend: [],
        values: [],
        tooltips: [],
        smallMultiples: [],
        drillFields: [],
        showTitle: false,
        showLegend: false,
        showLabels: false,
        background: '',
        border: false,
        shadow: false,
        altText: '',
        colorIndex: 0,
        analytics: [],
        conditionalFormat: false,
        subtotals: false,
        drillLevel: 0,
        ...partial,
    };
}

describe('joins', () => {
    describe('canonical', () => {
        it('trims and lowercases', () => {
            expect(canonical('  Prod_Group  ')).toBe('prod_group');
        });
    });

    describe('buildJoinRegistry', () => {
        it('keeps only confirmed shared join columns connecting two tables', () => {
            const reg = buildJoinRegistry(schema, [sales, targets, unrelated]);
            expect(Object.keys(reg).sort()).toEqual(['prodgroup']);
            expect(reg['prodgroup']!.participants).toEqual([
                { tableName: 'Sales', fieldName: 'ProdGroup' },
                { tableName: 'Targets', fieldName: 'prodgroup' },
            ]);
        });

        it('is empty when no shared join connects two loaded tables', () => {
            const reg = buildJoinRegistry(schema, [unrelated]);
            expect(reg).toEqual({});
        });
    });

    describe('findJoin', () => {
        it('resolves the join column for two related tables', () => {
            const reg = buildJoinRegistry(schema, [sales, targets]);
            expect(findJoin(reg, 'Sales', 'Targets')).toEqual({
                colInA: 'ProdGroup',
                colInB: 'prodgroup',
            });
        });

        it('returns null for unrelated tables', () => {
            const reg = buildJoinRegistry(schema, [sales, targets, unrelated]);
            expect(findJoin(reg, 'Sales', 'Unrelated')).toBeNull();
        });
    });

    describe('resolveJoinField', () => {
        it('returns the target table real field name', () => {
            const reg = buildJoinRegistry(schema, [sales, targets]);
            expect(resolveJoinField(reg, 'prodgroup', 'Targets')).toBe(
                'prodgroup',
            );
            expect(resolveJoinField(reg, 'prodgroup', 'Sales')).toBe(
                'ProdGroup',
            );
        });

        it('returns null for a non-participant table', () => {
            const reg = buildJoinRegistry(schema, [sales, targets]);
            expect(resolveJoinField(reg, 'prodgroup', 'Other')).toBeNull();
        });
    });

    describe('enrichRows', () => {
        const reg = buildJoinRegistry(schema, [sales, targets]);

        it('attaches values from a related table via the shared join column', () => {
            const visual = makeVisual({
                axis: [{ table: 'Sales', name: 'ProdGroup', agg: 'sum' }],
                values: [{ table: 'Targets', name: 'Target', agg: 'sum' }],
            });
            const out = enrichRows(visual, sales.rows, [sales, targets], reg);

            expect(out).not.toBe(sales.rows);
            expect(out[0]).toEqual({ ProdGroup: 'A', Amount: 10, Target: 100 });
            expect(out[2]).toEqual({ ProdGroup: 'B', Amount: 30, Target: 200 });
            expect(out[3]).toEqual({ ProdGroup: 'X', Amount: 40, Target: null });
            expect(aggregate(out, { table: 'Targets', name: 'Target', agg: 'sum' })).toBe(
                400,
            );
        });

        it('leaves existing columns untouched', () => {
            const visual = makeVisual({
                axis: [{ table: 'Sales', name: 'ProdGroup', agg: 'sum' }],
                values: [{ table: 'Targets', name: 'Amount', agg: 'sum' }],
            });
            const out = enrichRows(visual, sales.rows, [sales, targets], reg);
            expect(out[0]!['Amount']).toBe(10);
        });

        it('returns the same rows reference when nothing needs enrichment', () => {
            const visual = makeVisual({
                axis: [{ table: 'Sales', name: 'ProdGroup', agg: 'sum' }],
                values: [{ table: 'Sales', name: 'Amount', agg: 'sum' }],
            });
            expect(enrichRows(visual, sales.rows, [sales, targets], reg)).toBe(
                sales.rows,
            );
        });
    });

    describe('crossFilterRows', () => {
        const reg = buildJoinRegistry(schema, [sales, targets]);

        it('returns rows unchanged without a cross-filter', () => {
            expect(crossFilterRows(sales.rows, null, 'v1', 'Sales', true, 'filter', reg)).toEqual({
                rows: sales.rows,
                dim: false,
                match: null,
            });
        });

        it('ignores its own emitted filter', () => {
            const cf = { sourceId: 'v1', column: 'ProdGroup', value: 'A', table: 'Sales' };
            expect(crossFilterRows(sales.rows, cf, 'v1', 'Sales', true, 'filter', reg)).toEqual({
                rows: sales.rows,
                dim: false,
                match: null,
            });
        });

        it('filters same-table rows in filter mode', () => {
            const cf = { sourceId: 'v2', column: 'ProdGroup', value: 'A', table: 'Sales' };
            const { rows } = crossFilterRows(sales.rows, cf, 'v1', 'Sales', true, 'filter', reg);
            expect(rows).toEqual([
                { ProdGroup: 'A', Amount: 10 },
                { ProdGroup: 'A', Amount: 20 },
            ]);
        });

        it('propagates to a related table through the shared join column', () => {
            const cf = { sourceId: 'v2', column: 'ProdGroup', value: 'A', table: 'Sales' };
            const { rows } = crossFilterRows(targets.rows, cf, 'v1', 'Targets', true, 'filter', reg);
            expect(rows).toEqual([{ prodgroup: 'A', Target: 100 }]);
        });

        it('ignores cross-table filters when the column is not a shared join', () => {
            const cf = { sourceId: 'v2', column: 'Amount', value: '10', table: 'Sales' };
            const { rows } = crossFilterRows(targets.rows, cf, 'v1', 'Targets', true, 'filter', reg);
            expect(rows).toBe(targets.rows);
        });

        it('keeps all rows and returns a match predicate in highlight mode', () => {
            const cf = { sourceId: 'v2', column: 'ProdGroup', value: 'A', table: 'Sales' };
            const { rows, match } = crossFilterRows(sales.rows, cf, 'v1', 'Sales', true, 'highlight', reg);
            expect(rows).toBe(sales.rows);
            expect(match).not.toBeNull();
            expect(sales.rows.filter(match!)).toEqual([
                { ProdGroup: 'A', Amount: 10 },
                { ProdGroup: 'A', Amount: 20 },
            ]);
        });

        it('returns rows unchanged in none mode', () => {
            const cf = { sourceId: 'v2', column: 'ProdGroup', value: 'A', table: 'Sales' };
            const { rows } = crossFilterRows(sales.rows, cf, 'v1', 'Sales', true, 'none', reg);
            expect(rows).toBe(sales.rows);
        });

        it('guards the legacy table-less filter with the axis-column flag', () => {
            const cf = { sourceId: 'v2', column: 'ProdGroup', value: 'A' };
            expect(crossFilterRows(sales.rows, cf, 'v1', 'Sales', false, 'filter', reg)).toEqual({
                rows: sales.rows,
                dim: false,
                match: null,
            });
            const { rows } = crossFilterRows(sales.rows, cf, 'v1', 'Sales', true, 'filter', reg);
            expect(rows).toHaveLength(2);
        });
    });
});
