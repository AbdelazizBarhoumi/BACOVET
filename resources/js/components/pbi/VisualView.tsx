import { ChevronDown, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Funnel,
    FunnelChart,
    LabelList,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    Treemap,
    XAxis,
    YAxis,
    ZAxis,
} from 'recharts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import {
    cfAggToAgg,
    conditionalColor,
    parseColorCell,
} from '@/lib/pbi/conditionalFormat';
import type { RelativePreset } from '@/lib/pbi/filters';
import { crossFilterRows, enrichRows } from '@/lib/pbi/joins';
import {
    aggregate,
    buildChartData,
    buildScatterData,
    distinctValues,
    fieldLabel,
    fieldType,
    formatCallout,
    formatDisplayUnitValue,
    formatNumberWith,
    formatValue,
    formatWellValue,
    gaugeBoundValue,
    isMeasure,
    measureLabel,
    normalizeAxisStyle,
    normalizeBarStyle,
    normalizeCalloutStyle,
    normalizeCategoryLabelStyle,
    normalizeConditionalFormat,
    normalizeDataLabelStyle,
    normalizeGridlinesStyle,
    normalizeLegendStyle,
    normalizePlotAreaStyle,
    singleValue,
    singleValueLabel,
    visualTable,
    wellForReference,
    type AxisStyle,
    type DataLabelPosition,
    type FieldType,
    type Row,
    type Visual,
    type WellField,
} from '@/lib/pbi/model';
import { ShapeGlyph } from '@/lib/pbi/shapes';
import { slicerKey, usePbi, type SlicerDateMode } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { GaugeVisual } from './GaugeVisual';

const PALETTE = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--chart-6)',
    'var(--chart-7)',
    'var(--chart-8)',
];

/** Axis tick/style props honoring the visual's font settings. */
function axisPropsFor(visual: Pick<Visual, 'fontFamily' | 'fontSize' | 'fontColor'>) {
    const size = visual.fontSize ?? 10;
    const color = visual.fontColor || 'var(--muted-foreground)';
    return {
        tick: {
            fontSize: size,
            fill: color,
            fontFamily: visual.fontFamily || undefined,
        },
        stroke: 'var(--border)',
    } as const;
}

const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    fontSize: 11,
    color: 'var(--popover-foreground)',
};

type TooltipDatum = Record<string, string | number | boolean | null>;

/** Formats a value honoring the visual's number format (and field override). */
function visualFmt(
    n: number,
    visual: Pick<Visual, 'numberFormat'>,
    wf?: Pick<WellField, 'format'>,
): string {
    return formatWellValue(n, wf, visual.numberFormat ?? 'auto');
}

/** Recharts tick formatter bound to a visual's number format. */
function tickFmt(visual: Pick<Visual, 'numberFormat'>) {
    return (v: number) => formatNumberWith(v, visual.numberFormat ?? 'auto');
}

const GRIDLINE_DASH: Record<string, string | undefined> = {
    solid: undefined,
    dashed: '4 4',
    dotted: '1 3',
};

/** Recharts text style block from a FontStyle, falling back to defaults. */
function fontStyleProps(
    font: { fontSize?: number; color?: string; fontFamily?: string; bold?: boolean; italic?: boolean; underline?: boolean } | undefined,
    fallback: { fontSize: number; color: string; fontFamily?: string },
) {
    return {
        fontSize: font?.fontSize ?? fallback.fontSize,
        fill: font?.color || fallback.color,
        fontFamily: font?.fontFamily || fallback.fontFamily || undefined,
        fontWeight: font?.bold ? 700 : undefined,
        fontStyle: font?.italic ? 'italic' : undefined,
        textDecoration: font?.underline ? 'underline' : undefined,
    };
}

/** Recharts `label` prop for an axis title (undefined when empty). Vertical
 * (Y) axes get rotated text running alongside the ticks. */
function axisTitle(axis: AxisStyle, vertical?: boolean) {
    if (!axis.title) return undefined;
    const f = axis.titleFont;
    return {
        value: axis.title,
        position: vertical
            ? ('insideLeft' as const)
            : ('insideTop' as const),
        angle: vertical ? -90 : undefined,
        offset: vertical ? 20 : -6,
        fill: f?.color || 'var(--muted-foreground)',
        fontSize: f?.fontSize ?? 11,
        fontWeight: f?.bold ? 700 : undefined,
        fontStyle: f?.italic ? 'italic' : undefined,
    };
}

/** Recharts props for a numeric (value) axis honoring an AxisStyle. */
function valueAxisProps(
    axis: AxisStyle,
    visual: Visual,
    vertical?: boolean,
) {
    const props: Record<string, unknown> = {
        hide: !axis.show,
        tick: fontStyleProps(axis.labelsFont, {
            fontSize: visual.fontSize ?? 10,
            color: visual.fontColor || 'var(--muted-foreground)',
            fontFamily: visual.fontFamily,
        }),
        tickFormatter: (v: number) =>
            formatDisplayUnitValue(v, axis.displayUnits, axis.decimals),
    };
    const label = axisTitle(axis, vertical);
    if (label) props.label = label;
    if (axis.min !== undefined || axis.max !== undefined)
        props.domain = [axis.min ?? 'auto', axis.max ?? 'auto'];
    return props;
}

/** Recharts props for a category axis honoring an AxisStyle. */
function categoryAxisProps(
    axis: AxisStyle,
    visual: Visual,
    vertical?: boolean,
) {
    const props: Record<string, unknown> = {
        hide: !axis.show,
        tick: fontStyleProps(axis.labelsFont, {
            fontSize: visual.fontSize ?? 10,
            color: visual.fontColor || 'var(--muted-foreground)',
            fontFamily: visual.fontFamily,
        }),
    };
    const label = axisTitle(axis, vertical);
    if (label) props.label = label;
    return props;
}

/** Recharts LabelList position honoring the visual's data-label style. */
function labelPosition(
    pos: DataLabelPosition,
    horizontal: boolean,
): React.ComponentProps<typeof LabelList>['position'] {
    if (horizontal) {
        switch (pos) {
            case 'insideEnd':
                return 'insideRight';
            case 'outsideEnd':
                return 'right';
            case 'insideCenter':
                return 'center';
            case 'insideBase':
                return 'insideLeft';
            default:
                return 'right';
        }
    }
    switch (pos) {
        case 'insideEnd':
            return 'insideTop';
        case 'outsideEnd':
            return 'top';
        case 'insideCenter':
            return 'center';
        case 'insideBase':
            return 'insideBottom';
        default:
            return 'top';
    }
}

