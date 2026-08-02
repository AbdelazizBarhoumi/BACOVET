// Per-visual-type configuration: which field wells, tabs, format sections and
// analytics lines a visual exposes. Single-value visuals (card / gauge)
// share one very small build pane and have no analytics; cartesian visuals
// (bar/column families) get their own Format sections and analytics line set;
// everything else falls back to the shared chart layout + generic format.

import type { AnalyticsKind, VisualType } from './model';
import type { WellName } from './store';

export type WellSpec = { well: WellName; label: string };

/** Collapsible Format-tab sections a visual may show. */
export type FormatSection =
    | 'title'
    | 'xAxis'
    | 'yAxis'
    | 'gridlines'
    | 'bars'
    | 'dataLabels'
    | 'legend'
    | 'plotArea'
    | 'gaugeAxis'
    | 'colors'
    | 'general';

export type VisualConfig = {
    /** Field wells shown in the Build visual tab. */
    build: WellSpec[];
    /** Whether the Analytics tab is available. */
    showAnalytics: boolean;
    /** Analytics line kinds offered in the Analytics tab. */
    analyticsKinds: AnalyticsKind[];
    /** Which Format-tab renderer to use. */
    format: 'generic' | 'singleValue' | 'cartesian' | 'gauge';
    /** Format sections rendered by the section-based renderers. */
    sections: FormatSection[];
};

export const SINGLE_VALUE_TYPES: VisualType[] = ['card', 'gauge'];

/** Column + bar families (vertical & horizontal bars). */
export const CARTESIAN_TYPES: VisualType[] = [
    'column',
    'stackedColumn',
    'stacked100Column',
    'bar',
    'stackedBar',
    'stacked100Bar',
];

export const SINGLE_VALUE_CONFIG: VisualConfig = {
    build: [
        { well: 'values', label: 'Fields' },
        { well: 'target', label: 'Target (goal)' },
    ],
    showAnalytics: false,
    analyticsKinds: [],
    format: 'singleValue',
    sections: [],
};

/** Gauge: a single-value arc visual with min/max/target bound fields. */
export const GAUGE_CONFIG: VisualConfig = {
    build: [
        { well: 'values', label: 'Value' },
        { well: 'minimum', label: 'Minimum value' },
        { well: 'maximum', label: 'Maximum value' },
        { well: 'target', label: 'Target value' },
        { well: 'tooltips', label: 'Tooltips' },
    ],
    showAnalytics: false,
    analyticsKinds: [],
    format: 'gauge',
    sections: [
        'title',
        'gaugeAxis',
        'colors',
        'dataLabels',
        'general',
    ],
};

/** Bar/column charts: axes, gridlines, bars, data labels, legend, plot area.
 * Analytics: constant / average / min / max / median — no trend or forecast,
 * which only make sense on line charts. */
export const CARTESIAN_CONFIG: VisualConfig = {
    build: [
        { well: 'axis', label: 'X-axis / Rows' },
        { well: 'legend', label: 'Legend / Columns' },
        { well: 'values', label: 'Values' },
        { well: 'smallMultiples', label: 'Small multiples' },
        { well: 'tooltips', label: 'Tooltips' },
        { well: 'drillFields', label: 'Extraction / drill fields' },
    ],
    showAnalytics: true,
    analyticsKinds: ['constant', 'average', 'min', 'max', 'median'],
    format: 'cartesian',
    sections: [
        'title',
        'xAxis',
        'yAxis',
        'gridlines',
        'bars',
        'dataLabels',
        'legend',
        'plotArea',
        'general',
    ],
};

export const GENERIC_CONFIG: VisualConfig = {
    build: [
        { well: 'axis', label: 'X-axis / Rows' },
        { well: 'legend', label: 'Legend / Columns' },
        { well: 'values', label: 'Values' },
        { well: 'smallMultiples', label: 'Small multiples' },
        { well: 'tooltips', label: 'Tooltips' },
        { well: 'drillFields', label: 'Extraction / drill fields' },
    ],
    showAnalytics: true,
    analyticsKinds: ['constant', 'average', 'trend', 'forecast'],
    format: 'generic',
    sections: [],
};

export function isSingleValueType(type: VisualType): boolean {
    return SINGLE_VALUE_TYPES.includes(type);
}

export function isCartesianType(type: VisualType): boolean {
    return CARTESIAN_TYPES.includes(type);
}

export function visualConfig(type: VisualType): VisualConfig {
    if (type === 'gauge') return GAUGE_CONFIG;
    if (isSingleValueType(type)) return SINGLE_VALUE_CONFIG;
    if (isCartesianType(type)) return CARTESIAN_CONFIG;
    return GENERIC_CONFIG;
}
