// Data model, dataset tables and aggregation engine for the report canvas.

import type { ShapeKind } from './shapes';

export type FieldType = 'number' | 'text' | 'date' | 'boolean';

export type Field = {
    table: string;
    name: string;
    type: FieldType;
    /** true for DAX measures */
    measure?: boolean;
    expression?: string;
    /** shared-library id (persisted via the measures API) */
    id?: string | number;
    /** folder / group, used to group measures in the fields pane */
    category?: string | null;
    description?: string | null;
};

export type Row = Record<string, string | number | boolean | null>;

export type Agg =
    | 'sum'
    | 'avg'
    | 'count'
    | 'min'
    | 'max'
    | 'distinct'
    | 'first'
    | 'latest'
    | 'raw';

/** How a card/gauge shows a non-numeric field across multiple rows. */
export type ValueAggregationMode = 'first' | 'latest' | 'count';

export const VALUE_AGGREGATION_MODES: ValueAggregationMode[] = [
    'first',
    'latest',
    'count',
];

export function isValueAggregationMode(
    value: unknown,
): value is ValueAggregationMode {
    return (
        typeof value === 'string' &&
        VALUE_AGGREGATION_MODES.includes(value as ValueAggregationMode)
    );
}

/** Value presentation formats for numbers (per-field or per-visual). */
export type NumberFormat =
    | 'auto'
    | 'int'
    | '1dec'
    | '2dec'
    | 'compact'
    | 'percent'
    | 'currency';

export type WellField = {
    table: string;
    name: string;
    agg: Agg;
    /** Optional friendly presentation name; never used for row lookup. */
    label?: string;
    /** Number presentation format; `auto` falls back to the visual default. */
    format?: NumberFormat;
    /**
     * How a non-numeric (text/date/boolean) field is collapsed to one value:
     * `first` shows the first non-null cell, `latest` the last, `count` the
     * number of non-null cells. Numeric fields always use `agg`.
     */
    valueAggregation?: ValueAggregationMode;
};

export type FieldReference = {
    table?: string | undefined;
    name: string;
};

