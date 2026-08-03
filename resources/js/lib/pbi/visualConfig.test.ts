import { describe, expect, it } from 'vitest';
import { normalizeDataLabelStyle } from './model';
import { isCartesianType, isSingleValueType, visualConfig } from './visualConfig';

describe('visualConfig', () => {
    it('gives single-value visuals their Fields and Target wells, and no analytics', () => {
        for (const type of ['card'] as const) {
            const config = visualConfig(type);
            expect(config.build).toEqual([
                { well: 'values', label: 'Fields' },
                { well: 'target', label: 'Target (goal)' },
            ]);
            expect(config.showAnalytics).toBe(false);
            expect(config.format).toBe('singleValue');
            expect(isSingleValueType(type)).toBe(true);
        }
    });

    it('gives the gauge its own five wells, gauge format, and no analytics', () => {
        const config = visualConfig('gauge');
        expect(config.build).toEqual([
            { well: 'values', label: 'Value' },
            { well: 'minimum', label: 'Minimum value' },
            { well: 'maximum', label: 'Maximum value' },
            { well: 'target', label: 'Target value' },
            { well: 'tooltips', label: 'Tooltips' },
        ]);
        expect(config.showAnalytics).toBe(false);
        expect(config.analyticsKinds).toEqual([]);
        expect(config.format).toBe('gauge');
        expect(config.sections).toEqual([
            'title',
            'gaugeAxis',
            'colors',
            'dataLabels',
            'general',
        ]);
        expect(isSingleValueType('gauge')).toBe(true);
        expect(isCartesianType('gauge')).toBe(false);
    });

    it('keeps the full chart layout for cartesian and tabular visuals', () => {
        for (const type of ['line', 'pie', 'table', 'slicer'] as const) {
            const config = visualConfig(type);
            expect(config.build.map((w) => w.well)).toEqual([
                'axis',
                'legend',
                'values',
                'smallMultiples',
                'tooltips',
                'drillFields',
            ]);
            expect(config.showAnalytics).toBe(true);
            expect(config.format).toBe('generic');
            expect(config.analyticsKinds).toEqual([
                'constant',
                'average',
                'trend',
                'forecast',
            ]);
            expect(isSingleValueType(type)).toBe(false);
            expect(isCartesianType(type)).toBe(false);
        }
    });

    it('gives text/image elements a format-only config (no wells, no analytics)', () => {
        for (const type of ['text', 'image'] as const) {
            const config = visualConfig(type);
            expect(config.build).toEqual([]);
            expect(config.showAnalytics).toBe(false);
            expect(config.analyticsKinds).toEqual([]);
            expect(config.format).toBe('element');
            expect(config.sections).toEqual([]);
            expect(isSingleValueType(type)).toBe(false);
            expect(isCartesianType(type)).toBe(false);
        }
    });

    it('gives bar/column visuals cartesian sections and restricted analytics', () => {
        for (const type of [
            'column',
            'stackedColumn',
            'stacked100Column',
            'bar',
            'stackedBar',
            'stacked100Bar',
        ] as const) {
            const config = visualConfig(type);
            expect(config.build.map((w) => w.well)).toEqual([
                'axis',
                'legend',
                'values',
                'smallMultiples',
                'tooltips',
                'drillFields',
            ]);
            expect(config.showAnalytics).toBe(true);
            expect(config.format).toBe('cartesian');
            expect(config.analyticsKinds).toEqual([
                'constant',
                'average',
                'min',
                'max',
                'median',
            ]);
            expect(config.sections).toEqual([
                'title',
                'xAxis',
                'yAxis',
                'gridlines',
                'bars',
                'dataLabels',
                'legend',
                'plotArea',
                'general',
            ]);
            expect(isCartesianType(type)).toBe(true);
        }
    });

    it('normalizes per-series data-label overrides', () => {
        const style = normalizeDataLabelStyle({
            show: true,
            applyTo: 'perSeries',
            seriesStyles: {
                'Sales': { color: '#ff0000', font: { bold: true, fontSize: 12 } },
                'Cost': { font: { italic: true } },
                'Empty': {},
            },
        });
        expect(style.show).toBe(true);
        expect(style.applyTo).toBe('perSeries');
        expect(style.seriesStyles?.['Sales']).toEqual({
            color: '#ff0000',
            font: { bold: true, fontSize: 12 },
        });
        expect(style.seriesStyles?.['Cost']).toEqual({ font: { italic: true } });
        expect(style.seriesStyles?.['Empty']).toBeUndefined();
    });
});
