import { describe, expect, it } from 'vitest';
import {
    aggregate,
    buildChartData,
    compileMeasure,
    fieldLabel,
    inferFieldType,
    isMeasure,
    measureLabel,
    normalizeWellField,
    parseDaxRef,
    parseFieldReference,
    registerMeasure,
    setTables,
    type TableDef,
} from './model';
import { slicerKey } from './store';

const table: TableDef = {
    name: 'wip_chaine',
    fields: [
        { table: 'wip_chaine', name: 'ProdGroup', type: 'text' },
        { table: 'wip_chaine', name: 'WIP_Chaine', type: 'number' },
    ],
    rows: [
        { ProdGroup: 'CH01', WIP_Chaine: 10 },
        { ProdGroup: 'CH01', WIP_Chaine: 5 },
        { ProdGroup: 'CH02', WIP_Chaine: 7 },
    ],
};

describe('PBI field references', () => {
    it('unwraps plain, object, and JSON drag references', () => {
        expect(parseFieldReference('WIP_Chaine', 'wip_chaine')).toEqual({
            name: 'WIP_Chaine',
            table: 'wip_chaine',
        });
        expect(parseFieldReference({ table: 'wip_chaine', name: 'WIP_Chaine' })).toEqual({
            name: 'WIP_Chaine',
            table: 'wip_chaine',
        });
        expect(parseFieldReference('{"table":"wip_chaine","name":"WIP_Chaine"}')).toEqual({
            name: 'WIP_Chaine',
            table: 'wip_chaine',
        });
    });

    it('rejects malformed JSON-shaped values and preserves aliases', () => {
        expect(parseFieldReference('{"table":"wip_chaine"}')).toBeNull();
        expect(parseFieldReference('{bad json')).toBeNull();
        expect(normalizeWellField({
            table: 'wip_chaine',
            name: '{"table":"wip_chaine","name":"WIP_Chaine"}',
            agg: 'sum',
            label: 'Total Sales',
        })).toEqual({
            table: 'wip_chaine',
            name: 'WIP_Chaine',
            agg: 'sum',
            label: 'Total Sales',
        });
    });
});

describe('PBI slicer keys', () => {
    it('keeps equal column names from different tables separate', () => {
        expect(slicerKey('first', 'ProdGroup', 'CH01')).not.toBe(
            slicerKey('second', 'ProdGroup', 'CH01'),
        );
        expect(slicerKey('first', 'ProdGroup', 'A::B')).toContain('A::B');
    });
});

