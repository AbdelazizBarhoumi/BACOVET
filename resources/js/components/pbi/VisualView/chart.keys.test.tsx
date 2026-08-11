// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import {
    defaultAxes,
    normalizeAxisStyle,
    setTables,
    STACKED_EMPTY_FILL,
} from '@/lib/pbi/model';
import type { TableDef, Visual, WellField } from '@/lib/pbi/model';
import { ChartBody } from './chart';

vi.mock('recharts', async () => {
    const { createElement } = await import('react');
    const calls = ((
        globalThis as {
            __rechartsCalls?: Record<string, Record<string, unknown>[]>;
        }
    ).__rechartsCalls ??= {});
    const names = [
        'Area',
        'AreaChart',
        'Bar',
        'BarChart',
        'CartesianGrid',
        'Cell',
        'ComposedChart',
        'Funnel',
        'FunnelChart',
        'LabelList',
        'Legend',
        'Line',
        'LineChart',
        'Pie',
        'PieChart',
        'ReferenceLine',
        'ResponsiveContainer',
        'Scatter',
        'ScatterChart',
        'Tooltip',
        'Treemap',
        'XAxis',
        'YAxis',
        'ZAxis',
    ];
    const out: Record<string, unknown> = {};
    for (const name of names) {
        out[name] = (props: Record<string, unknown>) => {
            (calls[name] ??= []).push(props);
            return createElement('passthrough', null, props.children as never);
        };
    }
    return out;
});

vi.mock('@/lib/pbi/store', async () => {
    const usePbi = () => ({
        applyCrossFilter: () => {},
        setTooltipHover: () => {},
        tooltipHover: null,
        graph: { edges: [] },
        filteredTables: undefined,
    });
    return {
        usePbi,
        slicerKey: () => '',
        visualTypeLabel: (t: string) => t,
        visualDataTable: () => null,
    };
});

const sales: TableDef = {
    name: 'Sales',
    fields: [
        { table: 'Sales', name: 'Chaine', type: 'text' },
        { table: 'Sales', name: 'Objectif', type: 'number' },
        { table: 'Sales', name: 'Volume', type: 'number' },
    ],
    rows: [
        { Chaine: 'A', Objectif: 100, Volume: 50 },
        { Chaine: 'B', Objectif: 90, Volume: 30 },
    ],
};

function well(name: string, agg: 'sum' | 'avg' | 'count' = 'sum'): WellField {
    return { table: 'Sales', name, label: name, agg };
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
        minimum: [],
        maximum: [],
        target: [],
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

function renderAndCapture(partial: Visual) {
    setTables([sales]);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        act(() =>
            root.render(
                <ChartBody visual={partial} rows={sales.rows} match={null} />,
            ),
        );
    } finally {
        act(() => root.unmount());
        errorSpy.mockRestore();
    }
    return errorSpy.mock.calls.map((args) => String(args[0]));
}

describe('chart child keys', () => {
    it('keeps a same-named column and an analytics line from colliding', () => {
        const base = {
            axis: [well('Chaine', 'count')],
            values: [well('Objectif')],
            analytics: [
                { kind: 'constant' as const, enabled: true, value: 95 },
            ],
        };

        for (const type of ['line', 'column'] as const) {
            const errors = renderAndCapture(visual({ type, ...base }));
            const message = errors.join('\n');
            expect(
                message,
                `type=${type} rendered chart with no sibling-key warnings`,
            ).not.toMatch(/unique "key"|same key/);
        }
    });

    it('passes dataKey (never the datakey typo) to every series', () => {
        const all = globalThis as {
            __rechartsCalls?: Record<string, Record<string, unknown>[]>;
        };
        const calls = (all.__rechartsCalls ??= {});
        for (const name of Object.keys(calls)) calls[name] = [];

        renderAndCapture(
            visual({
                type: 'column',
                axis: [well('Chaine', 'count')],
                values: [well('Objectif')],
                analytics: [{ kind: 'trend' as const, enabled: true }],
            }),
        );
        renderAndCapture(
            visual({
                type: 'area',
                axis: [well('Chaine', 'count')],
                values: [well('Objectif')],
                analytics: [{ kind: 'trend' as const, enabled: true }],
            }),
        );

        const expectations: { name: string; present: boolean }[] = [
            { name: 'Bar', present: true },
            { name: 'Line', present: true },
            { name: 'Area', present: true },
        ];
        for (const { name, present } of expectations) {
            const series = calls[name] ?? [];
            if (present)
                expect(
                    series.length,
                    `${name} series rendered`,
                ).toBeGreaterThan(0);
            for (const props of series) {
                expect(props, `${name} received dataKey`).toHaveProperty(
                    'dataKey',
                );
                expect(
                    props,
                    `${name} never receives the misspelled datakey`,
                ).not.toHaveProperty('datakey');
            }
        }
    });
});

