// Aggregation helpers for distinct-value lists (VALUES measures) rendered in
// single-value visuals.

import { LIST_AGG_NUMERIC_MODES } from './consts';
import { LIST_MEASURE_IMPL } from './state';
import type { Agg, EvalCtx, Row } from './types';

/** True when the measure returns a distinct-value list (VALUES) instead of a
 *  scalar, so the single-value visual can render it as a list. */
export function isListMeasure(name: string) {
    return name in LIST_MEASURE_IMPL;
}

/** Distinct-value list of a list measure in the current (or ctx-filtered)
 *  table set. Falls back to `[]` for scalar measures. */
export function listMeasureValue(
    rows: Row[],
    name: string,
    ctx?: EvalCtx,
): string[] {
    const impl = LIST_MEASURE_IMPL[name];
    return impl ? impl(rows, ctx) : [];
}

/** Number of codes ignored by a numeric `listAgg` mode (non-numeric codes). */
export function listAggIgnoredCount(codes: string[], mode?: Agg): number {
    if (!mode || !LIST_AGG_NUMERIC_MODES.includes(mode)) return 0;
    return codes.filter((c) => !isFinite(Number(String(c).trim()))).length;
}

/**
 * Collapse a distinct-value list to a single value for a given `listAgg`
 * treatment. Undefined shows the whole list; `count`/`distinct` yield the
 * code count; `first`/`latest`/`raw` yield one code; `nth` yields the code at
 * 1-based `index`; numeric modes aggregate the numeric codes only.
 */
export function listTreatment(
    codes: string[],
    mode?: Agg,
    index = 1,
): string | null {
    if (!codes.length) return null;
    switch (mode) {
        case 'count':
        case 'distinct':
            return String(codes.length);
        case 'first':
        case 'raw':
            return codes[0] ?? null;
        case 'latest':
            return codes[codes.length - 1] ?? null;
        case 'nth':
            return (
                codes[Math.min(Math.max(index, 1), codes.length) - 1] ?? null
            );
        case 'sum':
        case 'avg':
        case 'min':
        case 'max': {
            const nums = codes
                .map((c) => Number(String(c).trim()))
                .filter((n) => isFinite(n));
            if (!nums.length) return null;
            let acc = nums[0];
            for (let i = 1; i < nums.length; i++) {
                if (mode === 'min') acc = Math.min(acc, nums[i]);
                else if (mode === 'max') acc = Math.max(acc, nums[i]);
                else acc += nums[i];
            }
            if (mode === 'avg') acc = acc / nums.length;
            return String(acc);
        }
        default:
            return null;
    }
}