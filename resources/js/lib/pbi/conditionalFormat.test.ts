import { describe, expect, it } from 'vitest';
import {
    cfAggToAgg,
    conditionalColor,
    conditionalIcon,
    gaugeFxColor,
    gradientColor,
    hexToRgb,
    isColor,
    mixColor,
    parseColorCell,
    percentile,
    resolveBound,
    rgbToHex,
    ruleColor,
} from './conditionalFormat';
import {
    defaultConditionalFormat,
    normalizeConditionalFormat,
    type CfBound,
    type CfRule,
    type ConditionalFormat,
} from './model';

describe('isColor / parseColorCell', () => {
    it('recognizes hex and oklch colors', () => {
        expect(isColor('#fff')).toBe(true);
        expect(isColor('#4c78d0')).toBe(true);
        expect(isColor('#FFF')).toBe(true);
        expect(isColor('oklch(0.7 0.15 240)')).toBe(true);
    });

    it('rejects non-color strings', () => {
        expect(isColor('red')).toBe(false);
        expect(isColor('#12345')).toBe(false);
        expect(isColor('#gggggg')).toBe(false);
        expect(isColor('')).toBe(false);
    });

    it('parses only string cells that look like colors', () => {
        expect(parseColorCell('  #4c78d0  ')).toBe('#4c78d0');
        expect(parseColorCell('oklch(0.7 0.1 200)')).toBe('oklch(0.7 0.1 200)');
        expect(parseColorCell(12)).toBeNull();
        expect(parseColorCell(null)).toBeNull();
        expect(parseColorCell('not-a-color')).toBeNull();
    });
});

describe('hexToRgb / rgbToHex', () => {
    it('round-trips 6-digit hex', () => {
        expect(rgbToHex(hexToRgb('#4c78d0')!)).toBe('#4c78d0');
    });

    it('expands 3-digit hex', () => {
        expect(hexToRgb('#abc')).toEqual([170, 187, 204]);
    });

    it('clamps rgb channels into range', () => {
        expect(rgbToHex([300, -10, 128])).toBe('#ff0080');
    });
});

describe('mixColor', () => {
    it('interpolates hex colors', () => {
        expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
        expect(mixColor('#000000', '#ffffff', 0)).toBe('#000000');
        expect(mixColor('#000000', '#ffffff', 1)).toBe('#ffffff');
    });

    it('interpolates oklch colors', () => {
        const out = mixColor('oklch(0 0 0)', 'oklch(1 0 0)', 0.5);
        expect(out).toMatch(/^oklch\(0\.5 0 0\)/);
    });
});

describe('percentile', () => {
    it('computes linear-interpolated percentiles', () => {
        expect(percentile([1, 2, 3, 4, 5], 50)).toBe(3);
        expect(percentile([1, 2, 3, 4], 50)).toBe(2.5);
        expect(percentile([], 50)).toBe(0);
    });
});

describe('resolveBound', () => {
    const values = [0, 50, 100, 150, 200];

    it('resolves fixed numbers', () => {
        expect(resolveBound({ type: 'number', value: 42, color: '#000' }, values)).toBe(42);
    });

    it('resolves percentages against the min/max', () => {
        expect(resolveBound({ type: 'percent', value: 50, color: '#000' }, values)).toBe(100);
    });

    it('resolves percentiles', () => {
        expect(resolveBound({ type: 'percentile', value: 50, color: '#000' }, values)).toBe(100);
    });

    it('resolves lowest / highest', () => {
        expect(resolveBound({ type: 'lowest', color: '#000' }, values)).toBe(0);
        expect(resolveBound({ type: 'highest', color: '#000' }, values)).toBe(200);
    });

    it('returns null for none or empty sets', () => {
        expect(resolveBound({ type: 'none', color: '#000' }, values)).toBeNull();
        expect(resolveBound({ type: 'lowest', color: '#000' }, [])).toBeNull();
    });
});

function gradient(min: string, max: string, overrides: Partial<ConditionalFormat> = {}): ConditionalFormat {
    return normalizeConditionalFormat({
        style: 'gradient',
        min: { type: 'lowest', color: min },
        max: { type: 'highest', color: max },
        ...overrides,
    });
}