const AGGREGATIONS: Agg[] = [
    'sum',
    'avg',
    'count',
    'distinct',
    'min',
    'max',
    'first',
    'latest',
    'raw',
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

/** Converts drag metadata and legacy persisted values into a physical field reference. */
export function parseFieldReference(
    input: unknown,
    fallbackTable?: string,
): FieldReference | null {
    if (typeof input === 'string') {
        const value = input.trim();
        if (!value) return null;
        try {
            const parsed: unknown = JSON.parse(value);
            if (parsed && typeof parsed === 'object')
                return parseFieldReference(parsed, fallbackTable);
        } catch {
            // A normal column name is not JSON and is valid as-is. Values
            // that look like serialized metadata but are malformed are not.
            if (value.startsWith('{') || value.startsWith('[')) return null;
        }
        return { name: value, table: fallbackTable || undefined };
    }

    if (!input || typeof input !== 'object') return null;
    const value = input as Record<string, unknown>;
    const name = parseFieldReference(value.name, fallbackTable);
    if (!name) return null;
    const table =
        typeof value.table === 'string' && value.table.trim()
            ? value.table.trim()
            : name.table || fallbackTable;
    return { name: name.name, table: table || undefined };
}

export function normalizeWellField(
    input: unknown,
    fallbackTable?: string,
): WellField | null {
    if (!input || typeof input !== 'object') {
        const reference = parseFieldReference(input, fallbackTable);
        return reference
            ? { table: reference.table ?? '', name: reference.name, agg: 'sum' }
            : null;
    }

    const value = input as Record<string, unknown>;
    const reference = parseFieldReference(
        value.name,
        typeof value.table === 'string' ? value.table : fallbackTable,
    );
    if (!reference) return null;
    const agg = AGGREGATIONS.includes(value.agg as Agg)
        ? (value.agg as Agg)
        : 'sum';
    const label =
        typeof value.label === 'string' && value.label.trim()
            ? value.label.trim()
            : undefined;
    const format = isNumberFormat(value.format) ? value.format : undefined;
    const valueAggregation = isValueAggregationMode(value.valueAggregation)
        ? value.valueAggregation
        : undefined;
    return {
        table: reference.table ?? '',
        name: reference.name,
        agg,
        ...(label ? { label } : {}),
        ...(format ? { format } : {}),
        ...(valueAggregation ? { valueAggregation } : {}),
    };
}

export function fieldLabel(wf: Pick<WellField, 'name' | 'label'>): string {
    return wf.label?.trim() || wf.name;
}

export type VisualType =
    | 'column'
    | 'stackedColumn'
    | 'stacked100Column'
    | 'bar'
    | 'stackedBar'
    | 'stacked100Bar'
    | 'line'
    | 'area'
    | 'stackedArea'
    | 'combo'
    | 'ribbon'
    | 'waterfall'
    | 'pie'
    | 'donut'
    | 'treemap'
    | 'funnel'
    | 'scatter'
    | 'bubble'
    | 'card'
    | 'gauge'
    | 'table'
    | 'matrix'
    | 'slicer'
    | 'buttonSlicer'
    | 'dropdownSlicer'
    | 'inputSlicer'
    | 'dateSlicer'
    | 'map'
    | 'filledMap'
    | 'shapeMap'
    | 'decompositionTree'
    | 'keyInfluencers'
    | 'smartNarrative'
    | 'qna'
    | 'rVisual'
    | 'pythonVisual'
    | 'text'
    | 'image'
    | 'button'
    | 'shape';

export type AnalyticsKind =
    | 'constant'
    | 'average'
    | 'min'
    | 'max'
    | 'median'
    | 'trend'
    | 'forecast';

export const ANALYTICS_KINDS: AnalyticsKind[] = [
    'constant',
    'average',
    'min',
    'max',
    'median',
    'trend',
    'forecast',
];

export type AnalyticsLine = {
    kind: AnalyticsKind;
    value?: number;
    enabled: boolean;
};

/** Format style for a visual's conditional formatting (Power BI-style). */
export type CfStyle = 'none' | 'gradient' | 'rules' | 'fieldValue';

/** How the based-on field is summarized into a number per category. */
export type CfAgg =
    | 'none'
    | 'sum'
    | 'average'
    | 'min'
    | 'max'
    | 'count'
    | 'first';

/** Lower/upper bound of a gradient or a rule threshold. */
export type CfBoundType =
    | 'none'
    | 'lowest'
    | 'highest'
    | 'number'
    | 'percent'
    | 'percentile';

export type CfValueType = 'number' | 'percent' | 'percentile';

export type CfComparator =
    | 'between'
    | 'greaterThan'
    | 'lessThan'
    | 'greaterThanOrEqual'
    | 'lessThanOrEqual';

export type CfRuleCondition = 'is' | 'isBlank' | 'isNotBlank';

export type CfBound = {
    type: CfBoundType;
    /** For `number`/`percent`/`percentile` bounds. */
    value?: number;
    color: string;
};

export type CfRule = {
    condition: CfRuleCondition;
    comparator: CfComparator;
    value: number;
    /** Required when `comparator` is `between`. */
    value2?: number;
    valueType: CfValueType;
    color: string;
};

/**
 * Conditional formatting for any visual (charts, tables, single-value).
 * `style: 'none'` disables it. Gradient interpolates colors by value,
 * rules match top-to-bottom (first match wins), and field-value maps a
 * literal color column onto the visual.
 */
export type ConditionalFormat = {
    style: CfStyle;
    /** Column the formatting is based on; `''` means the first values field. */
    basedOn: string;
    basedOnTable?: string;
    agg: CfAgg;
    diverging: boolean;
    min: CfBound;
    max: CfBound;
    center: CfBound;
    rules: CfRule[];
    /** Color column used when `style === 'fieldValue'`. */
    fieldValue: string;
    fieldValueTable?: string;
    /** Table/matrix only: render data bars behind cells. */
    showDataBars: boolean;
};

export const CF_STYLES: CfStyle[] = ['none', 'gradient', 'rules', 'fieldValue'];

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

/** The fully-default (disabled) conditional format. */
export function defaultConditionalFormat(): ConditionalFormat {
    return {
        style: 'none',
        basedOn: '',
        agg: 'none',
        diverging: false,
        min: { type: 'lowest', color: '#e11d48' },
        max: { type: 'highest', color: '#16a34a' },
        center: { type: 'none', color: '#f59e0b' },
        rules: [],
        fieldValue: '',
        showDataBars: false,
    };
}

function normalizeCfBound(
    input: unknown,
    fallback: CfBound,
    allowNone: boolean,
): CfBound {
    if (!input || typeof input !== 'object') return { ...fallback };
    const value = input as Record<string, unknown>;
    const types: CfBoundType[] = allowNone
        ? CF_BOUND_TYPES
        : CF_BOUND_TYPES.filter((t) => t !== 'none');
    return {
        type: types.includes(value.type as CfBoundType)
            ? (value.type as CfBoundType)
            : fallback.type,
        ...(typeof value.value === 'number' && isFinite(value.value)
            ? { value: value.value }
            : {}),
        color:
            typeof value.color === 'string' && value.color.trim()
                ? value.color.trim()
                : fallback.color,
    };
}

/**
 * Accepts a legacy boolean, the old `{mode, minColor, midColor, maxColor}`
 * table config, or a full `ConditionalFormat`; returns a normalized config.
 */
export function normalizeConditionalFormat(input: unknown): ConditionalFormat {
    const out = defaultConditionalFormat();
    if (input === true) {
        out.showDataBars = true;
        return out;
    }
    if (!input || typeof input !== 'object') return out;
    const value = input as Record<string, unknown>;
    if (value.mode === 'databars') out.showDataBars = true;
    if (value.mode === 'colorScale') {
        out.style = 'gradient';
        out.min.color =
            typeof value.minColor === 'string' ? value.minColor : out.min.color;
        out.max.color =
            typeof value.maxColor === 'string' ? value.maxColor : out.max.color;
    }
    if (CF_STYLES.includes(value.style as CfStyle))
        out.style = value.style as CfStyle;
    if (typeof value.basedOn === 'string') out.basedOn = value.basedOn;
    if (typeof value.basedOnTable === 'string')
        out.basedOnTable = value.basedOnTable;
    if (CF_AGGS.includes(value.agg as CfAgg)) out.agg = value.agg as CfAgg;
    if (typeof value.diverging === 'boolean') out.diverging = value.diverging;
    if (value.min) out.min = normalizeCfBound(value.min, out.min, false);
    if (value.max) out.max = normalizeCfBound(value.max, out.max, false);
    if (value.center)
        out.center = normalizeCfBound(value.center, out.center, true);
    if (Array.isArray(value.rules)) {
        out.rules = value.rules
            .filter(
                (r): r is Record<string, unknown> =>
                    !!r && typeof r === 'object',
            )
            .map((r): CfRule | null => {
                const c = r as Record<string, unknown>;
                if (
                    !CF_RULE_CONDITIONS.includes(c.condition as CfRuleCondition)
                )
                    return null;
                const comparator = CF_COMPARATORS.includes(
                    c.comparator as CfComparator,
                )
                    ? (c.comparator as CfComparator)
                    : 'greaterThan';
                return {
                    condition: c.condition as CfRuleCondition,
                    comparator,
                    value:
                        typeof c.value === 'number' && isFinite(c.value)
                            ? c.value
                            : 0,
                    ...(typeof c.value2 === 'number' && isFinite(c.value2)
                        ? { value2: c.value2 }
                        : {}),
                    valueType: CF_VALUE_TYPES.includes(
                        c.valueType as CfValueType,
                    )
                        ? (c.valueType as CfValueType)
                        : 'number',
                    color:
                        typeof c.color === 'string' && c.color.trim()
                            ? c.color.trim()
                            : '#4c78d0',
                };
            })
            .filter((r): r is CfRule => r !== null);
    }
    if (typeof value.fieldValue === 'string') out.fieldValue = value.fieldValue;
    if (typeof value.fieldValueTable === 'string')
        out.fieldValueTable = value.fieldValueTable;
    if (typeof value.showDataBars === 'boolean')
        out.showDataBars = value.showDataBars;
    return out;
}

/**
 * Migrates a legacy single-value `callout.fx` rule set into a `rules`
 * conditional format, or `null` when there is nothing to migrate.
 */
export function conditionalFormatFromFx(
    fx: FxFormat | undefined,
): ConditionalFormat | null {
    if (!fx?.enabled || !Array.isArray(fx.rules) || !fx.rules.length)
        return null;
    const cmp = (op: FxOp): CfComparator =>
        op === '>'
            ? 'greaterThan'
            : op === '>='
              ? 'greaterThanOrEqual'
              : op === '<'
                ? 'lessThan'
                : op === '<='
                  ? 'lessThanOrEqual'
                  : 'between';
    const out = defaultConditionalFormat();
    out.style = 'rules';
    out.rules = fx.rules
        .filter((r) => r.op !== '!=')
        .map((r) => ({
            condition: 'is' as const,
            comparator: cmp(r.op),
            value: r.value,
            ...(r.op === '=' ? { value2: r.value } : {}),
            valueType: 'number' as const,
            color: r.color,
        }));
    return out;
}

/** Builds a `WellField` (usable by `aggregate`) from a field reference. */
export function wellForReference(
    ref: { name: string; table?: string } | null | undefined,
    agg: Agg = 'sum',
): WellField | null {
    if (!ref || !ref.name) return null;
    const table = ref.table || findTableForField(ref.name);
    return { table, name: ref.name, agg };
}

/** Display-unit scaling for a single-value callout, mirroring Power BI's Card. */
export type DisplayUnit =
    | 'auto'
    | 'none'
    | 'thousands'
    | 'millions'
    | 'billions'
    | 'percent'
    | 'currency';

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

/** Auto/custom number formatting, mirroring the Gauge bound rows: when
 * `auto` is true the field/visual default applies; otherwise `format` is a
 * Power BI-style format string (see `formatNumberPattern`). */
export type ValueFormat = {
    auto: boolean;
    format?: string;
};

export function normalizeValueFormat(input: unknown): ValueFormat {
    if (!input || typeof input !== 'object') return { auto: true };
    const value = input as Record<string, unknown>;
    return {
        auto: typeof value.auto === 'boolean' ? value.auto : true,
        format:
            typeof value.format === 'string' && value.format.trim()
                ? value.format.trim()
                : undefined,
    };
}

export type FxOp = '>' | '>=' | '<' | '<=' | '=' | '!=';

/** One conditional-formatting rule for a callout value. */
export type FxRule = {
    op: FxOp;
    value: number;
    color: string;
};

export type FxFormat = {
    enabled: boolean;
    rules: FxRule[];
};

/** The big number of a card/gauge. */
export type CalloutStyle = {
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    /** Overrides the default text color; `undefined` keeps the visual default. */
    color?: string;
    displayUnits: DisplayUnit;
    /** Decimal places; `undefined` follows the unit's default. */
    decimals?: number;
    textWrap?: boolean;
    /** Extra spacing between the callout and its category label. */
    sourceSpacing?: boolean;
    fx?: FxFormat;
};

/** The small label under a callout value (e.g. "Profit"). */
export type CategoryLabelStyle = {
    show: boolean;
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
};

/** Power BI-style title formatting for single-value visuals. */
export type TitleStyle = {
    heading: 'none' | 'h1' | 'h2' | 'h3' | 'h4';
    /** Explicit title font size; overrides the heading preset when set. */
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    background?: string;
    align?: 'left' | 'center' | 'right';
    textWrap?: boolean;
};

/** Font style block shared by axis labels, titles, data labels and legends. */
export type FontStyle = {
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
};

/** One cartesian axis (X or Y). `displayUnits`/`decimals`/range only apply to
 * the value (numeric) axis; on the category axis they are ignored. */
export type AxisStyle = {
    show: boolean;
    /** Axis title text; '' hides the title. */
    title?: string;
    titleFont?: FontStyle;
    labelsFont?: FontStyle;
    /** Numeric axis only: display-unit scaling for tick labels. */
    displayUnits: DisplayUnit;
    decimals?: number;
    /** Numeric axis only: hard min/max range. */
    min?: number;
    max?: number;
};

export type GridlineStyle = 'solid' | 'dashed' | 'dotted';

/** Cartesian gridlines behind the bars. */
export type GridlinesStyle = {
    horizontal: boolean;
    vertical: boolean;
    color: string;
    style: GridlineStyle;
};

/** How a bar's fill color is chosen. */
export type BarsApplyMode = 'all' | 'perCategory';

/** Bars section: color + conditional formatting + transparency. */
export type BarStyle = {
    applyTo: BarsApplyMode;
    /** Fill when `applyTo === 'all'` and no conditional format is active. */
    color?: string;
    /** Per-category fill override keyed by category label ('' = palette). */
    categoryColors: Record<string, string>;
    /** 0 (opaque) .. 100 (invisible). */
    transparency: number;
    /** Corner radius in px. */
    radius?: number;
};

export type DataLabelPosition =
    | 'auto'
    | 'insideEnd'
    | 'outsideEnd'
    | 'insideCenter'
    | 'insideBase';

/** Per-series label override when `applyTo === 'perSeries'`. */
export type DataLabelSeriesOverride = {
    color?: string;
    font?: FontStyle;
};

/** What each bar/column label shows: category, value, percent, or combos. */
export type DataLabelContent =
    | 'category'
    | 'value'
    | 'percentOfTotal'
    | 'categoryValue'
    | 'categoryPercent'
    | 'valuePercent'
    | 'all';

/** Data labels for bars/columns. */
export type DataLabelStyle = {
    show: boolean;
    applyTo: 'all' | 'perSeries';
    position: DataLabelPosition;
    content?: DataLabelContent;
    displayUnits: DisplayUnit;
    decimals?: number;
    font?: FontStyle;
    /** Per-series overrides keyed by series name (legend value or measure label). */
    seriesStyles?: Record<string, DataLabelSeriesOverride>;
};

export type LegendPosition = 'top' | 'bottom' | 'left' | 'right';

/** Legend section styling. */
export type LegendStyle = {
    show: boolean;
    position: LegendPosition;
    font?: FontStyle;
};

/** Plot area / background of the cartesian chart. */
export type PlotAreaStyle = {
    background?: string;
    border: boolean;
    borderColor?: string;
    borderWidth?: number;
};

/* ------------------------- Gauge ------------------------- */

/** One gauge bound (min/max/target): how its value is read and formatted. */
export type GaugeBoundStyle = {
    /** Auto: display format derives from the source field (e.g. currency). */
    auto: boolean;
    /** Power BI-style custom format string when `auto` is off (e.g. "$#,##0"). */
    format?: string;
};

/** One gauge label group (value labels / target label / callout). */
export type GaugeLabelStyle = {
    show: boolean;
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    displayUnits: DisplayUnit;
    decimals?: number;
    /** Auto/custom number formatting; overrides `displayUnits` when set. */
    valueFormat?: ValueFormat;
    fx?: ConditionalFormat | boolean;
};

/** Gauge data labels: parent switch + three independently-toggleable groups. */
export type GaugeDataLabelsStyle = {
    show: boolean;
    /** Min/max value labels at the ends of the arc. */
    values: GaugeLabelStyle;
    /** Label near the target marker. */
    targetLabel: GaugeLabelStyle;
    /** Big central number. */
    callout: GaugeLabelStyle;
};

/** Full gauge formatting block. */
export type GaugeStyle = {
    /** Arc fill color ('' keeps the palette color). */
    fillColor?: string;
    fillFx?: ConditionalFormat | boolean;
    /** Target marker color. */
    targetColor?: string;
    targetFx?: ConditionalFormat | boolean;
    axis: {
        min: GaugeBoundStyle;
        max: GaugeBoundStyle;
        target: GaugeBoundStyle;
    };
    dataLabels: GaugeDataLabelsStyle;
};

export type Visual = {
    id: string;
    type: VisualType;
    /** Selection-pane display name */
    name: string;
    title: string;
    /** free-form pixel layout */
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    hidden: boolean;
    axis: WellField[];
    legend: WellField[];
    values: WellField[];
    tooltips: WellField[];
    smallMultiples: WellField[];
    drillFields: WellField[];
    /** gauge: min/max/target bound fields (single field each) */
    minimum: WellField[];
    maximum: WellField[];
    target: WellField[];
    /** gauge: typed constant bounds; a dropped field wins while present */
    minimumValue?: number;
    maximumValue?: number;
    targetValue?: number;
    text?: string | undefined;
    imageUrl?: string | undefined;
    /** shape kind when `type === 'shape'` */
    shape?: ShapeKind;
    /** rotation in degrees applied to shapes (and usable elsewhere) */
    rotation?: number;
    showTitle: boolean;
    showLegend: boolean;
    showLabels: boolean;
    /** format pane */
    background: string;
    border: boolean;
    shadow: boolean;
    altText: string;
    colorIndex: number;
    /** typography */
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
    fontBold?: boolean;
    fontItalic?: boolean;
    fontUnderline?: boolean;
    textAlign?: 'left' | 'center' | 'right';
    /** border styling (only when `border` is true) */
    borderColor?: string;
    borderWidth?: number;
    radius?: number;
    /** number format applied to values/ticks when fields don't override */
    numberFormat?: NumberFormat;
    /** analytics pane */
    analytics: AnalyticsLine[];
    /** conditional formatting for table/matrix + column charts */
    conditionalFormat: boolean | ConditionalFormat;
    subtotals: boolean;
    /** drill level index into drillFields (hierarchy) */
    drillLevel: number;
    /** max categories rendered before the remainder rolls into an "Other" bucket */
    maxCategories: number;
    /** per-page tooltip */
    tooltipPageId?: string | undefined;
    /** drillthrough target page */
    drillthroughPageId?: string | undefined;
    /** single-value (card/gauge) callout styling */
    callout?: CalloutStyle;
    /** single-value (card/gauge) category label styling */
    categoryLabel?: CategoryLabelStyle;
    /** single-value (card/gauge) title styling */
    titleStyle?: TitleStyle;
    /** cartesian (bar/column) X-axis styling */
    xAxis?: AxisStyle;
    /** cartesian (bar/column) Y-axis styling */
    yAxis?: AxisStyle;
    /** cartesian gridlines */
    gridlines?: GridlinesStyle;
    /** cartesian bars/columns styling */
    bars?: BarStyle;
    /** cartesian data labels */
    dataLabels?: DataLabelStyle;
    /** cartesian legend styling */
    legendStyle?: LegendStyle;
    /** cartesian plot area */
    plotArea?: PlotAreaStyle;
    /** gauge (single-value arc) styling */
    gauge?: GaugeStyle;
};

export type PageFormat = {
    /** canvas size preset name */
    preset: string;
    width: number;
    height: number;
    background: string;
    wallpaper: string;
    /** page is a tooltip page */
    tooltip: boolean;
    hidden: boolean;
};

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

export type Page = {
    id: string;
    name: string;
    visuals: Visual[];
    format: PageFormat;
    /** independent phone canvas: visualId -> layout */
    mobile: Record<
        string,
        { x: number; y: number; w: number; h: number; on: boolean }
    >;
    tabOrder: string[];
};

export type CrossFilter = {
    column: string;
    value: string;
    sourceId: string;
    table?: string;
} | null;

/** per-visual-pair interaction behaviour */
export type Interaction = 'filter' | 'highlight' | 'none';

/** A dataset table: a named set of fields backed by captured endpoint rows. */
export type TableDef = { name: string; fields: Field[]; rows: Row[] };

/* ------------------------------------------------------------------ */
/* Dataset tables — populated at runtime from the fetched endpoints.   */
/* ------------------------------------------------------------------ */

export let TABLES: TableDef[] = [];

export function setTables(tables: TableDef[]): void {
    TABLES = tables;
}

export const MEASURES: Field[] = [
    {
        table: 'Measures',
        name: 'Nombre de lignes',
        type: 'number',
        measure: true,
        expression: 'Nombre de lignes = COUNTROWS ( <table> )',
    },
];

/** A compiled measure: aggregates rows, optionally carrying eval context so
 *  `[Other Measure]` refs resolve through nested measure calls. */
export type MeasureImpl = (rows: Row[], ctx?: EvalCtx) => number;

export const MEASURE_IMPL: Record<string, MeasureImpl> = {
    'Nombre de lignes': (rows) => rows.length,
};

function numericValues(rows: Row[], col: string): number[] {
    return rows
        .map((row) => row[col])
        .filter(
            (value): value is number | string =>
                value !== null && value !== undefined && value !== '',
        )
        .map(Number)
        .filter(Number.isFinite);
}

function sum(rows: Row[], col: string) {
    return numericValues(rows, col).reduce((total, value) => total + value, 0);
}

/* ------------------------------------------------------------------ */
/* Custom measure creation + lightweight DAX evaluation                */
/* ------------------------------------------------------------------ */

/** Splits a `Table[Column]` (or `'Table Name'[Column]`, `[Column]`, `Table`) ref. */
export function parseDaxRef(arg: string): {
    table?: string;
    column?: string;
} {
    const trimmed = arg.trim();
    const quoted =
        trimmed.match(/^(?:'([^']+)'\s*)?\[([^\]]+)\]$/) ??
        trimmed.match(/^([^[\]]+)\s*\[([^\]]+)\]$/);
    if (quoted)
        return {
            table: (quoted[1] ?? '').trim() || undefined,
            column: quoted[2]!.trim(),
        };
    if (/^[^[\]]+$/.test(trimmed) && trimmed) return { table: trimmed };
    return {};
}

