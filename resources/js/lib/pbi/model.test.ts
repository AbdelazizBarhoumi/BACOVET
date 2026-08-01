import { describe, expect, it } from 'vitest';
import {
    aggregate,
    buildChartData,
    fieldLabel,
    measureLabel,
    normalizeWellField,
    parseFieldReference,
    setTables,
    type TableDef,
} from './model';

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
