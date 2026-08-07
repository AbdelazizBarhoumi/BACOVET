// Lookup constants, type guards and fixed option sets for the report canvas.

import type {
    Agg,
    AnalyticsKind,
    CfAgg,
    CfBoundType,
    CfComparator,
    CfRuleCondition,
    CfStyle,
    CfValueType,
    DataLabelContent,
    DataLabelPosition,
    DisplayUnit,
    Field,
    GridlineStyle,
    LegendPosition,
    NumberFormat,
    ValueAggregationMode,
    VisualType,
} from './types';

export const AGGREGATIONS: Agg[] = [
    'sum',
    'avg',
    'count',
    'distinct',
    'min',
    'max',
    'first',
    'latest',
    'raw',
    'nth',
];

export const NUMBER_FORMATS: NumberFormat[] = [
    'auto',
    'int',
    '1dec',
    '2dec',
    'compact',
    'percent',
    'currency',
];

export function isNumberFormat(value: unknown): value is NumberFormat {
    return (
        typeof value === 'string' &&
        NUMBER_FORMATS.includes(value as NumberFormat)
    );
}

export const VALUE_AGGREGATION_MODES: ValueAggregationMode[] = [
    'first',
    'latest',
    'count',
    'nth',
];

export function isValueAggregationMode(
    value: unknown,
): value is ValueAggregationMode {
    return (
        typeof value === 'string' &&
        VALUE_AGGREGATION_MODES.includes(value as ValueAggregationMode)
    );
}

export const ANALYTICS_KINDS: AnalyticsKind[] = [
    'constant',
    'average',
    'min',
    'max',
    'median',
    'trend',
    'forecast',
];

export const CF_STYLES: CfStyle[] = [
    'none',
    'gradient',
    'rules',
    'fieldValue',
    'icons',
];

export const CF_AGGS: CfAgg[] = [
    'none',
    'sum',
    'average',
    'min',
    'max',
    'count',
    'first',
];

export const CF_BOUND_TYPES: CfBoundType[] = [
    'none',
    'lowest',
    'highest',
    'number',
    'percent',
    'percentile',
];

export const CF_VALUE_TYPES: CfValueType[] = [
    'number',
    'percent',
    'percentile',
];

export const CF_COMPARATORS: CfComparator[] = [
    'between',
    'greaterThan',
    'lessThan',
    'greaterThanOrEqual',
    'lessThanOrEqual',
];

export const CF_RULE_CONDITIONS: CfRuleCondition[] = [
    'is',
    'isBlank',
    'isNotBlank',
];

export const DISPLAY_UNITS: DisplayUnit[] = [
    'auto',
    'none',
    'thousands',
    'millions',
    'billions',
    'percent',
    'currency',
];

export function isDisplayUnit(value: unknown): value is DisplayUnit {
    return (
        typeof value === 'string' &&
        DISPLAY_UNITS.includes(value as DisplayUnit)
    );
}

export const PAGE_PRESETS: {
    name: string;
    width: number;
    height: number;
    paper?: boolean;
}[] = [
    { name: '16:9', width: 1280, height: 720 },
    { name: '4:3', width: 960, height: 720 },
    { name: 'A5', width: 559, height: 794, paper: true },
    { name: 'A4', width: 794, height: 1123, paper: true },
    { name: 'A4 paysage', width: 1123, height: 794, paper: true },
    { name: 'A3', width: 1123, height: 1587, paper: true },
    { name: 'Lettre', width: 1100, height: 850, paper: true },
    { name: 'Info-bulle', width: 320, height: 240 },
    { name: 'Personnalisé', width: 1280, height: 720 },
];

export const MEASURES: Field[] = [
    {
        table: 'Measures',
        name: 'Nombre de lignes',
        type: 'number',
        measure: true,
        expression: 'Nombre de lignes = COUNTROWS ( <table> )',
    },
];

