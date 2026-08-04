import { describe, expect, it } from 'vitest';
import {
    formatNumberWith,
    formatWellValue,
    normalizeConditionalFormat,
} from './model';
import {
    THEME_COLOR_COUNT,
    THEMES,
    isValidPalette,
    themeById,
    themeCssVars,
} from './themes';

describe('formatNumberWith', () => {
    it('handles the standard presentation formats', () => {
        expect(formatNumberWith(1234567, 'compact')).toBe('1.2M');
        expect(formatNumberWith(1234, 'compact')).toBe('1.2K');
        expect(formatNumberWith(42, 'int')).toBe('42');
        expect(formatNumberWith(3.14159, '2dec')).toBe('3.14');
        expect(formatNumberWith(3.1, '1dec')).toBe('3.1');
        expect(formatNumberWith(0.5, 'percent')).toBe('50.0%');
        expect(formatNumberWith(2500, 'currency')).toBe('$2,500');
    });

    it('returns an em dash for non-finite inputs', () => {
        expect(formatNumberWith(NaN, 'int')).toBe('—');
        expect(formatNumberWith(Infinity, 'int')).toBe('—');
    });
});

describe('formatWellValue', () => {
    it('prefers the field-level format over the visual default', () => {
        expect(formatWellValue(2500, { format: 'currency' }, 'int')).toBe(
            '$2,500',
        );
    });

    it('ignores an "auto" field format and falls back to the visual default', () => {
        expect(formatWellValue(2500, { format: 'auto' }, 'compact')).toBe(
            '2.5K',
        );
    });

    it('falls back to auto when no format is present anywhere', () => {
        expect(formatWellValue(0.5, undefined)).toBe('50.0%');
        expect(formatWellValue(1200, undefined)).toBe('1.2K');
    });
});

describe('normalizeConditionalFormat', () => {
    it('migrates a legacy boolean true to data bars', () => {
        const cfg = normalizeConditionalFormat(true);
        expect(cfg.showDataBars).toBe(true);
        expect(cfg.style).toBe('none');
    });

    it('migrates a legacy boolean false to none', () => {
        expect(normalizeConditionalFormat(false).style).toBe('none');
    });

    it('migrates a legacy { mode: databars } to data bars', () => {
        expect(normalizeConditionalFormat({ mode: 'databars' }).showDataBars).toBe(
            true,
        );
    });

    it('migrates a legacy { mode: colorScale } to a gradient', () => {
        const cfg = normalizeConditionalFormat({
            mode: 'colorScale',
            minColor: '#111111',
            midColor: '#222222',
            maxColor: '#333333',
        });
        expect(cfg.style).toBe('gradient');
        expect(cfg.min.color).toBe('#111111');
        expect(cfg.max.color).toBe('#333333');
    });

    it('falls back to none for unknown modes and fills default colors', () => {
        const cfg = normalizeConditionalFormat({ mode: 'weird' });
        expect(cfg.style).toBe('none');
        expect(cfg.min.color).toBe('#e11d48');
        expect(cfg.max.color).toBe('#16a34a');
    });

    it('normalizes an icons style with an icon set and per-rule icons', () => {
        const cfg = normalizeConditionalFormat({
            style: 'icons',
            iconSet: 'traffic-rimmed',
            rules: [
                {
                    condition: 'is',
                    comparator: 'greaterThan',
                    value: 80,
                    valueType: 'number',
                    color: '#ff0000',
                    icon: 'go',
                },
            ],
        });
        expect(cfg.style).toBe('icons');
        expect(cfg.iconSet).toBe('traffic-rimmed');
        expect(cfg.rules[0]?.icon).toBe('go');
    });

    it('defaults iconSet to empty and keeps legacy rules compatible', () => {
        const cfg = normalizeConditionalFormat({
            style: 'rules',
            rules: [
                {
                    condition: 'is',
                    comparator: 'greaterThan',
                    value: 10,
                    valueType: 'number',
                    color: '#123456',
                },
            ],
        });
        expect(cfg.iconSet).toBe('');
        expect(cfg.rules[0]?.icon).toBeUndefined();
        expect(cfg.rules[0]?.color).toBe('#123456');
    });
});

describe('themeById', () => {
    it('returns the default theme for an unknown id', () => {
        expect(themeById('nope').id).toBe('default');
        expect(themeById(undefined).id).toBe('default');
    });

    it('resolves known built-in themes', () => {
        expect(themeById('ocean').name).toBe('Ocean');
        expect(themeById('monochrome').name).toBe('Monochrome');
    });
});

describe('themeCssVars', () => {
    it('maps every palette color to a --chart-N variable', () => {
        const vars = themeCssVars(themeById('default'));
        for (let i = 1; i <= THEME_COLOR_COUNT; i += 1) {
            expect(vars[`--chart-${i}`]).toMatch(/^oklch/);
        }
    });

    it('includes the font variable only when a font is set', () => {
        const vars = themeCssVars(themeById('default'));
        expect(vars['--chart-font']).toBeUndefined();
        expect(
            themeCssVars({
                id: 'x',
                name: 'X',
                palette: THEMES[0]!.palette,
                fontFamily: 'serif',
            })['--chart-font'],
        ).toBe('serif');
    });
});

describe('isValidPalette', () => {
    it('rejects wrong-length or empty palettes', () => {
        expect(isValidPalette([])).toBe(false);
        expect(isValidPalette(['#111'])).toBe(false);
    });

    it('accepts exactly THEME_COLOR_COUNT non-empty strings', () => {
        const palette = Array.from(
            { length: THEME_COLOR_COUNT },
            (_, i) => `#00${i}0000`,
        );
        expect(isValidPalette(palette)).toBe(true);
    });
});
