// Conditional-formatting evaluation: pure, unit-testable color logic shared by
// the renderers. Given a normalized ConditionalFormat and a per-point value
// (plus the value set for percentile/percent resolution) it returns a color,
// or null when the point should keep its static/palette color.

import type {
    Agg,
    CfAgg,
    CfBound,
    CfRule,
    ConditionalFormat,
} from './model';

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const OKLCH_RE = /^oklch\(/;

/** True for hex or oklch color strings (what this app persists). */
export function isColor(v: string): boolean {
    return HEX_RE.test(v.trim()) || OKLCH_RE.test(v.trim());
}

/** Parses a cell value as a color string, or null when it isn't one. */
export function parseColorCell(v: unknown): string | null {
    if (typeof v !== 'string') return null;
    const s = v.trim();
    return isColor(s) ? s : null;
}

export function hexToRgb(hex: string): [number, number, number] | null {
    const s = hex.trim().replace('#', '');
    if (s.length === 3)
        return [
            parseInt(s[0] + s[0], 16),
            parseInt(s[1] + s[1], 16),
            parseInt(s[2] + s[2], 16),
        ];
    if (s.length === 6)
        return [
            parseInt(s.slice(0, 2), 16),
            parseInt(s.slice(2, 4), 16),
            parseInt(s.slice(4, 6), 16),
        ];
    return null;
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
    const c = (n: number) =>
        Math.round(Math.min(255, Math.max(0, n)))
            .toString(16)
            .padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
}

/** Interpolates two hex or oklch colors at ratio `t` (0..1). */
export function mixColor(a: string, b: string, t: number): string {
    const t2 = Math.max(0, Math.min(1, t));
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    if (ca && cb) {
        return rgbToHex([
            ca[0] * (1 - t2) + cb[0] * t2,
            ca[1] * (1 - t2) + cb[1] * t2,
            ca[2] * (1 - t2) + cb[2] * t2,
        ]);
    }
    const pa = a.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    const pb = b.match(/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
    if (pa && pb) {
        const out = [1, 2, 3].map(
            (i) => Number(pa[i]) * (1 - t2) + Number(pb[i]) * t2,
        );
        return `oklch(${out[0]} ${out[1]} ${out[2]})`;
    }
    return t2 < 0.5 ? a : b;
}

/** Percentile `p` (0..100) of a numeric set. */
export function percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo]!;
    const frac = idx - lo;
    return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

/** Resolves a gradient/rule bound to an absolute number, or null. */
export function resolveBound(
    bound: CfBound,
    values: number[],
): number | null {
    switch (bound.type) {
        case 'number':
            return typeof bound.value === 'number' ? bound.value : null;
        case 'percent': {
            if (!values.length) return null;
            const min = Math.min(...values);
            const max = Math.max(...values);
            return min + (max - min) * ((bound.value ?? 0) / 100);
        }
        case 'percentile':
            return values.length ? percentile(values, bound.value ?? 50) : null;
        case 'lowest':
            return values.length ? Math.min(...values) : null;
        case 'highest':
            return values.length ? Math.max(...values) : null;
        default:
            return null;
    }
}

/** Color for a value inside a min→max (or diverging 3-color) gradient. */
export function gradientColor(
    cf: ConditionalFormat,
    value: number,
    values: number[],
): string | null {
    const lo = resolveBound(cf.min, values);
    const hi = resolveBound(cf.max, values);
    if (lo === null || hi === null || lo === hi) return cf.max.color;
    const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
    if (cf.diverging) {
        const center = resolveBound(cf.center, values);
        if (center !== null && center > lo && center < hi) {
            if (value <= center)
                return mixColor(
                    cf.min.color,
                    cf.center.color,
                    (value - lo) / (center - lo),
                );
            return mixColor(
                cf.center.color,
                cf.max.color,
                (value - center) / (hi - center),
            );
        }
    }
    return mixColor(cf.min.color, cf.max.color, t);
}

function resolveThreshold(rule: CfRule, values: number[]): number {
    if (rule.valueType === 'percent') {
        if (!values.length) return rule.value;
        const min = Math.min(...values);
        const max = Math.max(...values);
        return min + (max - min) * (rule.value / 100);
    }
    if (rule.valueType === 'percentile') {
        return values.length ? percentile(values, rule.value) : rule.value;
    }
    return rule.value;
}

function ruleMatches(
    rule: CfRule,
    value: number | null,
    values: number[],
): boolean {
    if (rule.condition === 'isBlank') return value === null;
    if (rule.condition === 'isNotBlank') return value !== null;
    if (value === null) return false;
    if (rule.comparator === 'between') {
        const a = rule.value;
        const b = rule.value2 ?? a;
        return value >= Math.min(a, b) && value <= Math.max(a, b);
    }
    const threshold = resolveThreshold(rule, values);
    switch (rule.comparator) {
        case 'greaterThan':
            return value > threshold;
        case 'greaterThanOrEqual':
            return value >= threshold;
        case 'lessThan':
            return value < threshold;
        case 'lessThanOrEqual':
            return value <= threshold;
    }
    return false;
}

/** First matching rule's color (rules evaluate top-to-bottom). */
export function ruleColor(
    cf: ConditionalFormat,
    value: number | null,
    values: number[],
): string | null {
    for (const rule of cf.rules) {
        if (ruleMatches(rule, value, values)) return rule.color;
    }
    return null;
}

/**
 * Resolves the conditional color for one point.
 * - `value` is the numeric basis (for gradient/rules), `cell` the raw value
 *   (for field-value style).
 * - Returns null when the point should keep its static/palette color.
 */
export function conditionalColor(
    cf: ConditionalFormat,
    value: number | string | boolean | null,
    values: number[] = [],
    cell?: unknown,
): string | null {
    if (cf.style === 'none') return null;
    if (cf.style === 'fieldValue')
        return parseColorCell(cell !== undefined ? cell : value);
    const n =
        typeof value === 'number' && isFinite(value)
            ? value
            : typeof value === 'string' && value.trim() !== '' && isFinite(Number(value))
              ? Number(value)
              : null;
    if (cf.style === 'rules') return ruleColor(cf, n, values);
    if (cf.style === 'gradient') return n === null ? null : gradientColor(cf, n, values);
    return null;
}

export function isConditionalActive(cf: Pick<ConditionalFormat, 'style'>): boolean {
    return cf.style !== 'none';
}

/** Maps a dialog aggregation onto an `Agg` usable by `aggregate`. */
export function cfAggToAgg(agg: CfAgg): Agg {
    switch (agg) {
        case 'average':
            return 'avg';
        case 'sum':
        case 'min':
        case 'max':
        case 'count':
            return agg;
        default:
            return 'sum';
    }
}