describe('gradientColor', () => {
    it('maps the lowest/highest values to the endpoint colors', () => {
        const cf = gradient('#000000', '#ffffff');
        const values = [0, 100];
        expect(gradientColor(cf, 0, values)).toBe('#000000');
        expect(gradientColor(cf, 100, values)).toBe('#ffffff');
        expect(gradientColor(cf, 50, values)).toBe('#808080');
    });

    it('clamps values outside the bound range', () => {
        const cf = gradient('#000000', '#ffffff');
        expect(gradientColor(cf, -50, [0, 100])).toBe('#000000');
        expect(gradientColor(cf, 250, [0, 100])).toBe('#ffffff');
    });

    it('uses the max color when bounds are degenerate', () => {
        const cf = gradient('#000000', '#ffffff');
        expect(gradientColor(cf, 5, [])).toBe('#ffffff');
    });

    it('renders a diverging 3-color scale through the center', () => {
        const cf = gradient('#000000', '#ffffff', {
            diverging: true,
            center: { type: 'number', value: 50, color: '#888888' } as CfBound,
        });
        const values = [0, 100];
        expect(gradientColor(cf, 25, values)).toBe(mixColor('#000000', '#888888', 0.5));
        expect(gradientColor(cf, 75, values)).toBe(mixColor('#888888', '#ffffff', 0.5));
    });
});

function rule(partial: Partial<CfRule> = {}): CfRule {
    return {
        condition: 'is',
        comparator: 'greaterThan',
        value: 0,
        valueType: 'number',
        color: '#ff0000',
        ...partial,
    };
}

describe('ruleColor', () => {
    const cf = normalizeConditionalFormat({
        style: 'rules',
        rules: [
            rule({ comparator: 'greaterThan', value: 100, color: '#ff0000' }),
            rule({ comparator: 'lessThanOrEqual', value: 100, color: '#00ff00' }),
        ],
    });

    it('returns the first matching rule color (top-to-bottom)', () => {
        expect(ruleColor(cf, 150, [])).toBe('#ff0000');
        expect(ruleColor(cf, 100, [])).toBe('#00ff00');
        expect(ruleColor(cf, 50, [])).toBe('#00ff00');
    });

    it('returns null when nothing matches', () => {
        const only = normalizeConditionalFormat({
            style: 'rules',
            rules: [rule({ comparator: 'greaterThan', value: 10 })],
        });
        expect(ruleColor(only, 5, [])).toBeNull();
    });

    it('supports between comparators', () => {
        const between = normalizeConditionalFormat({
            style: 'rules',
            rules: [rule({ comparator: 'between', value: 10, value2: 20 })],
        });
        expect(ruleColor(between, 15, [])).toBe('#ff0000');
        expect(ruleColor(between, 9, [])).toBeNull();
        expect(ruleColor(between, 21, [])).toBeNull();
    });

    it('supports blank / not-blank conditions', () => {
        const blank = normalizeConditionalFormat({
            style: 'rules',
            rules: [
                rule({ condition: 'isBlank', color: '#888888' }),
                rule({ condition: 'isNotBlank', color: '#ff0000' }),
            ],
        });
        expect(ruleColor(blank, null, [])).toBe('#888888');
        expect(ruleColor(blank, 5, [])).toBe('#ff0000');
    });

    it('resolves percent thresholds against the value set', () => {
        const pct = normalizeConditionalFormat({
            style: 'rules',
            rules: [rule({ value: 50, valueType: 'percent' })],
        });
        expect(ruleColor(pct, 120, [0, 200])).toBe('#ff0000');
        expect(ruleColor(pct, 100, [0, 200])).toBeNull();
    });

    it('resolves percentile thresholds', () => {
        const ptile = normalizeConditionalFormat({
            style: 'rules',
            rules: [rule({ value: 50, valueType: 'percentile' })],
        });
        const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
        expect(ruleColor(ptile, 10, values)).toBe('#ff0000');
        expect(ruleColor(ptile, 1, values)).toBeNull();
    });
});

describe('conditionalColor', () => {
    it('returns null when the style is none', () => {
        expect(conditionalColor(defaultConditionalFormat(), 5, [5])).toBeNull();
    });

    it('reads a literal color cell for field-value style', () => {
        const cf = normalizeConditionalFormat({
            style: 'fieldValue',
            fieldValue: 'Color',
        });
        expect(conditionalColor(cf, 'ignored', [], '#16a34a')).toBe('#16a34a');
        expect(conditionalColor(cf, 'ignored', [], 'nope')).toBeNull();
    });

    it('falls back to the value itself when no cell is provided', () => {
        const cf = normalizeConditionalFormat({
            style: 'fieldValue',
            fieldValue: 'Color',
        });
        expect(conditionalColor(cf, '#4c78d0', [])).toBe('#4c78d0');
    });

    it('applies gradients to numeric values', () => {
        const cf = gradient('#000000', '#ffffff');
        expect(conditionalColor(cf, 50, [0, 100])).toBe('#808080');
        expect(conditionalColor(cf, null, [0, 100])).toBeNull();
    });

    it('applies rules to numeric values', () => {
        const cf = normalizeConditionalFormat({
            style: 'rules',
            rules: [rule({ comparator: 'greaterThan', value: 100 })],
        });
        expect(conditionalColor(cf, 200, [200])).toBe('#ff0000');
        expect(conditionalColor(cf, 50, [50])).toBeNull();
    });
});