/* ------------------------------------------------------------------ */
/* Measure expression parser / evaluator                                */
/*                                                                      */
/* Supports a small, safe subset of DAX plus the simplified Phase-3     */
/* forms: SUM(Sales), AVG(Price), COUNT(Customer), SUM(Sales)-SUM(Cost) */
/* Column refs may be bare (`Sales`) or qualified (`Sales[Amount]`).    */
/* ------------------------------------------------------------------ */

export type MeasureEvalError = Error;

class MeasureSyntaxError extends Error {}

/** Runtime context for a single measure evaluation. */
type EvalCtx = {
    errors?: string[];
    /** Other page measures, resolved by `[Name]` refs. */
    measures?: Record<string, MeasureImpl | null>;
    /** Recursion depth guard for measures that reference other measures. */
    depth?: number;
};

type MeasureNode =
    | { kind: 'num'; value: number }
    | { kind: 'col'; table?: string; column: string }
    | { kind: 'func'; name: string; args: MeasureNode[] }
    | {
          kind: 'binop';
          op: '+' | '-' | '*' | '/';
          left: MeasureNode;
          right: MeasureNode;
      }
    | { kind: 'ref'; name: string }
    | { kind: 'table'; name: string };

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

type Token =
    | { type: 'num'; value: number }
    | { type: 'word'; value: string }
    | { type: 'qword'; value: string }
    | { type: 'bracket'; value: string }
    | { type: 'table'; value: string }
    | { type: 'lparen' | 'rparen' | 'comma' }
    | { type: 'op'; value: '+' | '-' | '*' | '/' };

function tokenize(src: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    while (i < src.length) {
        const c = src[i]!;
        if (/\s/.test(c)) {
            i += 1;
            continue;
        }
        if (c === '[') {
            const end = src.indexOf(']', i + 1);
            if (end < 0) throw new MeasureSyntaxError('Crochet non fermé');
            tokens.push({
                type: 'bracket',
                value: src.slice(i + 1, end).trim(),
            });
            i = end + 1;
            continue;
        }
        if (c === '(') {
            tokens.push({ type: 'lparen' });
            i += 1;
            continue;
        }
        if (c === ')') {
            tokens.push({ type: 'rparen' });
            i += 1;
            continue;
        }
        if (c === ',') {
            tokens.push({ type: 'comma' });
            i += 1;
            continue;
        }
        if (c === '+' || c === '-' || c === '*' || c === '/') {
            tokens.push({ type: 'op', value: c });
            i += 1;
            continue;
        }
        if (c === "'") {
            const end = src.indexOf("'", i + 1);
            if (end < 0) throw new MeasureSyntaxError('Guillemet non fermé');
            tokens.push({ type: 'qword', value: src.slice(i + 1, end) });
            i = end + 1;
            continue;
        }
        if (c === '<') {
            const end = src.indexOf('>', i + 1);
            if (end < 0)
                throw new MeasureSyntaxError('Balise « < » non fermée');
            tokens.push({ type: 'table', value: src.slice(i + 1, end).trim() });
            i = end + 1;
            continue;
        }
        if (/[0-9]/.test(c)) {
            const m = src.slice(i).match(/^\d+(?:\.\d+)?/);
            if (!m) throw new MeasureSyntaxError('Nombre invalide');
            tokens.push({ type: 'num', value: Number(m[0]) });
            i += m[0].length;
            continue;
        }
        if (/[\p{L}_]/u.test(c)) {
            const m = src.slice(i).match(/^[\p{L}\p{N}_]+/u);
            if (!m) throw new MeasureSyntaxError('Identifiant invalide');
            tokens.push({ type: 'word', value: m[0] });
            i += m[0].length;
            continue;
        }
        throw new MeasureSyntaxError(`Caractère inattendu « ${c} »`);
    }
    return tokens;
}

type ParseState = { tokens: Token[]; pos: number };

function peekToken(t: ParseState): Token | undefined {
    return t.tokens[t.pos];
}

function takeToken(t: ParseState): Token | undefined {
    return t.tokens[t.pos++];
}

function expectToken(t: ParseState, type: Token['type']): Token {
    const tok = takeToken(t);
    if (!tok || tok.type !== type)
        throw new MeasureSyntaxError(`« ${type} » attendu`);
    return tok;
}

function parseExpr(t: ParseState): MeasureNode {
    let left = parseTerm(t);
    for (;;) {
        const tok = peekToken(t);
        if (tok?.type === 'op' && (tok.value === '+' || tok.value === '-')) {
            takeToken(t);
            const right = parseTerm(t);
            left = { kind: 'binop', op: tok.value, left, right };
        } else break;
    }
    return left;
}

function parseTerm(t: ParseState): MeasureNode {
    let left = parseFactor(t);
    for (;;) {
        const tok = peekToken(t);
        if (tok?.type === 'op' && (tok.value === '*' || tok.value === '/')) {
            takeToken(t);
            const right = parseFactor(t);
            left = { kind: 'binop', op: tok.value, left, right };
        } else break;
    }
    return left;
}

function parseFactor(t: ParseState): MeasureNode {
    const tok = takeToken(t);
    if (!tok) throw new MeasureSyntaxError('Expression incomplète');
    if (tok.type === 'num') return { kind: 'num', value: tok.value };
    if (tok.type === 'op' && tok.value === '-') {
        const inner = parseFactor(t);
        return {
            kind: 'binop',
            op: '-',
            left: { kind: 'num', value: 0 },
            right: inner,
        };
    }
    if (tok.type === 'lparen') {
        const inner = parseExpr(t);
        expectToken(t, 'rparen');
        return inner;
    }
    if (tok.type === 'bracket') return { kind: 'ref', name: tok.value };
    if (tok.type === 'table') return { kind: 'table', name: tok.value };
    if (tok.type === 'word') {
        if (peekToken(t)?.type === 'lparen') {
            takeToken(t);
            const args: MeasureNode[] = [];
            if (peekToken(t)?.type !== 'rparen') {
                args.push(parseExpr(t));
                while (peekToken(t)?.type === 'comma') {
                    takeToken(t);
                    args.push(parseExpr(t));
                }
            }
            expectToken(t, 'rparen');
            return { kind: 'func', name: tok.value, args };
        }
        if (peekToken(t)?.type === 'bracket') {
            const column = takeToken(t) as { type: 'bracket'; value: string };
            return { kind: 'col', table: tok.value, column: column.value };
        }
        return { kind: 'col', column: tok.value };
    }
    if (tok.type === 'qword') {
        if (peekToken(t)?.type === 'bracket') {
            const column = takeToken(t) as { type: 'bracket'; value: string };
            return { kind: 'col', table: tok.value, column: column.value };
        }
        return { kind: 'col', column: tok.value };
    }
    throw new MeasureSyntaxError(`Syntaxe inattendue (${tok.type})`);
}