/** Numeric modes of `listAgg`: they operate on numeric codes only. */
export const LIST_AGG_NUMERIC_MODES: Agg[] = ['sum', 'avg', 'min', 'max'];

/** The built-in measure implementation for "Nombre de lignes". */
const BUILTIN_COUNTROWS_IMPL = (rows: unknown[]): number => rows.length;

export { BUILTIN_COUNTROWS_IMPL };

const DECIMALS: Record<Exclude<NumberFormat, 'auto'>, number | null> = {
    int: 0,
    '1dec': 1,
    '2dec': 2,
    compact: null,
    percent: null,
    currency: null,
};

export { DECIMALS };

const CURRENCY_SYMBOL = '$';

export { CURRENCY_SYMBOL };

const TITLE_HEADING_SIZES: Record<string, number | undefined> = {
    h1: 28,
    h2: 22,
    h3: 18,
    h4: 14,
};

export { TITLE_HEADING_SIZES };

const GRIDLINE_STYLES: GridlineStyle[] = ['solid', 'dashed', 'dotted'];

export { GRIDLINE_STYLES };

const DATA_LABEL_POSITIONS: DataLabelPosition[] = [
    'auto',
    'insideEnd',
    'outsideEnd',
    'insideCenter',
    'insideBase',
];

export { DATA_LABEL_POSITIONS };

const DATA_LABEL_CONTENTS: DataLabelContent[] = [
    'category',
    'value',
    'percentOfTotal',
    'categoryValue',
    'categoryPercent',
    'valuePercent',
    'all',
];

export { DATA_LABEL_CONTENTS };

const LEGEND_POSITIONS: LegendPosition[] = ['top', 'bottom', 'left', 'right'];

export { LEGEND_POSITIONS };

const SLICER_TYPES = new Set<VisualType>([
    'slicer',
    'buttonSlicer',
    'dropdownSlicer',
    'inputSlicer',
    'dateSlicer',
]);

export { SLICER_TYPES };

const AGGREGATION_FUNCS = new Set([
    'SUM',
    'AVERAGE',
    'AVERAGEA',
    'AVG',
    'COUNT',
    'COUNTA',
    'DISTINCTCOUNT',
    'MIN',
    'MAX',
    'MEDIAN',
    'PRODUCT',
    'COUNTROWS',
]);

export { AGGREGATION_FUNCS };

const SCALAR_FUNCS = new Set([
    'IF',
    'AND',
    'OR',
    'NOT',
    'SWITCH',
    'IFERROR',
    'TRIM',
    'ABS',
    'ROUND',
    'ROUNDUP',
    'ROUNDDOWN',
    'POWER',
    'DIVIDE',
    'MOD',
    'SQRT',
    'INT',
    'SIGN',
    'LEN',
    'UPPER',
    'LOWER',
    'LEFT',
    'RIGHT',
    'MID',
    'SUBSTITUTE',
    'SEARCH',
    'VALUE',
    'CONCATENATE',
    'FORMAT',
    'RELATED',
    'YEAR',
    'MONTH',
    'DAY',
    'WEEKDAY',
    'EOMONTH',
    'TODAY',
    'NOW',
    'DATE',
    'DATEDIFF',
]);

export { SCALAR_FUNCS };

const LIST_FUNCS = new Set(['VALUES', 'DISTINCT']);

export { LIST_FUNCS };

const ITERATOR_FUNCS = new Set([
    'SUMX',
    'COUNTX',
    'AVERAGEX',
    'MINX',
    'MAXX',
    'PRODUCTX',
]);

export { ITERATOR_FUNCS };

const TABLE_FUNCS = new Set([
    'FILTER',
    'ALL',
    'ALLEXCEPT',
    'TOPN',
    'RELATED',
    'CALCULATE',
    'DATEADD',
    'SAMEPERIODLASTYEAR',
    'PREVIOUSMONTH',
    'DATESYTD',
    'TOTALYTD',
    'TOTALMTD',
]);

export { TABLE_FUNCS };