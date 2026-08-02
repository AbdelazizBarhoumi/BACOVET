import { beforeEach, describe, expect, it } from 'vitest';
import {
    aggregate,
    buildChartData,
    buildScatterData,
    fieldIssue,
    fieldNumericIssue,
    setTables,
    type TableDef,
} from './model';

const sales: TableDef = {
    name: 'Sales',
    fields: [
        { table: 'Sales', name: 'Region', type: 'text' },
        { table: 'Sales', name: 'Product', type: 'text' },
        { table: 'Sales', name: 'Amount', type: 'number' },
        { table: 'Sales', name: 'Cost', type: 'number' },
        { table: 'Sales', name: 'Units', type: 'number' },
    ],
    rows: [
        { Region: 'North', Product: 'A', Amount: 100, Cost: 40, Units: 4 },
        { Region: 'North', Product: 'B', Amount: 50, Cost: 10, Units: 2 },
        { Region: 'South', Product: 'A', Amount: 25, Cost: 5, Units: 1 },
        { Region: 'South', Product: 'B', Amount: 75, Cost: 30, Units: 3 },
    ],
};

const field = (
    name: string,
    agg: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct' = 'sum',
) => ({
    table: 'Sales',
    name,
    agg,
});

beforeEach(() => {
    setTables([sales]);
});

describe('buildChartData — correct data per chart family', () => {
    it('aggregates column/line values grouped by a categorical axis', () => {
        const { data, series } = buildChartData(
            sales.rows,
            [field('Region')],
            [],
            [field('Amount')],
        );
        expect(series).toEqual(['Sum of Amount']);
        const byRegion = Object.fromEntries(
            data.map((d) => [d['category'], d['Sum of Amount']]),
        );
        expect(byRegion['North']).toBe(150);
        expect(byRegion['South']).toBe(100);
    });

    it('creates legend series (stacked/100% charts)', () => {
        const { data, series } = buildChartData(
            sales.rows,
            [field('Region')],
            [field('Product')],
            [field('Amount')],
        );
        expect(series.sort()).toEqual(['A', 'B']);
        const north = data.find((d) => d['category'] === 'North')!;
        expect(north['A']).toBe(100);
        expect(north['B']).toBe(50);
    });

    it('totals multiple value fields on a single point (card/kpi/pie via Total)', () => {
        const { data, series } = buildChartData(
            sales.rows,
            [],
            [],
            [field('Amount'), field('Cost')],
        );
        expect(data).toHaveLength(1);
        expect(data[0]!['Sum of Amount']).toBe(250);
        expect(data[0]!['Sum of Cost']).toBe(85);
        expect(series).toEqual(['Sum of Amount', 'Sum of Cost']);
    });

    it('is deterministic for large datasets', () => {
        const rows = Array.from({ length: 5000 }, (_, i) => ({
            Region: `R${i % 20}`,
            Amount: i % 7,
        }));
        const first = buildChartData(rows, [field('Region')], [], [field('Amount')]);
        const second = buildChartData(rows, [field('Region')], [], [field('Amount')]);
        expect(first.data).toEqual(second.data);
        expect(first.data.length).toBe(20);
        expect(aggregate(rows, field('Amount'))).toBeGreaterThan(0);
    });
});

describe('buildChartData — empty data handling', () => {
    it('returns a single Total point with zeroed values for no-axis charts', () => {
        const { data } = buildChartData([], [], [], [field('Amount')]);
        expect(data).toEqual([{ category: 'Total', 'Sum of Amount': 0 }]);
    });

    it('returns no points for an empty axis-grouped chart', () => {
        const { data } = buildChartData([], [field('Region')], [], [field('Amount')]);
        expect(data).toEqual([]);
    });
});

describe('buildChartData — maxCategories cap rolls into Other', () => {
    it('keeps top-N categories and aggregates the rest into Other', () => {
        const rows = Array.from({ length: 100 }, (_, i) => ({
            Region: `R${String(i % 10).padStart(2, '0')}`,
            Amount: i,
        }));
        const { data } = buildChartData(rows, [field('Region')], [], [field('Amount')], [], 4);
        expect(data).toHaveLength(5);
        const other = data.find((d) => d['category'] === 'Other')!;
        expect(other['Sum of Amount']).toBeGreaterThan(0);
        const categories = data.map((d) => d['category']).filter((c) => c !== 'Other');
        expect(categories.length).toBe(4);
    });

    it('leaves data untouched when under the cap', () => {
        const { data } = buildChartData(sales.rows, [field('Region')], [], [field('Amount')], [], 100);
        expect(data.some((d) => d['category'] === 'Other')).toBe(false);
        expect(data).toHaveLength(2);
    });
});

describe('buildScatterData — raw numeric points', () => {
    it('emits one point per row with finite X and Y', () => {
        const { points, numeric } = buildScatterData(
            sales.rows,
            field('Units'),
            field('Amount'),
            field('Cost'),
        );
        expect(numeric).toBe(true);
        expect(points).toHaveLength(4);
        expect(points[0]).toMatchObject({ x: 4, y: 100, z: 40 });
    });

    it('skips rows with non-finite coordinates', () => {
        const rows = [
            { Units: 1, Amount: 10 },
            { Units: null, Amount: 20 },
            { Units: 2, Amount: 'n/a' },
            { Units: 3, Amount: 30 },
        ];
        const { points } = buildScatterData(
            rows as TableDef['rows'],
            field('Units'),
            field('Amount'),
            undefined,
        );
        expect(points).toHaveLength(2);
    });

    it('falls back to non-numeric when the axis is categorical', () => {
        const { numeric } = buildScatterData(
            sales.rows,
            field('Region'),
            field('Amount'),
            undefined,
        );
        expect(numeric).toBe(false);
    });
});

describe('fieldIssue / fieldNumericIssue — incorrect field assignment', () => {
    it('flags a column missing from the loaded tables', () => {
        setTables([sales]);
        expect(fieldIssue({ table: 'Sales', name: 'Gone', agg: 'sum' })).toContain('Gone');
    });

    it('flags a table that is not loaded', () => {
        setTables([sales]);
        expect(fieldIssue({ table: 'Other', name: 'Amount', agg: 'sum' })).toContain('Other');
    });

    it('accepts valid fields and measures', () => {
        setTables([sales]);
        expect(fieldIssue({ table: 'Sales', name: 'Amount', agg: 'sum' })).toBeNull();
    });

    it('flags a text field dropped into values', () => {
        setTables([sales]);
        expect(fieldNumericIssue({ table: 'Sales', name: 'Region', agg: 'sum' })).toContain('texte');
        expect(fieldNumericIssue({ table: 'Sales', name: 'Amount', agg: 'sum' })).toBeNull();
    });
});

describe('aggregate — per-chart value correctness', () => {
    it('computes sum, avg, count, min, max deterministically', () => {
        expect(aggregate(sales.rows, field('Amount', 'sum'))).toBe(250);
        expect(aggregate(sales.rows, field('Amount', 'avg'))).toBe(62.5);
        expect(aggregate(sales.rows, field('Amount', 'count'))).toBe(4);
        expect(aggregate(sales.rows, field('Amount', 'min'))).toBe(25);
        expect(aggregate(sales.rows, field('Amount', 'max'))).toBe(100);
    });

    it('treats blanks as zero for sums but not for counts', () => {
        const rows = [
            { Amount: 10 },
            { Amount: null },
            { Amount: 5 },
        ];
        expect(aggregate(rows as TableDef['rows'], field('Amount', 'sum'))).toBe(15);
        expect(aggregate(rows as TableDef['rows'], field('Amount', 'count'))).toBe(2);
    });
});
