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
    RadialBar,
    RadialBarChart,
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
import {
    aggregate,
    buildChartData,
    distinctValues,
    fieldLabel,
    fieldType,
    formatNumber,
    formatValue,
    isMeasure,
    measureLabel,
    type FieldType,
    type Row,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';

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

const axisProps = {
    tick: { fontSize: 10, fill: 'var(--muted-foreground)' },
    stroke: 'var(--border)',
} as const;

const tooltipStyle = {
    backgroundColor: 'var(--popover)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    fontSize: 11,
    color: 'var(--popover-foreground)',
};

type TooltipDatum = Record<string, string | number | boolean | null>;

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
    }, [active, hoverCol, label, setTooltipHover, visual.id]);

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

function EmptyVisual({ label }: { label: string }) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
            <span className="font-medium">{label}</span>
            <span>Drag data fields here</span>
        </div>
    );
}

/** Applies cross-filter / cross-highlight coming from another visual. */
function useInteractiveRows(visual: Visual, rows: Row[]) {
    const { crossFilter, interactionFor } = usePbi();
    return useMemo(() => {
        if (!crossFilter || crossFilter.sourceId === visual.id)
            return { rows, dim: false };
        const mode = interactionFor(crossFilter.sourceId, visual.id);
        if (mode === 'none') return { rows, dim: false };
        const filtered = rows.filter(
            (r) => String(r[crossFilter.column]) === crossFilter.value,
        );
        return { rows: filtered, dim: mode === 'highlight' };
    }, [crossFilter, interactionFor, rows, visual.id]);
}

