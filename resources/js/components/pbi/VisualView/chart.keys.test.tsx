// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import {
    defaultAxes,
    normalizeAxisStyle,
    registerMeasure,
    setTables,
    STACKED_EMPTY_FILL,
    unregisterMeasure,
} from '@/lib/pbi/model';
import type { Field, Row, TableDef, Visual, WellField } from '@/lib/pbi/model';
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
        'ReferenceArea',
        'ReferenceDot',
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

/** Mutable stand-in for the store's `measures` array (see ChartBody re-key). */
let mockMeasures: Field[] = [];

/** Stable graph reference — mirrors the provider's memoized `state.graph`. */
const mockGraph = { edges: [] };

vi.mock('@/lib/pbi/store', async () => {
    const usePbi = () => ({
        applyCrossFilter: () => {},
        setTooltipHover: () => {},
        tooltipHover: null,
        graph: mockGraph,
        filteredTables: undefined,
        measures: mockMeasures,
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

/** Rows where Objectif and Volume cross between A and B (mid ~50). */
const crossingRows: Record<string, string | number>[] = [
    { Chaine: 'A', Objectif: 10, Volume: 90 },
    { Chaine: 'B', Objectif: 90, Volume: 10 },
];

function well(
    name: string,
    agg: 'sum' | 'avg' | 'count' = 'sum',
    axisId?: string,
): WellField {
    return {
        table: 'Sales',
        name,
        label: name,
        agg,
        ...(axisId ? { axisId } : {}),
    };
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

function renderAndCapture(
    partial: Visual,
    rows: Row[] = sales.rows,
    tables: TableDef[] = [sales],
    staticRender: boolean = false,
) {
    setTables(tables);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    const root = createRoot(host);
    try {
        act(() =>
            root.render(
                <ChartBody
                    visual={partial}
                    rows={rows}
                    match={null}
                    static={staticRender}
                />,
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

describe('measure-bound charts recompute when the measure library loads', () => {
    const all = globalThis as {
        __rechartsCalls?: Record<string, Record<string, unknown>[]>;
    };

    function clearCalls() {
        const calls = (all.__rechartsCalls ??= {});
        for (const name of Object.keys(calls)) calls[name] = [];
    }

    it('rekeys the chart data memo on the measures identity', () => {
        const name = 'TotalVolume';
        unregisterMeasure(name);

        setTables([sales]);
        mockMeasures = [];

        const v = visual({
            type: 'column',
            axis: [well('Chaine')],
            values: [{ table: 'Measures', name, label: name, agg: 'sum' }],
        });

        const host = document.createElement('div');
        const root = createRoot(host);
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        try {
            // First paint: the async measure library has not resolved yet, so
            // MEASURE_IMPL does not know the measure and the chart renders 0.
            clearCalls();
            act(() =>
                root.render(
                    <ChartBody visual={v} rows={sales.rows} match={null} />,
                ),
            );
            let composed = all.__rechartsCalls?.ComposedChart ?? [];
            let data = composed[composed.length - 1]?.data as
                Record<string, string | number>[] | undefined;
            expect(data, 'first paint data').toBeDefined();
            for (const row of data!) {
                expect(Number(row[name]), `${name} before library`).toBe(0);
            }

            // The library fetch resolves: register the expression into the
            // engine, then commit the new measures array (new identity) —
            // exactly the ordering the provider's async load effect uses.
            registerMeasure(name, 'SUM(Sales[Volume])');
            mockMeasures = [
                {
                    table: 'Measures',
                    name,
                    type: 'number',
                    expression: 'SUM(Sales[Volume])',
                },
            ];

            // Same props, same rows, same visual reference: only `measures`
            // changed. Without the re-key this render keeps the stale memo.
            clearCalls();
            act(() =>
                root.render(
                    <ChartBody visual={v} rows={sales.rows} match={null} />,
                ),
            );
            composed = all.__rechartsCalls?.ComposedChart ?? [];
            data = composed[composed.length - 1]?.data as
                Record<string, string | number>[] | undefined;
            const byCategory = Object.fromEntries(
                (data ?? []).map((r) => [
                    String(r['category']),
                    Number(r[name]),
                ]),
            );
            expect(byCategory['A'], `${name} for A`).toBe(50);
            expect(byCategory['B'], `${name} for B`).toBe(30);
        } finally {
            act(() => root.unmount());
            errorSpy.mockRestore();
            unregisterMeasure(name);
            mockMeasures = [];
        }
    });
});

describe('line family renders through the shared cartesian renderer', () => {
    const all = globalThis as {
        __rechartsCalls?: Record<string, Record<string, unknown>[]>;
    };

    function clearCalls() {
        const calls = (all.__rechartsCalls ??= {});
        for (const name of Object.keys(calls)) calls[name] = [];
    }

    it('line draws a Line series on a ComposedChart, not a Bar', () => {
        clearCalls();
        renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
            }),
        );
        expect(all.__rechartsCalls?.ComposedChart?.length).toBeGreaterThan(0);
        expect(all.__rechartsCalls?.Bar?.length ?? 0).toBe(0);
        expect(all.__rechartsCalls?.Line?.length).toBeGreaterThan(0);
    });

    it('area draws Area series', () => {
        clearCalls();
        renderAndCapture(
            visual({
                type: 'area',
                axis: [well('Chaine')],
                values: [well('Objectif')],
            }),
        );
        expect(all.__rechartsCalls?.Line?.length ?? 0).toBe(0);
        const areas = all.__rechartsCalls?.Area ?? [];
        expect(areas.length).toBeGreaterThan(0);
        for (const a of areas)
            expect(a.stackId, `Area ${a.dataKey}`).toBeUndefined();
    });

    it('stackedArea stacks its Area series', () => {
        clearCalls();
        renderAndCapture(
            visual({
                type: 'stackedArea',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
            }),
        );
        const areas = all.__rechartsCalls?.Area ?? [];
        expect(areas.length).toBe(2);
        for (const a of areas) expect(a.stackId).toBe('s');
    });

    it('combo draws a bar then lines by default', () => {
        clearCalls();
        renderAndCapture(
            visual({
                type: 'combo',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
            }),
        );
        expect(all.__rechartsCalls?.Bar?.length).toBe(1);
        expect((all.__rechartsCalls?.Line ?? []).length).toBeGreaterThanOrEqual(
            1,
        );
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
        renderAndCapture(visual({ type: 'stackedColumn', ...base() }));
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
        renderAndCapture(visual({ type: 'stackedColumn', axes, ...base() }));
        // First value axis carries the fill; the second defaults to none.
        const fills = new Set(
            bars().map(
                (b) => (b.background as { fill?: string } | undefined)?.fill,
            ),
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

describe('stacked area empty-space fill', () => {
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

    function refAreas(): Record<string, unknown>[] {
        return [...(all.__rechartsCalls?.ReferenceArea ?? [])];
    }

    it('paints a full-plot track behind stacked areas from the legacy yAxis', () => {
        clearCalls();
        renderAndCapture(
            visual({
                type: 'stackedArea',
                yAxis: normalizeAxisStyle({
                    show: true,
                    emptyColor: '#fca5a5',
                }),
                ...base(),
            }),
        );
        const band = refAreas()[0];
        expect(band).toBeDefined();
        // Objectif 100 + Volume 50 → 150 is the tallest stack, so the band
        // spans the whole 0..top plot.
        expect(band.fill).toBe('#fca5a5');
        expect(band.y1).toBe(0);
        expect(band.y2).toBe(150);
        expect(band.x1).toBe('A');
        expect(band.x2).toBe('B');
    });

    it('defaults the stacked-area track to light gray', () => {
        clearCalls();
        renderAndCapture(visual({ type: 'stackedArea', ...base() }));
        const band = refAreas()[0];
        expect(band).toBeDefined();
        expect(band.fill).toBe(STACKED_EMPTY_FILL);
    });

    it('honors an explicit axis max so the track fills the plot', () => {
        clearCalls();
        const axes = defaultAxes().map((a, i) =>
            i === 0
                ? {
                      ...a,
                      auto: false,
                      max: 200,
                      emptyColor: '#e2e8f0',
                  }
                : a,
        );
        renderAndCapture(visual({ type: 'stackedArea', axes, ...base() }));
        const band = refAreas()[0];
        expect(band).toBeDefined();
        expect(band.y2).toBe(200);
    });
});

describe('multi-axis analytics binding', () => {
    const all = globalThis as {
        __rechartsCalls?: Record<string, Record<string, unknown>[]>;
    };

    function clearCalls() {
        const calls = (all.__rechartsCalls ??= {});
        for (const name of Object.keys(calls)) calls[name] = [];
    }

    const twoAxes = () => [
        { ...defaultAxes()[0] },
        {
            ...defaultAxes()[0],
            id: 'y1',
            position: 'right' as const,
            order: 1,
        },
    ];

    it('binds analytics stat lines to the value axis on multi-axis charts', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'column',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                axes: twoAxes(),
                analytics: [
                    { kind: 'constant' as const, enabled: true, value: 95 },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines)
            expect(line, `ReferenceLine ${line.dataKey}`).toHaveProperty(
                'yAxisId',
                'axis-y0',
            );
    });

    it('shows min/max on every value axis that has series', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y0'),
                    well('Volume', 'sum', 'y1'),
                ],
                axes: twoAxes(),
                analytics: [
                    { kind: 'min' as const, enabled: true },
                    { kind: 'max' as const, enabled: true },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        const yFor = (id: string) =>
            lines
                .filter((l) => l.yAxisId === id)
                .map((l) => l.y as number)
                .sort((a, b) => a - b);
        expect(yFor('axis-y0')).toEqual([90, 100]);
        expect(yFor('axis-y1')).toEqual([30, 50]);
    });

    it('restricts a stat line to the chosen value axes only', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y0'),
                    well('Volume', 'sum', 'y1'),
                ],
                axes: twoAxes(),
                analytics: [
                    { kind: 'max' as const, enabled: true, axes: ['y0'] },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        expect(lines.map((l) => l.yAxisId)).toContain('axis-y0');
        expect(lines.map((l) => l.yAxisId)).not.toContain('axis-y1');
        expect(
            lines.filter((l) => l.yAxisId === 'axis-y0').map((l) => l.y),
        ).toEqual([100]);
    });

    it('restricts min and max to different axes', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y0'),
                    well('Volume', 'sum', 'y1'),
                ],
                axes: twoAxes(),
                analytics: [
                    { kind: 'min' as const, enabled: true, axes: ['y0'] },
                    { kind: 'max' as const, enabled: true, axes: ['y1'] },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        expect(
            lines.filter((l) => l.yAxisId === 'axis-y0').map((l) => l.y),
        ).toEqual([90]);
        expect(
            lines.filter((l) => l.yAxisId === 'axis-y1').map((l) => l.y),
        ).toEqual([50]);
    });

    it('renders no stat line when all axes are excluded', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y0'),
                    well('Volume', 'sum', 'y1'),
                ],
                axes: twoAxes(),
                analytics: [{ kind: 'min' as const, enabled: true, axes: [] }],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        expect(lines).toHaveLength(0);
    });

    it('binds analytics trend/forecast lines to the value axis on multi-axis charts', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'column',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                axes: twoAxes(),
                analytics: [{ kind: 'trend' as const, enabled: true }],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const trend = (all.__rechartsCalls?.Line ?? []).filter(
            (l) => l.legendType === 'none',
        );
        expect(trend.length).toBeGreaterThan(0);
        for (const line of trend)
            expect(line, `analytics line ${line.dataKey}`).toHaveProperty(
                'yAxisId',
                'axis-y0',
            );
    });

    it('leaves analytics lines unbound (default axis) on single-axis charts', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'column',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    { kind: 'constant' as const, enabled: true, value: 95 },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        expect(lines.length).toBeGreaterThan(0);
        for (const line of lines)
            expect(line, `ReferenceLine ${line.dataKey}`).not.toHaveProperty(
                'yAxisId',
            );
    });
});

describe('new analytics kinds', () => {
    const all = globalThis as {
        __rechartsCalls?: Record<string, Record<string, unknown>[]>;
    };

    function clearCalls() {
        const calls = (all.__rechartsCalls ??= {});
        for (const name of Object.keys(calls)) calls[name] = [];
    }

    const twoAxes = () => [
        { ...defaultAxes()[0] },
        {
            ...defaultAxes()[0],
            id: 'y1',
            position: 'right' as const,
            order: 1,
        },
    ];

    it('draws a vertical category line at the chosen category', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    { kind: 'category' as const, enabled: true, category: 'B' },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        const cat = lines.find((l) => l.x === 'B' || l.y === 'B');
        expect(cat, 'category ReferenceLine').toBeDefined();
        expect(cat).not.toHaveProperty('yAxisId');
    });

    it('binds a vertical category line to the value axis on multi-axis charts', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                axes: twoAxes(),
                analytics: [
                    { kind: 'category' as const, enabled: true, category: 'B' },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        const cat = lines.find((l) => l.x === 'B' || l.y === 'B');
        expect(cat).toHaveProperty('yAxisId', 'axis-y0');
    });

    it('renders a value-axis band between two bounds', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    {
                        kind: 'band' as const,
                        enabled: true,
                        value: 10,
                        value2: 90,
                    },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const bands = all.__rechartsCalls?.ReferenceArea ?? [];
        const band = bands.find((b) => b.y1 === 10 && b.y2 === 90);
        expect(band, 'band ReferenceArea').toBeDefined();
        expect(band).not.toHaveProperty('yAxisId');
    });

    it('renders the band across the category lane on horizontal charts', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'bar',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    {
                        kind: 'band' as const,
                        enabled: true,
                        value: 30,
                        value2: 10,
                    },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const bands = all.__rechartsCalls?.ReferenceArea ?? [];
        const band = bands.find((b) => b.x1 === 10 && b.x2 === 30);
        expect(band, 'horizontal band ReferenceArea').toBeDefined();
    });

    it('adds a hidden numeric axis that positions intersection markers', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                analytics: [{ kind: 'intersections' as const, enabled: true }],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const axis = (all.__rechartsCalls?.XAxis ?? []).find(
            (a) => a.xAxisId === 'xsec',
        );
        expect(axis, 'hidden xsec XAxis').toBeDefined();
        expect(axis).toHaveProperty('type', 'number');
        expect(axis).toHaveProperty('hide', true);
        expect(axis?.domain).toEqual([0, 1]);
    });

    it('marks the crossing of two line series via ReferenceDot', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                analytics: [{ kind: 'intersections' as const, enabled: true }],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        expect(dots.length).toBeGreaterThan(0);
        const dot = dots[0]!;
        expect(dot.x as number).toBeCloseTo(0.5, 5);
        expect(dot.y as number).toBeCloseTo(50, 5);
        expect(dot).toHaveProperty('xAxisId', 'xsec');
    });

    it('places spline dots on the curved (monotone) crossing, not the straight one', () => {
        clearCalls();
        // 6 rows whose monotone splines cross mid-curve; the straight-segment
        // polylines would cross at different category fractions. Values mirror
        // the live probe chart's rendered geometry.
        const splineRows: Record<string, string | number>[] = [
            { Chaine: 'A', Objectif: 243.182, Volume: 387.994 },
            { Chaine: 'B', Objectif: 313.56, Volume: 444.538 },
            { Chaine: 'C', Objectif: 502.576, Volume: 438.913 },
            { Chaine: 'D', Objectif: 455.52, Volume: 456.167 },
            { Chaine: 'E', Objectif: 487.556, Volume: 491.834 },
            { Chaine: 'F', Objectif: 517.66, Volume: 522.102 },
        ];
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine', 'count')],
                values: [well('Objectif'), well('Volume')],
                analytics: [{ kind: 'intersections' as const, enabled: true }],
            }),
            splineRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        // Four crossings of the two monotone splines on the shared value axis.
        // Category fractions are what they are (buildChartData sorts the
        // categories by value), so pinning exact marker coordinates guards the
        // "spline not straight" detection without re-deriving the layout.
        const xs = dots.map((d) => d.x as number);
        expect(xs.length).toBe(4);
        expect(xs[0]).toBeCloseTo(0.04052356908641742, 4);
        expect(xs[1]).toBeCloseTo(1.8879633175824895, 4);
        expect(xs[2]).toBeCloseTo(2.5141031929865676, 4);
        expect(xs[3]).toBeCloseTo(2.983369243119796, 4);
        for (const d of dots) expect(d).toHaveProperty('xAxisId', 'xsec');
    });

    it('binds intersection dots to the shared value axis on multi-axis charts', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                axes: twoAxes(),
                analytics: [{ kind: 'intersections' as const, enabled: true }],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        expect(dots.length).toBeGreaterThan(0);
        for (const dot of dots)
            expect(
                dot,
                `intersection dot (${String(dot.x)}, ${String(dot.y)})`,
            ).toHaveProperty('yAxisId', 'axis-y0');
    });

    it('drops a vertical guide line at the crossing', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                analytics: [{ kind: 'intersections' as const, enabled: true }],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const guides = (all.__rechartsCalls?.ReferenceLine ?? []).filter(
            (l) => l.xAxisId === 'xsec',
        );
        expect(guides.length).toBeGreaterThan(0);
        const guide = guides[0]!;
        expect(guide.x as number).toBeCloseTo(0.5, 5);
        expect(guide).toHaveProperty('xAxisId', 'xsec');
        expect(guide).not.toHaveProperty('yAxisId');
        expect(guide.strokeDasharray).toBe('3 3');
    });

    it('binds intersection guide lines to the value axis on multi-axis charts', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                axes: twoAxes(),
                analytics: [{ kind: 'intersections' as const, enabled: true }],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const guides = (all.__rechartsCalls?.ReferenceLine ?? []).filter(
            (l) => l.xAxisId === 'xsec',
        );
        expect(guides.length).toBeGreaterThan(0);
        for (const guide of guides)
            expect(
                guide,
                `intersection guide at ${String(guide.x)}`,
            ).toHaveProperty('yAxisId', 'axis-y0');
    });

    it('keeps a pixel-exact guide for cross-axis pairs without a dot', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y1'),
                    well('Volume', 'sum', 'y0'),
                ],
                axes: twoAxes(),
                analytics: [{ kind: 'intersections' as const, enabled: true }],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        expect(dots, 'no dot across different axes').toHaveLength(0);
        const guides = (all.__rechartsCalls?.ReferenceLine ?? []).filter(
            (l) => l.xAxisId === 'xsec',
        );
        expect(guides.length).toBeGreaterThan(0);
        for (const guide of guides) {
            expect(guide.x as number).toBeCloseTo(0.5, 5);
            expect(
                guide,
                `cross-axis intersection guide at ${String(guide.x)}`,
            ).toHaveProperty('yAxisId', 'axis-y1');
        }
    });

    it('positions intersection markers on horizontal charts via a hidden y-axis', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'bar',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', undefined),
                    well('Volume', 'sum', undefined),
                ].map((w) => ({ ...w, seriesType: 'line' as const })),
                analytics: [{ kind: 'intersections' as const, enabled: true }],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const axis = (all.__rechartsCalls?.YAxis ?? []).find(
            (a) => a.yAxisId === 'xsec',
        );
        expect(axis, 'hidden xsec YAxis').toBeDefined();
        expect(axis).toHaveProperty('type', 'number');
        expect(axis).toHaveProperty('hide', true);
        expect(axis?.domain).toEqual([0, 1]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        expect(dots.length).toBeGreaterThan(0);
        const dot = dots[0]!;
        expect(dot.y as number).toBeCloseTo(0.5, 5);
        expect(dot.x as number).toBeCloseTo(50, 5);
        expect(dot).toHaveProperty('yAxisId', 'xsec');
    });

    it('renders a dashed cursor when the crosshair kind is enabled', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [{ kind: 'crosshair' as const, enabled: true }],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const tooltip = (all.__rechartsCalls?.Tooltip ?? [])[0];
        expect(tooltip.cursor).toEqual({
            stroke: 'var(--ring)',
            strokeWidth: 1,
            strokeDasharray: '3 3',
        });
    });

    it('draws the trend as a least-squares fit line', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [{ kind: 'trend' as const, enabled: true }],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const trend = (all.__rechartsCalls?.Line ?? []).find(
            (l) => l.dataKey === '__trend',
        );
        expect(trend, 'regression trend Line').toBeDefined();
        expect(trend).toHaveProperty('legendType', 'none');
        const composed = all.__rechartsCalls?.ComposedChart ?? [];
        const data = composed[composed.length - 1]?.data as
            Record<string, string | number>[] | undefined;
        expect(data).toBeDefined();
        for (const row of data!)
            expect(typeof row['__trend'], `trend row`).toBe('number');
    });

    it('marks where a line series crosses the constant (Objectif) line', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    { kind: 'constant' as const, enabled: true, value: 50 },
                    { kind: 'intersections' as const, enabled: true },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        expect(
            dots.length,
            'one dot where Objectif crosses 50',
        ).toBeGreaterThan(0);
        const dot = dots[0]!;
        expect(dot.x as number).toBeCloseTo(0.5, 5);
        expect(dot.y as number).toBeCloseTo(50, 5);
        expect(dot).toHaveProperty('xAxisId', 'xsec');
        expect(dot.fill).toBe('#f59e0b');
        const guides = (all.__rechartsCalls?.ReferenceLine ?? []).filter(
            (l) => l.xAxisId === 'xsec',
        );
        expect(guides, 'full-height guide at the crossing').toHaveLength(1);
        expect(guides[0]!.x as number).toBeCloseTo(0.5, 5);
    });

    it('draws no constant-crossing dots without the intersections kind', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    { kind: 'constant' as const, enabled: true, value: 50 },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        expect(dots, 'constant alone adds no markers').toHaveLength(0);
    });

    it('binds constant-crossing dots to the constant value axis on multi-axis charts', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y1'),
                    well('Volume', 'sum', 'y0'),
                ],
                axes: twoAxes(),
                analytics: [
                    {
                        kind: 'constant' as const,
                        enabled: true,
                        value: 50,
                        axes: ['y0'],
                    },
                    { kind: 'intersections' as const, enabled: true },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        expect(dots.length).toBeGreaterThan(0);
        for (const dot of dots)
            expect(
                dot,
                `constant-crossing dot at (${String(dot.x)}, ${String(dot.y)})`,
            ).toHaveProperty('yAxisId', 'axis-y0');
    });

    it('positions constant crossings on horizontal charts via the hidden y-axis', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'bar',
                axis: [well('Chaine')],
                values: [well('Objectif')].map((w) => ({
                    ...w,
                    seriesType: 'line' as const,
                })),
                analytics: [
                    { kind: 'constant' as const, enabled: true, value: 50 },
                    { kind: 'intersections' as const, enabled: true },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        expect(dots.length).toBeGreaterThan(0);
        const dot = dots[0]!;
        expect(dot.y as number).toBeCloseTo(0.5, 5);
        expect(dot.x as number).toBeCloseTo(50, 5);
        expect(dot).toHaveProperty('yAxisId', 'xsec');
    });

    it('uses the constant line color on its stat lines', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    {
                        kind: 'constant' as const,
                        enabled: true,
                        value: 50,
                        color: '#ff0000',
                    },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const stat = (all.__rechartsCalls?.ReferenceLine ?? []).find(
            (l) => l.stroke === '#ff0000',
        );
        expect(stat, 'constant ReferenceLine in its color').toBeDefined();
        expect(stat!.y as number).toBe(50);
    });

    it('falls back to the kind default color without an explicit color', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [{ kind: 'average' as const, enabled: true }],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const stat = (all.__rechartsCalls?.ReferenceLine ?? []).find((l) =>
            String(
                (l.label as { value?: string } | undefined)?.value ?? '',
            ).startsWith('Moyenne '),
        );
        expect(stat, 'average ReferenceLine').toBeDefined();
        expect(stat!.stroke).toBe('var(--chart-4)');
    });

    it('uses the per-axis color override on multi-axis stat lines', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y1'),
                    well('Volume', 'sum', 'y0'),
                ],
                axes: twoAxes(),
                analytics: [
                    {
                        kind: 'constant' as const,
                        enabled: true,
                        value: 50,
                        axisColors: { y0: '#00ff00', y1: '#0000ff' },
                    },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        const y0 = lines.find((l) => l.yAxisId === 'axis-y0');
        const y1 = lines.find((l) => l.yAxisId === 'axis-y1');
        expect(y0, 'y0 constant line').toBeDefined();
        expect(y1, 'y1 constant line').toBeDefined();
        expect(y0!.stroke).toBe('#00ff00');
        expect(y1!.stroke).toBe('#0000ff');
    });

    it('uses the per-axis value override on multi-axis constant lines', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y1'),
                    well('Volume', 'sum', 'y0'),
                ],
                axes: twoAxes(),
                analytics: [
                    {
                        kind: 'constant' as const,
                        enabled: true,
                        value: 50,
                        axisValues: { y0: 20, y1: 90 },
                    },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        const y0 = lines.find((l) => l.yAxisId === 'axis-y0');
        const y1 = lines.find((l) => l.yAxisId === 'axis-y1');
        expect(y0, 'y0 constant line').toBeDefined();
        expect(y1, 'y1 constant line').toBeDefined();
        expect(y0!.y as number).toBe(20);
        expect(y1!.y as number).toBe(90);
    });

    it('falls back to the shared value when an axis lacks a per-axis override', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y1'),
                    well('Volume', 'sum', 'y0'),
                ],
                axes: twoAxes(),
                analytics: [
                    {
                        kind: 'min' as const,
                        enabled: true,
                        value: 7,
                        axisValues: { y0: 3 },
                    },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        const y0 = lines.find((l) => l.yAxisId === 'axis-y0');
        const y1 = lines.find((l) => l.yAxisId === 'axis-y1');
        expect(y0, 'y0 min line').toBeDefined();
        expect(y1, 'y1 min line').toBeDefined();
        expect(y0!.y as number).toBe(3);
        expect(y1!.y as number).toBe(7);
    });

    it('uses the per-axis value override when positioning constant-crossing dots', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y1'),
                    well('Volume', 'sum', 'y0'),
                ],
                axes: twoAxes(),
                analytics: [
                    {
                        kind: 'constant' as const,
                        enabled: true,
                        value: 50,
                        axes: ['y0'],
                        axisValues: { y0: 90 },
                    },
                    { kind: 'intersections' as const, enabled: true },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        const constDots = dots.filter((d) => d.fill === '#f59e0b');
        expect(constDots.length, 'constant-crossing dots').toBeGreaterThan(0);
        for (const dot of constDots) {
            expect(dot.yAxisId).toBe('axis-y0');
            expect(dot.y as number).toBe(90);
        }
    });

    it('colors constant-crossing dots from the intersections line color', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    { kind: 'constant' as const, enabled: true, value: 50 },
                    {
                        kind: 'intersections' as const,
                        enabled: true,
                        color: '#00ff00',
                    },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        const dots = all.__rechartsCalls?.ReferenceDot ?? [];
        const constDots = dots.filter((d) => d.fill === '#00ff00');
        expect(constDots.length, 'constant-crossing dots').toBeGreaterThan(0);
    });

    it('attaches hover tooltip handlers to analytics reference lines', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    { kind: 'constant' as const, enabled: true, value: 50 },
                    {
                        kind: 'average' as const,
                        enabled: true,
                    },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        const constant = lines.find((l) =>
            String(
                (l.label as { value?: string } | undefined)?.value ?? '',
            ).includes('Objectif'),
        );
        const average = lines.find(
            (l) =>
                typeof (l.label as { value?: string } | undefined)?.value ===
                    'string' &&
                String(
                    (l.label as { value?: string } | undefined)!.value,
                ).startsWith('Moyenne '),
        );
        expect(constant, 'constant ReferenceLine').toBeDefined();
        expect(average, 'average ReferenceLine').toBeDefined();
        for (const line of [constant!, average!]) {
            expect(typeof line.onMouseEnter, 'onMouseEnter').toBe('function');
            expect(typeof line.onMouseMove, 'onMouseMove').toBe('function');
            expect(typeof line.onMouseLeave, 'onMouseLeave').toBe('function');
            expect(line.onMouseEnter, 'handler list').toHaveLength(1);
        }
    });

    it('skips analytics hover handlers on static renders', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [{ kind: 'constant' as const, enabled: true }],
            }),
            undefined,
            undefined,
            true,
        );
        expect(errors, 'no render errors').toEqual([]);
        const lines = all.__rechartsCalls?.ReferenceLine ?? [];
        const constant = lines.find((l) =>
            String(
                (l.label as { value?: string } | undefined)?.value ?? '',
            ).includes('Objectif'),
        );
        expect(constant, 'constant ReferenceLine').toBeDefined();
        expect(
            constant!.onMouseEnter,
            'no onMouseEnter when static',
        ).toBeUndefined();
    });

    it('colors the trend/forecast and band visuals from the line color', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                analytics: [
                    {
                        kind: 'trend' as const,
                        enabled: true,
                        color: '#123456',
                    },
                    {
                        kind: 'band' as const,
                        enabled: true,
                        value: 10,
                        value2: 30,
                        color: '#abcdef',
                    },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const trend = (all.__rechartsCalls?.Line ?? []).find(
            (l) => l.dataKey === '__trend',
        );
        expect(trend, 'trend line').toBeDefined();
        expect(trend!.stroke).toBe('#123456');
        const band = (all.__rechartsCalls?.ReferenceArea ?? []).find(
            (b) => b.fill === '#abcdef',
        );
        expect(band, 'band ReferenceArea in its color').toBeDefined();
    });

    it('colors the crosshair cursor from the crosshair line', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                analytics: [
                    {
                        kind: 'crosshair' as const,
                        enabled: true,
                        color: '#0f0f0f',
                    },
                ],
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const tooltip = (all.__rechartsCalls?.Tooltip ?? [])[0];
        expect(tooltip.cursor).toEqual({
            stroke: '#0f0f0f',
            strokeWidth: 1,
            strokeDasharray: '3 3',
        });
    });
});

