import { describe, expect, it } from 'vitest';
import { defaultClockStyle, formatClock, normalizeClockStyle } from './model';

const fixed = new Date(2026, 7, 18, 14, 5, 32);

describe('clock style defaults + normalization', () => {
    it('defaults to a 24h clock with seconds and a dd/MM/yyyy date', () => {
        const style = defaultClockStyle();
        expect(style).toEqual({
            showClock: true,
            hourFormat: '24',
            showSeconds: true,
            showDate: true,
            dateFormat: 'dd/MM/yyyy',
        });
    });

    it('keeps valid persisted values and falls back on garbage', () => {
        const style = normalizeClockStyle({
            showClock: false,
            hourFormat: '12',
            showSeconds: false,
            showDate: false,
            dateFormat: 'dd MMMM yyyy',
        });
        expect(style).toEqual({
            showClock: false,
            hourFormat: '12',
            showSeconds: false,
            showDate: false,
            dateFormat: 'dd MMMM yyyy',
        });
        const bogus = normalizeClockStyle({
            hourFormat: 'banana',
            dateFormat: 'not-a-preset',
        });
        expect(bogus.hourFormat).toBe('24');
        expect(bogus.dateFormat).toBe('dd/MM/yyyy');
    });

    it('returns a fresh default for null / undefined input', () => {
        expect(normalizeClockStyle(undefined)).toEqual(defaultClockStyle());
        expect(normalizeClockStyle(null)).toEqual(defaultClockStyle());
    });
});

describe('formatClock', () => {
    it('renders 24h time with seconds', () => {
        const { time } = formatClock(fixed, defaultClockStyle());
        expect(time).toBe('14:05:32');
    });

    it('renders 12h time without seconds when configured', () => {
        const { time } = formatClock(fixed, {
            ...defaultClockStyle(),
            hourFormat: '12',
            showSeconds: false,
        });
        expect(time).toBe('02:05 PM');
    });

    it('renders the date presets', () => {
        const style = { ...defaultClockStyle(), showSeconds: false };
        expect(
            formatClock(fixed, { ...style, dateFormat: 'dd/MM/yyyy' }).date,
        ).toBe('18/08/2026');
        expect(
            formatClock(fixed, { ...style, dateFormat: 'dd/MM/yyyy HH:mm' })
                .date,
        ).toBe('18/08/2026 14:05');
        expect(
            formatClock(fixed, { ...style, dateFormat: 'dd MMMM yyyy' }).date,
        ).toBe('18 août 2026');
        expect(
            formatClock(fixed, { ...style, dateFormat: 'EEEE dd MMMM yyyy' })
                .date,
        ).toBe('mardi 18 août 2026');
        expect(
            formatClock(fixed, { ...style, dateFormat: 'MMMM yyyy' }).date,
        ).toBe('août 2026');
    });
});