function walkNode(node: MeasureNode, visit: (n: MeasureNode) => void): void {
    visit(node);
    if (node.kind === 'func') for (const a of node.args) walkNode(a, visit);
    else if (node.kind === 'binop') {
        walkNode(node.left, visit);
        walkNode(node.right, visit);
    }
}

function tryCompile(
    expression: string,
): { ok: true; node: MeasureNode } | { ok: false; error: string } {
    const eq = expression.indexOf('=');
    const rhs = (eq >= 0 ? expression.slice(eq + 1) : expression).trim();
    if (!rhs) return { ok: false, error: 'Expression vide.' };
    try {
        const tokens = tokenize(rhs);
        if (!tokens.length) return { ok: false, error: 'Expression vide.' };
        const state: ParseState = { tokens, pos: 0 };
        const node = parseExpr(state);
        if (state.pos < tokens.length) {
            return {
                ok: false,
                error: `Caractère inattendu à la fin de l'expression.`,
            };
        }
        return { ok: true, node };
    } catch (e) {
        return {
            ok: false,
            error:
                e instanceof MeasureSyntaxError
                    ? e.message
                    : 'Expression invalide.',
        };
    }
}

/** Column values from rows, flagging references to columns that no longer exist.
 *
 *  When the passed rows (a visual's primary-table rows) do not contain a
 *  column the measure references, the column is resolved from the table the
 *  expression names (or the first table exposing the column). This lets
 *  measures compute against their own tables even in measure-only visuals or
 *  measures that span multiple tables. */
function resolveColumn(
    column: string,
    rows: Row[],
    ctx: EvalCtx,
    table?: string,
): (string | number | boolean | null)[] {
    const sample = rows[0];
    const present = !!sample && column in sample;
    if (!present) {
        const candidates: string[] = table && table !== '' ? [table] : [];
        if (!candidates.length) {
            const found = findTableForField(column);
            if (found) candidates.push(found);
        }
        for (const name of candidates) {
            const source = TABLES.find((t) => t.name === name);
            if (source && source.rows.length && column in source.rows[0]) {
                return source.rows.map((r) => r[column] ?? null);
            }
        }
    }
    if (sample && !present) {
        const message = `Colonne « ${column} » introuvable.`;
        ctx.errors?.push(message);
        throw new MeasureSyntaxError(message);
    }
    return rows.map((r) => r[column] ?? null);
}

function numericOf(values: (string | number | boolean | null)[]): number[] {
    return values
        .filter((v) => v !== null && v !== undefined && v !== '')
        .map(Number)
        .filter(Number.isFinite);
}

/** The column a value-aggregation is applied to (a column or a `[Name]` ref). */
function columnNameOf(node: MeasureNode): string {
    if (node.kind === 'col') return node.column;
    if (node.kind === 'ref') return node.name;
    throw new MeasureSyntaxError('Une colonne est attendue en argument.');
}

function evalFunction(
    node: Extract<MeasureNode, { kind: 'func' }>,
    rows: Row[],
    ctx: EvalCtx,
): number {
    const name = node.name.toUpperCase();
    const arg = node.args[0];

    if (name === 'COUNTROWS') return rows.length;

    if (!AGGREGATION_FUNCS.has(name)) {
        throw new MeasureSyntaxError(
            `Fonction « ${node.name} » non supportée.`,
        );
    }
    if (!arg) throw new MeasureSyntaxError(`${name}() attend une colonne.`);

    const column = columnNameOf(arg);
    const table = arg.kind === 'col' ? arg.table : undefined;
    const values = resolveColumn(column, rows, ctx, table);

    switch (name) {
        case 'SUM':
            return numericOf(values).reduce((total, value) => total + value, 0);
        case 'AVERAGE':
        case 'AVERAGEA':
        case 'AVG': {
            const nums = numericOf(values);
            return nums.length
                ? nums.reduce((total, value) => total + value, 0) / nums.length
                : 0;
        }
        case 'COUNT':
            return values.filter(
                (v) => v !== null && v !== undefined && v !== '',
            ).length;
        case 'COUNTA':
            return values.filter((v) => v !== null && v !== undefined).length;
        case 'DISTINCTCOUNT':
            return new Set(
                values.filter((v) => v !== null && v !== undefined && v !== ''),
            ).size;
        case 'MIN': {
            const nums = numericOf(values);
            return nums.length ? Math.min(...nums) : 0;
        }
        case 'MAX': {
            const nums = numericOf(values);
            return nums.length ? Math.max(...nums) : 0;
        }
        case 'MEDIAN': {
            const nums = numericOf(values).sort((a, b) => a - b);
            if (!nums.length) return 0;
            const mid = Math.floor(nums.length / 2);
            return nums.length % 2
                ? nums[mid]!
                : (nums[mid - 1]! + nums[mid]!) / 2;
        }
        case 'PRODUCT':
            return numericOf(values).reduce((total, value) => total * value, 1);
        default:
            return 0;
    }
}

function evalNode(node: MeasureNode, rows: Row[], ctx: EvalCtx): number {
    switch (node.kind) {
        case 'num':
            return node.value;
        case 'col':
            return numericOf(
                resolveColumn(node.column, rows, ctx, node.table),
            ).reduce((total, value) => total + value, 0);
        case 'ref': {
            const known = ctx.measures;
            const fn =
                known && node.name in known
                    ? known[node.name]
                    : (MEASURE_IMPL[node.name] ?? null);
            if (fn) {
                const depth = ctx.depth ?? 0;
                if (depth > 8) return 0;
                return fn(rows, { ...ctx, depth: depth + 1 }) ?? 0;
            }
            return numericOf(
                resolveColumn(
                    node.name,
                    rows,
                    ctx,
                    findTableForField(node.name) || undefined,
                ),
            ).reduce((total, value) => total + value, 0);
        }
        case 'table':
            return 0;
        case 'binop': {
            const left = evalNode(node.left, rows, ctx);
            const right = evalNode(node.right, rows, ctx);
            if (node.op === '+') return left + right;
            if (node.op === '-') return left - right;
            if (node.op === '*') return left * right;
            if (node.op === '/') return right === 0 ? 0 : left / right;
            return 0;
        }
        case 'func':
            return evalFunction(node, rows, ctx);
    }
}

/**
 * Compiles a measure expression into a row aggregator. Unsupported or
 * malformed expressions compile to a function that always returns 0, so
 * existing callers keep working; use `validateMeasureExpression` /
 * `evaluateMeasure` to surface errors.
 */
export function compileMeasure(expression: string): MeasureImpl {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return () => 0;
    const node = compiled.node;
    return (rows, ctx = {}) => {
        try {
            return evalNode(node, rows, ctx);
        } catch {
            return 0;
        }
    };
}

/**
 * Returns the `Table[Column]` / `[Column]` references a measure expression
 * depends on, so callers can resolve the rows the measure should be evaluated
 * against (enrichment, measure-only visuals). Table names are kept as written
 * in the expression; bare column refs have no table and are resolved at
 * runtime via `findTableForField`.
 */
export function measureColumnRefs(
    expression: string,
): { table?: string; column: string }[] {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return [];
    const refs: { table?: string; column: string }[] = [];
    walkNode(compiled.node, (node) => {
        if (node.kind === 'col')
            refs.push({ table: node.table, column: node.column });
        else if (node.kind === 'ref') refs.push({ column: node.name });
    });
    return refs;
}

export type MeasureValidation = { ok: true } | { ok: false; error: string };

/**
 * Validates a measure expression. When `columns` is given, every referenced
 * column must exist in it (catches deleted-column dependencies). When
 * `measures` is given, `[Name]` refs may resolve to those measure names.
 */
export function validateMeasureExpression(
    expression: string,
    columns?: string[],
    measures?: string[],
): MeasureValidation {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return compiled;

    const knownColumns = new Set(
        (columns ?? []).map((c) => c.trim().toLowerCase()),
    );
    const knownMeasures = new Set(
        (measures ?? []).map((m) => m.trim().toLowerCase()),
    );

    let missing: string | null = null;
    walkNode(compiled.node, (node) => {
        if (missing) return;
        if (
            node.kind === 'func' &&
            !AGGREGATION_FUNCS.has(node.name.toUpperCase())
        ) {
            missing = `Fonction « ${node.name} » non supportée.`;
        } else if (
            node.kind === 'col' &&
            knownColumns.size > 0 &&
            node.column
        ) {
            if (!knownColumns.has(node.column.trim().toLowerCase())) {
                missing = `Colonne « ${node.column} » introuvable.`;
            }
        } else if (node.kind === 'ref' && node.name) {
            const key = node.name.trim().toLowerCase();
            if (knownMeasures.has(key)) return;
            if (knownColumns.size > 0 && knownColumns.has(key)) return;
            if (knownColumns.size > 0 || knownMeasures.size > 0) {
                missing = `Référence « ${node.name} » introuvable.`;
            }
        }
    });
    if (missing) return { ok: false, error: missing };
    return { ok: true };
}

/**
 * Evaluates a measure expression against rows, reporting the first error
 * (missing column, unknown function, malformed expression) instead of
 * silently returning 0. Division by zero yields 0 (DAX BLANK semantics).
 */
export function evaluateMeasure(
    expression: string,
    rows: Row[],
    measures?: Record<string, MeasureImpl | null>,
): { value: number; error?: string } {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return { value: 0, error: compiled.error };
    const errors: string[] = [];
    const ctx: EvalCtx = { errors, measures };
    try {
        const value = evalNode(compiled.node, rows, ctx);
        if (errors.length) return { value: 0, error: errors[0]! };
        return { value };
    } catch (e) {
        const message =
            e instanceof MeasureSyntaxError || e instanceof TypeError
                ? e.message
                : String(e);
        return { value: 0, error: message };
    }
}

/**
 * Makes a measure usable by the aggregation engine. Custom measures live in
 * the PBI state; this only wires the evaluator so `isMeasure` and `aggregate`
 * resolve them like the built-in ones. The expression is validated against
 * the currently loaded tables (and other registered measures); any problem is
 * recorded in `MEASURE_ERRORS` so the UI can flag broken measures.
 */
export const MEASURE_ERRORS: Record<string, string> = {};

export function measureError(name: string): string | undefined {
    return MEASURE_ERRORS[name];
}

function availableColumns(): string[] {
    const columns: string[] = [];
    for (const t of TABLES) for (const f of t.fields) columns.push(f.name);
    return columns;
}