describe('conditionalIcon', () => {
    function iconCf(partial: Partial<ConditionalFormat> = {}): ConditionalFormat {
        return normalizeConditionalFormat({
            style: 'icons',
            iconSet: 'directional-colored',
            rules: [
                rule({
                    comparator: 'greaterThan',
                    value: 100,
                    icon: 'up',
                }),
                rule({
                    comparator: 'lessThanOrEqual',
                    value: 100,
                    icon: 'down',
                }),
            ],
            ...partial,
        });
    }

    it('returns the first matching rule icon (top-to-bottom)', () => {
        const cf = iconCf();
        expect(conditionalIcon(cf, 150, [])).toBe('up');
        expect(conditionalIcon(cf, 100, [])).toBe('down');
        expect(conditionalIcon(cf, 50, [])).toBe('down');
    });

    it('returns null when no rule matches', () => {
        const cf = iconCf({
            rules: [rule({ comparator: 'greaterThan', value: 10, icon: 'up' })],
        });
        expect(conditionalIcon(cf, 5, [])).toBeNull();
    });

    it('supports between comparators and blank conditions', () => {
        const cf = iconCf({
            rules: [
                rule({ condition: 'isBlank', icon: 'side' }),
                rule({ comparator: 'between', value: 10, value2: 20, icon: 'up' }),
            ],
        });
        expect(conditionalIcon(cf, null, [])).toBe('side');
        expect(conditionalIcon(cf, 15, [])).toBe('up');
        expect(conditionalIcon(cf, 9, [])).toBeNull();
    });

    it('is inert for non-icons styles', () => {
        const rules = normalizeConditionalFormat({
            style: 'rules',
            rules: [rule({ comparator: 'greaterThan', value: 10, icon: 'up' })],
        });
        expect(conditionalIcon(rules, 200, [])).toBeNull();
    });

    it('treats a missing rule icon as no icon', () => {
        const cf = iconCf({
            rules: [rule({ comparator: 'greaterThan', value: 10 })],
        });
        expect(conditionalIcon(cf, 200, [])).toBeNull();
    });
});

describe('gaugeFxColor', () => {
    it('evaluates the default lowest/highest gradient against the gauge scale', () => {
        const cf = gradient('#e11d48', '#16a34a');
        expect(gaugeFxColor(cf, 0, 0, 100)).toBe('#e11d48');
        expect(gaugeFxColor(cf, 100, 0, 100)).toBe('#16a34a');
        expect(gaugeFxColor(cf, 50, 0, 100)).toBe(
            mixColor('#e11d48', '#16a34a', 0.5),
        );
    });

    it('resolves percent bounds against the gauge scale', () => {
        const cf = normalizeConditionalFormat({
            style: 'gradient',
            min: { type: 'percent', value: 25, color: '#000000' },
            max: { type: 'percent', value: 75, color: '#ffffff' },
        });
        expect(gaugeFxColor(cf, 50, 0, 100)).toBe(mixColor('#000000', '#ffffff', 0.5));
    });

    it('applies number rules to the value', () => {
        const cf = normalizeConditionalFormat({
            style: 'rules',
            rules: [rule({ comparator: 'greaterThan', value: 100 })],
        });
        expect(gaugeFxColor(cf, 200, 0, 100)).toBe('#ff0000');
        expect(gaugeFxColor(cf, 50, 0, 100)).toBeNull();
    });

    it('is inert for none and fieldValue styles', () => {
        expect(gaugeFxColor(normalizeConditionalFormat({}), 50, 0, 100)).toBeNull();
        const fv = normalizeConditionalFormat({ style: 'fieldValue' });
        expect(gaugeFxColor(fv, 50, 0, 100)).toBeNull();
        expect(gaugeFxColor(fv, Number.NaN, 0, 100)).toBeNull();
    });
});

describe('cfAggToAgg', () => {
    it('maps dialog aggregations onto model aggregations', () => {
        expect(cfAggToAgg('average')).toBe('avg');
        expect(cfAggToAgg('sum')).toBe('sum');
        expect(cfAggToAgg('min')).toBe('min');
        expect(cfAggToAgg('max')).toBe('max');
        expect(cfAggToAgg('count')).toBe('count');
        expect(cfAggToAgg('none')).toBe('sum');
        expect(cfAggToAgg('first')).toBe('sum');
    });
});
