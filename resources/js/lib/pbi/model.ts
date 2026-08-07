// Data model, dataset tables and aggregation engine for the report canvas.

import { applyTableRows, filterTableRows, type ReportFilter } from './filters';
import type { RelationGraph } from './graph';
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
    /**
     * Optional wizard (Measure Studio) spec persisted with the measure — the
     * hops/joins + kind/agg/column used to build the DAX. Only present for
     * measures created through the wizard.
     */
    config?: string | null | Record<string, unknown>;
};

export type Row = Record<string, string | number | boolean | null>;

export type Agg =
    | 'sum'
    | 'avg'
    | 'count'
    | 'distinct'
    | 'min'
    | 'max'
    | 'first'
    | 'latest'
    | 'raw'
    | 'nth';

/** How a card/gauge shows a non-numeric field across multiple rows. */
export type ValueAggregationMode = 'first' | 'latest' | 'count' | 'nth';

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
     * number of non-null cells, `nth` the cell at `index`. Numeric fields
     * always use `agg`.
     */
    valueAggregation?: ValueAggregationMode;
    /**
     * 1-based row position used by `agg === 'nth'` (numeric) and
     * `valueAggregation === 'nth'` (non-numeric). `1` = first value.
     */
    index?: number;
    /**
     * When set (positive integer), the aggregation operates on a window of
     * `window` rows only: the first `window` rows when `windowDir` is `first`,
     * the last `window` rows otherwise. Applies to every aggregation.
     */
    window?: number;
    /** Direction of the `window` slice; defaults to `last`. */
    windowDir?: 'first' | 'last';
    /**
     * Aggregation treatment applied to a list measure (VALUES) rendered in a
     * single-value visual. Undefined (or 'list') shows every distinct code;
     * numeric modes (sum/avg/min/max) operate on numeric codes only and ignore
     * the rest; `count`/`distinct` return the code count; `first`/`latest`/
     * `raw` return a single code; `nth` returns the code at `index`.
     */
    listAgg?: Agg;
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

/** Coerces an arbitrary value to a positive integer, or `undefined`. */
function positiveInt(value: unknown): number | undefined {
    if (typeof value !== 'number' && typeof value !== 'string')
        return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const int = Math.floor(n);
    return int >= 1 ? int : undefined;
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
    const index = positiveInt(value.index);
    const window = positiveInt(value.window);
    const windowDir =
        value.windowDir === 'first' || value.windowDir === 'last'
            ? value.windowDir
            : undefined;
    return {
        table: reference.table ?? '',
        name: reference.name,
        agg,
        ...(label ? { label } : {}),
        ...(format ? { format } : {}),
        ...(valueAggregation ? { valueAggregation } : {}),
        ...(index !== undefined ? { index } : {}),
        ...(window !== undefined ? { window } : {}),
        ...(windowDir ? { windowDir } : {}),
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
export type CfStyle = 'none' | 'gradient' | 'rules' | 'fieldValue' | 'icons';

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
    /** Icon id within the active icon set (used when `style === 'icons'`). */
    icon?: string;
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
    /** Icon set id used when `style === 'icons'`. */
    iconSet: string;
    /** Table/matrix only: render data bars behind cells. */
    showDataBars: boolean;
};

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
        iconSet: '',
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
                    ...(typeof c.icon === 'string' && c.icon.trim()
                        ? { icon: c.icon.trim() }
                        : {}),
                };
            })
            .filter((r): r is CfRule => r !== null);
    }
    if (typeof value.fieldValue === 'string') out.fieldValue = value.fieldValue;
    if (typeof value.fieldValueTable === 'string')
        out.fieldValueTable = value.fieldValueTable;
    if (typeof value.iconSet === 'string' && value.iconSet.trim())
        out.iconSet = value.iconSet.trim();
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
    /** Custom string appended after the value, overriding the unit's built-in
     * token (K/M/B/%/$). Empty/`undefined` keeps the built-in token. */
    suffix?: string;
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
    /** Custom suffix overriding the unit's built-in token (for axis ticks). */
    suffix?: string;
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
    /** Custom suffix overriding the unit's built-in token (for data labels). */
    suffix?: string;
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
export type TableDef = {
    name: string;
    fields: Field[];
    rows: Row[];
    slug?: string;
    label?: string | null;
    object?: string | null;
};

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

/** A compiled list measure (e.g. `VALUES(<column>)`): returns the distinct
 *  non-empty values of the column in the current (possibly ctx-filtered)
 *  table set, as a string list for the single-value visual. */
export type ListMeasureImpl = (rows: Row[], ctx?: EvalCtx) => string[];

export const LIST_MEASURE_IMPL: Record<string, ListMeasureImpl> = {};

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
export type EvalCtx = {
    errors?: string[];
    /** Other page measures, resolved by `[Name]` refs. */
    measures?: Record<string, MeasureImpl | null>;
    /** Recursion depth guard for measures that reference other measures. */
    depth?: number;
    /** Enclosing iterator rows (table + row), innermost last, so conditions
     *  inside FILTER / SUMX / COUNTX can reach the outer row context. */
    iter?: { table: string; row: Row }[];
    /** Table set to resolve table/column lookups against (a per-group filter
     *  context, e.g. a chain axis slice). When absent, the module-level
     *  `TABLES` (the store's currently filtered set) is used. */
    tables?: TableDef[];
};

type MeasureNode =
    | { kind: 'num'; value: number }
    | { kind: 'string'; value: string }
    | { kind: 'col'; table?: string; column: string }
    | { kind: 'func'; name: string; args: MeasureNode[] }
    | {
          kind: 'binop';
          op: '+' | '-' | '*' | '/' | '%';
          left: MeasureNode;
          right: MeasureNode;
      }
    | {
          kind: 'cmp';
          op: '=' | '<>' | '<' | '>' | '<=' | '>=';
          left: MeasureNode;
          right: MeasureNode;
      }
    | {
          kind: 'logic';
          op: '&&' | '||';
          left: MeasureNode;
          right: MeasureNode;
      }
    | { kind: 'ref'; name: string }
    | { kind: 'table'; name: string }
    | { kind: 'tablecol'; base: MeasureNode; column: string };

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

/** Row-context functions: evaluated once per row of an enclosing iterator. */
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

/** List-returning functions: valid only at the top level of a measure and
 *  resolved to a distinct-value list instead of a scalar. */
const LIST_FUNCS = new Set(['VALUES', 'DISTINCT']);