function knownMeasureNames(): string[] {
    return Object.keys(MEASURE_IMPL);
}

export function registerMeasure(
    name: string,
    expression: string,
    impl?: MeasureImpl,
): void {
    MEASURE_IMPL[name] = impl ?? compileMeasure(expression);
    const validation = validateMeasureExpression(
        expression,
        availableColumns(),
        knownMeasureNames(),
    );
    if (validation.ok) delete MEASURE_ERRORS[name];
    else MEASURE_ERRORS[name] = validation.error;
}

/** Removes a custom measure (and any recorded error) from the engine. */
export function unregisterMeasure(name: string): void {
    delete MEASURE_IMPL[name];
    delete MEASURE_ERRORS[name];
}

/* ------------------------------------------------------------------ */
/* Aggregation engine                                                  */
/* ------------------------------------------------------------------ */

export function isMeasure(name: string) {
    return name in MEASURE_IMPL;
}

/** First table that exposes a column with the given name. */
export function findTableForField(name: string): string {
    for (const t of TABLES) {
        if (t.fields.some((f) => f.name === name)) return t.name;
    }
    return '';
}

export function fieldType(name: string, table?: string): FieldType {
    if (isMeasure(name)) return 'number';
    if (table) {
        for (const t of TABLES) {
            if (t.name !== table) continue;
            const f = t.fields.find((x) => x.name === name);
            if (f) return f.type;
        }
    }
    for (const t of TABLES) {
        const f = t.fields.find((x) => x.name === name);
        if (f) return f.type;
    }
    return 'text';
}

export function hasColumn(table: TableDef, name: string): boolean {
    return table.fields.some((f) => f.name === name);
}

/**
 * Returns a human-readable reason a field cannot be resolved against the
 * loaded dataset, or `null` when it is fine. Used to surface "incorrect
 * field assignment" warnings (badge + tooltip) in the wells UI.
 */
export function fieldIssue(f: WellField): string | null {
    if (isMeasure(f.name)) return null;
    if (f.table && !TABLES.some((t) => t.name === f.table)) {
        return `Table « ${f.table} » introuvable dans le jeu de données.`;
    }
    if (TABLES.length) {
        const found = TABLES.some((t) =>
            t.fields.some((x) => x.name === f.name),
        );
        if (!found) {
            return `Colonne « ${f.name} » introuvable dans les données chargées.`;
        }
    }
    return null;
}

/** Returns a reason when a field is text but used where a number is expected. */
export function fieldNumericIssue(f: WellField): string | null {
    if (isMeasure(f.name)) return null;
    if (fieldType(f.name, f.table) === 'number') return null;
    return `« ${fieldLabel(f)} » est un champ texte.`;
}

export function aggregate(rows: Row[], wf: WellField): number {
    if (isMeasure(wf.name)) return MEASURE_IMPL[wf.name]!(rows);
    const col = wf.name;
    switch (wf.agg) {
        case 'count':
            return rows.filter(
                (row) => row[col] !== null && row[col] !== undefined,
            ).length;
        case 'distinct':
            return new Set(rows.map((r) => r[col])).size;
        case 'avg': {
            const values = numericValues(rows, col);
            return values.length
                ? values.reduce((total, value) => total + value, 0) /
                      values.length
                : 0;
        }
        case 'min': {
            const values = numericValues(rows, col);
            return values.length ? Math.min(...values) : 0;
        }
        case 'max': {
            const values = numericValues(rows, col);
            return values.length ? Math.max(...values) : 0;
        }
        case 'first': {
            const values = numericValues(rows, col);
            return values.length ? values[0] : 0;
        }
        case 'latest': {
            const values = numericValues(rows, col);
            const last = values[values.length - 1];
            return last === undefined ? 0 : last;
        }
        case 'raw': {
            // Actual value mode: show the field's value as-is from the first
            // row that has a non-null value, instead of an aggregate. For a
            // row-unique axis this surfaces the real per-row measurement.
            const nums = numericValues(rows, col);
            return nums.length ? nums[0] : 0;
        }
        default:
            return sum(rows, col);
    }
}

/**
 * Collapses a single-value visual's rows into one displayed value.
 * Measures and numeric columns aggregate via `wf.agg`; non-numeric fields
 * (text/date/boolean) use the field's `valueAggregation` mode: `first`
 * (first non-null cell), `latest` (last non-null cell) or `count` (number
 * of non-null cells). Returns `null` when no value can be shown.
 */
export function singleValue(
    rows: Row[],
    wf: WellField,
    mode?: ValueAggregationMode,
): string | number | boolean | null {
    if (isMeasure(wf.name)) return aggregate(rows, wf);
    if (fieldType(wf.name, wf.table) === 'number') return aggregate(rows, wf);
    const aggregation = mode ?? wf.valueAggregation ?? 'first';
    if (aggregation === 'count') {
        return rows.filter(
            (row) => row[wf.name] !== null && row[wf.name] !== undefined,
        ).length;
    }
    const cells = rows
        .map((row) => row[wf.name])
        .filter((v) => v !== null && v !== undefined && v !== '');
    const value = aggregation === 'latest' ? cells[cells.length - 1] : cells[0];
    return value === undefined ? null : value;
}

/**
 * Resolves a gauge bound (min/max/target) value. A dropped field wins over a
 * typed constant; returns `undefined` when neither yields a finite number.
 */
export function gaugeBoundValue(
    rows: Row[],
    wf: WellField | undefined,
    constant: number | undefined,
): number | undefined {
    if (wf) {
        const n = Number(singleValue(rows, wf) ?? 0);
        return Number.isFinite(n) ? n : undefined;
    }
    return typeof constant === 'number' && Number.isFinite(constant)
        ? constant
        : undefined;
}

/** Label shown under a single-value callout. */
export function singleValueLabel(
    wf: WellField,
    type: FieldType,
    mode?: ValueAggregationMode,
): string {
    if (isMeasure(wf.name)) return wf.name;
    if (type === 'number' || (mode ?? wf.valueAggregation) === 'count')
        return measureLabel(wf);
    return fieldLabel(wf);
}

export function measureLabel(wf: WellField) {
    if (isMeasure(wf.name)) return wf.name;
    if (wf.label?.trim()) return wf.label.trim();
    if (fieldType(wf.name, wf.table) === 'number') {
        if (wf.agg === 'raw') return fieldLabel(wf);
        const p =
            wf.agg === 'sum'
                ? 'Somme de'
                : wf.agg === 'avg'
                  ? 'Moyenne de'
                  : wf.agg === 'count'
                    ? 'Nombre de'
                    : wf.agg === 'distinct'
                      ? 'Nombre distinct de'
                      : wf.agg === 'first'
                        ? 'Premier de'
                        : wf.agg === 'latest'
                          ? 'Dernier de'
                          : wf.agg === 'min'
                            ? 'Min de'
                            : 'Max de';
        return `${p} ${fieldLabel(wf)}`;
    }
    return `Nombre de ${fieldLabel(wf)}`;
}

export function buildChartData(
    rows: Row[],
    axis: WellField[],
    legend: WellField[],
    values: WellField[],
    tooltips: WellField[] = [],
    maxCategories?: number,
    extra?: WellField,
    extraColor?: string,
) {
    const axisCol = axis[0]?.name;
    const legendCol = legend[0]?.name;

    /** First non-null/non-empty cell of a column across a group. */
    const firstNonNull = (groupRows: Row[], col: string): unknown => {
        for (const r of groupRows) {
            const v = r[col];
            if (v !== null && v !== undefined && v !== '') return v;
        }
        return null;
    };

    const withTooltips = (
        item: Record<string, string | number>,
        groupRows: Row[],
    ) => {
        for (const t of tooltips) {
            item[`tt:${t.name}`] = aggregate(groupRows, t);
        }
        if (extra) item['_cf'] = aggregate(groupRows, extra);
        if (extraColor)
            item['_cfx'] = firstNonNull(groupRows, extraColor) as
                | string
                | number;
        return item;
    };

    if (!axisCol) {
        const single: Record<string, string | number> = { category: 'Total' };
        values.forEach((v) => (single[measureLabel(v)] = aggregate(rows, v)));
        return {
            data: [withTooltips(single, rows)],
            series: values.map(measureLabel),
        };
    }

    const groups = new Map<string, Row[]>();
    for (const r of rows) {
        const k = String(r[axisCol]);
        const arr = groups.get(k);
        if (arr) arr.push(r);
        else groups.set(k, [r]);
    }

    const cap = maxCategories && maxCategories > 0 ? maxCategories : Infinity;
    const capped = cap < groups.size;
    const entries = [...groups.entries()];

    if (capped) {
        entries.sort((a, b) => {
            const av = values[0] ? aggregate(a[1], values[0]) : a[1].length;
            const bv = values[0] ? aggregate(b[1], values[0]) : b[1].length;
            return Number(bv) - Number(av);
        });
    }

    const kept = capped ? entries.slice(0, cap) : entries;

    const seriesSet = new Set<string>();
    const data: Record<string, string | number>[] = kept.map(
        ([key, groupRows]) => {
            const item: Record<string, string | number> = { category: key };
            if (legendCol) {
                const byLegend = new Map<string, Row[]>();
                for (const r of groupRows) {
                    const lk = String(r[legendCol]);
                    const arr = byLegend.get(lk);
                    if (arr) arr.push(r);
                    else byLegend.set(lk, [r]);
                }
                for (const [lk, lrows] of byLegend) {
                    seriesSet.add(lk);
                    item[lk] = values[0]
                        ? aggregate(lrows, values[0])
                        : lrows.length;
                }
            } else {
                values.forEach((v) => {
                    seriesSet.add(measureLabel(v));
                    item[measureLabel(v)] = aggregate(groupRows, v);
                });
            }
            return withTooltips(item, groupRows);
        },
    );

    if (capped) {
        const rest = entries.slice(cap);
        const other: Record<string, string | number> = { category: 'Other' };
        const otherRows: Row[] = [];
        for (const [, groupRows] of rest) otherRows.push(...groupRows);
        if (legendCol) {
            const byLegend = new Map<string, Row[]>();
            for (const r of otherRows) {
                const lk = String(r[legendCol]);
                const arr = byLegend.get(lk);
                if (arr) arr.push(r);
                else byLegend.set(lk, [r]);
            }
            for (const [lk, lrows] of byLegend) {
                seriesSet.add(lk);
                other[lk] = values[0]
                    ? aggregate(lrows, values[0])
                    : lrows.length;
            }
        } else {
            values.forEach((v) => {
                seriesSet.add(measureLabel(v));
                other[measureLabel(v)] = aggregate(otherRows, v);
            });
        }
        data.push(withTooltips(other, otherRows));
    }

    if (fieldType(axisCol, axis[0]?.table) === 'number') {
        data.sort((a, b) => Number(a['category']) - Number(b['category']));
    } else if (values.length && !legendCol && !capped) {
        const key = measureLabel(values[0]!);
        data.sort((a, b) => Number(b[key]) - Number(a[key]));
    }

    return { data, series: [...seriesSet] };
}

