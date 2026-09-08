import { gaugeFxColor } from '@/lib/pbi/conditionalFormat';
import {
    boundValue,
    fieldType,
    formatCallout,
    formatDisplayUnitValue,
    formatNumberPattern,
    formatWellValue,
    hasExplicitGaugeValueFormat,
    valueCategoryLabel,
    valueGaugeStyle,
    normalizeConditionalFormat,
    normalizeValueFormat,
    singleValue,
    singleValueLabel,
    type ConditionalFormat,
    type GaugeBoundStyle,
    type GaugeLabelStyle,
    type GaugeValueStyle,
    type Row,
    type Visual,
    type WellField,
} from '@/lib/pbi/model';

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

const CX = 100;
const CY = 110;
const R = 88;
const TRACK = 13;

/** Point on the gauge circle at a degree angle (0° = right, 90° = top). */
function anglePoint(deg: number, radius: number) {
    const rad = (deg * Math.PI) / 180;
    return {
        x: CX + radius * Math.cos(rad),
        y: CY - radius * Math.sin(rad),
    };
}

/** Top semicircle arc from 180° (left) down to `toDeg` through the top. */
function arcPath(toDeg: number) {
    const start = anglePoint(180, R);
    const end = anglePoint(toDeg, R);
    const sweptAngle = 180 - toDeg;
    const large = sweptAngle > 180 ? 1 : 0;
    // sweep-flag = 1: for endpoints this far apart (180°/0°), sweep-flag is what
    // decides whether the arc goes over the TOP or under the BOTTOM of the
    // circle — it does NOT come from the large-arc-flag here, since both halves
    // sweep exactly 180°. `0` draws the bottom half, which is why the track was
    // rendering off the bottom edge of the viewBox and getting clipped.
    return `M ${start.x} ${start.y} A ${R} ${R} 0 ${large} 1 ${end.x} ${end.y}`;
}

function clampLabel(deg: number, radius: number) {
    const p = anglePoint(deg, radius);
    return {
        x: Math.min(192, Math.max(8, p.x)),
        y: Math.min(136, Math.max(4, p.y)),
    };
}

/** Formats a bound (min/max/target) value honoring Auto vs custom string, and
 * falling back to the shared gauge value format when one is explicitly set. */
function formatBound(
    n: number,
    bound: GaugeBoundStyle,
    value: GaugeValueStyle,
    visual: Visual,
    wf?: WellField,
): string {
    if (!bound.auto && bound.format)
        return formatNumberPattern(n, bound.format);
    if (hasExplicitGaugeValueFormat(value))
        return formatDisplayUnitValue(
            n,
            value.displayUnits,
            value.decimals,
            value.suffix,
        );
    return formatWellValue(n, wf, visual.numberFormat);
}

/** Formats a data-label value (values/target label/callout). */
function formatLabel(
    n: number,
    style: GaugeLabelStyle,
    value: GaugeValueStyle,
    wf?: WellField,
): string {
    const vf = normalizeValueFormat(style.valueFormat);
    if (!vf.auto && vf.format) return formatNumberPattern(n, vf.format);
    if (hasExplicitGaugeValueFormat(value))
        return formatDisplayUnitValue(
            n,
            value.displayUnits,
            value.decimals,
            value.suffix,
        );
    return formatCallout(n, style, wf, 'number');
}