/** Table-iteration aggregators: iterate a table and aggregate an expression. */
const ITERATOR_FUNCS = new Set([
    'SUMX',
    'COUNTX',
    'AVERAGEX',
    'MINX',
    'MAXX',
    'PRODUCTX',
]);

/** Functions that return a table expression (usable as an iterator's table). */
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

type CmpOp = '=' | '<>' | '<' | '>' | '<=' | '>=';

const CMP_OPS = new Set<CmpOp>(['=', '<>', '<', '>', '<=', '>=']);

/** Type guard narrowing a token operator to a comparison operator. */
function isCmpOp(v: string): v is CmpOp {
    return CMP_OPS.has(v as CmpOp);
}

type Token =
    | { type: 'num'; value: number }
    | { type: 'string'; value: string }
    | { type: 'word'; value: string }
    | { type: 'qword'; value: string }
    | { type: 'bracket'; value: string }
    | { type: 'table'; value: string }
    | { type: 'lparen' | 'rparen' | 'comma' }
    | {
          type: 'op';
          value:
              | '+'
              | '-'
              | '*'
              | '/'
              | '%'
              | '='
              | '<>'
              | '<'
              | '>'
              | '<='
              | '>='
              | '&&'
              | '||';
      };

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
        if (c === '"') {
            const end = src.indexOf('"', i + 1);
            if (end < 0) throw new MeasureSyntaxError('Guillemet non fermé');
            tokens.push({ type: 'string', value: src.slice(i + 1, end) });
            i = end + 1;
            continue;
        }
        if (c === '<') {
            // `<table>` placeholder (used by COUNTROWS docs) — only when the
            // angle brackets enclose a non-empty identifier, so `<=`/`<>`
            // still reach the comparison operator handling below.
            const end = src.indexOf('>', i + 1);
            if (end >= 0 && src.slice(i + 1, end).trim()) {
                tokens.push({
                    type: 'table',
                    value: src.slice(i + 1, end).trim(),
                });
                i = end + 1;
                continue;
            }
        }
        if (c === '<' && src[i + 1] === '=') {
            tokens.push({ type: 'op', value: '<=' });
            i += 2;
            continue;
        }
        if (c === '>' && src[i + 1] === '=') {
            tokens.push({ type: 'op', value: '>=' });
            i += 2;
            continue;
        }
        if (c === '<' && src[i + 1] === '>') {
            tokens.push({ type: 'op', value: '<>' });
            i += 2;
            continue;
        }
        if (c === '&' && src[i + 1] === '&') {
            tokens.push({ type: 'op', value: '&&' });
            i += 2;
            continue;
        }
        if (c === '|' && src[i + 1] === '|') {
            tokens.push({ type: 'op', value: '||' });
            i += 2;
            continue;
        }
        if (c === '+' || c === '-' || c === '*' || c === '/' || c === '%') {
            tokens.push({ type: 'op', value: c });
            i += 1;
            continue;
        }
        if (c === '=') {
            tokens.push({ type: 'op', value: '=' });
            i += 1;
            continue;
        }
        if (c === '<') {
            tokens.push({ type: 'op', value: '<' });
            i += 1;
            continue;
        }
        if (c === '>') {
            tokens.push({ type: 'op', value: '>' });
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

function parseCompare(t: ParseState): MeasureNode {
    let left = parseExpr(t);
    for (;;) {
        const tok = peekToken(t);
        if (
            tok?.type === 'op' &&
            tok.value !== '&&' &&
            tok.value !== '||' &&
            isCmpOp(tok.value)
        ) {
            takeToken(t);
            const right = parseExpr(t);
            left = { kind: 'cmp', op: tok.value, left, right };
        } else break;
    }
    return left;
}

function parseAnd(t: ParseState): MeasureNode {
    let left = parseCompare(t);
    for (;;) {
        const tok = peekToken(t);
        if (tok?.type === 'op' && tok.value === '&&') {
            takeToken(t);
            const right = parseCompare(t);
            left = { kind: 'logic', op: '&&', left, right };
        } else break;
    }
    return left;
}

function parseOr(t: ParseState): MeasureNode {
    let left = parseAnd(t);
    for (;;) {
        const tok = peekToken(t);
        if (tok?.type === 'op' && tok.value === '||') {
            takeToken(t);
            const right = parseAnd(t);
            left = { kind: 'logic', op: '||', left, right };
        } else break;
    }
    return left;
}

function parseTerm(t: ParseState): MeasureNode {
    let left = parseFactor(t);
    for (;;) {
        const tok = peekToken(t);
        if (
            tok?.type === 'op' &&
            (tok.value === '*' || tok.value === '/' || tok.value === '%')
        ) {
            takeToken(t);
            const right = parseFactor(t);
            left = { kind: 'binop', op: tok.value, left, right };
        } else break;
    }
    return left;
}

/** Wraps a table expression followed by `[Column]`[Column]` (e.g. `FILTER(...)[Col]`)
 *  into a `tablecol` node, so `VALUES(<table-expr>[<column>])` can extract the
 *  column's values from the produced table. */
function maybeTableCol(t: ParseState, node: MeasureNode): MeasureNode {
    if (peekToken(t)?.type === 'bracket') {
        const column = takeToken(t) as { type: 'bracket'; value: string };
        return { kind: 'tablecol', base: node, column: column.value };
    }
    return node;
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
    if (tok.type === 'string') return { kind: 'string', value: tok.value };
    if (tok.type === 'lparen') {
        const inner = parseOr(t);
        expectToken(t, 'rparen');
        return maybeTableCol(t, inner);
    }
    if (tok.type === 'bracket') return { kind: 'ref', name: tok.value };
    if (tok.type === 'table')
        return maybeTableCol(t, { kind: 'table', name: tok.value });
    if (tok.type === 'word') {
        if (peekToken(t)?.type === 'lparen') {
            takeToken(t);
            const args: MeasureNode[] = [];
            if (peekToken(t)?.type !== 'rparen') {
                args.push(parseOr(t));
                while (peekToken(t)?.type === 'comma') {
                    takeToken(t);
                    args.push(parseOr(t));
                }
            }
            expectToken(t, 'rparen');
            return maybeTableCol(t, { kind: 'func', name: tok.value, args });
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
    else if (
        node.kind === 'binop' ||
        node.kind === 'cmp' ||
        node.kind === 'logic'
    ) {
        walkNode(node.left, visit);
        walkNode(node.right, visit);
    } else if (node.kind === 'tablecol') walkNode(node.base, visit);
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
        const node = parseOr(state);
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
            const found = findTableForField(column, ctx.tables);
            if (found) candidates.push(found);
        }
        const sourceTables = ctx.tables ?? TABLES;
        for (const name of candidates) {
            const source = sourceTables.find((t) => t.name === name);
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

function isTruthy(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return String(value).trim() !== '';
}

function compareScalar(a: unknown, b: unknown, op: CmpOp): boolean {
    // DAX semantics: text values always compare as text (case-insensitive for
    // equality). Only genuine numbers use numeric comparison — this keeps
    // padded string keys like "1140342334          " distinct from
    // "1140342334     " until they are explicitly TRIM()med.
    const aNum = typeof a === 'number' ? a : Number.NaN;
    const bNum = typeof b === 'number' ? b : Number.NaN;
    const numeric = Number.isFinite(aNum) && Number.isFinite(bNum);
    if (numeric) {
        switch (op) {
            case '=':
                return aNum === bNum;
            case '<>':
                return aNum !== bNum;
            case '<':
                return aNum < bNum;
            case '>':
                return aNum > bNum;
            case '<=':
                return aNum <= bNum;
            case '>=':
                return aNum >= bNum;
        }
    }
    const as = String(a ?? '').toLowerCase();
    const bs = String(b ?? '').toLowerCase();
    switch (op) {
        case '=':
            return as === bs;
        case '<>':
            return as !== bs;
        case '<':
            return as < bs;
        case '>':
            return as > bs;
        case '<=':
            return as <= bs;
        case '>=':
            return as >= bs;
    }
    return false;
}

/** Rows of a named table from the loaded dataset (or a ctx table set). */
function tableRowsFor(table: string, tables?: TableDef[]): Row[] {
    const source = (tables ?? TABLES).find((t) => t.name === table);
    return source?.rows ?? [];
}

/**
 * Resolves a single cell of a table-qualified (or bare) column inside an
 * iterator context: the current iteration row first, then enclosing iterator
 * rows (outermost last), then falls back to the loaded table's first row.
 */
function cellValue(
    table: string | undefined,
    column: string,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): unknown {
    if (frame && column in frame.row) {
        if (!table || table === frame.table) return frame.row[column] ?? null;
    }
    const stack = ctx.iter ?? [];
    for (let i = stack.length - 1; i >= 0; i -= 1) {
        const f = stack[i]!;
        if (column in f.row) {
            if (!table || table === f.table) return f.row[column] ?? null;
        }
    }
    return null;
}

/**
 * Evaluates a scalar node against a single iteration frame (row) plus the
 * enclosing row context. Used for FILTER conditions, IF branches and the
 * per-row expression of SUMX / COUNTX.
 */
function evalCondition(
    node: MeasureNode,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): unknown {
    switch (node.kind) {
        case 'num':
            return node.value;
        case 'string':
            return node.value;
        case 'col':
            return cellValue(node.table, node.column, frame, ctx);
        case 'ref': {
            const known = ctx.measures;
            const fn =
                known && node.name in known
                    ? known[node.name]
                    : (MEASURE_IMPL[node.name] ?? null);
            if (fn)
                return fn(frame ? [frame.row] : [], {
                    ...ctx,
                    iter: frame
                        ? [...(ctx.iter ?? []), frame]
                        : (ctx.iter ?? []),
                });
            return cellValue(undefined, node.name, frame, ctx);
        }
        case 'func':
            return evalConditionFunction(node, frame, ctx);
        case 'binop': {
            const left = Number(evalCondition(node.left, frame, ctx) ?? 0);
            const right = Number(evalCondition(node.right, frame, ctx) ?? 0);
            if (node.op === '+') return left + right;
            if (node.op === '-') return left - right;
            if (node.op === '*') return left * right;
            if (node.op === '/') return right === 0 ? 0 : left / right;
            if (node.op === '%') return right === 0 ? 0 : left % right;
            return 0;
        }
        case 'cmp': {
            const left = evalCondition(node.left, frame, ctx);
            const right = evalCondition(node.right, frame, ctx);
            return compareScalar(left, right, node.op);
        }
        case 'logic': {
            const left = evalCondition(node.left, frame, ctx);
            if (node.op === '&&')
                return (
                    isTruthy(left) &&
                    isTruthy(evalCondition(node.right, frame, ctx))
                );
            return (
                isTruthy(left) ||
                isTruthy(evalCondition(node.right, frame, ctx))
            );
        }
        case 'table':
            return null;
        case 'tablecol':
            return null;
    }
}

function evalConditionFunction(
    node: Extract<MeasureNode, { kind: 'func' }>,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): unknown {
    const name = node.name.toUpperCase();
    const args = node.args;

    if (name === 'IF') {
        const cond = args[0];
        const thenValue = args[1];
        const elseValue = args[2];
        return isTruthy(evalCondition(cond, frame, ctx))
            ? evalCondition(thenValue, frame, ctx)
            : elseValue
              ? evalCondition(elseValue, frame, ctx)
              : 0;
    }
    if (name === 'AND')
        return (
            isTruthy(evalCondition(args[0], frame, ctx)) &&
            isTruthy(evalCondition(args[1], frame, ctx))
        );
    if (name === 'OR')
        return (
            isTruthy(evalCondition(args[0], frame, ctx)) ||
            isTruthy(evalCondition(args[1], frame, ctx))
        );
    if (SCALAR_FUNCS.has(name)) return evalScalarFunction(node, frame, ctx);
    // Aggregate calls (SUM, COUNTROWS, …) used inside a condition. Thread the
    // current row into the iterator stack so nested FILTER conditions can still
    // reach the enclosing row's columns.
    return evalFunction(node, frame ? [frame.row] : [], {
        ...ctx,
        iter: frame ? [...(ctx.iter ?? []), frame] : (ctx.iter ?? []),
    });
}

const scalarNumber = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const scalarText = (v: unknown): string => String(v ?? '');

function midnightEpoch(d: Date): number {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
}

/**
 * Coerces a raw cell value into an epoch-milliseconds date. Accepts numbers
 * (already epoch ms or unix seconds), text ISO dates, or Date instances.
 */
function dateEpoch(v: unknown): number {
    if (v instanceof Date) {
        return typeof (v as unknown as { getTime?: unknown }).getTime ===
            'function'
            ? (v as Date).getTime()
            : NaN;
    }
    if (typeof v === 'number') {
        if (!Number.isFinite(v)) return NaN;
        const ms = v > 100000000000 ? v : v * 1000;
        return isNaN(midnightEpoch(new Date(ms)))
            ? NaN
            : (midnightEpoch(new Date(ms)), ms);
    }
    const d = new Date(scalarText(v));
    return isNaN(d.getTime()) ? NaN : d.getTime();
}

/** Evaluates a scalar/row-context function to a primitive (number | string). */
function evalScalarFunction(
    node: Extract<MeasureNode, { kind: 'func' }>,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): unknown {
    const name = node.name.toUpperCase();
    const args = node.args;
    const a = (i: number) => evalCondition(args[i], frame, ctx);
    const n = (i: number) => scalarNumber(a(i));

    switch (name) {
        case 'NOT':
            return isTruthy(a(0)) ? 0 : 1;
        case 'SWITCH': {
            const expr = args[0];
            const match = evalCondition(expr, frame, ctx);
            for (let i = 1; i + 1 < args.length; i += 2) {
                if (compareScalar(match, a(i), '='))
                    return evalCondition(args[i + 1], frame, ctx);
            }
            // trailing default value when an odd number of value args remain
            if (args.length > 1 && args.length % 2 === 0)
                return evalCondition(args[args.length - 1]!, frame, ctx);
            return 0;
        }
        case 'IFERROR':
            try {
                return evalCondition(args[0], frame, ctx);
            } catch {
                return args[1] ? evalCondition(args[1], frame, ctx) : 0;
            }
        case 'ABS':
            return Math.abs(n(0));
        case 'ROUND':
            return Math.round(n(0) * 10 ** n(1)) / 10 ** n(1);
        case 'ROUNDUP':
            return Math.ceil(n(0) * 10 ** n(1)) / 10 ** n(1);
        case 'ROUNDDOWN':
            return Math.floor(n(0) * 10 ** n(1)) / 10 ** n(1);
        case 'POWER':
            return Math.pow(n(0), n(1));
        case 'DIVIDE': {
            const d = n(1);
            return d === 0 ? n(2) : n(0) / d;
        }
        case 'MOD': {
            const d = n(1);
            return d === 0 ? 0 : n(0) % d;
        }
        case 'SQRT':
            return Math.sqrt(n(0));
        case 'INT':
            return Math.floor(n(0));
        case 'SIGN':
            return Math.sign(n(0));
        case 'LEN':
            return scalarText(a(0)).length;
        case 'UPPER':
            return scalarText(a(0)).toUpperCase();
        case 'LOWER':
            return scalarText(a(0)).toLowerCase();
        case 'LEFT': {
            const t = scalarText(a(0));
            return t.slice(0, Math.max(0, n(1)));
        }
        case 'RIGHT': {
            const t = scalarText(a(0));
            const k = Math.max(0, n(1));
            return k === 0 ? '' : t.slice(-k);
        }
        case 'MID': {
            const t = scalarText(a(0));
            return t.slice(Math.max(0, n(1) - 1), Math.max(0, n(1) - 1) + n(2));
        }
        case 'SUBSTITUTE':
            return scalarText(a(0))
                .split(scalarText(a(1)))
                .join(scalarText(a(2)));
        case 'SEARCH': {
            const idx = scalarText(a(1))
                .toLowerCase()
                .indexOf(scalarText(a(0)).toLowerCase());
            return idx < 0 ? 0 : idx + 1;
        }
        case 'VALUE': {
            const v = scalarText(a(0)).trim();
            return v ? Number(v) : 0;
        }
        case 'CONCATENATE':
            return scalarText(a(0)) + scalarText(a(1));
        case 'FORMAT':
            return String(a(0));
        case 'TRIM':
            return scalarText(a(0)).trim();
        case 'RELATED': {
            const colNode = args[0];
            const column =
                colNode && colNode.kind === 'col'
                    ? colNode.column
                    : colNode && colNode.kind === 'ref'
                      ? colNode.name
                      : undefined;
            if (!column) return 0;
            const direct = cellValue(
                colNode?.kind === 'col'
                    ? colNode.table
                    : (undefined as string | undefined),
                column,
                frame,
                ctx,
            );
            if (direct !== null && direct !== undefined) return direct;
            // Best-effort cross-table lookup: scan the target table rows for a
            // row whose value for `column` matches the current frame's value of
            // the same-named key column.
            const host = ctx.tables ?? TABLES;
            if (frame) {
                for (const t of host) {
                    if (!t.rows.length || !(column in t.rows[0]!)) continue;
                    for (const row of t.rows) {
                        if (row[column] === frame.row[column])
                            return row[column] ?? 0;
                    }
                }
            }
            return 0;
        }
        case 'TODAY':
            return midnightEpoch(new Date());
        case 'NOW':
            return Date.now();
        case 'DATE':
            return new Date(n(0), n(1) - 1, n(2)).getTime();
        case 'YEAR':
            return new Date(dateEpoch(a(0))).getUTCFullYear();
        case 'MONTH': {
            const d = new Date(dateEpoch(a(0)));
            return d.getUTCMonth() + 1;
        }
        case 'DAY':
            return new Date(dateEpoch(a(0))).getUTCDate();
        case 'WEEKDAY':
            return new Date(dateEpoch(a(0))).getUTCDay() + 1;
        case 'EOMONTH': {
            const d = new Date(dateEpoch(a(0)));
            return new Date(
                d.getUTCFullYear(),
                d.getUTCMonth() + 1 + n(1),
                0,
            ).getTime();
        }
        case 'DATEDIFF': {
            const unit = scalarText(a(2)).toUpperCase();
            const ms = dateEpoch(a(1)) - dateEpoch(a(0));
            switch (unit) {
                case 'DAY':
                    return Math.round(ms / 86400000);
                case 'HOUR':
                    return Math.round(ms / 3600000);
                case 'MONTH':
                    return Math.round(ms / (86400000 * 30));
                case 'YEAR':
                    return Math.round(ms / (86400000 * 365));
                default:
                    return Math.round(ms / 1000);
            }
        }
        default:
            return undefined;
    }
}

/**
 * Resolves a table expression argument: a table name, a bare column (the table
 * owning the column), or a FILTER(...) over another table expression.
 */
function evalTableArg(
    node: MeasureNode,
    ctx: EvalCtx,
): { table: string; row: Row }[] {
    if (node.kind === 'table') {
        return tableRowsFor(node.name, ctx.tables).map((row) => ({
            table: node.name,
            row,
        }));
    }
    if (node.kind === 'col') {
        // A bare table name parses as a column ref; prefer a table with that
        // name over a column lookup so COUNTROWS(wip_chaine) works.
        const tables = ctx.tables ?? TABLES;
        const table =
            node.table ||
            (tables.some((t) => t.name === node.column)
                ? node.column
                : findTableForField(node.column, tables));
        return tableRowsFor(table, tables).map((row) => ({ table, row }));
    }
    if (node.kind === 'func' && node.name.toUpperCase() === 'FILTER') {
        const base = evalTableArg(node.args[0], ctx);
        const cond = node.args[1];
        return base.filter((frame) =>
            isTruthy(evalCondition(cond, frame, ctx)),
        );
    }
    if (node.kind === 'func') {
        const fname = node.name.toUpperCase();
        if (fname === 'TOPN') {
            const frames = evalTableArg(node.args[0]!, ctx);
            const orderColumn = node.args[2];
            const ranked = frames
                .map((frame) => ({
                    frame,
                    key: scalarNumber(evalCondition(orderColumn, frame, ctx)),
                }))
                .sort((x, y) => y.key - x.key);
            const n = Math.max(
                0,
                Math.floor(
                    scalarNumber(evalCondition(node.args[1], null, ctx)),
                ),
            );
            return ranked.slice(0, n).map((r) => r.frame);
        }
        if (fname === 'DISTINCT') {
            const frames = evalTableArg(node.args[0]!, ctx);
            const seen = new Set<string>();
            const out: { table: string; row: Row }[] = [];
            for (const f of frames) {
                const key = JSON.stringify(f.row);
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(f);
            }
            return out;
        }
        // ALL / ALLEXCEPT / CALCULATE: no filter-context removal in the flat
        // engine — behave as the referenced table (or its first argument).
        if (fname === 'ALL' || fname === 'ALLEXCEPT' || fname === 'CALCULATE') {
            const base = node.args[0];
            if (!base)
                throw new MeasureSyntaxError(`${fname}() attend une table.`);
            return evalTableArg(base, ctx);
        }
        // Time-intelligence: no dedicated date/context engine, so these yield a
        // single pseudo-frame, keeping COUNTROWS/iteration non-crashing.
        if (
            fname === 'DATEADD' ||
            fname === 'SAMEPERIODLASTYEAR' ||
            fname === 'PREVIOUSMONTH' ||
            fname === 'DATESYTD' ||
            fname === 'TOTALYTD' ||
            fname === 'TOTALMTD'
        ) {
            return [{ table: '__time__', row: {} }];
        }
    }
    if (node.kind === 'tablecol') {
        return evalTableArg(node.base, ctx);
    }
    throw new MeasureSyntaxError('Une table est attendue.');
}

function evalFunction(
    node: Extract<MeasureNode, { kind: 'func' }>,
    rows: Row[],
    ctx: EvalCtx,
): number {
    const name = node.name.toUpperCase();
    const arg = node.args[0];

    if (name === 'IF') {
        return isTruthy(evalCondition(arg, null, ctx))
            ? evalIteratorValue(node.args[1]!, null, ctx)
            : evalIteratorValue(
                  node.args[2] ?? { kind: 'num', value: 0 },
                  null,
                  ctx,
              );
    }
    if (name === 'AND')
        return isTruthy(evalCondition(node.args[0], null, ctx)) &&
            isTruthy(evalCondition(node.args[1], null, ctx))
            ? 1
            : 0;
    if (name === 'OR')
        return isTruthy(evalCondition(node.args[0], null, ctx)) ||
            isTruthy(evalCondition(node.args[1], null, ctx))
            ? 1
            : 0;

    if (SCALAR_FUNCS.has(name)) {
        const v = evalScalarFunction(node, null, ctx);
        return typeof v === 'number' && Number.isFinite(v) ? v : 0;
    }

    if (ITERATOR_FUNCS.has(name)) {
        const frames = evalTableArg(node.args[0]!, ctx);
        const expr = node.args[1];
        const values = frames.map((frame) =>
            evalCondition(expr, frame, {
                ...ctx,
                iter: [...(ctx.iter ?? []), frame],
            }),
        );
        switch (name) {
            case 'SUMX': {
                let total = 0;
                for (const v of values) {
                    if (typeof v === 'number') total += v;
                    else if (typeof v === 'string') {
                        const n = Number(v);
                        if (Number.isFinite(n)) total += n;
                    } else if (v === true) total += 1;
                }
                return total;
            }
            case 'COUNTX':
                return values.filter(
                    (v) => v !== null && v !== undefined && v !== '',
                ).length;
            case 'AVERAGEX': {
                const nums = values.map(Number).filter(Number.isFinite);
                return nums.length
                    ? nums.reduce((total, value) => total + value, 0) /
                          nums.length
                    : 0;
            }
            case 'MINX': {
                const nums = values.map(Number).filter(Number.isFinite);
                return nums.length ? Math.min(...nums) : 0;
            }
            case 'MAXX': {
                const nums = values.map(Number).filter(Number.isFinite);
                return nums.length ? Math.max(...nums) : 0;
            }
            case 'PRODUCTX': {
                const nums = values.map(Number).filter(Number.isFinite);
                return nums.reduce((total, value) => total * value, 1);
            }
            default:
                return 0;
        }
    }

    if (name === 'COUNTROWS') {
        const first = node.args[0];
        if (
            first &&
            (first.kind === 'table' ||
                first.kind === 'col' ||
                (first.kind === 'func' &&
                    first.name.toUpperCase() === 'FILTER'))
        ) {
            return evalTableArg(first, ctx).length;
        }
        return rows.length;
    }
    if (name === 'FILTER') {
        return evalTableArg(node, ctx).length;
    }
    if (name === 'VALUES') {
        throw new MeasureSyntaxError(
            'VALUES renvoie une liste de valeurs et ne peut être utilisé qu’au niveau supérieur de la mesure.',
        );
    }

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

/** Coerces a per-row scalar (condition result) into an aggregate number. */
function evalIteratorValue(
    node: MeasureNode,
    frame: { table: string; row: Row } | null,
    ctx: EvalCtx,
): number {
    const value = evalCondition(node, frame, ctx);
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'string') {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

function evalNode(node: MeasureNode, rows: Row[], ctx: EvalCtx): number {
    switch (node.kind) {
        case 'num':
            return node.value;
        case 'string':
            return 0;
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
                    findTableForField(node.name, ctx.tables) || undefined,
                ),
            ).reduce((total, value) => total + value, 0);
        }
        case 'table':
            return 0;
        case 'tablecol':
            return 0;
        case 'binop': {
            const left = evalNode(node.left, rows, ctx);
            const right = evalNode(node.right, rows, ctx);
            if (node.op === '+') return left + right;
            if (node.op === '-') return left - right;
            if (node.op === '*') return left * right;
            if (node.op === '/') return right === 0 ? 0 : left / right;
            if (node.op === '%') return right === 0 ? 0 : left % right;
            return 0;
        }
        case 'cmp': {
            const left = evalCondition(node.left, null, ctx);
            const right = evalCondition(node.right, null, ctx);
            return compareScalar(left, right, node.op) ? 1 : 0;
        }
        case 'logic': {
            const left = evalCondition(node.left, null, ctx);
            if (node.op === '&&')
                return isTruthy(left) &&
                    isTruthy(evalCondition(node.right, null, ctx))
                    ? 1
                    : 0;
            return isTruthy(left) ||
                isTruthy(evalCondition(node.right, null, ctx))
                ? 1
                : 0;
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
 * Compiles a top-level `VALUES(<column>)` or
 * `VALUES(<table-expr>[<column>])` measure into a list aggregator. The latter
 * form (e.g. `VALUES(FILTER(codestyle, …)[StyleCode])`) evaluates the table
 * expression first, then collects the distinct values of `<column>` from the
 * produced rows. Returns `null` when the expression is not a VALUES measure,
 * so the numeric `compileMeasure` path keeps handling everything else.
 */
export function compileListMeasure(expression: string): ListMeasureImpl | null {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return null;
    const node = compiled.node;
    if (
        node.kind !== 'func' ||
        (node.name.toUpperCase() !== 'VALUES' &&
            node.name.toUpperCase() !== 'DISTINCT')
    )
        return null;
    const arg = node.args[0];
    if (!arg)
        throw new MeasureSyntaxError(
            `${node.name.toUpperCase()}() attend une colonne.`,
        );
    let column: string;
    let table: string | undefined;
    let base: MeasureNode | null = null;
    if (arg.kind === 'col') {
        column = arg.column;
        table = arg.table;
    } else if (arg.kind === 'tablecol') {
        column = arg.column;
        base = arg.base;
    } else if (arg.kind === 'ref') {
        column = arg.name;
    } else {
        throw new MeasureSyntaxError('VALUES() attend une colonne.');
    }
    if (base) {
        return (rows, ctx = {}) => {
            const frames = evalTableArg(base, ctx);
            return [
                ...new Set(
                    frames
                        .map((f) => f.row[column] ?? null)
                        .filter(
                            (v) => v !== null && v !== undefined && v !== '',
                        )
                        .map((v) => String(v)),
                ),
            ].sort();
        };
    }
    return (rows, ctx = {}) => {
        const values = resolveColumn(column, rows, ctx, table);
        return [
            ...new Set(
                values
                    .filter((v) => v !== null && v !== undefined && v !== '')
                    .map((v) => String(v)),
            ),
        ].sort();
    };
}

/**
 * Extracts the target table + column a `VALUES()` / `DISTINCT()` list measure
 * operates on, working purely from the expression (no persisted `config`
 * needed). Returns `{ table, column }` when the top-level call is a list
 * measure over a column, or `null` otherwise. The table is resolved statically
 * from the argument so callers can locate source rows without evaluating.
 */
export function listMeasureSource(
    expression: string,
): { table: string; column: string } | null {
    const compiled = tryCompile(expression);
    if (!compiled.ok) return null;
    const node = compiled.node;
    if (
        node.kind !== 'func' ||
        (node.name.toUpperCase() !== 'VALUES' &&
            node.name.toUpperCase() !== 'DISTINCT')
    ) {
        return null;
    }
    const arg = node.args[0];
    if (!arg) return null;
    if (arg.kind === 'col') {
        return { table: arg.table ?? '', column: arg.column };
    }
    if (arg.kind === 'ref') {
        return { table: '', column: arg.name };
    }
    if (arg.kind === 'tablecol') {
        return { table: staticTable(arg.base) ?? '', column: arg.column };
    }
    return null;
}

/** Best-effort static table name for a table-expression node. */
function staticTable(node: MeasureNode | null): string | null {
    if (!node) return null;
    if (node.kind === 'table') return node.name;
    if (node.kind === 'col') {
        // A bare token used as a table expression is its table name.
        return node.table || node.column || null;
    }
    if (node.kind === 'tablecol') return staticTable(node.base);
    if (node.kind === 'func' && node.name.toUpperCase() === 'FILTER') {
        return staticTable(node.args[0] ?? null);
    }
    return null;
}

/**
 * Returns the `Table[column]` / `[column]` references a measure expression
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
        else if (node.kind === 'tablecol') refs.push({ column: node.column });
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
            !AGGREGATION_FUNCS.has(node.name.toUpperCase()) &&
            !SCALAR_FUNCS.has(node.name.toUpperCase()) &&
            !ITERATOR_FUNCS.has(node.name.toUpperCase()) &&
            !TABLE_FUNCS.has(node.name.toUpperCase()) &&
            !LIST_FUNCS.has(node.name.toUpperCase())
        ) {
            missing = `Fonction « ${node.name} » non supportée.`;
        } else if (
            node.kind === 'col' &&
            knownColumns.size > 0 &&
            node.column
        ) {
            if (!node.table && TABLES.some((t) => t.name === node.column))
                return;
            if (!knownColumns.has(node.column.trim().toLowerCase())) {
                missing = `Colonne « ${node.column} » introuvable.`;
            }
        } else if (
            node.kind === 'tablecol' &&
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
    try {
        const list = compileListMeasure(expression);
        if (list) LIST_MEASURE_IMPL[name] = list;
        else delete LIST_MEASURE_IMPL[name];
    } catch {
        delete LIST_MEASURE_IMPL[name];
    }
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
    delete LIST_MEASURE_IMPL[name];
    delete MEASURE_ERRORS[name];
}

/* ------------------------------------------------------------------ */
/* Aggregation engine                                                  */
/* ------------------------------------------------------------------ */

export function isMeasure(name: string) {
    return name in MEASURE_IMPL;
}

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

/** Numeric modes of `listAgg`: they operate on numeric codes only. */
export const LIST_AGG_NUMERIC_MODES: Agg[] = ['sum', 'avg', 'min', 'max'];

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

/** First table that exposes a column with the given name. */
export function findTableForField(name: string, tables?: TableDef[]): string {
    for (const t of tables ?? TABLES) {
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

/**
 * Restricts rows to the aggregation window configured on the field, or returns
 * the rows untouched when no window is set. `first` keeps the first `window`
 * rows, anything else keeps the last `window` rows.
 */
export function scopedRows(rows: Row[], wf: WellField): Row[] {
    const n = wf.window;
    if (!n || !Number.isFinite(n) || n <= 0) return rows;
    const count = Math.min(Math.floor(n), rows.length);
    if (count <= 0) return rows;
    return wf.windowDir === 'first' ? rows.slice(0, count) : rows.slice(-count);
}

export function aggregate(rows: Row[], wf: WellField, ctx?: EvalCtx): number {
    if (isMeasure(wf.name)) return MEASURE_IMPL[wf.name]!(rows, ctx);
    const scoped = scopedRows(rows, wf);
    const col = wf.name;
    switch (wf.agg) {
        case 'count':
            return scoped.filter(
                (row) => row[col] !== null && row[col] !== undefined,
            ).length;
        case 'distinct':
            return new Set(scoped.map((r) => r[col])).size;
        case 'avg': {
            const values = numericValues(scoped, col);
            return values.length
                ? values.reduce((total, value) => total + value, 0) /
                      values.length
                : 0;
        }
        case 'min': {
            const values = numericValues(scoped, col);
            return values.length ? Math.min(...values) : 0;
        }
        case 'max': {
            const values = numericValues(scoped, col);
            return values.length ? Math.max(...values) : 0;
        }
        case 'first': {
            const values = numericValues(scoped, col);
            return values.length ? values[0] : 0;
        }
        case 'latest': {
            const values = numericValues(scoped, col);
            const last = values[values.length - 1];
            return last === undefined ? 0 : last;
        }
        case 'nth': {
            const values = numericValues(scoped, col);
            const at = Math.max(0, Math.floor((wf.index ?? 1) - 1));
            return values[at] ?? 0;
        }
        case 'raw': {
            // Actual value mode: show the field's value as-is from the first
            // row that has a non-null value, instead of an aggregate. For a
            // row-unique axis this surfaces the real per-row measurement.
            const nums = numericValues(scoped, col);
            return nums.length ? nums[0] : 0;
        }
        default:
            return sum(scoped, col);
    }
}

/**
 * Collapses a single-value visual's rows into one displayed value.
 * Measures and numeric columns aggregate via `wf.agg`; non-numeric fields
 * (text/date/boolean) use the field's `valueAggregation` mode: `first`
 * (first non-null cell), `latest` (last non-null cell), `count` (number
 * of non-null cells) or `nth` (cell at `wf.index`). A `window` on the field
 * scopes every mode to a slice of rows. Returns `null` when no value can be
 * shown.
 */
export function singleValue(
    rows: Row[],
    wf: WellField,
    mode?: ValueAggregationMode,
): string | number | boolean | null {
    if (isMeasure(wf.name)) return aggregate(rows, wf);
    if (fieldType(wf.name, wf.table) === 'number') return aggregate(rows, wf);
    const scoped = scopedRows(rows, wf);
    const aggregation = mode ?? wf.valueAggregation ?? 'first';
    if (aggregation === 'count') {
        return scoped.filter(
            (row) => row[wf.name] !== null && row[wf.name] !== undefined,
        ).length;
    }
    const cells = scoped
        .map((row) => row[wf.name])
        .filter((v) => v !== null && v !== undefined && v !== '');
    if (aggregation === 'latest') {
        const last = cells[cells.length - 1];
        return last === undefined ? null : last;
    }
    if (aggregation === 'nth') {
        const nth = cells[(wf.index ?? 1) - 1];
        return nth === undefined ? null : nth;
    }
    return cells[0] ?? null;
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
    const aggregation = mode ?? wf.valueAggregation;
    if (aggregation === 'nth' && type !== 'number') return nthLabel(wf);
    if (type === 'number' || aggregation === 'count') return measureLabel(wf);
    return fieldLabel(wf);
}

function nthLabel(wf: WellField): string {
    return `Valeur N°${wf.index ?? 1} de ${fieldLabel(wf)}${windowSuffix(wf)}`;
}

function windowSuffix(wf: WellField): string {
    if (!wf.window || !Number.isFinite(wf.window) || wf.window <= 0) return '';
    const n = Math.floor(wf.window);
    const dir = wf.windowDir === 'first' ? 'premiers' : 'derniers';
    return ` (${dir} ${n} lignes)`;
}

export function measureLabel(wf: WellField) {
    if (isMeasure(wf.name)) return wf.name;
    if (wf.label?.trim()) return wf.label.trim();
    if (fieldType(wf.name, wf.table) === 'number') {
        if (wf.agg === 'raw') return fieldLabel(wf) + windowSuffix(wf);
        if (wf.agg === 'nth') return nthLabel(wf);
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
        return `${p} ${fieldLabel(wf)}${windowSuffix(wf)}`;
    }
    return `Nombre de ${fieldLabel(wf)}${windowSuffix(wf)}`;
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
    graph?: RelationGraph,
) {
    const axisCol = axis[0]?.name;
    const axisTable = axis[0]?.table;
    const legendCol = legend[0]?.name;

    const hasMeasure = (list: WellField[]) =>
        list.some((f) => isMeasure(f.name));

    // When measures are aggregated per chain (or legend) slice, resolve their
    // table lookups against a network-filtered table set so counts such as
    // DISTINCTCOUNT(codestyle[StyleCode]) reflect the related rows only.
    const needsContext =
        !!graph &&
        !!axisCol &&
        (hasMeasure(values) ||
            hasMeasure(tooltips) ||
            hasMeasure(legend) ||
            (extra != null && isMeasure(extra.name)));

    const ctxCache = new Map<string, EvalCtx | undefined>();
    const ctxFor = (key: string): EvalCtx | undefined => {
        if (!needsContext) return undefined;
        if (ctxCache.has(key)) return ctxCache.get(key);
        const table =
            axisTable ||
            (TABLES.find((td) => td.fields.some((f) => f.name === axisCol))
                ?.name ??
                '');
        if (!table) return undefined;
        const filter: ReportFilter = {
            column: axisCol,
            table,
            values: [key],
            scope: 'report',
            type: 'list',
        };
        const filtered = filterTableRows(TABLES, [filter], graph);
        const ctx: EvalCtx | undefined = {
            tables: applyTableRows(TABLES, filtered),
        };
        ctxCache.set(key, ctx);
        return ctx;
    };

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
        ctx: EvalCtx | undefined,
    ) => {
        for (const t of tooltips) {
            item[`tt:${t.name}`] = aggregate(groupRows, t, ctx);
        }
        if (extra) item['_cf'] = aggregate(groupRows, extra, ctx);
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
            data: [withTooltips(single, rows, undefined)],
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
            const av = values[0]
                ? aggregate(a[1], values[0], ctxFor(a[0]))
                : a[1].length;
            const bv = values[0]
                ? aggregate(b[1], values[0], ctxFor(b[0]))
                : b[1].length;
            return Number(bv) - Number(av);
        });
    }

    const kept = capped ? entries.slice(0, cap) : entries;

    const seriesSet = new Set<string>();
    const data: Record<string, string | number>[] = kept.map(
        ([key, groupRows]) => {
            const ctx = ctxFor(key);
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
                        ? aggregate(lrows, values[0], ctx)
                        : lrows.length;
                }
            } else {
                values.forEach((v) => {
                    seriesSet.add(measureLabel(v));
                    item[measureLabel(v)] = aggregate(groupRows, v, ctx);
                });
            }
            return withTooltips(item, groupRows, ctx);
        },
    );

    if (capped) {
        const rest = entries.slice(cap);
        const other: Record<string, string | number> = { category: 'Autre' };
        const otherRows: Row[] = [];
        for (const [, groupRows] of rest) otherRows.push(...groupRows);
        const otherCtx = needsContext
            ? (() => {
                  const table =
                      axisTable ||
                      (TABLES.find((td) =>
                          td.fields.some((f) => f.name === axisCol),
                      )?.name ??
                          '');
                  if (!table) return undefined;
                  const filter: ReportFilter = {
                      column: axisCol,
                      table,
                      values: rest.map(([key]) => key),
                      scope: 'report',
                      type: 'list',
                  };
                  return {
                      tables: applyTableRows(
                          TABLES,
                          filterTableRows(TABLES, [filter], graph),
                      ),
                  };
              })()
            : undefined;
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
                    ? aggregate(lrows, values[0], otherCtx)
                    : lrows.length;
            }
        } else {
            values.forEach((v) => {
                seriesSet.add(measureLabel(v));
                other[measureLabel(v)] = aggregate(otherRows, v, otherCtx);
            });
        }
        data.push(withTooltips(other, otherRows, otherCtx));
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

/**
 * Applies display-unit scaling/behavior and decimal places to a number. A
 * custom `suffix` (when non-empty) is appended as a postfix in place of the
 * unit's built-in token (K/M/B/%/$); an empty/absent suffix keeps the token.
 */
function formatUnitValue(
    n: number,
    unit: DisplayUnit,
    decimals?: number,
    suffix?: string,
): string {
    const d =
        typeof decimals === 'number' && isFinite(decimals)
            ? decimals
            : undefined;
    const post = suffix && suffix.trim().length > 0 ? suffix : undefined;
    const fixed = (value: number, dp: number | undefined) =>
        value.toLocaleString('en-US', {
            minimumFractionDigits: dp ?? 0,
            maximumFractionDigits: dp ?? 0,
        });
    switch (unit) {
        case 'none':
            return `${fixed(n, d ?? 2)}${post ?? ''}`;
        case 'thousands':
            return `${fixed(n / 1_000, d ?? 1)}${post ?? 'K'}`;
        case 'millions':
            return `${fixed(n / 1_000_000, d ?? 1)}${post ?? 'M'}`;
        case 'billions':
            return `${fixed(n / 1_000_000_000, d ?? 1)}${post ?? 'B'}`;
        case 'percent':
            return `${(n * 100).toFixed(d ?? 1)}${post ?? '%'}`;
        case 'currency':
            return post !== undefined
                ? `${fixed(n, d ?? 0)}${post}`
                : `$${fixed(n, d ?? 0)}`;
        default:
            return formatAutoNumber(n, d, post);
    }
}

/** Applies display-unit scaling and decimal places to a number. */
export function formatDisplayUnitValue(
    n: number,
    displayUnits: DisplayUnit = 'auto',
    decimals?: number,
    suffix?: string,
): string {
    if (!isFinite(n)) return '—';
    const unit = isDisplayUnit(displayUnits) ? displayUnits : 'auto';
    return formatUnitValue(n, unit, decimals, suffix);
}

/**
 * Auto display-unit formatting: keeps the compact K/M scaling for large
 * values but honors the decimal-places cap, and shows raw decimals rather
 * than a surprise percentage for values below 1. A custom `post` suffix
 * overrides the built-in K/M token (and is appended to small values too).
 */
function formatAutoNumber(n: number, decimals?: number, post?: string): string {
    const dp =
        typeof decimals === 'number' && isFinite(decimals)
            ? decimals
            : undefined;
    const abs = Math.abs(n);
    const scaled = (value: number, token: string) =>
        `${value.toLocaleString('en-US', {
            maximumFractionDigits: dp ?? 1,
        })}${post ?? token}`;
    if (abs >= 1_000_000) return scaled(n / 1_000_000, 'M');
    if (abs >= 1_000) return scaled(n / 1_000, 'K');
    return `${n.toLocaleString('en-US', {
        maximumFractionDigits: dp ?? 0,
    })}${post ?? ''}`;
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
        /** Custom suffix overriding the unit's built-in token. */
        suffix?: string;
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
    return formatUnitValue(n, unit, decimals, style.suffix);
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
    if (typeof value.suffix === 'string' && value.suffix.trim())
        style.suffix = value.suffix.trim();
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
    if (typeof value.suffix === 'string' && value.suffix.trim())
        style.suffix = value.suffix.trim();
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
    if (typeof value.suffix === 'string' && value.suffix.trim())
        style.suffix = value.suffix.trim();
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
        return value === true ? 'Oui' : value === false ? 'Non' : String(value);
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