export type ScatterPoint = {
    x: number;
    y: number;
    z?: number;
    category?: string;
    raw: Row;
};

/**
 * Builds scatter/bubble points directly from rows: one point per row using
 * raw numeric X/Y (and optional Z for bubble size) values. Rows without a
 * finite X or Y are skipped. When the axis field is not numeric, falls back
 * to the category-grouped chart data so categorical scatters keep working.
 */
export function buildScatterData(
    rows: Row[],
    xWell: WellField | undefined,
    yWell: WellField | undefined,
    zWell: WellField | undefined,
): { points: ScatterPoint[]; numeric: boolean } {
    const xCol = xWell?.name;
    const yCol = yWell?.name;
    const zCol = zWell?.name;

    if (!xCol || !yCol) return { points: [], numeric: false };
    const xNumeric = fieldType(xCol, xWell?.table) === 'number';
    const yNumeric = fieldType(yCol, yWell?.table) === 'number';
    if (!xNumeric || !yNumeric) return { points: [], numeric: false };

    const points: ScatterPoint[] = [];
    for (const r of rows) {
        const xv = r[xCol];
        const yv = r[yCol];
        if (xv === null || xv === undefined || xv === '') continue;
        if (yv === null || yv === undefined || yv === '') continue;
        const x = Number(xv);
        const y = Number(yv);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const point: ScatterPoint = { x, y, raw: r };
        if (zCol) {
            const zv = r[zCol];
            if (zv !== null && zv !== undefined && zv !== '') {
                const z = Number(zv);
                if (Number.isFinite(z)) point.z = z;
            }
        }
        points.push(point);
    }
    return { points, numeric: true };
}

export function distinctValues(col: string, rows: Row[]) {
    const s = new Set<string>();
    for (const r of rows) s.add(String(r[col]));
    return [...s].sort();
}

const SLICER_TYPES = new Set<VisualType>([
    'slicer',
    'buttonSlicer',
    'dropdownSlicer',
    'inputSlicer',
    'dateSlicer',
]);

/** True for any slicer family visual (checkbox, buttons, dropdown, input, date). */
export function isSlicerVisual(v: Pick<Visual, 'type'>): boolean {
    return SLICER_TYPES.has(v.type);
}

/** Table backing a visual — resolved from its first populated well. */
export function visualTable(
    v: Pick<
        Visual,
        | 'axis'
        | 'legend'
        | 'values'
        | 'drillFields'
        | 'smallMultiples'
        | 'tooltips'
        | 'minimum'
        | 'maximum'
        | 'target'
    >,
): string {
    const wells = [
        v.axis,
        v.legend,
        v.values,
        v.drillFields,
        v.smallMultiples,
        v.tooltips,
        v.minimum ?? [],
        v.maximum ?? [],
        v.target ?? [],
    ];
    for (const well of wells) {
        if (well[0]?.table) return well[0].table;
    }
    return '';
}

export function formatNumber(n: number, compact = true) {
    if (!isFinite(n)) return '—';
    if (Math.abs(n) < 1 && n !== 0) return `${(n * 100).toFixed(1)}%`;
    if (!compact)
        return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

const DECIMALS: Record<Exclude<NumberFormat, 'auto'>, number | null> = {
    int: 0,
    '1dec': 1,
    '2dec': 2,
    compact: null,
    percent: null,
    currency: null,
};

const CURRENCY_SYMBOL = '$';

/**
 * Formats a number with an explicit presentation format. `auto` keeps the
 * existing heuristic behavior (percent when |n| < 1, compact otherwise).
 */
export function formatNumberWith(n: number, code: NumberFormat): string {
    if (!isFinite(n)) return '—';
    switch (code) {
        case 'percent':
            return `${(n * 100).toFixed(1)}%`;
        case 'currency':
            return `${CURRENCY_SYMBOL}${n.toLocaleString('en-US', {
                maximumFractionDigits: 0,
            })}`;
        case 'compact': {
            const abs = Math.abs(n);
            if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
            if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
            return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
        case 'int':
        case '1dec':
        case '2dec':
            return n.toLocaleString('en-US', {
                minimumFractionDigits: DECIMALS[code] ?? 0,
                maximumFractionDigits: DECIMALS[code] ?? 0,
            });
        default:
            return formatNumber(n);
    }
}

/**
 * Formats a number with a Power BI-style custom format string (a pragmatic
 * subset of Excel syntax). Supports `0`/`#` digit placeholders, thousands
 * separators, decimal places, `%` scaling, literal prefix/suffix (quoted or
 * plain) and `;` positive/negative sections. Examples: `"$#,##0"`, `"0.0%"`,
 * `"#,##0.00"`, `"0.0 K"`.
 */
export function formatNumberPattern(n: number, pattern: string): string {
    if (!isFinite(n)) return '—';
    const sections = pattern.split(';');
    const neg = sections[1] !== undefined ? sections[1]! : null;
    const section = n < 0 && neg !== null ? neg : (sections[0] ?? '');
    const negative = n < 0 && neg === null;
    const abs = Math.abs(n);

    let percent = false;
    let thousands = false;
    let decimals = 0;
    let scaling = 0;
    let intBlock = '';
    let fracBlock = '';
    let prefix = '';
    let suffix = '';
    let readingFrac = false;

    for (let i = 0; i < section.length; i++) {
        const ch = section[i]!;
        if (ch === '"') {
            const end = section.indexOf('"', i + 1);
            const lit =
                end === -1 ? section.slice(i + 1) : section.slice(i + 1, end);
            if (intBlock || readingFrac) suffix += lit;
            else prefix += lit;
            if (end === -1) break;
            i = end;
            continue;
        }
        if (ch === '\\') {
            const lit = section[i + 1] ?? '';
            if (intBlock || readingFrac) suffix += lit;
            else prefix += lit;
            i += 1;
            continue;
        }
        if (ch === '0' || ch === '#' || ch === '?') {
            if (readingFrac) {
                fracBlock += ch;
                decimals += 1;
            } else {
                intBlock += ch;
            }
            continue;
        }
        if (ch === '.') {
            readingFrac = true;
            continue;
        }
        if (ch === ',') {
            if (!readingFrac && intBlock) thousands = true;
            else if (!intBlock && !fracBlock) prefix += ch;
            else scaling += 1;
            continue;
        }
        if (ch === '%') {
            percent = true;
            continue;
        }
        if (intBlock || readingFrac) suffix += ch;
        else prefix += ch;
    }

    if (!intBlock && !fracBlock)
        return `${negative ? '-' : ''}${prefix}${suffix}`;

    let v = abs;
    if (percent) v *= 100;
    while (scaling > 0) {
        v /= 1000;
        scaling -= 1;
    }

    const factor = 10 ** decimals;
    const rounded = Math.round(v * factor) / factor;
    const [intRaw, fracRaw = ''] = rounded.toFixed(decimals).split('.');
    let intPart = intRaw;
    const minInt = (intBlock.match(/0/g) ?? []).length;
    if (intPart.length < minInt) intPart = intPart.padStart(minInt, '0');
    if (thousands) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fracOut = decimals > 0 ? `.${fracRaw}` : '';
    return `${negative ? '-' : ''}${prefix}${intPart}${fracOut}${
        percent ? '%' : ''
    }${suffix}`;
}

/**
 * Resolves the effective format for a well field: the field's own format wins,
 * otherwise the visual-level `numberFormat`, otherwise `auto`.
 */
export function formatWellValue(
    n: number,
    wf: Pick<WellField, 'format'> | undefined,
    visualDefault: NumberFormat = 'auto',
): string {
    const code = wf?.format && wf.format !== 'auto' ? wf.format : visualDefault;
    return formatNumberWith(n, code);
}

/* ------------------------- Single-value callout ------------------------- */

/** First matching rule's color wins; `undefined` when none match. */
export function applyFx(rules: FxRule[], value: number): string | undefined {
    for (const rule of rules) {
        const match =
            rule.op === '>'
                ? value > rule.value
                : rule.op === '>='
                  ? value >= rule.value
                  : rule.op === '<'
                    ? value < rule.value
                    : rule.op === '<='
                      ? value <= rule.value
                      : rule.op === '='
                        ? value === rule.value
                        : value !== rule.value;
        if (match) return rule.color;
    }
    return undefined;
}

export const DEFAULT_CALLOUT: CalloutStyle = {
    displayUnits: 'auto',
    decimals: 1,
    textWrap: false,
    sourceSpacing: false,
    fx: { enabled: false, rules: [] },
};

export const DEFAULT_CATEGORY_LABEL: CategoryLabelStyle = {
    show: true,
    fontSize: 11,
};

export const DEFAULT_TITLE_STYLE: TitleStyle = {
    heading: 'none',
    align: 'center',
};

export const DEFAULT_AXIS_STYLE: AxisStyle = {
    show: true,
    title: '',
    displayUnits: 'auto',
};

export const DEFAULT_GRIDLINES: GridlinesStyle = {
    horizontal: true,
    vertical: false,
    color: 'var(--border)',
    style: 'solid',
};

export const DEFAULT_BAR_STYLE: BarStyle = {
    applyTo: 'all',
    categoryColors: {},
    transparency: 0,
};

export const DEFAULT_DATA_LABELS: DataLabelStyle = {
    show: false,
    applyTo: 'all',
    position: 'auto',
    content: 'value',
    displayUnits: 'auto',
    decimals: 1,
};

export const DEFAULT_LEGEND: LegendStyle = {
    show: true,
    position: 'top',
    font: { fontSize: 10 },
};

export const DEFAULT_PLOT_AREA: PlotAreaStyle = {
    border: false,
    borderWidth: 1,
};

/** Applies display-unit scaling and decimal places to a number. */
export function formatDisplayUnitValue(
    n: number,
    displayUnits: DisplayUnit = 'auto',
    decimals?: number,
): string {
    if (!isFinite(n)) return '—';
    const unit = isDisplayUnit(displayUnits) ? displayUnits : 'auto';
    const d =
        typeof decimals === 'number' && isFinite(decimals)
            ? decimals
            : undefined;
    const fixed = (value: number, dp: number | undefined) =>
        value.toLocaleString('en-US', {
            minimumFractionDigits: dp ?? 0,
            maximumFractionDigits: dp ?? 0,
        });
    switch (unit) {
        case 'none':
            return fixed(n, d ?? 2);
        case 'thousands':
            return `${fixed(n / 1_000, d ?? 1)}K`;
        case 'millions':
            return `${fixed(n / 1_000_000, d ?? 1)}M`;
        case 'billions':
            return `${fixed(n / 1_000_000_000, d ?? 1)}B`;
        case 'percent':
            return `${(n * 100).toFixed(d ?? 1)}%`;
        case 'currency':
            return `$${fixed(n, d ?? 0)}`;
        default:
            return formatAutoNumber(n, d);
    }
}

/**
 * Auto display-unit formatting: keeps the compact K/M scaling for large
 * values but honors the decimal-places cap, and shows raw decimals rather
 * than a surprise percentage for values below 1.
 */
function formatAutoNumber(n: number, decimals?: number): string {
    const dp =
        typeof decimals === 'number' && isFinite(decimals) ? decimals : undefined;
    const abs = Math.abs(n);
    const scaled = (value: number, suffix: string) =>
        `${value.toLocaleString('en-US', {
            maximumFractionDigits: dp ?? 1,
        })}${suffix}`;
    if (abs >= 1_000_000) return scaled(n / 1_000_000, 'M');
    if (abs >= 1_000) return scaled(n / 1_000, 'K');
    return n.toLocaleString('en-US', { maximumFractionDigits: dp ?? 0 });
}

/**
 * Formats a callout value. Numbers honor the display unit and decimal places,
 * a per-field format wins over the callout unit; non-numeric values (text,
 * dates, booleans) are formatted through `formatValue`.
 */
export function formatCallout(
    value: string | number | boolean | null,
    style: {
        displayUnits?: DisplayUnit;
        decimals?: number;
        valueFormat?: ValueFormat;
    },
    wf?: Pick<WellField, 'format'>,
    type: FieldType = 'number',
): string {
    if (value === null || value === undefined) return '—';
    if (type !== 'number' || typeof value !== 'number')
        return formatValue(value, type);
    const n = value;
    if (!isFinite(n)) return '—';
    const vf = normalizeValueFormat(style.valueFormat);
    if (!vf.auto && vf.format) return formatNumberPattern(n, vf.format);
    if (wf?.format && wf.format !== 'auto')
        return formatNumberWith(n, wf.format);
    const unit = isDisplayUnit(style.displayUnits)
        ? style.displayUnits
        : 'auto';
    const decimals =
        typeof style.decimals === 'number' && isFinite(style.decimals)
            ? style.decimals
            : undefined;
    const fixed = (value: number, d: number | undefined) =>
        value.toLocaleString('en-US', {
            minimumFractionDigits: d ?? 0,
            maximumFractionDigits: d ?? 0,
        });
    switch (unit) {
        case 'none':
            return fixed(n, decimals ?? 2);
        case 'thousands':
            return `${fixed(n / 1_000, decimals ?? 1)}K`;
        case 'millions':
            return `${fixed(n / 1_000_000, decimals ?? 1)}M`;
        case 'billions':
            return `${fixed(n / 1_000_000_000, decimals ?? 1)}B`;
        case 'percent':
            return `${(n * 100).toFixed(decimals ?? 1)}%`;
        case 'currency':
            return `$${fixed(n, decimals ?? 0)}`;
        default:
            return formatAutoNumber(n, decimals);
    }
}

export function normalizeFxFormat(input: unknown): FxFormat {
    if (!input || typeof input !== 'object') {
        return { enabled: false, rules: [] };
    }
    const value = input as Record<string, unknown>;
    const ops: FxOp[] = ['>', '>=', '<', '<=', '=', '!='];
    const rules = Array.isArray(value.rules)
        ? value.rules
              .map((r): FxRule | null => {
                  if (!r || typeof r !== 'object') return null;
                  const rule = r as Record<string, unknown>;
                  if (!ops.includes(rule.op as FxOp)) return null;
                  return {
                      op: rule.op as FxOp,
                      value:
                          typeof rule.value === 'number' && isFinite(rule.value)
                              ? rule.value
                              : 0,
                      color:
                          typeof rule.color === 'string' && rule.color.trim()
                              ? rule.color.trim()
                              : '#4c78d0',
                  };
              })
              .filter((r): r is FxRule => r !== null)
        : [];
    return { enabled: value.enabled === true, rules };
}

export function normalizeCalloutStyle(input: unknown): CalloutStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_CALLOUT };
    const value = input as Record<string, unknown>;
    const style: CalloutStyle = {
        displayUnits: isDisplayUnit(value.displayUnits)
            ? value.displayUnits
            : DEFAULT_CALLOUT.displayUnits,
        decimals:
            typeof value.decimals === 'number' && isFinite(value.decimals)
                ? value.decimals
                : DEFAULT_CALLOUT.decimals,
        textWrap:
            typeof value.textWrap === 'boolean'
                ? value.textWrap
                : DEFAULT_CALLOUT.textWrap,
        sourceSpacing:
            typeof value.sourceSpacing === 'boolean'
                ? value.sourceSpacing
                : DEFAULT_CALLOUT.sourceSpacing,
        fx: normalizeFxFormat(value.fx),
    };
    if (typeof value.fontFamily === 'string' && value.fontFamily.trim())
        style.fontFamily = value.fontFamily.trim();
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.fontSize = value.fontSize;
    if (typeof value.bold === 'boolean') style.bold = value.bold;
    if (typeof value.italic === 'boolean') style.italic = value.italic;
    if (typeof value.underline === 'boolean') style.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    return style;
}

