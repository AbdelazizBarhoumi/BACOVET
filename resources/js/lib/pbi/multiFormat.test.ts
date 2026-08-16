import { describe, expect, it } from 'vitest';
import { effectivePatchFor, GENERIC_FORMAT_KEYS } from './multiFormat';

describe('effectivePatchFor', () => {
    it('applies generic keys regardless of the target type', () => {
        const patch = { background: 'red', border: true, x: 10, y: 20 };
        expect(effectivePatchFor(patch, 'column', 'text')).toEqual({
            background: 'red',
            border: true,
            x: 10,
            y: 20,
        });
    });

    it('applies type-specific keys when the target shares the anchor type', () => {
        const patch = {
            showLegend: false,
            background: 'blue',
            maxCategories: 500,
        };
        expect(effectivePatchFor(patch, 'column', 'column')).toEqual({
            showLegend: false,
            background: 'blue',
            maxCategories: 500,
        });
    });

    it('drops type-specific keys for a mixed-type target', () => {
        const patch = {
            showLegend: false,
            axisScale: 'log' as const,
            background: 'green',
        };
        expect(effectivePatchFor(patch, 'column', 'card')).toEqual({
            background: 'green',
        });
    });

    it('returns null when nothing applies', () => {
        const patch = { showLegend: false, axisScale: 'log' as const };
        expect(effectivePatchFor(patch, 'column', 'text')).toBeNull();
    });

    it('keeps an empty patch as null', () => {
        expect(effectivePatchFor({}, 'column', 'text')).toBeNull();
    });
});

describe('GENERIC_FORMAT_KEYS', () => {
    it('includes position, size, look and font keys', () => {
        for (const key of [
            'background',
            'border',
            'borderColor',
            'borderWidth',
            'radius',
            'shadow',
            'x',
            'y',
            'w',
            'h',
            'fontFamily',
            'fontSize',
            'fontColor',
            'fontBold',
            'fontItalic',
            'fontUnderline',
            'textAlign',
            'numberFormat',
            'colorIndex',
            'altText',
            'title',
            'titleStyle',
            'showTitle',
        ]) {
            expect(GENERIC_FORMAT_KEYS.has(key), key).toBe(true);
        }
    });

    it('excludes content and chart-specific keys', () => {
        for (const key of [
            'text',
            'imageUrl',
            'showLegend',
            'showLabels',
            'axisScale',
            'maxCategories',
            'tooltipPageId',
            'type',
            'name',
        ]) {
            expect(GENERIC_FORMAT_KEYS.has(key), key).toBe(false);
        }
    });
});