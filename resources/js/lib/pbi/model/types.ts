// Data model, dataset tables and aggregation engine types for the report canvas.

import type { ShapeKind } from '../shapes';

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
    /**
     * When true the visual computes a 1-based "Rang" column for the whole
     * result set: groups are ordered by this value (descending, largest → 1)
     * and each cell holds the rank instead of the value (W3-3).
     */
    rank?: boolean;
    /**
     * When true the visual accumulates this value across the groups ordered
     * by the (numeric) axis — a running / cumulative total (W3-4).
     */
    running?: boolean;
    /**
     * Table/matrix only: render this value as raw per-row detail (one table
     * row per dataset row) instead of collapsing the group. Enabled via the
     * "Détail des lignes" toggle in the values well.
     */
    detail?: boolean;
    /**
     * Cartesian multi-axis binding: id of the value axis this field plots on.
     * Fallback is the visual's first value axis when omitted.
     */
    axisId?: string;
    /**
     * Series-styling choice for combo/pareto charts: how this value is drawn
     * ('bar' | 'line' | 'area'). Ignored by single-type charts.
     */
    seriesType?: 'bar' | 'line' | 'area';
};

export type FieldReference = {
    table?: string | undefined;
    name: string;
};

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
    | 'pareto'
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
    | 'category'
    | 'band'
    | 'intersections'
    | 'crosshair'
    | 'trend'
    | 'forecast';

export type AnalyticsLine = {
    kind: AnalyticsKind;
    value?: number;
    value2?: number;
    category?: string;
    enabled: boolean;
    /** Value axis ids this line applies to; undefined means all value axes. */
    axes?: string[];
    /** Stroke/fill color for this analytics visual. Undefined = the per-kind
     * default (see `ANALYTICS_DEFAULT_COLOR`). */
    color?: string;
    /** Per-value-axis color overrides keyed by axis id, used when an analytics
     * line renders once per axis (constant / average / min / max / median /
     * band). An axis without an entry falls back to `color`, then the default. */
    axisColors?: Record<string, string>;
    /** Per-value-axis value overrides keyed by axis id, used when an analytics
     * line renders once per axis with an editable value (constant / min / max).
     * An axis without an entry falls back to `value`. */
    axisValues?: Record<string, number>;
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
    /** Icon set key used when `style === 'icons'`. */
    iconSet: string;
    /** Table/matrix only: render data bars behind cells. */
    showDataBars: boolean;
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
    /** cartesian default series draw style for value fields without an
     * explicit `WellField.seriesType` override ('auto' → bar). */
    seriesType?: 'bar' | 'line' | 'area' | 'auto';
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
    /** cartesian multi-axis system: independent value axes, each bound by
     * `WellField.axisId`. Absent for legacy visuals → migrated in normalize. */
    axes?: AxisDef[];
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
    displayName?: string;
    fields: Field[];
    rows: Row[];
    slug?: string;
    label?: string | null;
    object?: string | null;
};

/** A compiled measure: aggregates rows, optionally carrying eval context so
 *  `[Other Measure]` refs resolve through nested measure calls. */
export type MeasureImpl = (rows: Row[], ctx?: EvalCtx) => number;

/** A compiled list measure (e.g. `VALUES(<column>)`): returns the distinct
 *  non-empty values of the column in the current (possibly ctx-filtered)
 *  table set, as a string list for the single-value visual. */
export type ListMeasureImpl = (rows: Row[], ctx?: EvalCtx) => string[];

export type MeasureEvalError = Error;

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
    /** When true, an empty row set from a CALCULATE time-window filter is a
     *  real (matching-nothing) filter: column resolution must yield an empty
     *  list instead of falling back to the whole source table. */
    strictEmpty?: boolean;
};

export type MeasureValidation = { ok: true } | { ok: false; error: string };

/** Display-unit scaling for a single-value callout, mirroring Power BI's Card. */
export type DisplayUnit =
    | 'auto'
    | 'none'
    | 'thousands'
    | 'millions'
    | 'billions'
    | 'percent'
    | 'currency';

/** Auto/custom number formatting, mirroring the Gauge bound rows: when
 * `auto` is true the field/visual default applies; otherwise `format` is a
 * Power BI-style format string (see `formatNumberPattern`). */