describe('value-axis domains come from a single resolved source', () => {
    const all = globalThis as {
        __rechartsCalls?: Record<string, Record<string, unknown>[]>;
    };

    function clearCalls() {
        const calls = (all.__rechartsCalls ??= {});
        for (const name of Object.keys(calls)) calls[name] = [];
    }

    const valueAxis = (yAxisId?: string) => {
        const candidates = all.__rechartsCalls?.YAxis ?? [];
        return yAxisId
            ? candidates.find((p) => p.yAxisId === yAxisId)
            : candidates.find((p) => !p.dataKey);
    };

    it('pins the auto legacy axis to the nice domain of its series', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        // crossingRows spans 10..90 → 1/2/5-niced [0,100].
        expect(valueAxis()).toHaveProperty('domain', [0, 100]);
    });

    it('respects the explicit min/max on a multi-axis def', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                axes: [
                    {
                        ...defaultAxes()[0],
                        auto: false,
                        min: 0,
                        max: 50,
                    },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        expect(valueAxis()).toHaveProperty('domain', [0, 50]);
    });

    it('gives every auto axis its own nice domain on a multi-axis chart', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y0'),
                    well('Volume', 'sum', 'y1'),
                ],
                axes: [
                    { ...defaultAxes()[0] },
                    {
                        ...defaultAxes()[0],
                        id: 'y1',
                        position: 'right' as const,
                        order: 1,
                    },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        // crossingRows: Objectif 10/90 → [0,100]; Volume 90/10 → [0,100].
        expect(valueAxis('axis-y0')).toHaveProperty('domain', [0, 100]);
        expect(valueAxis('axis-y1')).toHaveProperty('domain', [0, 100]);
    });

    it('puts each series scale in its own rendered axis (no cross-contamination)', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [
                    well('Objectif', 'sum', 'y0'),
                    well('Volume', 'sum', 'y1'),
                ],
                axes: [
                    { ...defaultAxes()[0] },
                    {
                        ...defaultAxes()[0],
                        id: 'y1',
                        position: 'right' as const,
                        order: 1,
                    },
                ],
            }),
            // Objectif stays small, Volume runs large.
            [
                { Chaine: 'A', Objectif: 2, Volume: 900 },
                { Chaine: 'B', Objectif: 8, Volume: 1100 },
            ],
        );
        expect(errors, 'no render errors').toEqual([]);
        const y0 = valueAxis('axis-y0');
        const y1 = valueAxis('axis-y1');
        expect(y0?.domain).toEqual([2, 8]);
        expect(y1?.domain).toEqual([900, 1100]);
        expect(y0?.domain).not.toEqual(y1?.domain);
    });

    it('has the horizontal bar chart honor the legacy AxisStyle min/max', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'bar',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                xAxis: normalizeAxisStyle({ min: 0, max: 60 }),
            }),
        );
        expect(errors, 'no render errors').toEqual([]);
        const xValueAxis = (all.__rechartsCalls?.XAxis ?? []).find(
            (p) => p.type === 'number',
        );
        expect(xValueAxis).toHaveProperty('domain', [0, 60]);
    });

    it('never forwards a NaN min/max into the rendered axis domain', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif'), well('Volume')],
                axes: [
                    {
                        ...defaultAxes()[0],
                        auto: false,
                        min: NaN,
                        max: NaN,
                    },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        // NaN min/max must not reach recharts (Decimal throws on NaN); the
        // axis falls back to the nice domain of its series.
        expect(valueAxis()).toHaveProperty('domain', [0, 100]);
    });

    it('falls back to the data extent when only one side is NaN', () => {
        clearCalls();
        const errors = renderAndCapture(
            visual({
                type: 'line',
                axis: [well('Chaine')],
                values: [well('Objectif')],
                axes: [
                    {
                        ...defaultAxes()[0],
                        auto: false,
                        min: NaN,
                        max: 50,
                    },
                ],
            }),
            crossingRows,
        );
        expect(errors, 'no render errors').toEqual([]);
        // Objectif spans 10..90; the NaN min falls back to the data extent.
        expect(valueAxis()).toHaveProperty('domain', [10, 50]);
    });
});

