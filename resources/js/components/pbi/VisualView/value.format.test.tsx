// @vitest-environment node
// The shared value display format (units / suffix / decimals) used by the
// "Part du tout et distribution" charts (pie, treemap, funnel, waterfall,
// scatter, bubble) must drive their labels/ticks, and must NOT change current
// output when the format is left on its defaults.
import { describe, expect, it } from 'vitest';
import type { Visual } from '@/lib/pbi/model';
import { valueFmtFor, valueTickFmt } from './shared';

function visual(dataLabels?: unknown): Visual {
    return {
        numberFormat: 'auto',
        dataLabels,
    } as unknown as Visual;
}

describe('valueFmtFor — shared value display format', () => {
    it('falls back to the visual number format when not configured', () => {
        expect(valueFmtFor(2500, visual(), undefined)).toBe('2.5K');
        expect(valueFmtFor(1_200_000, visual(), undefined)).toBe('1.2M');
    });

    it('keeps the field format when no explicit value format is set', () => {
        const v = visual();
        const wf = { format: 'currency' as const };
        expect(valueFmtFor(2500, v, wf)).toBe('$2,500');
    });

    it('applies display units, suffix and decimals when configured', () => {
        const v = visual({
            displayUnits: 'billions',
            decimals: 1,
            suffix: 'd',
        });
        expect(valueFmtFor(2_000_000_000, v, undefined)).toBe('2.0d');
    });

    it('applies decimals alone (non-default) with auto units', () => {
        const v = visual({ displayUnits: 'auto', decimals: 2 });
        expect(valueFmtFor(2500, v, undefined)).toBe('2.5K');
    });

    it('ignores the default decimals so the field format still wins', () => {
        const v = visual({ displayUnits: 'auto', decimals: 1 });
        const wf = { format: 'currency' as const };
        expect(valueFmtFor(2500, v, wf)).toBe('$2,500');
    });
});

describe('valueTickFmt — axis ticks share the same format', () => {
    it('formats ticks with the configured units/suffix/decimals', () => {
        const v = visual({
            displayUnits: 'millions',
            decimals: 1,
            suffix: 'd',
        });
        expect(valueTickFmt(v)(1_200_000)).toBe('1.2d');
    });

    it('falls back to the number format for unconfigured ticks', () => {
        expect(valueTickFmt(visual())(2500)).toBe('2.5K');
    });
});