export function normalizeCategoryLabelStyle(
    input: unknown,
): CategoryLabelStyle {
    if (!input || typeof input !== 'object')
        return { ...DEFAULT_CATEGORY_LABEL };
    const value = input as Record<string, unknown>;
    const style: CategoryLabelStyle = {
        show: typeof value.show === 'boolean' ? value.show : true,
    };
    if (typeof value.fontFamily === 'string' && value.fontFamily.trim())
        style.fontFamily = value.fontFamily.trim();
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.fontSize = value.fontSize;
    if (typeof value.bold === 'boolean') style.bold = value.bold;
    if (typeof value.italic === 'boolean') style.italic = value.italic;
    if (typeof value.underline === 'boolean') style.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    return style;
}

export function normalizeTitleStyle(input: unknown): TitleStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_TITLE_STYLE };
    const value = input as Record<string, unknown>;
    const headings: TitleStyle['heading'][] = ['none', 'h1', 'h2', 'h3', 'h4'];
    const style: TitleStyle = {
        heading: headings.includes(value.heading as TitleStyle['heading'])
            ? (value.heading as TitleStyle['heading'])
            : DEFAULT_TITLE_STYLE.heading,
        align:
            value.align === 'left' ||
            value.align === 'right' ||
            value.align === 'center'
                ? value.align
                : DEFAULT_TITLE_STYLE.align,
    };
    if (typeof value.bold === 'boolean') style.bold = value.bold;
    if (typeof value.italic === 'boolean') style.italic = value.italic;
    if (typeof value.underline === 'boolean') style.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    if (typeof value.background === 'string' && value.background.trim())
        style.background = value.background.trim();
    if (typeof value.textWrap === 'boolean') style.textWrap = value.textWrap;
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.fontSize = value.fontSize;
    return style;
}

const TITLE_HEADING_SIZES: Record<string, number | undefined> = {
    h1: 28,
    h2: 22,
    h3: 18,
    h4: 14,
};

/** Power BI-style title CSS props. An explicit title font size wins over the
 * heading preset, which in turn wins over the visual's general font size. */
export function visualTitleStyle(
    v: Pick<Visual, 'fontFamily' | 'fontSize' | 'fontColor' | 'titleStyle'>,
) {
    const t = normalizeTitleStyle(v.titleStyle);
    return {
        fontFamily: v.fontFamily || undefined,
        fontSize: t.fontSize ?? TITLE_HEADING_SIZES[t.heading] ?? v.fontSize,
        color: t.color ?? v.fontColor,
        fontWeight: t.bold ? 700 : 600,
        fontStyle: t.italic ? 'italic' : undefined,
        textDecoration: t.underline ? 'underline' : undefined,
        backgroundColor: t.background || undefined,
        textAlign: t.align,
        whiteSpace: t.textWrap ? 'normal' : 'nowrap',
    } as const;
}

export function normalizeFontStyle(input: unknown): FontStyle | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const value = input as Record<string, unknown>;
    const style: FontStyle = {};
    if (typeof value.fontFamily === 'string' && value.fontFamily.trim())
        style.fontFamily = value.fontFamily.trim();
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.fontSize = value.fontSize;
    if (typeof value.bold === 'boolean') style.bold = value.bold;
    if (typeof value.italic === 'boolean') style.italic = value.italic;
    if (typeof value.underline === 'boolean') style.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    return Object.keys(style).length ? style : undefined;
}

export function normalizeAxisStyle(input: unknown): AxisStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_AXIS_STYLE };
    const value = input as Record<string, unknown>;
    const style: AxisStyle = {
        show: typeof value.show === 'boolean' ? value.show : true,
        displayUnits: isDisplayUnit(value.displayUnits)
            ? value.displayUnits
            : DEFAULT_AXIS_STYLE.displayUnits,
    };
    if (typeof value.title === 'string') style.title = value.title;
    const titleFont = normalizeFontStyle(value.titleFont);
    if (titleFont) style.titleFont = titleFont;
    const labelsFont = normalizeFontStyle(value.labelsFont);
    if (labelsFont) style.labelsFont = labelsFont;
    if (typeof value.decimals === 'number' && isFinite(value.decimals))
        style.decimals = value.decimals;
    if (typeof value.min === 'number' && isFinite(value.min))
        style.min = value.min;
    if (typeof value.max === 'number' && isFinite(value.max))
        style.max = value.max;
    return style;
}

const GRIDLINE_STYLES: GridlineStyle[] = ['solid', 'dashed', 'dotted'];

export function normalizeGridlinesStyle(input: unknown): GridlinesStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_GRIDLINES };
    const value = input as Record<string, unknown>;
    return {
        horizontal:
            typeof value.horizontal === 'boolean'
                ? value.horizontal
                : DEFAULT_GRIDLINES.horizontal,
        vertical:
            typeof value.vertical === 'boolean'
                ? value.vertical
                : DEFAULT_GRIDLINES.vertical,
        color:
            typeof value.color === 'string' && value.color.trim()
                ? value.color.trim()
                : DEFAULT_GRIDLINES.color,
        style: GRIDLINE_STYLES.includes(value.style as GridlineStyle)
            ? (value.style as GridlineStyle)
            : DEFAULT_GRIDLINES.style,
    };
}

