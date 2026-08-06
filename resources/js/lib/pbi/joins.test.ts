import { describe, expect, it } from 'vitest';
import type { SchemaAnalysis } from '@/services/endpointManagerApi';
import type { RelationGraph } from './graph';
import {
    buildJoinRegistry,
    canonical,
    crossFilterRows,
    enrichRows,
    findJoin,
    networkCrossFilter,
    resolveJoinField,
} from './joins';
import { aggregate, setTables, type TableDef, type Visual } from './model';

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
        minimum: [],
        maximum: [],
        target: [],
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
        maxCategories: 200,
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
            expect(out[3]).toEqual({
                ProdGroup: 'X',
                Amount: 40,
                Target: null,
            });
            expect(
                aggregate(out, {
                    table: 'Targets',
                    name: 'Target',
                    agg: 'sum',
                }),
            ).toBe(400);
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

        it('joins columns referenced by a bound measure expression', () => {
            const visual = makeVisual({
                axis: [{ table: 'Sales', name: 'ProdGroup', agg: 'sum' }],
                values: [{ table: 'Measures', name: 'Target Sum', agg: 'sum' }],
            });
            const out = enrichRows(visual, sales.rows, [sales, targets], reg, {
                'Target Sum': 'SUM(Targets[Target])',
            });

            expect(out[0]).toEqual({ ProdGroup: 'A', Amount: 10, Target: 100 });
            expect(out[2]).toEqual({ ProdGroup: 'B', Amount: 30, Target: 200 });
            expect(out[3]).toEqual({
                ProdGroup: 'X',
                Amount: 40,
                Target: null,
            });
        });

        it('resolves bare measure refs to the first table exposing the column', () => {
            setTables([sales, targets]);
            const visual = makeVisual({
                axis: [{ table: 'Sales', name: 'ProdGroup', agg: 'sum' }],
                values: [{ table: 'Measures', name: 'Target Sum', agg: 'sum' }],
            });
            const out = enrichRows(visual, sales.rows, [sales, targets], reg, {
                'Target Sum': 'SUM(Target)',
            });

            expect(out[0]).toEqual({ ProdGroup: 'A', Amount: 10, Target: 100 });
        });

        it('leaves rows unchanged when the measure references an unrelated table', () => {
            const visual = makeVisual({
                axis: [{ table: 'Sales', name: 'ProdGroup', agg: 'sum' }],
                values: [
                    { table: 'Measures', name: 'Unrelated Sum', agg: 'sum' },
                ],
            });
            const out = enrichRows(visual, sales.rows, [sales, targets], reg, {
                'Unrelated Sum': 'SUM(Unrelated[Label])',
            });

            expect(out).toBe(sales.rows);
        });
    });

    describe('crossFilterRows', () => {
        const reg = buildJoinRegistry(schema, [sales, targets]);

        // Mirrors the real endpoints: both wip_chaine and EmpDefectEff carry
        // ProdGroup but pad it to different widths (36 vs 6 trailing spaces).
        const wipProd = (v: string) => `${v}${' '.repeat(36)}`;
        const empProd = (v: string) => `${v}${' '.repeat(6)}`;
        const wipLike: TableDef = {
            name: 'WipChaine',
            fields: [
                { table: 'WipChaine', name: 'ProdGroup', type: 'text' },
                { table: 'WipChaine', name: 'WIP', type: 'number' },
            ],
            rows: [
                { ProdGroup: wipProd('CH14'), WIP: 10 },
                { ProdGroup: wipProd('CH16'), WIP: 20 },
            ],
        };
        const empLike: TableDef = {
            name: 'EmpDefectEff',
            fields: [
                { table: 'EmpDefectEff', name: 'ProdGroup', type: 'text' },
                { table: 'EmpDefectEff', name: 'Defects', type: 'number' },
            ],
            rows: [
                { ProdGroup: empProd('CH14'), Defects: 5 },
                { ProdGroup: empProd('CH16'), Defects: 7 },
                { ProdGroup: empProd('CH14A'), Defects: 9 },
            ],
        };
        const paddedReg = buildJoinRegistry(schema, [wipLike, empLike]);

        it('returns rows unchanged without a cross-filter', () => {
            expect(
                crossFilterRows(
                    sales.rows,
                    null,
                    'v1',
                    'Sales',
                    true,
                    'filter',
                    reg,
                ),
            ).toEqual({
                rows: sales.rows,
                dim: false,
                match: null,
            });
        });

        it('ignores its own emitted filter', () => {
            const cf = {
                sourceId: 'v1',
                column: 'ProdGroup',
                value: 'A',
                table: 'Sales',
            };
            expect(
                crossFilterRows(
                    sales.rows,
                    cf,
                    'v1',
                    'Sales',
                    true,
                    'filter',
                    reg,
                ),
            ).toEqual({
                rows: sales.rows,
                dim: false,
                match: null,
            });
        });

        it('filters same-table rows in filter mode', () => {
            const cf = {
                sourceId: 'v2',
                column: 'ProdGroup',
                value: 'A',
                table: 'Sales',
            };
            const { rows } = crossFilterRows(
                sales.rows,
                cf,
                'v1',
                'Sales',
                true,
                'filter',
                reg,
            );
            expect(rows).toEqual([
                { ProdGroup: 'A', Amount: 10 },
                { ProdGroup: 'A', Amount: 20 },
            ]);
        });

        it('propagates to a related table through the shared join column', () => {
            const cf = {
                sourceId: 'v2',
                column: 'ProdGroup',
                value: 'A',
                table: 'Sales',
            };
            const { rows } = crossFilterRows(
                targets.rows,
                cf,
                'v1',
                'Targets',
                true,
                'filter',
                reg,
            );
            expect(rows).toEqual([{ prodgroup: 'A', Target: 100 }]);
        });

        it('propagates cross-table filters across differently padded values', () => {
            const cf = {
                sourceId: 'v2',
                column: 'ProdGroup',
                value: wipProd('CH14'),
                table: 'WipChaine',
            };
            const { rows } = crossFilterRows(
                empLike.rows,
                cf,
                'v1',
                'EmpDefectEff',
                true,
                'filter',
                paddedReg,
            );
            expect(rows).toEqual([{ ProdGroup: empProd('CH14'), Defects: 5 }]);
        });

        it('matches highlight rows by normalized value across padding', () => {
            const cf = {
                sourceId: 'v2',
                column: 'ProdGroup',
                value: wipProd('CH16'),
                table: 'WipChaine',
            };
            const { rows, match } = crossFilterRows(
                empLike.rows,
                cf,
                'v1',
                'EmpDefectEff',
                true,
                'highlight',
                paddedReg,
            );
            expect(rows).toBe(empLike.rows);
            expect(empLike.rows.filter(match!)).toEqual([
                { ProdGroup: empProd('CH16'), Defects: 7 },
            ]);
        });

        it('does not merge distinct trimmed values when normalizing', () => {
            const cf = {
                sourceId: 'v2',
                column: 'ProdGroup',
                value: wipProd('CH14'),
                table: 'WipChaine',
            };
            const { match } = crossFilterRows(
                empLike.rows,
                cf,
                'v1',
                'EmpDefectEff',
                true,
                'highlight',
                paddedReg,
            );
            const matched = empLike.rows.filter(match!);
            expect(matched).toHaveLength(1);
            expect(matched[0]!.Defects).toBe(5);
        });

        it('ignores cross-table filters when the column is not a shared join', () => {
            const cf = {
                sourceId: 'v2',
                column: 'Amount',
                value: '10',
                table: 'Sales',
            };
            const { rows } = crossFilterRows(
                targets.rows,
                cf,
                'v1',
                'Targets',
                true,
                'filter',
                reg,
            );
            expect(rows).toBe(targets.rows);
        });

        it('keeps all rows and returns a match predicate in highlight mode', () => {
            const cf = {
                sourceId: 'v2',
                column: 'ProdGroup',
                value: 'A',
                table: 'Sales',
            };
            const { rows, match } = crossFilterRows(
                sales.rows,
                cf,
                'v1',
                'Sales',
                true,
                'highlight',
                reg,
            );
            expect(rows).toBe(sales.rows);
            expect(match).not.toBeNull();
            expect(sales.rows.filter(match!)).toEqual([
                { ProdGroup: 'A', Amount: 10 },
                { ProdGroup: 'A', Amount: 20 },
            ]);
        });

        it('returns rows unchanged in none mode', () => {
            const cf = {
                sourceId: 'v2',
                column: 'ProdGroup',
                value: 'A',
                table: 'Sales',
            };
            const { rows } = crossFilterRows(
                sales.rows,
                cf,
                'v1',
                'Sales',
                true,
                'none',
                reg,
            );
            expect(rows).toBe(sales.rows);
        });

        it('guards the legacy table-less filter with the axis-column flag', () => {
            const cf = { sourceId: 'v2', column: 'ProdGroup', value: 'A' };
            expect(
                crossFilterRows(
                    sales.rows,
                    cf,
                    'v1',
                    'Sales',
                    false,
                    'filter',
                    reg,
                ),
            ).toEqual({
                rows: sales.rows,
                dim: false,
                match: null,
            });
            const { rows } = crossFilterRows(
                sales.rows,
                cf,
                'v1',
                'Sales',
                true,
                'filter',
                reg,
            );
            expect(rows).toHaveLength(2);
        });
    });

    describe('networkCrossFilter', () => {
        const products: TableDef = {
            name: 'Products',
            fields: [{ table: 'Products', name: 'Id', type: 'text' }],
            rows: [{ Id: 'P1' }, { Id: 'P2' }],
        };
        const orders: TableDef = {
            name: 'Orders',
            fields: [{ table: 'Orders', name: 'ProductRef', type: 'text' }],
            rows: [
                { ProductRef: 'P1' },
                { ProductRef: 'P1' },
                { ProductRef: 'P2' },
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
        const cf = {
            sourceId: 'v2',
            column: 'Id',
            value: 'P1',
            table: 'Products',
        };

        it('is a no-op when the graph is empty', () => {
            const res = networkCrossFilter(
                orders.rows,
                [products, orders],
                { edges: [] },
                cf,
                'Orders',
                'filter',
            );
            expect(res).toEqual({ rows: orders.rows, dim: false, match: null });
        });

        it('in filter mode returns the target rows reachable from the seed', () => {
            const { rows } = networkCrossFilter(
                orders.rows,
                [products, orders],
                graph,
                cf,
                'Orders',
                'filter',
            );
            expect(rows).toEqual([{ ProductRef: 'P1' }, { ProductRef: 'P1' }]);
        });

        it('in highlight mode returns all rows plus a value-based match', () => {
            const { rows, match } = networkCrossFilter(
                orders.rows,
                [products, orders],
                graph,
                cf,
                'Orders',
                'highlight',
            );
            expect(rows).toBe(orders.rows);
            expect(orders.rows.filter(match!)).toEqual([
                { ProductRef: 'P1' },
                { ProductRef: 'P1' },
            ]);
        });

        it('empties the fact table when the seed matches nothing (orphan)', () => {
            const { rows } = networkCrossFilter(
                orders.rows,
                [products, orders],
                graph,
                { ...cf, value: 'P9' },
                'Orders',
                'filter',
            );
            expect(rows).toEqual([]);
        });

        it('is a no-op when the source table is unknown', () => {
            const res = networkCrossFilter(
                orders.rows,
                [products, orders],
                graph,
                { ...cf, table: 'Nope' },
                'Orders',
                'filter',
            );
            expect(res).toEqual({ rows: orders.rows, dim: false, match: null });
        });

        it('gets wired as the crossFilterRows fallback when no shared join resolves', () => {
            const { rows } = crossFilterRows(
                orders.rows,
                cf,
                'v1',
                'Orders',
                false,
                'filter',
                {},
                [products, orders],
                graph,
                true,
            );
            expect(rows).toEqual([{ ProductRef: 'P1' }, { ProductRef: 'P1' }]);
        });
    });
});
