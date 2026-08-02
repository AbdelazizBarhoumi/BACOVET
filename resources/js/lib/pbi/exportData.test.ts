import { describe, expect, it, beforeEach } from 'vitest';
import {
    collectPageDatasets,
    currentViewRows,
    datasetToCsv,
    datasetsToCsv,
    visualExportData,
    type ExportDeps,
} from './exportData';
import { setTables, type Row, type TableDef, type Visual, type WellField } from './model';

const sales: TableDef = {
    name: 'Sales',
    fields: [
        { table: 'Sales', name: 'Region', type: 'text' },
        { table: 'Sales', name: 'Category', type: 'text' },
        { table: 'Sales', name: 'Amount', type: 'number' },
    ],
    rows: [
        { Region: 'North', Category: 'A', Amount: 10 },
        { Region: 'North', Category: 'B', Amount: 20 },
        { Region: 'South', Category: 'B', Amount: 40 },
        { Region: 'South', Category: 'C', Amount: 50 },
    ],
};

const deps: ExportDeps = {
    tables: [sales],
    joins: {},
    crossFilter: null,
    interactionFor: () => 'none',
};

beforeEach(() => {
    setTables([sales]);
});

function well(
    name: string,
    table = 'Sales',
    agg: 'sum' | 'avg' | 'count' = 'sum',
): WellField {
    return { table, name, agg };
}

function visual(partial: Partial<Visual>): Visual {
    return {
        id: 'v1',
        type: 'column',
        name: 'Sales chart',
        title: 'Sales chart',
        x: 0,
        y: 0,
        w: 200,
        h: 200,
        z: 0,
        hidden: false,
        axis: [],
        legend: [],
        values: [],
        tooltips: [],
        smallMultiples: [],
        drillFields: [],
        showTitle: true,
        showLegend: true,
        showLabels: false,
        background: 'transparent',
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

describe('currentViewRows', () => {
    it('applies an active cross-filter on the same table', () => {
        const v = visual({ axis: [well('Region')], values: [well('Amount')] });
        const result = currentViewRows(v, sales.rows, {
            ...deps,
            crossFilter: {
                sourceId: 'v0',
                column: 'Region',
                value: 'North',
                table: 'Sales',
            },
            interactionFor: () => 'filter',
        });
        expect(result).toHaveLength(2);
        expect(result.every((r) => r['Region'] === 'North')).toBe(true);
    });
});

describe('visualExportData', () => {
    it('exports a chart grouped by axis with aggregated values', () => {
        const v = visual({
            type: 'column',
            axis: [well('Region')],
            values: [well('Amount')],
        });
        const ds = visualExportData(v, sales.rows, deps)!;
        expect(ds.columns).toEqual(['Category', 'Sum of Amount']);
        expect(ds.rows).toEqual([
            ['South', '90'],
            ['North', '30'],
        ]);
    });

    it('exports a table visual with legend series', () => {
        const v = visual({
            type: 'matrix',
            axis: [well('Region')],
            legend: [well('Category')],
            values: [well('Amount')],
        });
        const ds = visualExportData(v, sales.rows, deps)!;
        expect(ds.columns[0]).toBe('Category');
        expect(ds.rows.length).toBe(2);
    });

    it('exports a card as a single aggregate row per measure', () => {
        const v = visual({ type: 'card', values: [well('Amount')] });
        const ds = visualExportData(v, sales.rows, deps)!;
        expect(ds.columns).toEqual(['Measure', 'Value']);
        expect(ds.rows).toEqual([['Sum of Amount', '120']]);
    });

    it('exports a slicer as its distinct axis values', () => {
        const v = visual({
            type: 'listSlicer',
            axis: [well('Category')],
        });
        const ds = visualExportData(v, sales.rows, deps)!;
        expect(ds.rows).toEqual([['A'], ['B'], ['C']]);
    });

    it('returns null for visuals without data (text)', () => {
        const v = visual({ type: 'text', text: 'hi' });
        expect(visualExportData(v, sales.rows, deps)).toBeNull();
    });

    it('returns null for a chart with no values', () => {
        const v = visual({ type: 'line', axis: [well('Region')], values: [] });
        expect(visualExportData(v, sales.rows, deps)).toBeNull();
    });

    it('applies the field/visual number format to cells', () => {
        const v = visual({
            type: 'card',
            values: [{ table: 'Sales', name: 'Amount', agg: 'sum', format: 'currency' }],
        });
        const ds = visualExportData(v, sales.rows, deps)!;
        expect(ds.rows[0]![1]).toBe('$120');
    });
});

describe('collectPageDatasets', () => {
    it('skips hidden visuals and prefixes page names', () => {
        const page = {
            name: 'Page 1',
            visuals: [
                visual({ id: 'a', type: 'card', values: [well('Amount')], hidden: true }),
                visual({ id: 'b', type: 'card', values: [well('Amount')] }),
            ],
        };
        const datasets = collectPageDatasets(page, { Sales: sales.rows }, deps);
        expect(datasets).toHaveLength(1);
        expect(datasets[0]!.title.startsWith('Page 1 —')).toBe(true);
    });
});

describe('datasetToCsv', () => {
    it('escapes quotes, commas and newlines', () => {
        const csv = datasetToCsv({
            title: 't',
            columns: ['Name', 'Note'],
            rows: [
                ['Alice', 'has, a "comma"'],
                ['Bob', 'line\nbreak'],
            ],
        });
        expect(csv).toContain('Alice,"has, a ""comma"""');
        expect(csv).toContain('"line\nbreak"');
        expect(csv.startsWith('\uFEFF')).toBe(true);
    });

    it('joins multiple datasets with a blank line', () => {
        const csv = datasetsToCsv([
            { title: 'a', columns: ['X'], rows: [['1']] },
            { title: 'b', columns: ['Y'], rows: [['2']] },
        ]);
        expect(csv.split('\r\n')).toContain('');
    });
});