describe('100 % stacked charts fill to 100%', () => {
    const all = globalThis as {
        __rechartsCalls?: Record<string, Record<string, unknown>[]>;
    };

    function clearCalls() {
        const calls = (all.__rechartsCalls ??= {});
        for (const name of Object.keys(calls)) calls[name] = [];
    }

    const base = () => ({
        axis: [well('Chaine')],
        values: [well('Objectif'), well('Volume')],
        axes: defaultAxes(),
    });

    it('locks the stacked100Column value axis to 0–100 with % ticks', () => {
        clearCalls();
        renderAndCapture(visual({ type: 'stacked100Column', ...base() }));
        const valueAxis = (all.__rechartsCalls?.YAxis ?? []).find(
            (p) => !p.dataKey,
        );
        expect(valueAxis?.domain).toEqual([0, 100]);
        expect(typeof valueAxis?.tickFormatter).toBe('function');
        expect((valueAxis?.tickFormatter as (v: number) => string)(100)).toBe(
            '100 %',
        );
    });

    it('locks the stacked100Bar value axis to 0–100 with % ticks', () => {
        clearCalls();
        renderAndCapture(visual({ type: 'stacked100Bar', ...base() }));
        const valueAxis = (all.__rechartsCalls?.XAxis ?? []).find(
            (p) => p.type === 'number',
        );
        expect(valueAxis?.domain).toEqual([0, 100]);
        expect(typeof valueAxis?.tickFormatter).toBe('function');
        expect((valueAxis?.tickFormatter as (v: number) => string)(50)).toBe(
            '50 %',
        );
    });

    it('normalizes every category to a 100% total for both 100% types', () => {
        for (const type of ['stacked100Column', 'stacked100Bar'] as const) {
            clearCalls();
            renderAndCapture(visual({ type, ...base() }));
            const composed = all.__rechartsCalls?.ComposedChart ?? [];
            const data = composed[composed.length - 1]?.data as
                Record<string, string | number>[] | undefined;
            expect(data, `${type} data`).toBeDefined();
            expect(data!.length, `${type} rows`).toBeGreaterThan(0);
            for (const row of data!) {
                const sum = Object.entries(row)
                    .filter(([k]) => k !== 'category')
                    .reduce((acc, [, v]) => acc + Number(v ?? 0), 0);
                expect(sum, `${type} row ${row['category']}`).toBeCloseTo(
                    100,
                    6,
                );
            }
        }
    });
});

describe('stacked empty-space fill', () => {
    const all = globalThis as {
        __rechartsCalls?: Record<string, Record<string, unknown>[]>;
    };

    function clearCalls() {
        const calls = (all.__rechartsCalls ??= {});
        for (const name of Object.keys(calls)) calls[name] = [];
    }

    const base = () => ({
        axis: [well('Chaine')],
        values: [well('Objectif'), well('Volume')],
    });

    function bars(): Record<string, unknown>[] {
        return [...(all.__rechartsCalls?.Bar ?? [])];
    }

    it('fills the empty space of stacked columns from the legacy yAxis', () => {
        clearCalls();
        renderAndCapture(
            visual({
                type: 'stackedColumn',
                yAxis: normalizeAxisStyle({
                    show: true,
                    emptyColor: '#e2e8f0',
                }),
                ...base(),
            }),
        );
        const found = bars();
        expect(found.length).toBeGreaterThan(0);
        for (const b of found)
            expect(b.background).toEqual({ fill: '#e2e8f0' });
    });

    it('reads the empty fill of stacked bars from the legacy xAxis', () => {
        clearCalls();
        renderAndCapture(
            visual({
                type: 'stackedBar',
                xAxis: normalizeAxisStyle({
                    show: true,
                    emptyColor: '#fde68a',
                }),
                ...base(),
            }),
        );
        const found = bars();
        expect(found.length).toBeGreaterThan(0);
        for (const b of found)
            expect(b.background).toEqual({ fill: '#fde68a' });
    });

    it('defaults the empty fill to light gray when no color is set', () => {
        clearCalls();
        renderAndCapture(
            visual({ type: 'stackedColumn', ...base() }),
        );
        const found = bars();
        expect(found.length).toBeGreaterThan(0);
        for (const b of found)
            expect(b.background).toEqual({ fill: STACKED_EMPTY_FILL });
    });

    it('applies the per-axis empty fill in multi-axis stacked charts', () => {
        clearCalls();
        const axes = defaultAxes().map((a, i) =>
            i === 0 ? { ...a, emptyColor: '#93c5fd' } : a,
        );
        renderAndCapture(
            visual({ type: 'stackedColumn', axes, ...base() }),
        );
        // First value axis carries the fill; the second defaults to none.
        const fills = new Set(
            bars().map((b) => (b.background as { fill?: string } | undefined)?.fill),
        );
        expect(fills).toContain('#93c5fd');
    });

    it('ignores emptyColor once legend stacking is off (grouped columns)', () => {
        clearCalls();
        renderAndCapture(
            visual({
                type: 'column',
                yAxis: normalizeAxisStyle({
                    show: true,
                    emptyColor: '#e2e8f0',
                }),
                ...base(),
            }),
        );
        for (const b of bars())
            expect(b.background, `Bar ${b.dataKey}`).toBeUndefined();
    });
});
