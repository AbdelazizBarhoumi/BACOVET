import { describe, expect, it } from 'vitest';
import type { Visual } from '../model';
import { mkPage, mkVisual, wf } from './helpers';
import { defaultState, normalizeState } from './state';

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
            mkPage('p1', 'P1', [
                ...state.pages[0]!.visuals,
                legacy,
            ]),
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
            { id: 'pct', position: 'right', order: 1, auto: true, title: '', showTitle: true, showLine: true, showLabels: true, showGridlines: false, color: '', numberFormat: 'auto', displayUnits: 'auto', lockRange: true },
        ];
        v.values = [
            { ...v.values[0]!, axisId: 'pct' },
            { ...v.values[0]!, axisId: 'ghost' },
        ];
        const state = { ...defaultState(), pages: [mkPage('p1', 'P1', [v])] };
        const next = normalizeState(state);
        const migrated = next.pages[0]!.visuals.find((x) => x.id === v.id)!;
        expect(migrated.axes).toHaveLength(1);
        expect(migrated.axes![0]).toMatchObject({ min: 0, max: 1, auto: false });
        expect(migrated.values.map((f) => f.axisId)).toEqual(['pct', 'pct']);
    });

    it('strips axis config from non-cartesian visuals', () => {
        const v = mkVisual('pie', 0, 0, 100, 100, {
            values: [wf('Amount', 'Sales')],
        });
        const weird = {
            ...v,
            axes: [
                { id: 'y0', position: 'left', order: 0, auto: true, title: '', showTitle: true, showLine: true, showLabels: true, showGridlines: true, color: '', numberFormat: 'auto', displayUnits: 'auto' },
            ],
            seriesType: 'line',
        } as unknown as Visual;
        const state = { ...defaultState(), pages: [mkPage('p1', 'P1', [weird])] };
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