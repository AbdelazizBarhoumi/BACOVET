import { beforeEach, describe, expect, it } from 'vitest';
import {
    aggregate,
    buildChartData,
    buildScatterData,
    defaultAxes,
    fieldIssue,
    fieldNumericIssue,
    normalizeAxes,
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
        expect(series).toEqual(['Somme de Amount']);
        const byRegion = Object.fromEntries(
            data.map((d) => [d['category'], d['Somme de Amount']]),
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

    it('totals multiple value fields on a single point (card/pie via Total)', () => {
        const { data, series } = buildChartData(
            sales.rows,
            [],
            [],
            [field('Amount'), field('Cost')],
        );
        expect(data).toHaveLength(1);
        expect(data[0]!['Somme de Amount']).toBe(250);
        expect(data[0]!['Somme de Cost']).toBe(85);
        expect(series).toEqual(['Somme de Amount', 'Somme de Cost']);
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
        expect(data).toEqual([{ category: 'Total', 'Somme de Amount': 0 }]);
    });

    it('returns no points for an empty axis-grouped chart', () => {
        const { data } = buildChartData([], [field('Region')], [], [field('Amount')]);
        expect(data).toEqual([]);
    });
});

describe('buildChartData — maxCategories cap rolls into Autre', () => {
    it('keeps top-N categories and aggregates the rest into Autre', () => {
        const rows = Array.from({ length: 100 }, (_, i) => ({
            Region: `R${String(i % 10).padStart(2, '0')}`,
            Amount: i,
        }));
        const { data } = buildChartData(rows, [field('Region')], [], [field('Amount')], [], 4);
        expect(data).toHaveLength(5);
        const other = data.find((d) => d['category'] === 'Autre')!;
        expect(other['Somme de Amount']).toBeGreaterThan(0);
        const categories = data.map((d) => d['category']).filter((c) => c !== 'Autre');
        expect(categories.length).toBe(4);
    });

    it('leaves data untouched when under the cap', () => {
        const { data } = buildChartData(sales.rows, [field('Region')], [], [field('Amount')], [], 100);
        expect(data.some((d) => d['category'] === 'Autre')).toBe(false);
        expect(data).toHaveLength(2);
    });
});

describe('buildChartData — seriesMeta binding', () => {
    it('maps each value field to an axis id and draw type', () => {
        const { seriesMeta } = buildChartData(
            sales.rows,
            [field('Region')],
            [],
            [
                { ...field('Amount'), axisId: 'y0', seriesType: 'bar' },
                { ...field('Cost'), axisId: 'y1', seriesType: 'line' },
            ],
        );
        expect(seriesMeta).toHaveLength(2);
        expect(seriesMeta[0]).toMatchObject({
            key: 'Somme de Amount',
            axisId: 'y0',
            type: 'bar',
            index: 0,
        });
        expect(seriesMeta[1]).toMatchObject({
            key: 'Somme de Cost',
            axisId: 'y1',
            type: 'line',
            index: 1,
        });
    });

    it('defaults missing axisId to y0', () => {
        const { seriesMeta } = buildChartData(
            sales.rows,
            [field('Region')],
            [],
            [field('Amount')],
        );
        expect(seriesMeta[0]?.axisId).toBe('y0');
        expect(seriesMeta[0]?.type).toBe('bar');
    });

    it('flags a running (Pareto cumulative) series as a line', () => {
        const { seriesMeta } = buildChartData(
            sales.rows,
            [field('Region')],
            [],
            [{ ...field('Amount'), running: true }],
        );
        expect(seriesMeta[0]).toMatchObject({
            type: 'line',
            running: true,
        });
    });

    it('binds legend buckets to the first value field axis', () => {
        const { seriesMeta } = buildChartData(
            sales.rows,
            [field('Region')],
            [field('Product')],
            [{ ...field('Amount'), axisId: 'y2' }],
        );
        expect(seriesMeta.every((m) => m.axisId === 'y2')).toBe(true);
        expect(seriesMeta.map((m) => m.legendLabel)).toEqual(['A', 'B']);
        expect(seriesMeta.map((m) => m.key).sort()).toEqual(['A', 'B']);
    });
});

describe('normalizeAxes — persisted multi-axis shape', () => {
    it('returns a single default left axis for empty input', () => {
        const axes = normalizeAxes(undefined);
        expect(axes).toHaveLength(1);
        expect(axes[0]).toMatchObject({
            id: 'y0',
            position: 'left',
            auto: true,
            order: 0,
        });
    });

    it('re-derives order from the explicit order field', () => {
        const axes = normalizeAxes([
            { id: 'b', position: 'right', order: 1, auto: true, title: '' },
            { id: 'a', position: 'left', order: 0, auto: true, title: '' },
        ]);
        expect(axes.map((a) => a.id)).toEqual(['a', 'b']);
        expect(axes.map((a) => a.order)).toEqual([0, 1]);
    });

    it('snaps locked (Pareto) axes to a fixed 0–100 % range', () => {
        const axes = normalizeAxes([
            {
                id: 'pct',
                position: 'right',
                order: 1,
                auto: true,
                lockRange: true,
            },
        ]);
        expect(axes[0]).toMatchObject({ min: 0, max: 1, auto: false });
    });

    it('keeps only one gridline-driving axis', () => {
        const axes = normalizeAxes([
            { id: 'a', position: 'left', order: 0, showGridlines: true },
            { id: 'b', position: 'right', order: 1, showGridlines: true },
        ]);
        expect(axes.filter((a) => a.showGridlines)).toHaveLength(1);
    });

    it('defaultAxes returns fresh copies', () => {
        const a = defaultAxes();
        const b = defaultAxes();
        expect(a[0]).not.toBe(b[0]);
        expect(a).toEqual(b);
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
