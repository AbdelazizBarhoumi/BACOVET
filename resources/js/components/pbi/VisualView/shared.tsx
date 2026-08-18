import { useEffect, useMemo, useRef } from 'react';
import type { LabelList } from 'recharts';
import { CfIcon } from '@/components/pbi/CfIcon';
import {
    conditionalColor,
    conditionalIcon,
} from '@/lib/pbi/conditionalFormat';
import { iconById } from '@/lib/pbi/icons';
import { crossFilterRows } from '@/lib/pbi/joins';
import {
    formatAxisDefTick,
    formatCallout,
    formatDisplayUnitValue,
    formatNumberWith,
    formatValue,
    formatWellValue,
    isMeasure,
    fieldType,
    measureLabel,
    normalizeCalloutStyle,
    normalizeCategoryLabelStyle,
    normalizeConditionalFormat,
    normalizeDataLabelStyle,
    visualTable,
    type AxisStyle,
    type DataLabelPosition,
    type FieldType,
    type AxisDef,
    type Row,
    type Visual,
    type WellField,
} from '@/lib/pbi/model';
import { ShapeGlyph } from '@/lib/pbi/shapes';
import { usePbi } from '@/lib/pbi/store';

export const PALETTE = [
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
export function axisPropsFor(
    visual: Pick<Visual, 'fontFamily' | 'fontSize' | 'fontColor'>,
) {
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

export const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    fontSize: 11,
    color: 'var(--popover-foreground)',
};

export type TooltipDatum = Record<string, string | number | boolean | null>;

/** Formats a value honoring the visual's number format (and field override). */
export function visualFmt(
    n: number,
    visual: Pick<Visual, 'numberFormat'>,
    wf?: Pick<WellField, 'format'>,
): string {
    return formatWellValue(n, wf, visual.numberFormat ?? 'auto');
}

/** Formats a value honoring the shared data-label/value display format
 * (display units / suffix / decimals) when explicitly configured, otherwise
 * falling back to the visual's number format. Used by the "Part du tout et
 * distribution" charts (pie, treemap, funnel, waterfall, scatter…). */
export function valueFmtFor(
    n: number,
    visual: Visual,
    wf?: Pick<WellField, 'format'>,
): string {
    const dl = normalizeDataLabelStyle(visual.dataLabels);
    const explicit =
        dl.displayUnits !== 'auto' ||
        Boolean(dl.suffix?.trim()) ||
        (dl.decimals !== undefined && dl.decimals !== 1);
    if (explicit)
        return formatDisplayUnitValue(n, dl.displayUnits, dl.decimals, dl.suffix);
    return visualFmt(n, visual, wf);
}

/** Recharts tick formatter bound to the shared value display format. */
export function valueTickFmt(visual: Visual) {
    return (v: number) => valueFmtFor(v, visual, undefined);
}

export {
    formatTableNumber as tableValueFmt,
    isTableNumberCustomized as tableNumberCustomized,
} from '@/lib/pbi/model';

/** Recharts tick formatter bound to a visual's number format. */
export function tickFmt(visual: Pick<Visual, 'numberFormat'>) {
    return (v: number) => formatNumberWith(v, visual.numberFormat ?? 'auto');
}

export const GRIDLINE_DASH: Record<string, string | undefined> = {
    solid: undefined,
    dashed: '4 4',
    dotted: '1 3',
};

/** Recharts text style block from a FontStyle, falling back to defaults. */
export function fontStyleProps(
    font:
        | {
              fontSize?: number;
              color?: string;
              fontFamily?: string;
              bold?: boolean;
              italic?: boolean;
              underline?: boolean;
          }
        | undefined,
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

/** Legend label renderer that applies the legend font color/style. Recharts
 * colors legend text from the series color (an inline style on each span),
 * so `wrapperStyle` color never shows — wrap the label in a span instead. */
export function legendLabelFormatter(
    font:
        | {
              color?: string;
              bold?: boolean;
              italic?: boolean;
              underline?: boolean;
          }
        | undefined,
) {
    return (value: string | number) => (
        <span
            style={{
                color: font?.color || 'var(--muted-foreground)',
                fontWeight: font?.bold ? 700 : undefined,
                fontStyle: font?.italic ? 'italic' : undefined,
                textDecoration: font?.underline ? 'underline' : undefined,
            }}
        >
            {value}
        </span>
    );
}

/** Gap between the tick lane and the axis title (px). */
export const AXIS_TITLE_GAP = 4;
/** Height of the category-axis lane (X on column charts, Y on bar charts).
 * Recharts defaults a missing XAxis `height` to a roomy 30; sizing it to a
 * single line of tick text keeps the axis title hugging the labels. */
export function estimateCategoryAxisLane(fontSize: number): number {
    return Math.min(24, Math.max(14, fontSize + 6));
}
/** Extra chart margin reserved on a side that carries an axis title, so a
 * rotated/stacked title is never clipped by the SVG edge. */
export const AXIS_TITLE_RESERVE = 12;
/** Gutter width for the column value axis; wide enough that tick labels like
 * `1,234,567.89` fit on one line instead of wrapping. */
export const VALUE_AXIS_WIDTH = 80;
/** Gutter width for the bar category axis. */
export const CATEGORY_AXIS_WIDTH = 110;

/** Recharts `label` prop for an axis title (undefined when empty). Vertical
 * (Y) axes get rotated text just outside their tick lane; horizontal (X) axes
 * get text just below/above the ticks. Recharts places the anchor at
 * `viewBox ± offset`, and every axis lane is carved out of the plot area, so a
 * small `AXIS_TITLE_GAP` offset parks the title tight against the lane's outer
 * edge on its own side. */
export function axisTitle(
    axis: AxisStyle,
    vertical?: boolean,
): Record<string, unknown> | undefined {
    if (!axis.title || axis.showTitle === false) return undefined;
    const f = axis.titleFont;
    const gap = AXIS_TITLE_GAP + (axis.titleOffset ?? 0);
    return {
        value: axis.title,
        position: vertical ? ('insideLeft' as const) : ('bottom' as const),
        angle: vertical ? -90 : undefined,
        offset: vertical ? -gap : gap,
        fill: f?.color || 'var(--muted-foreground)',
        fontSize: f?.fontSize ?? 11,
        fontWeight: f?.bold ? 700 : undefined,
        fontStyle: f?.italic ? 'italic' : undefined,
    };
}

/** Recharts props for a numeric (value) axis honoring an AxisStyle. */
export function valueAxisProps(
    axis: AxisStyle,
    visual: Visual,
    vertical?: boolean,
) {
    const color = axis.color || visual.fontColor || 'var(--muted-foreground)';
    const props: Record<string, unknown> = {
        hide: !axis.show,
        stroke: color,
        axisLine: axis.showLine !== false,
        allowDataOverflow: true,
        tick: fontStyleProps(axis.labelsFont, {
            fontSize: visual.fontSize ?? 10,
            color,
            fontFamily: visual.fontFamily,
        }),
        tickFormatter: (v: number) =>
            formatDisplayUnitValue(
                v,
                axis.displayUnits,
                axis.decimals,
                axis.suffix,
            ),
    };
    if (axis.showLabels === false)
        props.tick = {
            ...(props.tick as Record<string, unknown>),
            fontSize: 0,
        };
    const label = axisTitle(axis, vertical);
    if (label) props.label = label;
    if (axis.min !== undefined || axis.max !== undefined)
        props.domain = [
            axis.min !== undefined && Number.isFinite(axis.min)
                ? axis.min
                : 'auto',
            axis.max !== undefined && Number.isFinite(axis.max)
                ? axis.max
                : 'auto',
        ];
    return props;
}

/** Converts an `AxisDef` (multi-axis system) into an `AxisStyle` so the
 * existing single-axis prop builders can reuse the styling/format logic. */
export function axisDefAsStyle(axis: AxisDef): AxisStyle {
    return {
        show: axis.showLine || axis.showLabels,
        title: axis.showTitle ? axis.title : '',
        titleFont: axis.titleFont,
        labelsFont: axis.labelsFont,
        displayUnits: axis.displayUnits,
        ...(axis.suffix ? { suffix: axis.suffix } : {}),
        ...(axis.decimals !== undefined ? { decimals: axis.decimals } : {}),
        ...(!axis.auto &&
        (axis.min !== undefined || axis.max !== undefined)
            ? {
                  min: axis.min,
                  max: axis.max,
              }
            : {}),
    };
}

/** Recharts `YAxis` (or X for horizontal plots) props for one `AxisDef` in the
 * multi-axis system, including the series binding id and orientation. */
export function axisDefProps(
    axis: AxisDef,
    visual: Visual,
    vertical: boolean,
    _gutterWidth = 60,
) {
    const style = axisDefAsStyle(axis);
    const props = valueAxisProps(style, visual, vertical);
    props.hide = !axis.showLine && !axis.showLabels;
    props.axisLine = !!axis.showLine;
    props.orientation = axis.position === 'right' || axis.position === 'top'
        ? (vertical ? 'right' : 'top')
        : (vertical ? 'left' : 'bottom');
    props.stroke = axis.color || 'var(--border)';
    // Title parked just outside this axis's own tick lane: rotated -90° for
    // vertical axes, stacked above/below for horizontal ones. A tiny gap
    // (not the gutter) keeps it tight against the line on the correct side.
    if (axis.showTitle && axis.title) {
        const f = axis.titleFont;
        const gap = AXIS_TITLE_GAP + (axis.titleOffset ?? 0);
        props.label = {
            value: axis.title,
            position: vertical
                ? (axis.position === 'right' ? ('insideRight' as const) : ('insideLeft' as const))
                : (axis.position === 'top' ? ('top' as const) : ('bottom' as const)),
            angle: vertical ? -90 : undefined,
            offset: vertical ? -gap : gap,
            fill: f?.color || 'var(--muted-foreground)',
            fontSize: f?.fontSize ?? 11,
            fontWeight: f?.bold ? 700 : undefined,
            fontStyle: f?.italic ? 'italic' : undefined,
        };
    } else {
        delete props.label;
    }
    const axisColor = axis.color || visual.fontColor || 'var(--muted-foreground)';
    props.tick = fontStyleProps(axis.labelsFont, {
        fontSize: visual.fontSize ?? 10,
        color: axisColor,
        fontFamily: visual.fontFamily,
    });
    if (!axis.showLabels)
        props.tick = {
            ...(props.tick as Record<string, unknown>),
            fontSize: 0,
        };
    props.tickFormatter = (v: number) =>
        formatAxisDefTick(v, {
            displayUnits: axis.displayUnits,
            numberFormat: axis.numberFormat,
            decimals: axis.decimals,
            suffix: axis.suffix,
        });
    if (!axis.auto && (axis.min !== undefined || axis.max !== undefined))
        props.domain = [
            axis.min !== undefined && Number.isFinite(axis.min)
                ? axis.min
                : 'auto',
            axis.max !== undefined && Number.isFinite(axis.max)
                ? axis.max
                : 'auto',
        ];
    return props;
}

/** Recharts props for a category axis honoring an AxisStyle. */
export function categoryAxisProps(
    axis: AxisStyle,
    visual: Visual,
    vertical?: boolean,
    _gutterWidth = 90,
) {
    const color = axis.color || visual.fontColor || 'var(--muted-foreground)';
    const props: Record<string, unknown> = {
        hide: !axis.show,
        stroke: color,
        axisLine: axis.showLine !== false,
        tickLine: axis.showLine !== false,
        tick: fontStyleProps(axis.labelsFont, {
            fontSize: visual.fontSize ?? 10,
            color,
            fontFamily: visual.fontFamily,
        }),
    };
    if (axis.showLabels === false)
        props.tick = {
            ...(props.tick as Record<string, unknown>),
            fontSize: 0,
        };
    const label = axisTitle(axis, vertical);
    if (label) props.label = label;
    return props;
}

/** Recharts LabelList position honoring the visual's data-label style. */
export function labelPosition(
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

/** Anchor for a multi-line bar/column label, mirroring recharts' cartesian
 * position math for the positions this app actually uses. `block` describes
 * how the whole line stack lines up against `y` (start/middle/end). */
export function labelBlockAnchor(
    vb: { x?: number; y?: number; width?: number; height?: number },
    position: string | { x?: number; y?: number } | undefined,
    offset: number,
): {
    x: number;
    y: number;
    textAnchor: 'start' | 'middle' | 'end';
    block: 'start' | 'middle' | 'end';
} {
    const x = Number(vb.x ?? 0);
    const y = Number(vb.y ?? 0);
    const width = Number(vb.width ?? 0);
    const height = Number(vb.height ?? 0);
    const verticalSign = height >= 0 ? 1 : -1;
    const horizontalSign = width >= 0 ? 1 : -1;
    const verticalOffset = verticalSign * offset;
    const horizontalOffset = horizontalSign * offset;
    switch (position) {
        case 'top':
            return {
                x: x + width / 2,
                y: y - verticalOffset,
                textAnchor: 'middle',
                block: verticalSign > 0 ? 'end' : 'start',
            };
        case 'bottom':
            return {
                x: x + width / 2,
                y: y + height + verticalOffset,
                textAnchor: 'middle',
                block: verticalSign > 0 ? 'start' : 'end',
            };
        case 'left':
            return {
                x: x - horizontalOffset,
                y: y + height / 2,
                textAnchor: horizontalSign > 0 ? 'end' : 'start',
                block: 'middle',
            };
        case 'right':
            return {
                x: x + width + horizontalOffset,
                y: y + height / 2,
                textAnchor: horizontalSign > 0 ? 'start' : 'end',
                block: 'middle',
            };
        case 'insideLeft':
            return {
                x: x + horizontalOffset,
                y: y + height / 2,
                textAnchor: horizontalSign > 0 ? 'start' : 'end',
                block: 'middle',
            };
        case 'insideRight':
            return {
                x: x + width - horizontalOffset,
                y: y + height / 2,
                textAnchor: horizontalSign > 0 ? 'end' : 'start',
                block: 'middle',
            };
        case 'insideTop':
            return {
                x: x + width / 2,
                y: y + verticalOffset,
                textAnchor: 'middle',
                block: verticalSign > 0 ? 'start' : 'end',
            };
        case 'insideBottom':
            return {
                x: x + width / 2,
                y: y + height - verticalOffset,
                textAnchor: 'middle',
                block: verticalSign > 0 ? 'end' : 'start',
            };
        default:
            return {
                x: x + width / 2,
                y: y + height / 2,
                textAnchor: 'middle',
                block: 'middle',
            };
    }
}

/** Shared recharts tooltip that honors the Tooltips well, formatted by type. */
export function CustomTooltip({
    active,
    payload,
    label,
    visual,
}: {
    active?: boolean;
    payload?: {
        name?: string | number;
        dataKey?: string | number;
        value?: unknown;
        payload?: TooltipDatum;
    }[];
    label?: string | number;
    visual: Visual;
}) {
    const { setTooltipHover } = usePbi();
    const hoverCol = visual.axis[0]?.name;
    const lastHoverKeyRef = useRef<string | null>(null);

    useEffect(() => {
        const key =
            active && label !== undefined && label !== '' && hoverCol
                ? `${hoverCol}\u0000${String(label)}`
                : null;
        if (key === lastHoverKeyRef.current) return;
        lastHoverKeyRef.current = key;
        if (key === null) {
            setTooltipHover(null);
            return;
        }
        setTooltipHover({
            sourceId: visual.id,
            column: hoverCol!,
            value: String(label),
        });
        // setTooltipHover is an unstable context helper (recreated every
        // provider render). Depending on it here would re-run this effect on
        // every render and loop forever; it only wraps a stable setState.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, hoverCol, label, visual.id]);

    if (!active || !payload?.length) return null;
    const datum = payload[0]?.payload ?? {};
    const rows: { label: string; value: string; strong?: boolean }[] = [];

    if (label !== undefined && label !== '') {
        rows.push({ label: 'Catégorie', value: String(label) });
    }

    for (const p of payload) {
        if (p.value === undefined || p.value === null) continue;
        const itemKey = String(p.dataKey ?? p.name ?? '');
        const name = itemKey.startsWith('tt:') ? itemKey.slice(3) : itemKey;
        const ttField = visual.tooltips.find((t) => t.name === name);
        const type =
            itemKey.startsWith('tt:') && ttField
                ? fieldType(ttField.name, ttField.table)
                : itemKey.startsWith('tt:') && name
                  ? fieldType(name)
                  : typeof p.value === 'number'
                    ? 'number'
                    : 'text';
        const formatRaw =
            typeof p.value === 'number' && itemKey.startsWith('__paretoPct:');
        rows.push({
            label: String(p.name ?? name),
            value: formatRaw
                ? formatDisplayUnitValue(Number(p.value), 'percent')
                : formatValue(p.value, type as FieldType),
            strong: !itemKey.startsWith('tt:'),
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

export function chartTooltip(visual: Visual) {
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

export function EmptyVisual({ label, hint }: { label: string; hint?: string }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
            <span className="font-medium">{label}</span>
            <span>{hint ?? 'Glissez des champs de données ici'}</span>
        </div>
    );
}

/** The big number of a card/kpi/gauge, honoring its callout + fx formatting. */
export function CalloutValue({
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
    const iconId =
        cf.style === 'icons'
            ? conditionalIcon(cf, n, n !== null ? [n] : [])
            : null;
    const icon = iconId !== null ? iconById(cf.iconSet, iconId) : undefined;
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
            {icon && (
                <span className="mr-1 inline-block align-middle">
                    <CfIcon icon={icon} size={(callout.fontSize ?? 24) * 0.8} />
                </span>
            )}
            {formatCallout(value, callout, wf, type)}
        </div>
    );
}

/** The small label under a callout value. */
export function CategoryLabel({
    visual,
    label,
}: {
    visual: Visual;
    label: string;
}) {
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

export function ShapeVisual({ visual }: { visual: Visual }) {
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
export function useInteractiveRows(visual: Visual, rows: Row[]) {
    const { crossFilter, interactionFor, joins, tables, graph, smartNetwork } =
        usePbi();
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
            tables,
            graph,
            smartNetwork,
        );
    }, [
        crossFilter,
        interactionFor,
        joins,
        tables,
        graph,
        smartNetwork,
        rows,
        visual,
    ]);
}