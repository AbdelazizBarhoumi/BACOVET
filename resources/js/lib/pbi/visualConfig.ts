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
    format: 'generic' | 'singleValue' | 'cartesian' | 'gauge' | 'element';
    /** Format sections rendered by the section-based renderers. */
    sections: FormatSection[];
};

export const SINGLE_VALUE_TYPES: VisualType[] = ['card', 'gauge'];

/** Column + bar families (vertical & horizontal bars) plus the line-family
 * charts (line / area / stacked area / combo) — all of which share the
 * cartesian axes, gridlines, data-label, legend and plot-area systems. */
export const CARTESIAN_TYPES: VisualType[] = [
    'column',
    'stackedColumn',
    'stacked100Column',
    'bar',
    'stackedBar',
    'stacked100Bar',
    'line',
    'area',
    'stackedArea',
    'combo',
];

export const SINGLE_VALUE_CONFIG: VisualConfig = {
    build: [
        { well: 'values', label: 'Champs' },
        { well: 'target', label: 'Objectif (cible)' },
    ],
    showAnalytics: false,
    analyticsKinds: [],
    format: 'singleValue',
    sections: [],
};

/** Gauge: a single-value arc visual with min/max/target bound fields. */
export const GAUGE_CONFIG: VisualConfig = {
    build: [
        { well: 'values', label: 'Valeur' },
        { well: 'minimum', label: 'Valeur min' },
        { well: 'maximum', label: 'Valeur max' },
        { well: 'target', label: 'Objectif (cible)' },
        { well: 'tooltips', label: 'Info-bulles' },
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

/** Bar/column charts and the line family (line / area / stacked area / combo):
 * axes, gridlines, bars, data labels, legend, plot area.
 * Analytics: constant / average / min / max / median.
 */
export const CARTESIAN_CONFIG: VisualConfig = {
    build: [
        { well: 'axis', label: 'Axe X / Lignes' },
        { well: 'legend', label: 'Légende / Colonnes' },
        { well: 'values', label: 'Valeurs' },
        { well: 'smallMultiples', label: 'Petits multiples' },
        { well: 'tooltips', label: 'Info-bulles' },
        { well: 'drillFields', label: 'Extraction / champs d’exploration' },
    ],
    showAnalytics: true,
    analyticsKinds: [
        'constant',
        'average',
        'min',
        'max',
        'median',
        'category',
        'band',
        'intersections',
        'crosshair',
    ],
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
        { well: 'axis', label: 'Axe X / Lignes' },
        { well: 'legend', label: 'Légende / Colonnes' },
        { well: 'values', label: 'Valeurs' },
        { well: 'smallMultiples', label: 'Petits multiples' },
        { well: 'tooltips', label: 'Info-bulles' },
        { well: 'drillFields', label: 'Extraction / champs d’exploration' },
    ],
    showAnalytics: true,
    analyticsKinds: ['constant', 'average', 'trend', 'forecast'],
    format: 'generic',
    sections: [],
};

/** Text / image elements: no field wells, no analytics, format-only pane. */
export const ELEMENT_CONFIG: VisualConfig = {
    build: [],
    showAnalytics: false,
    analyticsKinds: [],
    format: 'element',
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
    if (type === 'text' || type === 'image') return ELEMENT_CONFIG;
    return GENERIC_CONFIG;
}
