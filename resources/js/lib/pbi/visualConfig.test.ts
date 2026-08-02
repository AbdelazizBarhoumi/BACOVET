import { describe, expect, it } from 'vitest';
import { normalizeDataLabelStyle } from './model';
import { isCartesianType, isSingleValueType, visualConfig } from './visualConfig';

describe('visualConfig', () => {
    it('gives single-value visuals one Fields well and no analytics', () => {
        for (const type of ['card', 'kpi', 'gauge'] as const) {
            const config = visualConfig(type);
            expect(config.build).toEqual([
                { well: 'values', label: 'Fields' },
            ]);
            expect(config.showAnalytics).toBe(false);
            expect(config.format).toBe('singleValue');
            expect(isSingleValueType(type)).toBe(true);
        }
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