export function VisualView({
    visual,
    rows: allRows,
}: {
    visual: Visual;
    rows: Row[];
}) {
    const { rows, dim } = useInteractiveRows(visual, allRows);
    const sm = visual.smallMultiples[0]?.name;

    if (!sm) return <ChartBody visual={visual} rows={rows} dim={dim} />;

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
                            dim={dim}
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
    dim,
}: {
    visual: Visual;
    rows: Row[];
    dim: boolean;
}) {
    const { applyCrossFilter, setTooltipHover, tooltipHover } = usePbi();

    const { data, series } = useMemo(
        () =>
            buildChartData(
                rows,
                visual.axis,
                visual.legend,
                visual.values,
                visual.tooltips,
            ),
        [rows, visual.axis, visual.legend, visual.values, visual.tooltips],
    );

    const axisCol = visual.axis[0]?.name;
    const onPointClick = (
        payload: { category?: string | number } | undefined,
    ) => {
        if (!axisCol || !payload?.category) return;
        applyCrossFilter(visual.id, axisCol, String(payload.category));
    };

    const hasValues = visual.values.length > 0;
    const wrap = (node: React.ReactNode) => (
        <div
            className={cn('h-full w-full', dim && 'opacity-70')}
            onMouseLeave={() => {
                if (tooltipHover?.sourceId === visual.id) setTooltipHover(null);
            }}
        >
            {node}
        </div>
    );

    switch (visual.type) {
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
                <EmptyVisual label="Image — set a URL in Format" />
            );
        case 'button':
            return (
                <button className="m-auto rounded bg-brand px-4 py-2 text-[12px] font-medium text-brand-foreground">
                    {visual.text || 'Button'}
                </button>
            );
        case 'slicer':
        case 'buttonSlicer':
        case 'listSlicer':
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
                    data={data}
                    series={series}
                    onPointClick={onPointClick}
                />
            );
        default:
            break;
    }

    if (!hasValues && visual.type !== 'table' && visual.type !== 'matrix')
        return <EmptyVisual label={visual.type} />;

    switch (visual.type) {
        case 'card': {
            return wrap(
                <div className="flex h-full flex-wrap items-center justify-around gap-2">
                    {visual.values.map((v, i) => (
                        <div key={i} className="flex flex-col items-center">
                            <div className="text-3xl font-semibold tracking-tight text-foreground">
                                {formatNumber(aggregate(rows, v))}
                            </div>
                            <div className="mt-1 text-[11px] text-muted-foreground">
                                {measureLabel(v)}
                            </div>
                            {visual.axis[0] && (
                                <div className="text-[10px] text-muted-foreground">
                                    by {fieldLabel(visual.axis[0])}
                                </div>
                            )}
                        </div>
                    ))}
                </div>,
            );
        }
        case 'kpi': {
            const v = visual.values[0]!;
            const val = aggregate(rows, v);
            const goal = val * 0.95;
            const good = val >= goal;
            return wrap(
                <div className="flex h-full flex-col items-center justify-center gap-1">
                    <div
                        className={cn(
                            'text-3xl font-semibold tracking-tight',
                            good ? 'text-success' : 'text-destructive',
                        )}
                    >
                        {formatNumber(val)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                        {measureLabel(v)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        Goal {formatNumber(goal)}
                    </div>
                </div>,
            );
        }
        case 'gauge': {
            const v = visual.values[0]!;
            const val = aggregate(rows, v);
            const max = val * 1.4 || 1;
            return wrap(
                <div className="relative h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                            innerRadius="65%"
                            outerRadius="100%"
                            startAngle={180}
                            endAngle={0}
                            data={[
                                {
                                    name: 'v',
                                    value: val,
                                    fill: 'var(--chart-1)',
                                },
                            ]}
                        >
                            <RadialBar
                                background
                                dataKey="value"
                                cornerRadius={4}
                            />
                        </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-x-0 bottom-6 text-center">
                        <div className="text-xl font-semibold text-foreground">
                            {formatNumber(val)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            of {formatNumber(max)}
                        </div>
                    </div>
                </div>,
            );
        }
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
                            {data.map((_, i) => (
                                <Cell
                                    key={i}
                                    fill={
                                        PALETTE[
                                            (i + visual.colorIndex) %
                                                PALETTE.length
                                        ]
                                    }
                                />
                            ))}
                            {visual.showLabels && (
                                <LabelList
                                    dataKey={key}
                                    formatter={(x: number) => formatNumber(x)}
                                    style={{ fontSize: 9 }}
                                />
                            )}
                        </Pie>
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && (
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                        )}
                    </PieChart>
                </ResponsiveContainer>,
            );
        }
        case 'treemap': {
            const key = series[0] ?? 'value';
            const tm = data.map((d, i) => ({
                name: String(d['category']),
                size: Number(d[key]) || 0,
                fill: PALETTE[i % PALETTE.length],
            }));
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={tm}
                        dataKey="size"
                        nameKey="name"
                        stroke="var(--card)"
                        isAnimationActive={false}
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
                        >
                            <LabelList
                                position="right"
                                dataKey="category"
                                style={{
                                    fontSize: 10,
                                    fill: 'var(--foreground)',
                                }}
                            />
                            {data.map((_, i) => (
                                <Cell
                                    key={i}
                                    fill={PALETTE[i % PALETTE.length]}
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
                        <XAxis dataKey="category" {...axisProps} />
                        <YAxis
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        <Bar dataKey="base" stackId="w" fill="transparent" />
                        <Bar dataKey="delta" stackId="w" radius={[2, 2, 0, 0]}>
                            {wdata.map((d, i) => (
                                <Cell
                                    key={i}
                                    fill={
                                        d.delta >= 0
                                            ? 'var(--chart-2)'
                                            : 'var(--destructive)'
                                    }
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
                        <XAxis dataKey="category" {...axisProps} />
                        <YAxis
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && (
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                        )}
                        {series.map((s, i) => (
                            <Line
                                key={s}
                                type="monotone"
                                dataKey={s}
                                stroke={PALETTE[i % PALETTE.length]}
                                strokeWidth={2}
                                dot={false}
                            />
                        ))}
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
                        <XAxis dataKey="category" {...axisProps} />
                        <YAxis
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && (
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                        )}
                        {series.map((s, i) => (
                            <Area
                                key={s}
                                type="monotone"
                                dataKey={s}
                                {...(visual.type === 'stackedArea'
                                    ? { stackId: '1' }
                                    : {})}
                                stroke={PALETTE[i % PALETTE.length]}
                                fill={PALETTE[i % PALETTE.length]}
                                fillOpacity={0.35}
                            />
                        ))}
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
                        <XAxis dataKey="category" {...axisProps} />
                        <YAxis
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && (
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                        )}
                        {series.map((s, i) =>
                            i === 0 ? (
                                <Bar
                                    key={s}
                                    dataKey={s}
                                    fill={PALETTE[0]}
                                    radius={[2, 2, 0, 0]}
                                    onClick={onPointClick}
                                />
                            ) : (
                                <Line
                                    key={s}
                                    type="monotone"
                                    dataKey={s}
                                    stroke={PALETTE[i]}
                                    strokeWidth={2}
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
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid stroke="var(--border)" />
                        <XAxis
                            dataKey={xKey}
                            type="number"
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
                        />
                        <YAxis
                            dataKey={yKey}
                            type="number"
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
                        />
                        {visual.type === 'bubble' && (
                            <ZAxis dataKey={zKey} range={[40, 500]} />
                        )}
                        <Tooltip content={chartTooltip(visual)} />
                        <Scatter
                            data={data}
                            fill="var(--chart-1)"
                            onClick={onPointClick}
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
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={bdata}
                        layout="vertical"
                        margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
                    >
                        <CartesianGrid
                            stroke="var(--border)"
                            horizontal={false}
                        />
                        <XAxis
                            type="number"
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
                        />
                        <YAxis
                            type="category"
                            dataKey="category"
                            width={90}
                            {...axisProps}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && series.length > 1 && (
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                        )}
                        {series.map((s, i) => (
                            <Bar
                                key={s}
                                dataKey={s}
                                {...(stacked ? { stackId: 'a' } : {})}
                                fill={
                                    PALETTE[
                                        (i + visual.colorIndex) % PALETTE.length
                                    ]
                                }
                                radius={[0, 2, 2, 0]}
                                onClick={onPointClick}
                            />
                        ))}
                    </BarChart>
                </ResponsiveContainer>,
            );
        }
        case 'table':
        case 'matrix':
            return <TableVisual visual={visual} rows={rows} />;
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
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={cdata}
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid
                            stroke="var(--border)"
                            vertical={false}
                        />
                        <XAxis dataKey="category" {...axisProps} />
                        <YAxis
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
                        />
                        <Tooltip content={chartTooltip(visual)} />
                        {visual.showLegend && series.length > 1 && (
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                        )}
                        {series.map((s, i) => (
                            <Bar
                                key={s}
                                dataKey={s}
                                {...(stacked ? { stackId: 'a' } : {})}
                                fill={
                                    PALETTE[
                                        (i + visual.colorIndex) % PALETTE.length
                                    ]
                                }
                                radius={[2, 2, 0, 0]}
                                onClick={onPointClick}
                            >
                                {visual.showLabels && (
                                    <LabelList
                                        position="top"
                                        formatter={(v: number) =>
                                            formatNumber(v)
                                        }
                                        style={{
                                            fontSize: 9,
                                            fill: 'var(--muted-foreground)',
                                        }}
                                    />
                                )}
                            </Bar>
                        ))}
                        {analyticsLines(visual, cdata, series)}
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
        series.forEach((s) => (out[s] = ((Number(d[s]) || 0) / total) * 100));
        return out;
    });
}

function analyticsLines(
    visual: Visual,
    data: Record<string, string | number>[],
    series: string[],
) {
    if (!visual.analytics.length || !series.length) return null;
    const key = series[0]!;
    const vals = data.map((d) => Number(d[key]) || 0);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const max = Math.max(...vals, 0);
    return visual.analytics.map((a) => {
        if (a.kind === 'average')
            return (
                <ReferenceLine
                    key="avg"
                    y={avg}
                    stroke="var(--chart-4)"
                    strokeDasharray="4 4"
                    label={{
                        value: `Average ${formatNumber(avg)}`,
                        fontSize: 9,
                        fill: 'var(--muted-foreground)',
                    }}
                />
            );
        if (a.kind === 'constant')
            return (
                <ReferenceLine
                    key="const"
                    y={a.value ?? max * 0.8}
                    stroke="var(--chart-5)"
                    label={{
                        value: 'Target',
                        fontSize: 9,
                        fill: 'var(--muted-foreground)',
                    }}
                />
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

function TableVisual({ visual, rows }: { visual: Visual; rows: Row[] }) {
    const groupCol = visual.axis[0]?.name;
    const legendCol = visual.legend[0]?.name;
    const { data, series } = buildChartData(
        rows,
        visual.axis,
        visual.type === 'matrix' ? visual.legend : [],
        visual.values,
    );
    if (!groupCol && !visual.values.length)
        return <EmptyVisual label="Table" />;
    const maxByCol = Object.fromEntries(
        series.map((s) => [
            s,
            Math.max(...data.map((d) => Number(d[s]) || 0), 1),
        ]),
    );
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
                        <tr key={i} className="hover:bg-accent">
                            {groupCol && (
                                <td className="border-b border-border px-2 py-1">
                                    {d['category']}
                                </td>
                            )}
                            {series.map((s) => {
                                const val = Number(d[s]) || 0;
                                const pct =
                                    (val / (maxByCol[s] as number)) * 100;
                                return (
                                    <td
                                        key={s}
                                        className="relative border-b border-border px-2 py-1 text-right tabular-nums"
                                    >
                                        {visual.conditionalFormat && (
                                            <span
                                                className="absolute inset-y-[2px] left-0 rounded-sm bg-brand/15"
                                                style={{ width: `${pct}%` }}
                                            />
                                        )}
                                        <span className="relative">
                                            {formatNumber(val)}
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
                                    {formatNumber(t)}
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
    const { slicerSelections, toggleSlicer, clearSlicer } = usePbi();
    const [q, setQ] = useState('');
    const col = visual.axis[0]?.name;
    const selection = slicerSelections[visual.id] ?? [];
    if (!col) return <EmptyVisual label="Slicer" />;
    const values = distinctValues(col, rows).filter((v) =>
        v.toLowerCase().includes(q.toLowerCase()),
    );
    const isOn = (v: string) => selection.includes(`${col}::${v}`);

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

    if (visual.type === 'dateSlicer')
        return (
            <div className="flex h-full flex-col justify-center gap-2 p-2 text-[11px]">
                <label className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">From</span>
                    <input
                        type="date"
                        className="rounded border border-border bg-background px-2 py-1"
                    />
                </label>
                <label className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">To</span>
                    <input
                        type="date"
                        className="rounded border border-border bg-background px-2 py-1"
                    />
                </label>
            </div>
        );

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

    const circular = visual.type === 'listSlicer';
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
                            type={circular ? 'radio' : 'checkbox'}
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
                <strong>{formatNumber(total)}</strong> across {data.length}{' '}
                {visual.axis[0] ? fieldLabel(visual.axis[0]) : 'categories'} and{' '}
                {rows.length.toLocaleString()} rows in the current filter
                context.
            </p>
            <p className="mt-2">
                <strong>{top['category']}</strong> had the highest value at{' '}
                {formatNumber(Number(top[key]))} (
                {((Number(top[key]) / (total || 1)) * 100).toFixed(1)}% of
                total), while <strong>{bottom['category']}</strong> was lowest
                at {formatNumber(Number(bottom[key]))}.
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
                    {formatNumber(aggregate(scoped, measure))}
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
                                    {formatNumber(it.v)}
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
                        <XAxis dataKey="category" {...axisProps} />
                        <YAxis
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
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
                        <XAxis dataKey="category" {...axisProps} />
                        <YAxis
                            tickFormatter={(v) => formatNumber(v)}
                            {...axisProps}
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
    data,
    series,
    onPointClick,
}: {
    data: Record<string, string | number>[];
    series: string[];
    onPointClick: (p: { category?: string | number }) => void;
}) {
    const key = series[0];
    if (!key) return <EmptyVisual label="Map — add a location and a measure" />;
    const max = Math.max(...data.map((d) => Number(d[key]) || 0), 1);
    return (
        <div className="grid h-full grid-cols-3 content-start gap-1 overflow-auto rounded bg-muted/40 p-1">
            {data.map((d, i) => {
                const v = Number(d[key]) || 0;
                return (
                    <button
                        key={i}
                        onClick={() => onPointClick(d)}
                        className="flex flex-col items-center justify-center rounded p-1 text-[10px]"
                        style={{
                            backgroundColor: `color-mix(in oklch, var(--chart-1) ${(v / max) * 80 + 10}%, transparent)`,
                        }}
                    >
                        <span className="truncate">{d['category']}</span>
                        <span className="font-semibold tabular-nums">
                            {formatNumber(v)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