export function GaugeVisual({
    visual,
    rows,
    index = 0,
}: {
    visual: Visual;
    rows: Row[];
    /** Which `values[i]` this gauge renders (per-value bounds/style). */
    index?: number;
}) {
    const wf = visual.values[index];
    const type = wf ? fieldType(wf.name, wf.table) : 'number';
    const raw = wf ? singleValue(rows, wf) : null;
    const numeric = typeof raw === 'number' && isFinite(raw);
    const val = numeric ? (raw as number) : null;

    const minWf = visual.minimum[index];
    const maxWf = visual.maximum[index];
    const targetWf = visual.target[index];
    const gauge = valueGaugeStyle(visual, index);
    const callout = gauge.dataLabels.callout;

    const min = boundValue(rows, visual, 'minimum', index) ?? 0;
    let max =
        boundValue(rows, visual, 'maximum', index) ??
        (numeric ? (val as number) * 1.4 : 1);
    if (!(max > min)) max = min + Math.max(1, Math.abs(min) * 0.1);
    const target = boundValue(rows, visual, 'target', index);
    const fxColor = (
        fx: ConditionalFormat | boolean | undefined,
        value: number,
    ) => gaugeFxColor(normalizeConditionalFormat(fx), value, min, max);

    if (!numeric || !wf) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                <div
                    className="font-semibold tracking-tight"
                    style={{
                        fontFamily: callout.fontFamily || visual.fontFamily,
                        fontSize: callout.fontSize ?? 24,
                        color: callout.color ?? 'var(--foreground)',
                    }}
                >
                    {formatCallout(raw, callout, wf, type)}
                </div>
                {wf && (
                    <div
                        className="text-muted-foreground"
                        style={{
                            fontSize:
                                valueCategoryLabel(visual, index).fontSize ??
                                11,
                        }}
                    >
                        {singleValueLabel(wf, type)}
                    </div>
                )}
            </div>
        );
    }

    const frac = Math.min(
        1,
        Math.max(0, ((val as number) - min) / (max - min)),
    );
    const valueDeg = 180 - 180 * frac;

    const fill =
        fxColor(gauge.fillFx, val as number) ??
        gauge.fillColor ??
        PALETTE[visual.colorIndex % PALETTE.length];
    const targetColor =
        fxColor(gauge.targetFx, val as number) ??
        gauge.targetColor ??
        'var(--chart-2)';

    const dl = gauge.dataLabels;
    const valuesStyle = dl.values;
    const targetLabelStyle = dl.targetLabel;

    const minText = formatBound(
        min,
        gauge.axis.min,
        gauge.value,
        visual,
        minWf,
    );
    const maxText = formatBound(
        max,
        gauge.axis.max,
        gauge.value,
        visual,
        maxWf,
    );

    const category = valueCategoryLabel(visual, index);
    const categoryLabel = singleValueLabel(wf, type);

    return (
        <svg
            viewBox="0 0 200 140"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
        >
            <path
                d={arcPath(0)}
                fill="none"
                stroke="var(--border)"
                strokeWidth={TRACK}
                strokeLinecap="round"
            />
            {frac > 0 && (
                <path
                    d={arcPath(valueDeg)}
                    fill="none"
                    stroke={fill}
                    strokeWidth={TRACK}
                    strokeLinecap="round"
                />
            )}
            {target !== undefined &&
                (() => {
                    const targetDeg =
                        180 -
                        180 *
                            Math.min(
                                1,
                                Math.max(0, (target - min) / (max - min)),
                            );
                    const outer = anglePoint(targetDeg, R + TRACK / 2 + 2);
                    const inner = anglePoint(targetDeg, R - TRACK / 2 - 2);
                    return (
                        <line
                            x1={inner.x}
                            y1={inner.y}
                            x2={outer.x}
                            y2={outer.y}
                            stroke={targetColor}
                            strokeWidth={3}
                            strokeLinecap="round"
                        />
                    );
                })()}
            {dl.show && valuesStyle.show && (
                <>
                    <text
                        x={12}
                        y={138}
                        textAnchor="start"
                        fontSize={valuesStyle.fontSize ?? 10}
                        fontFamily={valuesStyle.fontFamily || visual.fontFamily}
                        fill={
                            fxColor(valuesStyle.fx, min) ??
                            valuesStyle.color ??
                            'var(--muted-foreground)'
                        }
                    >
                        {minText}
                    </text>
                    <text
                        x={188}
                        y={138}
                        textAnchor="end"
                        fontSize={valuesStyle.fontSize ?? 10}
                        fontFamily={valuesStyle.fontFamily || visual.fontFamily}
                        fill={
                            fxColor(valuesStyle.fx, max) ??
                            valuesStyle.color ??
                            'var(--muted-foreground)'
                        }
                    >
                        {maxText}
                    </text>
                </>
            )}
            {dl.show &&
                targetLabelStyle.show &&
                target !== undefined &&
                (() => {
                    const targetDeg =
                        180 -
                        180 *
                            Math.min(
                                1,
                                Math.max(0, (target - min) / (max - min)),
                            );
                    const pos = clampLabel(targetDeg, R + 22);
                    return (
                        <text
                            x={pos.x}
                            y={pos.y}
                            textAnchor="middle"
                            fontSize={targetLabelStyle.fontSize ?? 10}
                            fontFamily={
                                targetLabelStyle.fontFamily || visual.fontFamily
                            }
                            fill={
                                fxColor(targetLabelStyle.fx, target) ??
                                targetLabelStyle.color ??
                                'var(--muted-foreground)'
                            }
                        >
                            {formatLabel(
                                target,
                                targetLabelStyle,
                                gauge.value,
                                targetWf,
                            )}
                        </text>
                    );
                })()}
            {dl.show && callout.show && (
                <text
                    x={100}
                    y={104}
                    textAnchor="middle"
                    fontSize={callout.fontSize ?? 26}
                    fontWeight={callout.bold ? 700 : 600}
                    fontStyle={callout.italic ? 'italic' : undefined}
                    textDecoration={callout.underline ? 'underline' : undefined}
                    fontFamily={callout.fontFamily || visual.fontFamily}
                    fill={
                        fxColor(callout.fx, val as number) ??
                        callout.color ??
                        'var(--foreground)'
                    }
                >
                    {formatLabel(val as number, callout, gauge.value, wf)}
                </text>
            )}
            {category.show && (
                <text
                    x={100}
                    y={122}
                    textAnchor="middle"
                    fontSize={category.fontSize ?? 11}
                    fontFamily={category.fontFamily || visual.fontFamily}
                    fill={category.color || 'var(--muted-foreground)'}
                >
                    {categoryLabel}
                </text>
            )}
        </svg>
    );
}