export function normalizeBarStyle(input: unknown): BarStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_BAR_STYLE };
    const value = input as Record<string, unknown>;
    const style: BarStyle = {
        applyTo: value.applyTo === 'perCategory' ? 'perCategory' : 'all',
        categoryColors: {},
        transparency:
            typeof value.transparency === 'number' &&
            isFinite(value.transparency)
                ? Math.max(0, Math.min(100, value.transparency))
                : DEFAULT_BAR_STYLE.transparency,
    };
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    if (value.categoryColors && typeof value.categoryColors === 'object') {
        for (const [key, color] of Object.entries(
            value.categoryColors as Record<string, unknown>,
        )) {
            if (typeof color === 'string' && color.trim())
                style.categoryColors[key] = color.trim();
        }
    }
    if (typeof value.radius === 'number' && isFinite(value.radius))
        style.radius = value.radius;
    return style;
}

const DATA_LABEL_POSITIONS: DataLabelPosition[] = [
    'auto',
    'insideEnd',
    'outsideEnd',
    'insideCenter',
    'insideBase',
];

const DATA_LABEL_CONTENTS: DataLabelContent[] = [
    'category',
    'value',
    'percentOfTotal',
    'categoryValue',
    'categoryPercent',
    'valuePercent',
    'all',
];

export function normalizeDataLabelStyle(input: unknown): DataLabelStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_DATA_LABELS };
    const value = input as Record<string, unknown>;
    const style: DataLabelStyle = {
        show: typeof value.show === 'boolean' ? value.show : false,
        applyTo: value.applyTo === 'perSeries' ? 'perSeries' : 'all',
        position: DATA_LABEL_POSITIONS.includes(
            value.position as DataLabelPosition,
        )
            ? (value.position as DataLabelPosition)
            : DEFAULT_DATA_LABELS.position,
        content: DATA_LABEL_CONTENTS.includes(value.content as DataLabelContent)
            ? (value.content as DataLabelContent)
            : DEFAULT_DATA_LABELS.content,
        displayUnits: isDisplayUnit(value.displayUnits)
            ? value.displayUnits
            : DEFAULT_DATA_LABELS.displayUnits,
        decimals:
            typeof value.decimals === 'number' && isFinite(value.decimals)
                ? value.decimals
                : DEFAULT_DATA_LABELS.decimals,
    };
    const font = normalizeFontStyle(value.font);
    if (font) style.font = font;
    if (value.seriesStyles && typeof value.seriesStyles === 'object') {
        const out: Record<string, DataLabelSeriesOverride> = {};
        for (const [key, raw] of Object.entries(
            value.seriesStyles as Record<string, unknown>,
        )) {
            if (!raw || typeof raw !== 'object') continue;
            const o = raw as Record<string, unknown>;
            const override: DataLabelSeriesOverride = {};
            if (typeof o.color === 'string' && o.color.trim())
                override.color = o.color.trim();
            const overrideFont = normalizeFontStyle(o.font);
            if (overrideFont) override.font = overrideFont;
            if (Object.keys(override).length) out[key] = override;
        }
        if (Object.keys(out).length) style.seriesStyles = out;
    }
    return style;
}

const LEGEND_POSITIONS: LegendPosition[] = ['top', 'bottom', 'left', 'right'];

export function normalizeLegendStyle(input: unknown): LegendStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_LEGEND };
    const value = input as Record<string, unknown>;
    const style: LegendStyle = {
        show: typeof value.show === 'boolean' ? value.show : true,
        position: LEGEND_POSITIONS.includes(value.position as LegendPosition)
            ? (value.position as LegendPosition)
            : DEFAULT_LEGEND.position,
    };
    const font = normalizeFontStyle(value.font);
    if (font) style.font = font;
    else if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.font = { fontSize: value.fontSize };
    return style;
}

export function normalizePlotAreaStyle(input: unknown): PlotAreaStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_PLOT_AREA };
    const value = input as Record<string, unknown>;
    const style: PlotAreaStyle = {
        border: typeof value.border === 'boolean' ? value.border : false,
    };
    if (typeof value.background === 'string' && value.background.trim())
        style.background = value.background.trim();
    if (typeof value.borderColor === 'string' && value.borderColor.trim())
        style.borderColor = value.borderColor.trim();
    if (typeof value.borderWidth === 'number' && isFinite(value.borderWidth))
        style.borderWidth = value.borderWidth;
    return style;
}

/* ------------------------- Gauge normalizers ------------------------- */

export const DEFAULT_GAUGE_BOUND: GaugeBoundStyle = { auto: true };

export const DEFAULT_GAUGE_LABEL: GaugeLabelStyle = {
    show: true,
    displayUnits: 'auto',
    decimals: 1,
    valueFormat: { auto: true },
};

export const DEFAULT_GAUGE_DATA_LABELS: GaugeDataLabelsStyle = {
    show: false,
    values: { ...DEFAULT_GAUGE_LABEL, show: true },
    targetLabel: { ...DEFAULT_GAUGE_LABEL, show: true },
    callout: { ...DEFAULT_GAUGE_LABEL, show: true },
};

export const DEFAULT_GAUGE: GaugeStyle = {
    axis: {
        min: { ...DEFAULT_GAUGE_BOUND },
        max: { ...DEFAULT_GAUGE_BOUND },
        target: { ...DEFAULT_GAUGE_BOUND },
    },
    dataLabels: {
        show: false,
        values: { ...DEFAULT_GAUGE_LABEL, show: true },
        targetLabel: { ...DEFAULT_GAUGE_LABEL, show: true },
        callout: { ...DEFAULT_GAUGE_LABEL, show: true },
    },
};

/** Fresh deep copy of the default gauge style (never shared across visuals). */
export function defaultGaugeStyle(): GaugeStyle {
    return {
        axis: {
            min: { ...DEFAULT_GAUGE_BOUND },
            max: { ...DEFAULT_GAUGE_BOUND },
            target: { ...DEFAULT_GAUGE_BOUND },
        },
        dataLabels: {
            show: false,
            values: { ...DEFAULT_GAUGE_LABEL, show: true },
            targetLabel: { ...DEFAULT_GAUGE_LABEL, show: true },
            callout: { ...DEFAULT_GAUGE_LABEL, show: true },
        },
    };
}

function normalizeGaugeBound(
    input: unknown,
    fallback: GaugeBoundStyle,
): GaugeBoundStyle {
    if (!input || typeof input !== 'object') return { ...fallback };
    const value = input as Record<string, unknown>;
    const out: GaugeBoundStyle = {
        auto: typeof value.auto === 'boolean' ? value.auto : fallback.auto,
    };
    if (typeof value.format === 'string' && value.format.trim())
        out.format = value.format.trim();
    return out;
}

function normalizeGaugeLabel(
    input: unknown,
    fallback: GaugeLabelStyle,
): GaugeLabelStyle {
    if (!input || typeof input !== 'object') return { ...fallback };
    const value = input as Record<string, unknown>;
    const out: GaugeLabelStyle = {
        show: typeof value.show === 'boolean' ? value.show : fallback.show,
        displayUnits: isDisplayUnit(value.displayUnits)
            ? (value.displayUnits as DisplayUnit)
            : fallback.displayUnits,
    };
    if (typeof value.fontFamily === 'string' && value.fontFamily)
        out.fontFamily = value.fontFamily;
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        out.fontSize = value.fontSize;
    if (typeof value.bold === 'boolean') out.bold = value.bold;
    if (typeof value.italic === 'boolean') out.italic = value.italic;
    if (typeof value.underline === 'boolean') out.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        out.color = value.color.trim();
    if (typeof value.decimals === 'number' && isFinite(value.decimals))
        out.decimals = value.decimals;
    out.valueFormat = normalizeValueFormat(value.valueFormat);
    if (value.fx !== undefined)
        out.fx = value.fx as ConditionalFormat | boolean;
    return out;
}

export function normalizeGaugeStyle(input: unknown): GaugeStyle {
    const d = defaultGaugeStyle();
    if (!input || typeof input !== 'object') return d;
    const value = input as Record<string, unknown>;
    const axis = value.axis as Record<string, unknown> | undefined;
    const dataLabels = value.dataLabels as Record<string, unknown> | undefined;
    const out: GaugeStyle = {
        axis: {
            min: normalizeGaugeBound(axis?.min, d.axis.min),
            max: normalizeGaugeBound(axis?.max, d.axis.max),
            target: normalizeGaugeBound(axis?.target, d.axis.target),
        },
        dataLabels: {
            show:
                typeof dataLabels?.show === 'boolean'
                    ? dataLabels.show
                    : d.dataLabels.show,
            values: normalizeGaugeLabel(
                dataLabels?.values,
                d.dataLabels.values,
            ),
            targetLabel: normalizeGaugeLabel(
                dataLabels?.targetLabel,
                d.dataLabels.targetLabel,
            ),
            callout: normalizeGaugeLabel(
                dataLabels?.callout,
                d.dataLabels.callout,
            ),
        },
    };
    if (typeof value.fillColor === 'string' && value.fillColor.trim())
        out.fillColor = value.fillColor.trim();
    if (value.fillFx !== undefined)
        out.fillFx = value.fillFx as ConditionalFormat | boolean;
    if (typeof value.targetColor === 'string' && value.targetColor.trim())
        out.targetColor = value.targetColor.trim();
    if (value.targetFx !== undefined)
        out.targetFx = value.targetFx as ConditionalFormat | boolean;
    return out;
}

export function formatValue(value: unknown, type: FieldType = 'text'): string {
    if (value === null || value === undefined) return '—';
    if (type === 'number' && typeof value === 'number')
        return formatNumber(value);
    if (type === 'boolean')
        return value === true ? 'Yes' : value === false ? 'No' : String(value);
    if (type === 'date') {
        const parsed = value instanceof Date ? value : new Date(String(value));
        if (!Number.isNaN(parsed.getTime()))
            return parsed.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
            });
    }
    return String(value);
}

/* ------------------------------------------------------------------ */
/* Column type inference                                               */
/* ------------------------------------------------------------------ */

function isDateString(v: string): boolean {
    const trimmed = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(trimmed)) return false;
    return !Number.isNaN(Date.parse(trimmed.slice(0, 10)));
}

export function inferFieldType(values: unknown[]): FieldType {
    let numbers = 0;
    let dates = 0;
    let booleans = 0;
    let texts = 0;
    for (const v of values) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'boolean') booleans++;
        else if (typeof v === 'number') numbers++;
        else if (typeof v === 'string') {
            if (isDateString(v)) dates++;
            else texts++;
        } else texts++;
    }
    const total = numbers + dates + booleans + texts;
    if (!total) return 'text';
    if (numbers === total) return 'number';
    if (booleans === total) return 'boolean';
    if (dates === total) return 'date';
    if (numbers >= total * 0.8) return 'number';
    return 'text';
}
