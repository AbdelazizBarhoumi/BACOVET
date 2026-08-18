import { describe, expect, it } from 'vitest';
import type { Visual } from '../model';
import { mkPage, mkVisual, wf } from './helpers';
import { defaultState, normalizeState, type ReportParameter } from './state';

const parameter = (overrides: Partial<ReportParameter>): ReportParameter => ({
    id: 'param-1',
    pageId: 'p1',
    root: 'https://bacovet.example',
    name: 'chaine',
    value: [],
    values: ['CH01', 'CH02', 'CH03'],
    ...overrides,
});

function cartesianWithoutAxes(): Visual {
    const v = mkVisual('column', 0, 0, 100, 100, {
        axis: [wf('Region', 'Sales')],
        values: [wf('Amount', 'Sales')],
    });
    // Simulate a legacy persisted visual: no multi-axis config.
    delete (v as { axes?: unknown }).axes;
    delete (v as { seriesType?: unknown }).seriesType;
    return v;
}

describe('normalizeState — cartesian multi-axis migration', () => {
    it('adds a default axis and binds legacy value fields to it', () => {
        const legacy = cartesianWithoutAxes();
        const state = defaultState();
        state.pages = [
            mkPage('p1', 'P1', [...state.pages[0]!.visuals, legacy]),
        ];
        const next = normalizeState(state);
        const v = next.pages
            .flatMap((p) => p.visuals)
            .find((x) => x.id === legacy.id)!;
        expect(v.axes).toHaveLength(1);
        expect(v.axes![0]!.id).toBe('y0');
        expect(v.values[0]!.axisId).toBe('y0');
        expect(v.seriesType).toBe('auto');
    });

    it('preserves explicit axis ids while snapping unknown ones to y0', () => {
        const v = cartesianWithoutAxes();
        v.axes = [
            {
                id: 'pct',
                position: 'right',
                order: 1,
                auto: true,
                title: '',
                showTitle: true,
                showLine: true,
                showLabels: true,
                showGridlines: false,
                color: '',
                numberFormat: 'auto',
                displayUnits: 'auto',
                lockRange: true,
            },
        ];
        v.values = [
            { ...v.values[0]!, axisId: 'pct' },
            { ...v.values[0]!, axisId: 'ghost' },
        ];
        const state = { ...defaultState(), pages: [mkPage('p1', 'P1', [v])] };
        const next = normalizeState(state);
        const migrated = next.pages[0]!.visuals.find((x) => x.id === v.id)!;
        expect(migrated.axes).toHaveLength(1);
        expect(migrated.axes![0]).toMatchObject({
            min: 0,
            max: 1,
            auto: false,
        });
        expect(migrated.values.map((f) => f.axisId)).toEqual(['pct', 'pct']);
    });

    it('strips axis config from non-cartesian visuals', () => {
        const v = mkVisual('pie', 0, 0, 100, 100, {
            values: [wf('Amount', 'Sales')],
        });
        const weird = {
            ...v,
            axes: [
                {
                    id: 'y0',
                    position: 'left',
                    order: 0,
                    auto: true,
                    title: '',
                    showTitle: true,
                    showLine: true,
                    showLabels: true,
                    showGridlines: true,
                    color: '',
                    numberFormat: 'auto',
                    displayUnits: 'auto',
                },
            ],
            seriesType: 'line',
        } as unknown as Visual;
        const state = {
            ...defaultState(),
            pages: [mkPage('p1', 'P1', [weird])],
        };
        const next = normalizeState(state);
        const migrated = next.pages[0]!.visuals.find((x) => x.id === v.id)!;
        expect(migrated.axes).toBeUndefined();
        expect(migrated.seriesType).toBe('auto');
    });

    it('new visuals with default tables already carry default axes', () => {
        const v = mkVisual('column', 0, 0, 100, 100, {
            axis: [wf('Region', 'Sales')],
            values: [wf('Amount', 'Sales')],
        });
        const state = { ...defaultState(), pages: [mkPage('p1', 'P1', [v])] };
        const next = normalizeState(state);
        const migrated = next.pages[0]!.visuals.find((x) => x.id === v.id)!;
        expect(migrated.axes).toHaveLength(1);
        expect(migrated.axes![0]!.id).toBe('y0');
        expect(migrated.values[0]!.axisId).toBe('y0');
    });
});

describe('parameters', () => {
    it('defaults to an empty list', () => {
        expect(defaultState().parameters).toEqual([]);
    });

    it('round-trips parameters through normalizeState', () => {
        const state = {
            ...defaultState(),
            parameters: [
                parameter({
                    id: 'param-1',
                    pageId: 'p1',
                    name: 'chaine',
                    value: ['CH02'],
                }),
            ],
        };
        const next = normalizeState(state);
        expect(next.parameters).toHaveLength(1);
        expect(next.parameters[0]).toMatchObject({
            id: 'param-1',
            pageId: 'p1',
            root: 'https://bacovet.example',
            name: 'chaine',
            value: ['CH02'],
            values: ['CH01', 'CH02', 'CH03'],
        });
    });

    it('coerces missing parameters to an empty list', () => {
        const state = {
            ...defaultState(),
            parameters: undefined,
        } as unknown as ReturnType<typeof defaultState>;
        expect(normalizeState(state).parameters).toEqual([]);
    });

    it('migrates a legacy single-string value into an array', () => {
        const state = {
            ...defaultState(),
            parameters: [
                {
                    ...parameter({}),
                    value: 'CH02',
                } as unknown as ReportParameter,
            ],
        } as unknown as ReturnType<typeof defaultState>;
        expect(normalizeState(state).parameters[0]!.value).toEqual(['CH02']);
    });

    it('defaults a missing value to an empty array', () => {
        const state = {
            ...defaultState(),
            parameters: [parameter({ value: undefined })],
        } as unknown as ReturnType<typeof defaultState>;
        expect(normalizeState(state).parameters[0]!.value).toEqual([]);
    });
});