export type ValueFormat = {
    auto: boolean;
    format?: string;
};

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
     *  token (K/M/B/%/$). Empty/`undefined` keeps the built-in token. */
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
    /** Show the title text (default: true when `title` is set). */
    showTitle?: boolean;
    /** Draw the axis rule (default: true). */
    showLine?: boolean;
    /** Draw the tick values (default: true). */
    showLabels?: boolean;
    /** axis/label color; '' inherits the report foreground. */
    color?: string;
    /** Extra distance (px) pushing the title away from its axis; negative
     * pulls it toward the plot. 0 = the default tight gap. */
    titleOffset?: number;
    /** Extra pixels added to the axis lane, nudging the axis (line + ticks)
     * further from the plot; negative pulls it closer. */
    gap?: number;
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
    /** Stacked bar/column charts: fill the empty space above/beside each
     * stacked bar with this color (a full-height track behind the bars). */
    emptyColor?: string;
};

/** Which side a value axis sits on. For vertical charts this is left/right;
 * for the horizontal (bar) family the value axis runs along the bottom/top. */
export type AxisPosition = 'left' | 'right' | 'bottom' | 'top';

/** One independent value axis in the multi-axis system. A series binds to an
 * axis via `id` (mirrors Recharts' `yAxisId`/`xAxisId`). Each axis keeps its
 * own scale, format and visual affordances, so several measures with wildly
 * different ranges can share one plot. */
export type AxisDef = {
    /** stable id used to bind series (`yAxisId`/`xAxisId`). */
    id: string;
    /** which side of the plot area this axis sits on. */
    position: AxisPosition;
    /** stacking order on its side: lower = inner (flush to the plot). */
    order: number;
    /** hard domain; undefined means "auto" for that bound. */
    min?: number;
    max?: number;
    /** when true, min/max are ignored and the axis auto-ranges. */
    auto: boolean;
    /** axis title text; '' hides it. */
    title: string;
    showTitle: boolean;
    /** Extra distance (px) pushing the title away from its axis; negative
     * pulls it toward the plot. 0 = the default tight gap. */
    titleOffset?: number;
    /** Extra pixels added to the axis lane, nudging the axis (line + ticks)
     * further from the plot; negative pulls it closer. */
    gap?: number;
    /** the vertical/horizontal rule itself. */
    showLine: boolean;
    /** the tick numbers (14000, 12000, …). */
    showLabels: boolean;
    /** this axis drives the shared gridlines. Only one axis should show
     * gridlines at a time, since every scale is different. */
    showGridlines: boolean;
    /** axis/label color; '' inherits the bound series color. */
    color?: string;
    /** Pareto cumulative-% line color; ''/absent inherits the palette. */
    lineColor?: string;
    /** number presentation format applied to ticks + bound series. */
    numberFormat: NumberFormat;
    displayUnits: DisplayUnit;
    suffix?: string;
    decimals?: number;
    titleFont?: FontStyle;
    labelsFont?: FontStyle;
    /** Pareto-style percentage axes: range is locked (0–100%) and min/max
     * inputs are hidden — the percentage is fixed by definition. */
    lockRange?: boolean;
    /** Stacked bar/column charts: fill the empty space above/beside each
     * stacked bar with this color (a full-height track behind the bars). */
    emptyColor?: string;
};

/** One rendered series of a cartesian chart, along with its data binding.
 * Returned by `buildChartData` alongside the row data so the chart can bind
 * each `Line`/`Bar`/`Area` to its own value axis and format. */
export type SeriesMeta = {
    /** key used as the row property (matches `data[i][key]`). */
    key: string;
    /** display label (measure label or legend bucket). */
    label: string;
    /** id of the value axis this series plots on. */
    axisId: string;
    /** how to draw the series ('bar' | 'line' | 'area'). */
    type: 'bar' | 'line' | 'area';
    /** palette slot so colors rotate deterministically. */
    index: number;
    /** after legend columns: the "legend bucket" name, else the measure label. */
    legendLabel?: string;
    /** running/cumulative total flag (pareto cumulative line). */
    running?: boolean;
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

/** Text/plot area background of a cartesian chart. */
export type PlotAreaStyle = {
    background?: string;
    border: boolean;
    borderColor?: string;
    borderWidth?: number;
};

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

export type ScatterPoint = {
    x: number;
    y: number;
    z?: number;
    category?: string;
    raw: Row;
};