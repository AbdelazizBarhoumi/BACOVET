// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { setTables } from '@/lib/pbi/model';
import type { TableDef, Visual, WellField } from '@/lib/pbi/model';
import { VALUE_AXIS_WIDTH } from './shared';
import { ChartBody } from './chart';

vi.mock('recharts', async () => {
    const { createElement } = await import('react');
    const calls = (globalThis as {
        __rechartsAxis?: Record<string, Record<string, unknown>[]>;
    }).__rechartsAxis ??= {};
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
    ],
    rows: [
        { Chaine: 'A', Objectif: 100 },
        { Chaine: 'B', Objectif: 90 },
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

function yAxisCalls() {
    const all = globalThis as {
        __rechartsAxis?: Record<string, Record<string, unknown>[]>;
    };
    const calls = (all.__rechartsAxis ??= {});
    const out = [...(calls['YAxis'] ?? [])];
    for (const name of Object.keys(calls)) calls[name] = [];
    return out;
}

function render(partial: Visual) {
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

describe('single value axis honors its position', () => {
    it('renders a sole RIGHT axis on the right with a right-side title', () => {
        const errors = render(
            visual({
                type: 'column',
                axis: [well('Chaine', 'count')],
                values: [well('Objectif')],
                axes: [
                    {
                        id: 'a1',
                        position: 'right',
                        title: 'Droite',
                        showTitle: true,
                        showLine: true,
                        showLabels: true,
                    },
                ],
            }),
        );
        const yAxis = yAxisCalls();
        const valueAxis = yAxis.filter((a) => a['type'] !== 'category');
        expect(errors.join('\n')).not.toMatch(/unique "key"|same key/);
        expect(valueAxis.length).toBe(1);
        expect(valueAxis[0]).toMatchObject({ orientation: 'right' });
        expect(valueAxis[0]['label']).toMatchObject({
            position: 'insideRight',
            angle: -90,
        });
        // Lane hugs the labels ("100"/"90"), well under the fixed gutter.
        expect(Number(valueAxis[0]['width'])).toBeLessThan(VALUE_AXIS_WIDTH);
    });

    it('renders a sole LEFT axis with an estimated tight lane', () => {
        render(
            visual({
                type: 'column',
                axis: [well('Chaine', 'count')],
                values: [well('Objectif')],
                axes: [
                    {
                        id: 'a1',
                        position: 'left',
                        title: 'Gauche',
                        showTitle: true,
                        showLine: true,
                        showLabels: true,
                    },
                ],
            }),
        );
        const valueAxis = yAxisCalls().filter((a) => a['type'] !== 'category');
        expect(valueAxis.length).toBe(1);
        expect(valueAxis[0]).toMatchObject({ orientation: 'left' });
        expect(valueAxis[0]['label']).toMatchObject({
            position: 'insideLeft',
            angle: -90,
        });
        expect(Number(valueAxis[0]['width'])).toBeLessThan(VALUE_AXIS_WIDTH);
    });

    it('renders each of two axes on its own side', () => {
        render(
            visual({
                type: 'column',
                axis: [well('Chaine', 'count')],
                values: [well('Objectif'), well('Objectif', 'avg')],
                axes: [
                    {
                        id: 'a1',
                        position: 'left',
                        title: 'Gauche',
                        showTitle: true,
                    },
                    {
                        id: 'a2',
                        position: 'right',
                        title: 'Droite',
                        showTitle: true,
                    },
                ],
            }),
        );
        const valueAxis = yAxisCalls().filter((a) => a['type'] !== 'category');
        expect(valueAxis.length).toBe(2);
        expect(valueAxis.map((a) => a['orientation']).sort()).toEqual([
            'left',
            'right',
        ]);
    });
});