describe('card and gauge per-value rendering', () => {
    function renderToHost(partial: Visual): string {
        setTables([sales]);
        const errorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        const host = document.createElement('div');
        const root = createRoot(host);
        let html = '';
        try {
            act(() =>
                root.render(
                    <ChartBody
                        visual={partial}
                        rows={sales.rows}
                        match={null}
                    />,
                ),
            );
            html = host.innerHTML;
        } finally {
            act(() => root.unmount());
            errorSpy.mockRestore();
        }
        return html;
    }

    it('card shows one Objectif line per value with its own target', () => {
        const html = renderToHost(
            visual({
                type: 'card',
                values: [well('Volume'), well('Objectif')],
                targetValues: [100, 90],
            }),
        );
        expect(html).toMatch(/Objectif\s*100/);
        expect(html).toMatch(/Objectif\s*90/);
        expect(html).not.toMatch(/Objectif\s*100[\s\S]*Objectif\s*100/);
    });

    it('card stack layout renders a vertical column', () => {
        const html = renderToHost(
            visual({
                type: 'card',
                multiLayout: 'stack',
                values: [well('Volume'), well('Objectif')],
            }),
        );
        expect(html).toContain('flex-col');
        expect(html).not.toContain('flex-wrap');
    });

    it('gauge renders one svg per value with per-index bounds', () => {
        const html = renderToHost(
            visual({
                type: 'gauge',
                values: [well('Volume'), well('Objectif')],
                minimumValues: [0, 0],
                maximumValues: [100, 200],
            }),
        );
        expect((html.match(/<svg/g) ?? []).length).toBe(2);
        expect(html).toContain('flex-wrap');
        expect(html).toContain('100');
        expect(html).toContain('200');
    });

    it('gauge stack layout renders a vertical column of gauges', () => {
        const html = renderToHost(
            visual({
                type: 'gauge',
                multiLayout: 'stack',
                values: [well('Volume'), well('Objectif')],
            }),
        );
        expect((html.match(/<svg/g) ?? []).length).toBe(2);
        expect(html).toContain('flex-col');
        expect(html).not.toContain('flex-wrap');
    });
});
