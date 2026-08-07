import { useEffect, useMemo } from 'react';
import type { LabelList } from 'recharts';
import { CfIcon } from '@/components/pbi/CfIcon';
import {
    conditionalColor,
    conditionalIcon,
} from '@/lib/pbi/conditionalFormat';
import { iconById } from '@/lib/pbi/icons';
import { crossFilterRows } from '@/lib/pbi/joins';
import {
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
    visualTable,
    type AxisStyle,
    type DataLabelPosition,
    type FieldType,
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

/** Left margin reserved for a rotated Y-axis title (outside the plot). */
export const AXIS_TITLE_LEFT_MARGIN = 28;
/** Bottom margin reserved for an X-axis title (outside the plot). */
export const AXIS_TITLE_BOTTOM_MARGIN = 18;
/** X position (from the SVG left edge) of a Y-axis title. */
export const Y_TITLE_PAD = 2;
/** Gutter width for the column value axis; wide enough that tick labels like
 * `1,234,567.89` fit on one line instead of wrapping. */
export const VALUE_AXIS_WIDTH = 80;
/** Gutter width for the bar category axis. */
export const CATEGORY_AXIS_WIDTH = 110;

/** Recharts `label` prop for an axis title (undefined when empty). Vertical
 * (Y) axes get rotated text in the left margin, outside the plot; horizontal
 * (X) axes get text below the ticks. `gutterWidth` is the vertical axis tick
 * gutter so the Y title can be pushed clear of the tick labels. */
export function axisTitle(
    axis: AxisStyle,
    vertical?: boolean,
    gutterWidth = 60,
): Record<string, unknown> | undefined {
    if (!axis.title) return undefined;
    const f = axis.titleFont;
    return {
        value: axis.title,
        position: vertical ? ('insideLeft' as const) : ('bottom' as const),
        angle: vertical ? -90 : undefined,
        // `insideLeft` places x at axisX + offset; a negative offset of
        // -(gutterWidth + margin) parks the rotated title in the left margin.
        offset: vertical
            ? -(gutterWidth + AXIS_TITLE_LEFT_MARGIN - Y_TITLE_PAD)
            : 0,
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
    gutterWidth = 60,
) {
    const props: Record<string, unknown> = {
        hide: !axis.show,
        tick: fontStyleProps(axis.labelsFont, {
            fontSize: visual.fontSize ?? 10,
            color: visual.fontColor || 'var(--muted-foreground)',
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
    const label = axisTitle(axis, vertical, gutterWidth);
    if (label) props.label = label;
    if (axis.min !== undefined || axis.max !== undefined)
        props.domain = [axis.min ?? 'auto', axis.max ?? 'auto'];
    return props;
}

/** Recharts props for a category axis honoring an AxisStyle. */
export function categoryAxisProps(
    axis: AxisStyle,
    visual: Visual,
    vertical?: boolean,
    gutterWidth = 90,
) {
    const props: Record<string, unknown> = {
        hide: !axis.show,
        tick: fontStyleProps(axis.labelsFont, {
            fontSize: visual.fontSize ?? 10,
            color: visual.fontColor || 'var(--muted-foreground)',
            fontFamily: visual.fontFamily,
        }),
    };
    const label = axisTitle(axis, vertical, gutterWidth);
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
        rows.push({ label: 'Catégorie', value: String(label) });
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