describe('PBI chart aggregation', () => {
    it('groups and sums the physical JSON column name', () => {
        setTables([table]);
        const value = { table: 'wip_chaine', name: 'WIP_Chaine', agg: 'sum' as const };
        const result = buildChartData(
            table.rows,
            [{ table: 'wip_chaine', name: 'ProdGroup', agg: 'count' }],
            [],
            [value],
        );

        expect(result.series).toEqual(['Sum of WIP_Chaine']);
        expect(result.data).toEqual([
            { category: 'CH01', 'Sum of WIP_Chaine': 15 },
            { category: 'CH02', 'Sum of WIP_Chaine': 7 },
        ]);
    });

    it('aggregates deterministic numeric edge cases without treating blanks as zero', () => {
        setTables([
            {
                name: 'sales',
                fields: [
                    { table: 'sales', name: 'Amount', type: 'number' },
                    { table: 'sales', name: 'DecimalAmount', type: 'number' },
                ],
                rows: [],
            },
        ]);
        const rows = [
            { Amount: 10, DecimalAmount: 1.5 },
            { Amount: 0, DecimalAmount: -0.5 },
            { Amount: -4, DecimalAmount: null },
            { Amount: null, DecimalAmount: 2.5 },
        ];
        const field = (name: string, agg: 'sum' | 'avg' | 'count' | 'distinct' | 'min' | 'max') => ({
            table: 'sales',
            name,
            agg,
        });

        expect(aggregate(rows, field('Amount', 'sum'))).toBe(6);
        expect(aggregate(rows, field('Amount', 'avg'))).toBe(2);
        expect(aggregate(rows, field('Amount', 'count'))).toBe(3);
        expect(aggregate(rows, field('Amount', 'distinct'))).toBe(4);
        expect(aggregate(rows, field('Amount', 'min'))).toBe(-4);
        expect(aggregate(rows, field('Amount', 'max'))).toBe(10);
        expect(measureLabel(field('Amount', 'sum'))).toBe('Sum of Amount');
        expect(measureLabel(field('Amount', 'avg'))).toBe('Average of Amount');
        expect(measureLabel(field('Amount', 'count'))).toBe('Count of Amount');
        expect(measureLabel(field('Amount', 'distinct'))).toBe('Distinct count of Amount');
        expect(measureLabel(field('Amount', 'min'))).toBe('Min of Amount');
        expect(measureLabel(field('Amount', 'max'))).toBe('Max of Amount');
    });

    it('infers all supported fixture field types and handles empty rows', () => {
        expect(inferFieldType([1, 0, -2, 1.5, null])).toBe('number');
        expect(inferFieldType(['2026-01-01', '2026-01-02', null])).toBe('date');
        expect(inferFieldType([true, false, null])).toBe('boolean');
        expect(inferFieldType(['A', 'B', ''])).toBe('text');
        expect(inferFieldType([])).toBe('text');
    });

    it('supports aggregation changes and friendly aliases', () => {
        setTables([table]);
        const rows = table.rows;
        expect(aggregate(rows, { table: 'wip_chaine', name: 'WIP_Chaine', agg: 'avg' })).toBeCloseTo(22 / 3);
        expect(aggregate(rows, { table: 'wip_chaine', name: 'WIP_Chaine', agg: 'count' })).toBe(3);
        expect(aggregate(rows, { table: 'wip_chaine', name: 'WIP_Chaine', agg: 'distinct' })).toBe(3);
        expect(aggregate(rows, { table: 'wip_chaine', name: 'WIP_Chaine', agg: 'min' })).toBe(5);
        expect(aggregate(rows, { table: 'wip_chaine', name: 'WIP_Chaine', agg: 'max' })).toBe(10);
        expect(measureLabel({ table: 'wip_chaine', name: 'WIP_Chaine', agg: 'sum', label: 'Total Sales' })).toBe('Total Sales');
        expect(fieldLabel({ name: 'WIP_Chaine' })).toBe('WIP_Chaine');
    });

    it('creates legend series from the physical column', () => {
        setTables([table]);
        const result = buildChartData(
            table.rows,
            [{ table: 'wip_chaine', name: 'ProdGroup', agg: 'count' }],
            [{ table: 'wip_chaine', name: 'ProdGroup', agg: 'count' }],
            [{ table: 'wip_chaine', name: 'WIP_Chaine', agg: 'sum' }],
        );
        expect(result.data.every((row) => !Object.keys(row).some((key) => key.startsWith('{')))).toBe(true);
    });
});

describe('PBI custom measures (DAX)', () => {
    it('parses DAX column references with and without a table', () => {
        expect(parseDaxRef('Sales[Amount]')).toEqual({ table: 'Sales', column: 'Amount' });
        expect(parseDaxRef("'Sales Data'[Amount]")).toEqual({ table: 'Sales Data', column: 'Amount' });
        expect(parseDaxRef('Sales Data [Amount]')).toEqual({ table: 'Sales Data', column: 'Amount' });
        expect(parseDaxRef('[Amount]')).toEqual({ column: 'Amount' });
        expect(parseDaxRef('Sales')).toEqual({ table: 'Sales' });
    });

    it('compiles common aggregations into row functions', () => {
        setTables([table]);
        const rows = table.rows;
        expect(compileMeasure('Total = SUM(wip_chaine[WIP_Chaine])')(rows)).toBe(22);
        expect(compileMeasure('Total = AVERAGE(wip_chaine[WIP_Chaine])')(rows)).toBeCloseTo(22 / 3);
        expect(compileMeasure('Total = COUNT(wip_chaine[WIP_Chaine])')(rows)).toBe(3);
        expect(compileMeasure('Total = DISTINCTCOUNT(wip_chaine[WIP_Chaine])')(rows)).toBe(3);
        expect(compileMeasure('Total = MIN(wip_chaine[WIP_Chaine])')(rows)).toBe(5);
        expect(compileMeasure('Total = MAX(wip_chaine[WIP_Chaine])')(rows)).toBe(10);
        expect(compileMeasure('Total = COUNTROWS(wip_chaine)')(rows)).toBe(3);
        expect(compileMeasure('Total = 42')(rows)).toBe(42);
        expect(compileMeasure('Total = SUM(nonexistent[col])')(rows)).toBe(0);
    });

    it('registers measures into the aggregation engine', () => {
        setTables([table]);
        registerMeasure('WIP Total', 'WIP Total = SUM(wip_chaine[WIP_Chaine])');
        expect(isMeasure('WIP Total')).toBe(true);
        expect(
            aggregate(table.rows, {
                table: 'Measures',
                name: 'WIP Total',
                agg: 'sum',
            }),
        ).toBe(22);
    });
});