/** Shared recharts tooltip that honors the Tooltips well, formatted by type. */
function CustomTooltip({
    active,
    payload,
    label,
    visual,
}: {
    active?: boolean;
    payload?: {
        name?: string | number;
        value?: unknown;
        payload?: TooltipDatum;
    }[];
    label?: string | number;
    visual: Visual;
}) {
    const { setTooltipHover } = usePbi();
    const hoverCol = visual.axis[0]?.name;

    useEffect(() => {
        if (active && label !== undefined && label !== '' && hoverCol) {
            setTooltipHover({
                sourceId: visual.id,
                column: hoverCol,
                value: String(label),
            });
        } else if (active === false || active === undefined) {
            setTooltipHover(null);
        }
        return () => {
            setTooltipHover(null);
        };
        // setTooltipHover is an unstable context helper (recreated every
        // provider render). Depending on it here would re-run this effect on
        // every render and loop forever; it only wraps a stable setState.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, hoverCol, label, visual.id]);

    if (!active || !payload?.length) return null;
    const datum = payload[0]?.payload ?? {};
    const rows: { label: string; value: string; strong?: boolean }[] = [];

    if (label !== undefined && label !== '') {
        rows.push({ label: 'Category', value: String(label) });
    }

    for (const p of payload) {
        if (p.value === undefined || p.value === null) continue;
        const key = String(p.name ?? '');
        const name = key.startsWith('tt:') ? key.slice(3) : key;
        const ttField = visual.tooltips.find((t) => t.name === name);
        const type =
            key.startsWith('tt:') && ttField
                ? fieldType(ttField.name, ttField.table)
                : key.startsWith('tt:') && name
                  ? fieldType(name)
                  : typeof p.value === 'number'
                    ? 'number'
                    : 'text';
        rows.push({
            label: name,
            value: formatValue(p.value, type as FieldType),
            strong: !key.startsWith('tt:'),
        });
    }

    for (const tt of visual.tooltips) {
        const key = `tt:${tt.name}`;
        if (!(key in datum) || datum[key] === null || datum[key] === undefined)
            continue;
        rows.push({
            label: measureLabel(tt),
            value: formatValue(
                datum[key],
                isMeasure(tt.name) ? 'number' : fieldType(tt.name, tt.table),
            ),
            strong: false,
        });
    }

    if (!rows.length) return null;

    return (
        <div
            className="max-w-56 space-y-0.5 rounded px-2 py-1.5 shadow-lg"
            style={tooltipStyle}
        >
            {rows.map((r, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between gap-3"
                >
                    <span className="truncate text-muted-foreground">
                        {r.label}
                    </span>
                    <span
                        className={
                            r.strong
                                ? 'font-semibold tabular-nums'
                                : 'tabular-nums'
                        }
                    >
                        {r.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

function chartTooltip(visual: Visual) {
    return (props: {
        active?: boolean;
        payload?: {
            name?: string | number;
            value?: unknown;
            payload?: TooltipDatum;
        }[];
        label?: string | number;
    }) => <CustomTooltip {...props} visual={visual} />;
}

function EmptyVisual({ label, hint }: { label: string; hint?: string }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
            <span className="font-medium">{label}</span>
            <span>{hint ?? 'Drag data fields here'}</span>
        </div>
    );
}

/** The big number of a card/kpi/gauge, honoring its callout + fx formatting. */
function CalloutValue({
    visual,
    value,
    type,
    wf,
    defaultColor,
}: {
    visual: Visual;
    value: string | number | boolean | null;
    type: FieldType;
    wf: WellField;
    defaultColor: string;
}) {
    const callout = normalizeCalloutStyle(visual.callout);
    const n = typeof value === 'number' && isFinite(value) ? value : null;
    const cf = normalizeConditionalFormat(visual.conditionalFormat);
    const fxColor =
        cf.style !== 'none'
            ? conditionalColor(cf, value, n !== null ? [n] : [], value)
            : undefined;
    return (
        <div
            className="font-semibold tracking-tight"
            style={{
                fontFamily: callout.fontFamily || undefined,
                fontSize: callout.fontSize ?? 24,
                fontWeight: callout.bold ? 700 : undefined,
                fontStyle: callout.italic ? 'italic' : undefined,
                textDecoration: callout.underline ? 'underline' : undefined,
                color: fxColor ?? callout.color ?? defaultColor,
                whiteSpace: callout.textWrap ? 'normal' : 'nowrap',
                textAlign: 'center',
            }}
        >
            {formatCallout(value, callout, wf, type)}
        </div>
    );
}

/** The small label under a callout value. */
function CategoryLabel({ visual, label }: { visual: Visual; label: string }) {
    const category = normalizeCategoryLabelStyle(visual.categoryLabel);
    if (!category.show) return null;
    return (
        <div
            className="text-muted-foreground"
            style={{
                fontFamily: category.fontFamily || undefined,
                fontSize: category.fontSize ?? 11,
                fontWeight: category.bold ? 600 : undefined,
                fontStyle: category.italic ? 'italic' : undefined,
                textDecoration: category.underline ? 'underline' : undefined,
                color: category.color || undefined,
            }}
        >
            {label}
        </div>
    );
}

function ShapeVisual({ visual }: { visual: Visual }) {
    return (
        <ShapeGlyph
            kind={visual.shape ?? 'rectangle'}
            className="h-full w-full"
            stroke={visual.background || 'var(--card)'}
            strokeWidth={
                visual.borderWidth && visual.borderWidth > 0
                    ? visual.borderWidth
                    : 2
            }
            radius={visual.radius}
        />
    );
}

/** Applies cross-filter / cross-highlight coming from another visual. */
function useInteractiveRows(visual: Visual, rows: Row[]) {
    const { crossFilter, interactionFor, joins } = usePbi();
    return useMemo(() => {
        const mode = interactionFor(crossFilter?.sourceId ?? '', visual.id);
        return crossFilterRows(
            rows,
            crossFilter,
            visual.id,
            visualTable(visual),
            visual.axis.some((f) => f.name === crossFilter?.column),
            mode,
            joins,
        );
    }, [crossFilter, interactionFor, joins, rows, visual]);
}

export function VisualView({
    visual,
    rows: allRows,
}: {
    visual: Visual;
    rows: Row[];
}) {
    const { tables, joins, measures } = usePbi();
    const measureExpressions = useMemo(
        () =>
            measures.reduce<Record<string, string>>((acc, m) => {
                if (m.expression) acc[m.name] = m.expression;
                return acc;
            }, {}),
        [measures],
    );
    const enrichedRows = useMemo(
        () => enrichRows(visual, allRows, tables, joins, measureExpressions),
        [visual, allRows, tables, joins, measureExpressions],
    );
    const { rows, match } = useInteractiveRows(visual, enrichedRows);
    const sm = visual.smallMultiples[0]?.name;

    if (!sm) return <ChartBody visual={visual} rows={rows} match={match} />;

    const cells = distinctValues(sm, rows);
    if (!cells.length)
        return <EmptyVisual label="No data for Small multiples" />;

    return (
        <div className="grid h-full w-full grid-cols-2 gap-1 overflow-auto p-1 lg:grid-cols-3">
            {cells.map((value) => (
                <div
                    key={value}
                    className="flex min-w-0 flex-col rounded border border-border"
                >
                    <div className="truncate border-b border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {value}
                    </div>
                    <div className="min-h-0 flex-1">
                        <ChartBody
                            visual={visual}
                            rows={rows.filter(
                                (r) => String(r[sm]) === String(value),
                            )}
                            match={match}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function ChartBody({
    visual,
    rows,
    match,
}: {
    visual: Visual;
    rows: Row[];
    match: ((r: Row) => boolean) | null;
}) {
    const { applyCrossFilter, setTooltipHover, tooltipHover } = usePbi();

    const cf = normalizeConditionalFormat(visual.conditionalFormat);
    const extra = useMemo(() => {
        if (cf.style === 'none' || cf.style === 'fieldValue') return undefined;
        if (cf.basedOn)
            return (
                wellForReference(
                    { name: cf.basedOn, table: cf.basedOnTable },
                    cfAggToAgg(cf.agg),
                ) ?? undefined
            );
        return visual.values[0];
    }, [cf, visual.values]);
    const extraColor =
        cf.style === 'fieldValue' && cf.fieldValue ? cf.fieldValue : undefined;

    const { data, series } = useMemo(
        () =>
            buildChartData(
                rows,
                visual.axis,
                visual.legend,
                visual.values,
                visual.tooltips,
                visual.maxCategories,
                extra,
                extraColor,
            ),
        [rows, visual.axis, visual.legend, visual.values, visual.tooltips, visual.maxCategories, extra, extraColor],
    );

    const cfValues = useMemo(
        () => data.map((d) => Number(d['_cf']) || 0),
        [data],
    );

    /** Per-point conditional fill; falls back to the palette color. */
    const pointFill = (
        d: Record<string, string | number>,
        fallback: string,
    ) =>
        conditionalColor(cf, d['_cf'] ?? null, cfValues, d['_cfx']) ?? fallback;

    /** Whole-series color for line/area/scatter when formatting is active. */
    const seriesColor = useMemo(() => {
        if (cf.style === 'none') return null;
        if (cf.style === 'fieldValue' && extraColor) {
            for (const r of rows) {
                const c = parseColorCell(r[extraColor]);
                if (c) return c;
            }
            return null;
        }
        if (extra) return conditionalColor(cf, aggregate(rows, extra), [0]);
        return null;
    }, [cf, rows, extra, extraColor]);

    const scatter = useMemo(
        () =>
            buildScatterData(
                rows,
                visual.axis[0],
                visual.values[0],
                visual.values[1],
            ),
        [rows, visual.axis, visual.values],
    );

    const axisCol = visual.axis[0]?.name;
    const onPointClick = (
        payload: { category?: string | number } | undefined,
    ) => {
        if (!axisCol || !payload?.category) return;
        applyCrossFilter(
            visual.id,
            axisCol,
            String(payload.category),
            visual.axis[0]?.table,
        );
    };

    const matchSet = useMemo(() => {
        if (!match || !axisCol) return null;
        const s = new Set<string>();
        for (const r of rows) if (match(r)) s.add(String(r[axisCol]));
        return s;
    }, [match, rows, axisCol]);

    /** Cell opacity per data item when a cross-highlight is active. */
    const itemOpacity = (d: Record<string, string | number>) =>
        matchSet
            ? matchSet.has(String(d['category']))
                ? 1
                : 0.2
            : 1;

    /* ----- Cartesian (bar/column) style values ----- */

    const horizontal =
        visual.type === 'bar' ||
        visual.type === 'stackedBar' ||
        visual.type === 'stacked100Bar';
    const xAxis = normalizeAxisStyle(visual.xAxis);
    const yAxis = normalizeAxisStyle(visual.yAxis);
    const gridlines = normalizeGridlinesStyle(visual.gridlines);
    const bars = normalizeBarStyle(visual.bars);
    const dataLabels = normalizeDataLabelStyle(visual.dataLabels);
    const legend = normalizeLegendStyle(visual.legendStyle);
    const plotArea = normalizePlotAreaStyle(visual.plotArea);

    /** Base (series) fill honoring `bars.color` + palette rotation. */
    const seriesBaseFill = (i: number) =>
        bars.applyTo === 'all' && bars.color
            ? bars.color
            : PALETTE[(i + visual.colorIndex) % PALETTE.length];

    /** Per-point fill: conditional format wins, then per-category color. */
    const barFill = (
        d: Record<string, string | number>,
        i: number,
    ) => {
        const cat = String(d['category'] ?? '');
        const perCat =
            bars.applyTo === 'perCategory'
                ? bars.categoryColors[cat]
                : undefined;
        return pointFill(d, perCat ?? seriesBaseFill(i));
    };

    /** Cell opacity combining cross-highlight + bar transparency. */
    const barOpacity = (d: Record<string, string | number>) =>
        itemOpacity(d) * (1 - (bars.transparency ?? 0) / 100);

    const barRadius: number | [number, number, number, number] =
        bars.radius ?? (horizontal ? [0, 2, 2, 0] : [2, 2, 0, 0]);

    const labelFormatter = (v: number) =>
        dataLabels.displayUnits !== 'auto' ||
        (dataLabels.decimals !== undefined &&
            dataLabels.decimals !== null)
            ? formatDisplayUnitValue(
                  v,
                  dataLabels.displayUnits,
                  dataLabels.decimals,
              )
            : visualFmt(v, visual, visual.values[0]);

    /** Legacy-safe: honor the pre-cartesian `showLabels` field too. */
    const labelsShown = dataLabels.show || visual.showLabels === true;

    const baseLabelStyle = fontStyleProps(dataLabels.font, {
        fontSize: visual.fontSize ?? 9,
        color: 'var(--muted-foreground)',
        fontFamily: visual.fontFamily,
    });

    /** Per-series label style merging the shared base with any override. */
    const labelStyleFor = (s: string) => {
        const o =
            dataLabels.applyTo === 'perSeries'
                ? dataLabels.seriesStyles?.[s]
                : undefined;
        if (!o) return baseLabelStyle;
        return fontStyleProps(
            { ...(dataLabels.font ?? {}), ...(o.font ?? {}), color: o.color ?? o.font?.color },
            {
                fontSize: o.font?.fontSize ?? visual.fontSize ?? 9,
                color:
                    o.color ||
                    dataLabels.font?.color ||
                    'var(--muted-foreground)',
                fontFamily:
                    o.font?.fontFamily || visual.fontFamily,
            },
        );
    };

    /** Legacy-safe: honor the pre-cartesian `showLegend` field too. */
    const legendShown =
        legend.show &&
        (visual.legendStyle !== undefined || visual.showLegend !== false);

    const legendStyle = fontStyleProps(legend.font, {
        fontSize: visual.fontSize ?? 10,
        color: 'var(--muted-foreground)',
        fontFamily: visual.fontFamily,
    });

    const plotStyle = {
        background: plotArea.background || undefined,
        border: plotArea.border
            ? `${plotArea.borderWidth ?? 1}px solid ${
                  plotArea.borderColor || 'var(--border)'
              }`
            : undefined,
        borderRadius: 4,
    } as const;

    /** Wraps a chart in the plot-area surface (background/border). */
    const plotWrap = (chart: React.ReactElement) =>
        wrap(
            <div className="h-full w-full" style={plotStyle}>
                {chart}
            </div>,
        );

    /** Point renderer for line/area/combo: clickable dots, dimmed during highlight. */
    const pointDot = (color: string) => {
        if (!axisCol) return false;
        return ({
            cx,
            cy,
            payload,
        }: {
            cx?: number;
            cy?: number;
            payload?: { category?: string | number };
        }) =>
            cx != null ? (
                <circle
                    cx={cx}
                    cy={cy ?? 0}
                    r={matchSet ? 3 : 2}
                    fill={
                        matchSet
                            ? matchSet.has(String(payload?.category))
                                ? color
                                : 'rgba(148,163,184,0.25)'
                            : color
                    }
                    onClick={(e) => {
                        e.stopPropagation();
                        onPointClick(payload);
                    }}
                />
            ) : (
                <g />
            );
    };

    const hasValues = visual.values.length > 0;
    const wrap = (node: React.ReactNode) => (
        <div
            className="h-full w-full"
            onMouseLeave={() => {
                if (tooltipHover?.sourceId === visual.id)
                    setTooltipHover(null);
            }}
        >
            {node}
        </div>
    );

    switch (visual.type) {
        case 'shape':
            return (
                <div
                    className="h-full w-full"
                    style={{
                        transform: visual.rotation
                            ? `rotate(${visual.rotation}deg)`
                            : undefined,
                    }}
                >
                    <ShapeVisual visual={visual} />
                </div>
            );
        case 'text':
            return (
                <div className="h-full w-full overflow-auto p-2 text-sm text-foreground">
                    {visual.text}
                </div>
            );
        case 'image':
            return visual.imageUrl ? (
                <img
                    src={visual.imageUrl}
                    alt={visual.altText || visual.name}
                    className="h-full w-full object-contain"
                />
            ) : (
                <EmptyVisual label="Image — upload or set a URL in Format" />
            );
        case 'button':
            return (
                <button className="m-auto rounded bg-brand px-4 py-2 text-[12px] font-medium text-brand-foreground">
                    {visual.text || 'Button'}
                </button>
            );
        case 'slicer':
        case 'buttonSlicer':
        case 'dropdownSlicer':
        case 'inputSlicer':
        case 'dateSlicer':
            return <SlicerVisual visual={visual} rows={rows} />;
        case 'qna':
            return <QnaVisual visual={visual} rows={rows} />;
        case 'smartNarrative':
            return (
                <SmartNarrative
                    visual={visual}
                    rows={rows}
                    data={data}
                    series={series}
                />
            );
        case 'keyInfluencers':
            return <KeyInfluencers visual={visual} rows={rows} />;
        case 'decompositionTree':
            return <DecompositionTree visual={visual} rows={rows} />;
        case 'rVisual':
        case 'pythonVisual':
            return <ScriptVisual visual={visual} data={data} series={series} />;
        case 'map':
        case 'filledMap':
        case 'shapeMap':
            return (
                <MapVisual
                    visual={visual}
                    data={data}
                    series={series}
                    matchSet={matchSet}
                    onPointClick={onPointClick}
                />
            );
        default:
            break;
    }

    if (!hasValues && visual.type !== 'table' && visual.type !== 'matrix')
        return <EmptyVisual label={visual.type} />;

    if (!rows.length)
        return <EmptyVisual label="No data" hint="No data matches the current filters" />;

    switch (visual.type) {
        case 'card': {
            const callout = normalizeCalloutStyle(visual.callout);
            const goal = gaugeBoundValue(rows, visual.target[0], visual.targetValue);
            const hasGoal = goal !== undefined;
            return wrap(
                <div className="flex h-full flex-wrap items-center justify-around gap-2">
                    {visual.values.map((v, i) => {
                        const type = fieldType(v.name, v.table);
                        const raw = singleValue(rows, v);
                        const numeric = typeof raw === 'number' && isFinite(raw);
                        const val = numeric ? raw : 0;
                        const good = hasGoal && val >= goal;
                        return (
                            <div
                                key={i}
                                className="flex flex-col items-center"
                                style={{
                                    gap: callout.sourceSpacing ? 8 : 2,
                                }}
                            >
                                <CalloutValue
                                    visual={visual}
                                    value={raw}
                                    type={type}
                                    wf={v}
                                    defaultColor={
                                        numeric && hasGoal
                                            ? good
                                                ? 'var(--success)'
                                                : 'var(--destructive)'
                                            : 'var(--foreground)'
                                    }
                                />
                                <CategoryLabel
                                    visual={visual}
                                    label={singleValueLabel(v, type)}
                                />
                                {visual.axis[0] && (
                                    <div className="text-[10px] text-muted-foreground">
                                        by {fieldLabel(visual.axis[0])}
                                    </div>
                                )}
                                {numeric && hasGoal && (
                                    <div className="text-[10px] text-muted-foreground">
                                        Goal {visualFmt(goal, visual, v)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>,
            );
        }
        case 'gauge':
            return wrap(<GaugeVisual visual={visual} rows={rows} />);
        case 'pie':
        case 'donut': {
            const key = series[0] ?? 'value';
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey={key}
                            nameKey="category"
                            innerRadius={visual.type === 'donut' ? '55%' : 0}
                            outerRadius="85%"
                            paddingAngle={1}
                            onClick={(d: { category?: string }) =>
                                onPointClick(d)
                            }
                        >
                            {data.map((d, i) => (
                                <Cell
                                    key={i}
                                    fill={pointFill(
                                        d,
                                        PALETTE[
                                            (i + visual.colorIndex) %
                                                PALETTE.length
                                        ],
                                    )}
                                    fillOpacity={itemOpacity(d)}
                                />
                            ))}
                            {visual.showLabels && (
                                <LabelList
                                    dataKey={key}
                                    formatter={(x: number) =>
                                        visualFmt(x, visual, visual.values[0])
                                    }
                                    style={{ fontSize: visual.fontSize ?? 9 }}
                                />
                            )}
                        </Pie>
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && (
                            <Legend wrapperStyle={{ fontSize: visual.fontSize ?? 10 }} />
                        )}
                    </PieChart>
                </ResponsiveContainer>,
            );
        }
        case 'treemap': {
            const key = series[0] ?? 'value';
            const tm = data.map((d, i) => ({
                name: String(d['category']),
                category: d['category'],
                size: Number(d[key]) || 0,
                fill:
                    matchSet && !matchSet.has(String(d['category']))
                        ? 'rgba(148,163,184,0.2)'
                        : pointFill(d, PALETTE[i % PALETTE.length]),
            }));
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={tm}
                        dataKey="size"
                        nameKey="name"
                        stroke="var(--card)"
                        isAnimationActive={false}
                        onClick={(node) =>
                            onPointClick({
                                category: (
                                    node as {
                                        category?: string | number;
                                    }
                                ).category,
                            })
                        }
                    >
                        <Tooltip content={chartTooltip(visual)} />
                    </Treemap>
                </ResponsiveContainer>,
            );
        }
        case 'funnel':
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                        <Tooltip content={chartTooltip(visual)} />
                        <Funnel
                            dataKey={series[0] ?? 'value'}
                            data={data}
                            isAnimationActive
                            onClick={onPointClick}
                        >
                            <LabelList
                                position="right"
                                dataKey="category"
                                style={{
                                    fontSize: 10,
                                    fill: 'var(--foreground)',
                                }}
                            />
                            {data.map((d, i) => (
                                <Cell
                                    key={i}
                                    fill={pointFill(
                                        d,
                                        PALETTE[i % PALETTE.length],
                                    )}
                                    fillOpacity={itemOpacity(d)}
                                />
                            ))}
                        </Funnel>
                    </FunnelChart>
                </ResponsiveContainer>,
            );
        case 'waterfall': {
            const key = series[0] ?? 'value';
            const wdata = data.reduce<{
                running: number;
                items: {
                    category: string | number;
                    base: number;
                    delta: number;
                    total: number;
                    _cf?: string | number;
                }[];
            }>(
                (acc, d) => {
                    const val = Number(d[key]) || 0;
                    const running = acc.running + val;
                    acc.items.push({
                        category: d['category'],
                        base: acc.running,
                        delta: val,
                        total: running,
                        ...(d['_cf'] !== undefined
                            ? { _cf: d['_cf'] }
                            : {}),
                    });
                    return { running, items: acc.items };
                },
                { running: 0, items: [] },
            ).items;
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={wdata}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            stroke="var(--border)"
                            vertical={false}
                        />
                        <XAxis dataKey="category" {...axisPropsFor(visual)} />
                        <YAxis
                            tickFormatter={tickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        <Bar dataKey="base" stackId="w" fill="transparent" />
                        <Bar
                            dataKey="delta"
                            stackId="w"
                            radius={[2, 2, 0, 0]}
                            onClick={onPointClick}
                        >
                            {wdata.map((d, i) => (
                                <Cell
                                    key={i}
                                    fill={pointFill(
                                        d,
                                        d.delta >= 0
                                            ? 'var(--chart-2)'
                                            : 'var(--destructive)',
                                    )}
                                    fillOpacity={itemOpacity(d)}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>,
            );
        }
        case 'line':
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={data}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            stroke="var(--border)"
                            vertical={false}
                        />
                        <XAxis dataKey="category" {...axisPropsFor(visual)} />
                        <YAxis
                            tickFormatter={tickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && (
                            <Legend wrapperStyle={{ fontSize: visual.fontSize ?? 10 }} />
                        )}
                        {series.map((s, i) => {
                            const color =
                                seriesColor ?? PALETTE[i % PALETTE.length];
                            return (
                                <Line
                                    key={s}
                                    type="monotone"
                                    dataKey={s}
                                    stroke={color}
                                    strokeWidth={2}
                                    dot={pointDot(color)}
                                />
                            );
                        })}
                        {analyticsLines(visual, data, series)}
                    </LineChart>
                </ResponsiveContainer>,
            );
        case 'area':
        case 'stackedArea':
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={data}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            stroke="var(--border)"
                            vertical={false}
                        />
                        <XAxis dataKey="category" {...axisPropsFor(visual)} />
                        <YAxis
                            tickFormatter={tickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && (
                            <Legend wrapperStyle={{ fontSize: visual.fontSize ?? 10 }} />
                        )}
                        {series.map((s, i) => {
                            const color =
                                seriesColor ?? PALETTE[i % PALETTE.length];
                            return (
                                <Area
                                    key={s}
                                    type="monotone"
                                    dataKey={s}
                                    {...(visual.type === 'stackedArea'
                                        ? { stackId: '1' }
                                        : {})}
                                    stroke={color}
                                    fill={color}
                                    fillOpacity={0.35}
                                    dot={pointDot(color)}
                                />
                            );
                        })}
                    </AreaChart>
                </ResponsiveContainer>,
            );
        case 'combo':
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={data}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            stroke="var(--border)"
                            vertical={false}
                        />
                        <XAxis dataKey="category" {...axisPropsFor(visual)} />
                        <YAxis
                            tickFormatter={tickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && (
                            <Legend wrapperStyle={{ fontSize: visual.fontSize ?? 10 }} />
                        )}
                        {series.map((s, i) =>
                            i === 0 ? (
                                <Bar
                                    key={s}
                                    dataKey={s}
                                    fill={PALETTE[0]}
                                    radius={[2, 2, 0, 0]}
                                    onClick={onPointClick}
                                >
                                    {data.map((d, idx) => (
                                        <Cell
                                            key={idx}
                                            fill={pointFill(d, PALETTE[0])}
                                            fillOpacity={itemOpacity(d)}
                                        />
                                    ))}
                                </Bar>
                            ) : (
                                <Line
                                    key={s}
                                    type="monotone"
                                    dataKey={s}
                                    stroke={seriesColor ?? PALETTE[i]}
                                    strokeWidth={2}
                                    dot={pointDot(seriesColor ?? PALETTE[i])}
                                />
                            ),
                        )}
                        {analyticsLines(visual, data, series)}
                    </ComposedChart>
                </ResponsiveContainer>,
            );
        case 'scatter':
        case 'bubble': {
            const xKey = series[0] ?? 'x';
            const yKey = series[1] ?? series[0] ?? 'y';
            const zKey = series[2] ?? yKey;
            const raw = scatter.numeric
                ? scatter.points.map((p) => ({
                      x: p.x,
                      y: p.y,
                      ...(p.z !== undefined ? { z: p.z } : {}),
                      ...(axisCol ? { category: String(p.raw[axisCol] ?? '') } : {}),
                      ...(visual.legend[0]
                          ? {
                                legend: String(
                                    p.raw[visual.legend[0].name] ?? '',
                                ),
                            }
                          : {}),
                  }))
                : undefined;
            const scData: unknown[] = raw ?? data;
            const scXKey = raw ? 'x' : xKey;
            const scYKey = raw ? 'y' : yKey;
            const scZKey = raw ? 'z' : zKey;
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid stroke="var(--border)" />
                        <XAxis
                            dataKey={scXKey}
                            type="number"
                            tickFormatter={tickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        <YAxis
                            dataKey={scYKey}
                            type="number"
                            tickFormatter={tickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        {visual.type === 'bubble' && (
                            <ZAxis dataKey={scZKey} range={[40, 500]} />
                        )}
                        <Tooltip content={chartTooltip(visual)} />
                        <Scatter
                            data={scData}
                            fill={seriesColor ?? 'var(--chart-1)'}
                            onClick={onPointClick}
                            shape={
                                matchSet
                                    ? ({
                                          cx,
                                          cy,
                                          payload,
                                      }: {
                                          cx?: number;
                                          cy?: number;
                                          payload?: { category?: string | number };
                                      }) =>
                                          cx != null ? (
                                              <circle
                                                  cx={cx}
                                                  cy={cy ?? 0}
                                                  r={4}
                                                  fill={
                                                      matchSet.has(
                                                          String(
                                                              payload?.category,
                                                          ),
                                                      )
                                                          ? (seriesColor ??
                                                            'var(--chart-1)')
                                                          : 'rgba(148,163,184,0.25)'
                                                  }
                                              />
                                          ) : (
                                              <g />
                                          )
                                    : undefined
                            }
                        />
                    </ScatterChart>
                </ResponsiveContainer>,
            );
        }
        case 'bar':
        case 'stackedBar':
        case 'stacked100Bar': {
            const bdata =
                visual.type === 'stacked100Bar'
                    ? normalize(data, series)
                    : data;
            const stacked = visual.type !== 'bar' || visual.legend.length > 0;
            return plotWrap(
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={bdata}
                        layout="vertical"
                        margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                    >
                        <CartesianGrid
                            stroke={gridlines.color}
                            horizontal={gridlines.vertical}
                            vertical={gridlines.horizontal}
                            strokeDasharray={GRIDLINE_DASH[gridlines.style]}
                        />
                        <XAxis
                            type="number"
                            {...valueAxisProps(xAxis, visual, false)}
                        />
                        <YAxis
                            type="category"
                            dataKey="category"
                            width={90}
                            {...categoryAxisProps(yAxis, visual, true)}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        {legendShown && series.length > 1 && (
                            <Legend
                                layout={
                                    legend.position === 'left' ||
                                    legend.position === 'right'
                                        ? 'vertical'
                                        : 'horizontal'
                                }
                                verticalAlign={
                                    legend.position === 'top'
                                        ? 'top'
                                        : legend.position === 'bottom'
                                          ? 'bottom'
                                          : 'middle'
                                }
                                align={
                                    legend.position === 'left'
                                        ? 'left'
                                        : legend.position === 'right'
                                          ? 'right'
                                          : 'center'
                                }
                                wrapperStyle={legendStyle}
                            />
                        )}
                        {series.map((s, i) => (
                            <Bar
                                key={s}
                                dataKey={s}
                                {...(stacked ? { stackId: 'a' } : {})}
                                fill={seriesBaseFill(i)}
                                radius={barRadius}
                                onClick={onPointClick}
                            >
                                {bdata.map((d, idx) => (
                                    <Cell
                                        key={idx}
                                        fill={barFill(d, i)}
                                        fillOpacity={barOpacity(d)}
                                    />
                                ))}
                                {labelsShown && (
                                    <LabelList
                                        position={labelPosition(
                                            dataLabels.position,
                                            true,
                                        )}
                                        formatter={labelFormatter}
                                        style={labelStyleFor(s)}
                                    />
                                )}
                            </Bar>
                        ))}
                        {analyticsLines(visual, bdata, series, true)}
                    </BarChart>
                </ResponsiveContainer>,
            );
        }
        case 'table':
        case 'matrix':
            return <TableVisual visual={visual} rows={rows} match={match} />;
        default: {
            // column, stackedColumn, stacked100Column, ribbon
            const cdata =
                visual.type === 'stacked100Column'
                    ? normalize(data, series)
                    : data;
            const stacked =
                visual.type === 'stackedColumn' ||
                visual.type === 'stacked100Column' ||
                visual.type === 'ribbon' ||
                visual.legend.length > 0;
            return plotWrap(
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={cdata}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            stroke={gridlines.color}
                            horizontal={gridlines.horizontal}
                            vertical={gridlines.vertical}
                            strokeDasharray={GRIDLINE_DASH[gridlines.style]}
                        />
                        <XAxis
                            dataKey="category"
                            {...categoryAxisProps(xAxis, visual, false)}
                        />
                        <YAxis {...valueAxisProps(yAxis, visual, true)} />
                        <Tooltip content={chartTooltip(visual)} />
                        {legendShown && series.length > 1 && (
                            <Legend
                                layout={
                                    legend.position === 'left' ||
                                    legend.position === 'right'
                                        ? 'vertical'
                                        : 'horizontal'
                                }
                                verticalAlign={
                                    legend.position === 'top'
                                        ? 'top'
                                        : legend.position === 'bottom'
                                          ? 'bottom'
                                          : 'middle'
                                }
                                align={
                                    legend.position === 'left'
                                        ? 'left'
                                        : legend.position === 'right'
                                          ? 'right'
                                          : 'center'
                                }
                                wrapperStyle={legendStyle}
                            />
                        )}
                        {series.map((s, i) => (
                            <Bar
                                key={s}
                                dataKey={s}
                                {...(stacked ? { stackId: 'a' } : {})}
                                fill={seriesBaseFill(i)}
                                radius={barRadius}
                                onClick={onPointClick}
                            >
                                {cdata.map((d, idx) => (
                                    <Cell
                                        key={idx}
                                        fill={barFill(d, i)}
                                        fillOpacity={barOpacity(d)}
                                    />
                                ))}
                                {labelsShown && (
                                    <LabelList
                                        position={labelPosition(
                                            dataLabels.position,
                                            false,
                                        )}
                                        formatter={labelFormatter}
                                        style={labelStyleFor(s)}
                                    />
                                )}
                            </Bar>
                        ))}
                        {analyticsLines(visual, cdata, series, false)}
                    </BarChart>
                </ResponsiveContainer>,
            );
        }
    }
}

function normalize(data: Record<string, string | number>[], series: string[]) {
    return data.map((d) => {
        const total = series.reduce((t, s) => t + (Number(d[s]) || 0), 0) || 1;
        const out: Record<string, string | number> = {
            category: d['category'] as string,
        };
        if (d['_cf'] !== undefined) out['_cf'] = d['_cf'];
        if (d['_cfx'] !== undefined) out['_cfx'] = d['_cfx'];
        series.forEach((s) => (out[s] = ((Number(d[s]) || 0) / total) * 100));
        return out;
    });
}

function analyticsLines(
    visual: Visual,
    data: Record<string, string | number>[],
    series: string[],
    horizontal = false,
) {
    if (!visual.analytics.length || !series.length) return null;
    const key = series[0]!;
    const vals = data.map((d) => Number(d[key]) || 0);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const max = Math.max(...vals, 0);
    const min = vals.length ? Math.min(...vals) : 0;
    const sorted = [...vals].sort((a, b) => a - b);
    const median = sorted.length
        ? sorted.length % 2
            ? sorted[Math.floor(sorted.length / 2)]!
            : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) /
              2
        : 0;
    /** Stat line (average/constant/min/max/median) positioned on the value axis. */
    const statLine = (value: number, color: string, label: string) => (
        <ReferenceLine
            key={label}
            {...(horizontal ? { x: value } : { y: value })}
            stroke={color}
            strokeDasharray="4 4"
            label={{
                value: label,
                fontSize: 9,
                fill: 'var(--muted-foreground)',
            }}
        />
    );
    return visual.analytics.map((a) => {
        if (a.kind === 'average')
            return statLine(
                avg,
                'var(--chart-4)',
                `Average ${visualFmt(avg, visual, visual.values[0])}`,
            );
        if (a.kind === 'constant')
            return statLine(a.value ?? max * 0.8, 'var(--chart-5)', 'Target');
        if (a.kind === 'min')
            return statLine(
                min,
                'var(--chart-6)',
                `Min ${visualFmt(min, visual, visual.values[0])}`,
            );
        if (a.kind === 'max')
            return statLine(
                max,
                'var(--chart-6)',
                `Max ${visualFmt(max, visual, visual.values[0])}`,
            );
        if (a.kind === 'median')
            return statLine(
                median,
                'var(--chart-6)',
                `Median ${visualFmt(median, visual, visual.values[0])}`,
            );
        if (a.kind === 'trend' || a.kind === 'forecast')
            return (
                <Line
                    key={a.kind}
                    type="linear"
                    dataKey={key}
                    stroke="var(--chart-6)"
                    strokeDasharray={a.kind === 'forecast' ? '6 3' : '3 3'}
                    strokeWidth={1.5}
                    dot={false}
                    legendType="none"
                />
            );
        return null;
    });
}

/* --------------------------------- Table -------------------------------- */

function TableVisual({
    visual,
    rows,
    match,
}: {
    visual: Visual;
    rows: Row[];
    match: ((r: Row) => boolean) | null;
}) {
    const groupCol = visual.axis[0]?.name;
    const legendCol = visual.legend[0]?.name;
    /** Row group values that match an active cross-highlight (null = none). */
    const matchSet = useMemo(() => {
        if (!match || !groupCol) return null;
        const s = new Set<string>();
        for (const r of rows) if (match(r)) s.add(String(r[groupCol]));
        return s;
    }, [match, rows, groupCol]);
    const dimmed = (d: Record<string, string | number>) =>
        matchSet ? !matchSet.has(String(d['category'])) : false;
    const cf = normalizeConditionalFormat(visual.conditionalFormat);
    const extra =
        cf.style === 'none' || cf.style === 'fieldValue'
            ? undefined
            : cf.basedOn
              ? (wellForReference(
                    { name: cf.basedOn, table: cf.basedOnTable },
                    cfAggToAgg(cf.agg),
                ) ?? undefined)
              : visual.values[0];
    const extraColor =
        cf.style === 'fieldValue' && cf.fieldValue ? cf.fieldValue : undefined;
    const { data, series } = buildChartData(
        rows,
        visual.axis,
        visual.type === 'matrix' ? visual.legend : [],
        visual.values,
        [],
        undefined,
        extra,
        extraColor,
    );
    if (!groupCol && !visual.values.length)
        return <EmptyVisual label="Table" />;
    const maxByCol = Object.fromEntries(
        series.map((s) => [
            s,
            Math.max(...data.map((d) => Number(d[s]) || 0), 1),
        ]),
    );
    const cfValues = data.map((d) => Number(d['_cf']) || 0);

    /** Background tint for a table cell when conditional formatting is on. */
    const cellColor = (d: Record<string, string | number>) =>
        conditionalColor(cf, d['_cf'] ?? null, cfValues, d['_cfx']);

    const totals = series.map((s) =>
        data.reduce((t, d) => t + (Number(d[s]) || 0), 0),
    );

    return (
        <div className="h-full overflow-auto">
            <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 bg-muted">
                    <tr>
                        {groupCol && (
                            <th className="border-b border-border px-2 py-1 text-left font-semibold">
                                {fieldLabel(visual.axis[0]!)}
                                {legendCol && visual.type === 'matrix'
                                    ? ` / ${fieldLabel(visual.legend[0]!)}`
                                    : ''}
                            </th>
                        )}
                        {series.map((s) => (
                            <th
                                key={s}
                                className="border-b border-border px-2 py-1 text-right font-semibold"
                            >
                                {s}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((d, i) => (
                        <tr
                            key={i}
                            className="hover:bg-accent"
                            style={{ opacity: dimmed(d) ? 0.25 : 1 }}
                        >
                            {groupCol && (
                                <td className="border-b border-border px-2 py-1">
                                    {d['category']}
                                </td>
                            )}
                            {series.map((s) => {
                                const val = Number(d[s]) || 0;
                                const pct =
                                    (val / (maxByCol[s] as number)) * 100;
                                const background = cellColor(d);
                                return (
                                    <td
                                        key={s}
                                        className="relative border-b border-border px-2 py-1 text-right tabular-nums"
                                        style={
                                            background
                                                ? { backgroundColor: background }
                                                : undefined
                                        }
                                    >
                                        {cf.showDataBars && (
                                            <span
                                                className="absolute inset-y-[2px] left-0 rounded-sm"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor:
                                                        cf.max.color,
                                                    opacity: 0.15,
                                                }}
                                            />
                                        )}
                                        <span className="relative">
                                            {visualFmt(val, visual, visual.values[0])}
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    {visual.subtotals && (
                        <tr className="bg-muted font-semibold">
                            {groupCol && <td className="px-2 py-1">Total</td>}
                            {totals.map((t, i) => (
                                <td
                                    key={i}
                                    className="px-2 py-1 text-right tabular-nums"
                                >
                                    {visualFmt(t, visual, visual.values[0])}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

/* -------------------------------- Slicers -------------------------------- */

function SlicerVisual({ visual, rows }: { visual: Visual; rows: Row[] }) {
    const {
        slicerSelections,
        slicerDateRanges,
        toggleSlicer,
        setSlicerSelection,
        setSlicerDateRange,
        clearSlicer,
    } = usePbi();
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const col = visual.axis[0]?.name;
    const selection = slicerSelections[visual.id] ?? [];
    if (!col) return <EmptyVisual label="Slicer" />;
    const allValues = distinctValues(col, rows);
    const values = allValues.filter((v) =>
        v.toLowerCase().includes(q.toLowerCase()),
    );
    const isOn = (v: string) => selection.includes(slicerKey(visual.axis[0]?.table, col, v));
    const selectedValue = allValues.find(isOn) ?? null;

    if (visual.type === 'dropdownSlicer')
        return (
            <div className="flex h-full flex-col justify-center p-1">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <button
                            className="flex w-full items-center gap-1.5 rounded border border-border bg-background px-2 py-1.5 text-left text-[11px] hover:bg-accent"
                            onClick={() => setOpen((o) => !o)}
                        >
                            <span className="min-w-0 flex-1 truncate">
                                {selectedValue ?? 'All'}
                            </span>
                            <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent
                        align="start"
                        className="flex max-h-64 w-60 flex-col p-0"
                    >
                        <div className="flex items-center gap-1 border-b border-border p-1.5">
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search…"
                                className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-1 text-[11px] focus:outline-none"
                            />
                            {selectedValue && (
                                <button
                                    onClick={() =>
                                        setSlicerSelection(visual.id, col, null)
                                    }
                                    aria-label="Clear slicer"
                                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </div>
                        <div className="min-h-0 flex-1 overflow-auto p-1">
                            {values.map((v) => (
                                <button
                                    key={v}
                                    onClick={() => {
                                        setSlicerSelection(visual.id, col, v);
                                        setQ('');
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'block w-full truncate rounded px-1.5 py-1 text-left text-[11px] hover:bg-accent',
                                        isOn(v) && 'bg-brand/15 font-medium',
                                    )}
                                >
                                    {v}
                                </button>
                            ))}
                            {!values.length && (
                                <div className="px-1.5 py-1 text-[10px] text-muted-foreground">
                                    No values
                                </div>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        );

    if (visual.type === 'inputSlicer')
        return (
            <div className="flex h-full flex-col gap-2 p-1">
                <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={`Type to filter ${col}…`}
                    className="rounded border border-border bg-background px-2 py-1 text-[11px]"
                />
                <div className="flex-1 overflow-auto">
                    {values.map((v) => (
                        <button
                            key={v}
                            onClick={() => toggleSlicer(visual.id, col, v)}
                            className={cn(
                                'block w-full truncate rounded px-2 py-0.5 text-left text-[11px] hover:bg-accent',
                                isOn(v) && 'bg-brand/15 font-medium',
                            )}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>
        );

    if (visual.type === 'dateSlicer') {
        const range = slicerDateRanges[visual.id] ?? {};
        const mode: SlicerDateMode = range.mode ?? 'between';
        const dateVals = allValues.filter((v) =>
            /^\d{4}-\d{2}-\d{2}/.test(v),
        );
        const minIso = dateVals[0];
        const maxIso = dateVals[dateVals.length - 1];
        const minMs = minIso ? new Date(`${minIso}T00:00:00`).getTime() : 0;
        const maxMs = maxIso ? new Date(`${maxIso}T00:00:00`).getTime() : 0;
        const hasDomain = !!minIso && !!maxIso && minMs < maxMs;
        const msToIso = (ms: number) => {
            const d = new Date(ms);
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${d.getFullYear()}-${m}-${day}`;
        };
        const STEP = 86_400_000;
        const MODES: { value: SlicerDateMode; label: string }[] = [
            { value: 'between', label: 'Between' },
            { value: 'before', label: 'Before' },
            { value: 'after', label: 'After' },
            { value: 'relative', label: 'Relative' },
        ];
        const RELATIVE_PRESETS: { key: RelativePreset; label: string }[] = [
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'last7days', label: 'Last 7 days' },
            { key: 'last30days', label: 'Last 30 days' },
            { key: 'last90days', label: 'Last 90 days' },
            { key: 'thisMonth', label: 'This month' },
            { key: 'lastMonth', label: 'Last month' },
            { key: 'thisYear', label: 'This year' },
            { key: 'lastYear', label: 'Last year' },
            { key: 'ytd', label: 'YTD' },
        ];
        const set = (patch: Partial<typeof range>) =>
            setSlicerDateRange(visual.id, { ...range, ...patch });

        let body: React.ReactNode;
        if (mode === 'relative') {
            body = (
                <div className="flex flex-wrap gap-1">
                    {RELATIVE_PRESETS.map((p) => {
                        const active = range.relative === p.key;
                        return (
                            <button
                                key={p.key}
                                onClick={() =>
                                    set({
                                        mode: 'relative',
                                        relative: p.key,
                                        from: undefined,
                                        to: undefined,
                                    })
                                }
                                className={cn(
                                    'rounded-full border px-2 py-0.5 text-[10px] transition-colors',
                                    active
                                        ? 'border-brand bg-brand text-brand-foreground'
                                        : 'border-border hover:bg-accent',
                                )}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            );
        } else if (mode === 'before') {
            body = (
                <>
                    {hasDomain && (
                        <Slider
                            min={minMs}
                            max={maxMs}
                            step={STEP}
                            value={[range.to ? new Date(`${range.to}T00:00:00`).getTime() : maxMs]}
                            onValueChange={([v]) =>
                                set({ mode: 'before', to: msToIso(v), from: undefined })
                            }
                        />
                    )}
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">To</span>
                        <input
                            type="date"
                            value={range.to ?? ''}
                            onChange={(e) =>
                                set({
                                    mode: 'before',
                                    to: e.target.value || undefined,
                                    from: undefined,
                                })
                            }
                            className="rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                </>
            );
        } else if (mode === 'after') {
            body = (
                <>
                    {hasDomain && (
                        <Slider
                            min={minMs}
                            max={maxMs}
                            step={STEP}
                            value={[range.from ? new Date(`${range.from}T00:00:00`).getTime() : minMs]}
                            onValueChange={([v]) =>
                                set({ mode: 'after', from: msToIso(v), to: undefined })
                            }
                        />
                    )}
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">From</span>
                        <input
                            type="date"
                            value={range.from ?? ''}
                            onChange={(e) =>
                                set({
                                    mode: 'after',
                                    from: e.target.value || undefined,
                                    to: undefined,
                                })
                            }
                            className="rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                </>
            );
        } else {
            body = (
                <>
                    {hasDomain && (
                        <Slider
                            min={minMs}
                            max={maxMs}
                            step={STEP}
                            value={[
                                range.from ? new Date(`${range.from}T00:00:00`).getTime() : minMs,
                                range.to ? new Date(`${range.to}T00:00:00`).getTime() : maxMs,
                            ]}
                            onValueChange={([a, b]) =>
                                set({ mode: 'between', from: msToIso(a), to: msToIso(b) })
                            }
                        />
                    )}
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">From</span>
                        <input
                            type="date"
                            value={range.from ?? ''}
                            onChange={(e) =>
                                set({ mode: 'between', from: e.target.value || undefined })
                            }
                            className="rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                    <label className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">To</span>
                        <input
                            type="date"
                            value={range.to ?? ''}
                            onChange={(e) =>
                                set({ mode: 'between', to: e.target.value || undefined })
                            }
                            className="rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                </>
            );
        }

        return (
            <div className="flex h-full flex-col justify-center gap-2 p-2 text-[11px]">
                <div className="flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                        {MODES.map((m) => (
                            <button
                                key={m.value}
                                onClick={() => set({ mode: m.value })}
                                className={cn(
                                    'rounded px-1.5 py-0.5 text-[9px] transition-colors',
                                    mode === m.value
                                        ? 'bg-brand text-brand-foreground'
                                        : 'bg-accent/50 text-muted-foreground hover:bg-accent',
                                )}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => setSlicerDateRange(visual.id, {})}
                        className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                        Clear
                    </button>
                </div>
                {body}
            </div>
        );
    }

    if (visual.type === 'buttonSlicer')
        return (
            <div className="flex h-full flex-wrap content-start gap-1 overflow-auto p-1">
                {values.map((v) => (
                    <button
                        key={v}
                        onClick={() => toggleSlicer(visual.id, col, v)}
                        className={cn(
                            'rounded border px-2 py-1 text-[10px] transition-colors',
                            isOn(v)
                                ? 'border-brand bg-brand text-brand-foreground'
                                : 'border-border hover:bg-accent',
                        )}
                    >
                        {v}
                    </button>
                ))}
            </div>
        );

    return (
        <div className="flex h-full flex-col">
            <button
                onClick={() => clearSlicer(visual.id)}
                className="self-end text-[10px] text-muted-foreground hover:text-foreground"
            >
                Clear
            </button>
            <div className="mt-1 flex-1 overflow-auto pr-1">
                {values.map((v) => (
                    <label
                        key={v}
                        className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-accent"
                    >
                        <input
                            type="checkbox"
                            checked={isOn(v)}
                            onChange={() => toggleSlicer(visual.id, col, v)}
                            className="size-3 accent-[var(--brand)]"
                        />
                        <span className="truncate">{v}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}

/* ------------------------------ AI-ish visuals ---------------------------- */

function SmartNarrative({
    visual,
    rows,
    data,
    series,
}: {
    visual: Visual;
    rows: Row[];
    data: Record<string, string | number>[];
    series: string[];
}) {
    const key = series[0];
    if (!key || !data.length)
        return (
            <EmptyVisual label="Smart narrative — add a category and a measure" />
        );
    const sorted = [...data].sort((a, b) => Number(b[key]) - Number(a[key]));
    const top = sorted[0]!;
    const bottom = sorted[sorted.length - 1]!;
    const total = data.reduce((t, d) => t + Number(d[key]), 0);
    return (
        <div className="h-full overflow-auto p-2 text-[11px] leading-relaxed text-foreground">
            <p>
                <strong>{key}</strong> totalled{' '}
                <strong>{visualFmt(total, visual, visual.values[0])}</strong>{' '}
                across {data.length}{' '}
                {visual.axis[0] ? fieldLabel(visual.axis[0]) : 'categories'} and{' '}
                {rows.length.toLocaleString()} rows in the current filter
                context.
            </p>
            <p className="mt-2">
                <strong>{top['category']}</strong> had the highest value at{' '}
                {visualFmt(Number(top[key]), visual, visual.values[0])} (
                {((Number(top[key]) / (total || 1)) * 100).toFixed(1)}% of
                total), while <strong>{bottom['category']}</strong> was lowest
                at {visualFmt(Number(bottom[key]), visual, visual.values[0])}.
            </p>
            <p className="mt-2 text-muted-foreground">
                Summary updates automatically as filters change.
            </p>
        </div>
    );
}

function KeyInfluencers({ visual, rows }: { visual: Visual; rows: Row[] }) {
    const dim = visual.axis[0]?.name;
    const measure = visual.values[0];
    if (!dim || !measure)
        return (
            <EmptyVisual label="Key influencers — add a field and a measure" />
        );
    const groups = new Map<string, Row[]>();
    for (const r of rows) {
        const k = String(r[dim]);
        groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    const scored = [...groups.entries()]
        .map(([k, rs]) => ({ k, v: aggregate(rs, measure) }))
        .sort((a, b) => b.v - a.v);
    const total = scored.reduce((t, s) => t + s.v, 0) || 1;
    return (
        <div className="h-full overflow-auto p-1 text-[11px]">
            <p className="mb-2 text-muted-foreground">
                What influences <strong>{measureLabel(measure)}</strong> to
                increase?
            </p>
            {scored.slice(0, 8).map((s) => (
                <div key={s.k} className="mb-1">
                    <div className="flex justify-between">
                        <span className="truncate">{s.k}</span>
                        <span className="text-muted-foreground tabular-nums">
                            {((s.v / total) * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div className="h-1.5 rounded bg-muted">
                        <div
                            className="h-full rounded bg-brand"
                            style={{ width: `${(s.v / total) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function DecompositionTree({ visual, rows }: { visual: Visual; rows: Row[] }) {
    const [path, setPath] = useState<{ col: string; val: string }[]>([]);
    const measure = visual.values[0];
    const levels = (
        visual.drillFields.length ? visual.drillFields : visual.axis
    ).map((f) => f.name);
    if (!measure || !levels.length)
        return (
            <EmptyVisual label="Decomposition tree — add Explain by fields and a measure" />
        );

    let scoped = rows;
    for (const p of path)
        scoped = scoped.filter((r) => String(r[p.col]) === p.val);
    const nextCol = levels[path.length];

    const groups = new Map<string, Row[]>();
    if (nextCol)
        for (const r of scoped) {
            const k = String(r[nextCol]);
            groups.set(k, [...(groups.get(k) ?? []), r]);
        }
    const items = [...groups.entries()]
        .map(([k, rs]) => ({ k, v: aggregate(rs, measure) }))
        .sort((a, b) => b.v - a.v);
    const max = Math.max(...items.map((i) => i.v), 1);

    return (
        <div className="flex h-full gap-3 overflow-auto p-1 text-[11px]">
            <div className="min-w-24">
                <div className="font-semibold">{measureLabel(measure)}</div>
                <div className="text-lg">
                    {visualFmt(aggregate(scoped, measure), visual, measure)}
                </div>
                {path.map((p, i) => (
                    <button
                        key={i}
                        onClick={() => setPath(path.slice(0, i))}
                        className="mt-1 block truncate rounded bg-muted px-1 hover:bg-accent"
                    >
                        {p.col}: {p.val} ×
                    </button>
                ))}
            </div>
            {nextCol && (
                <div className="min-w-40 flex-1">
                    <div className="mb-1 font-semibold text-muted-foreground">
                        {nextCol}
                    </div>
                    {items.slice(0, 12).map((it) => (
                        <button
                            key={it.k}
                            onClick={() =>
                                setPath([...path, { col: nextCol, val: it.k }])
                            }
                            className="mb-0.5 block w-full rounded px-1 text-left hover:bg-accent"
                        >
                            <span className="flex justify-between">
                                <span className="truncate">{it.k}</span>
                                <span className="tabular-nums">
                                    {visualFmt(it.v, visual, measure)}
                                </span>
                            </span>
                            <span
                                className="block h-1 rounded bg-brand"
                                style={{ width: `${(it.v / max) * 100}%` }}
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function QnaVisual({ visual, rows }: { visual: Visual; rows: Row[] }) {
    const [q, setQ] = useState('');
    const firstRow = rows[0] ?? {};
    const textKey =
        Object.keys(firstRow).find((k) => typeof firstRow[k] !== 'number') ??
        Object.keys(firstRow)[0] ??
        '';
    const { data, series } = buildChartData(
        rows,
        textKey ? [{ table: '', name: textKey, agg: 'count' }] : [],
        [],
        visual.values.length
            ? visual.values
            : [{ table: 'Measures', name: 'Row Count', agg: 'sum' }],
    );
    return (
        <div className="flex h-full flex-col gap-1">
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask a question about your data"
                className="rounded border border-border bg-background px-2 py-1 text-[11px]"
            />
            <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis dataKey="category" {...axisPropsFor(visual)} />
                        <YAxis
                            tickFormatter={tickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        <Bar
                            dataKey={series[0] ?? 'value'}
                            fill="var(--chart-1)"
                            radius={[2, 2, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function ScriptVisual({
    visual,
    data,
    series,
}: {
    visual: Visual;
    data: Record<string, string | number>[];
    series: string[];
}) {
    const isR = visual.type === 'rVisual';
    return (
        <div className="flex h-full flex-col gap-1">
            <pre className="max-h-16 overflow-auto rounded bg-muted p-1 font-mono text-[9px] text-muted-foreground">
                {isR
                    ? 'library(ggplot2)\nggplot(dataset, aes(category, value)) + geom_line()'
                    : "import matplotlib.pyplot as plt\nplt.plot(dataset['category'], dataset['value'])"}
            </pre>
            <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid
                            stroke="var(--border)"
                            vertical={false}
                        />
                        <XAxis dataKey="category" {...axisPropsFor(visual)} />
                        <YAxis
                            tickFormatter={tickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        <Line
                            type="monotone"
                            dataKey={series[0] ?? 'value'}
                            stroke="var(--chart-3)"
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function MapVisual({
    visual,
    data,
    series,
    matchSet,
    onPointClick,
}: {
    visual: Visual;
    data: Record<string, string | number>[];
    series: string[];
    matchSet: Set<string> | null;
    onPointClick: (p: { category?: string | number }) => void;
}) {
    const key = series[0];
    if (!key) return <EmptyVisual label="Map — add a location and a measure" />;
    const max = Math.max(...data.map((d) => Number(d[key]) || 0), 1);
    return (
        <div className="grid h-full grid-cols-3 content-start gap-1 overflow-auto rounded bg-muted/40 p-1">
            {data.map((d, i) => {
                const v = Number(d[key]) || 0;
                const dimmed = matchSet && !matchSet.has(String(d['category']));
                return (
                    <button
                        key={i}
                        onClick={() => onPointClick(d)}
                        className="flex flex-col items-center justify-center rounded p-1 text-[10px]"
                        style={{
                            backgroundColor: `color-mix(in oklch, var(--chart-1) ${(v / max) * 80 + 10}%, transparent)`,
                            opacity: dimmed ? 0.25 : 1,
                        }}
                    >
                        <span className="truncate">{d['category']}</span>
                        <span className="font-semibold tabular-nums">
                            {visualFmt(v, visual, visual.values[0])}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
