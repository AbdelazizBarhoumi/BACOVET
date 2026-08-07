import { useMemo } from 'react';
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
import { GaugeVisual } from '@/components/pbi/GaugeVisual';
import {
    cfAggToAgg,
    conditionalColor,
    parseColorCell,
} from '@/lib/pbi/conditionalFormat';
import {
    aggregate,
    buildChartData,
    buildScatterData,
    fieldLabel,
    fieldType,
    formatDisplayUnitValue,
    gaugeBoundValue,
    isListMeasure,
    listMeasureValue,
    listTreatment,
    normalizeAxisStyle,
    normalizeBarStyle,
    normalizeCalloutStyle,
    normalizeConditionalFormat,
    normalizeDataLabelStyle,
    normalizeGridlinesStyle,
    normalizeLegendStyle,
    normalizePlotAreaStyle,
    singleValue,
    singleValueLabel,
    wellForReference,
    type Row,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import {
    DecompositionTree,
    KeyInfluencers,
    MapVisual,
    QnaVisual,
    ScriptVisual,
    SmartNarrative,
} from './ai';
import {
    AXIS_TITLE_BOTTOM_MARGIN,
    AXIS_TITLE_LEFT_MARGIN,
    CATEGORY_AXIS_WIDTH,
    CalloutValue,
    CategoryLabel,
    EmptyVisual,
    GRIDLINE_DASH,
    PALETTE,
    ShapeVisual,
    VALUE_AXIS_WIDTH,
    axisPropsFor,
    categoryAxisProps,
    chartTooltip,
    fontStyleProps,
    labelBlockAnchor,
    labelPosition,
    legendLabelFormatter,
    tickFmt,
    valueAxisProps,
    visualFmt,
} from './shared';
import { SlicerVisual } from './slicer';
import { TableVisual } from './table';

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
    animate = true,
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
            : (sorted[sorted.length / 2 - 1]! + sorted[sorted.length / 2]!) / 2
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
                `Moyenne ${visualFmt(avg, visual, visual.values[0])}`,
            );
        if (a.kind === 'constant')
            return statLine(a.value ?? max * 0.8, 'var(--chart-5)', 'Objectif');
        if (a.kind === 'min')
            return statLine(
                a.value ?? min,
                'var(--chart-6)',
                `Minimum ${visualFmt(a.value ?? min, visual, visual.values[0])}`,
            );
        if (a.kind === 'max')
            return statLine(
                a.value ?? max,
                'var(--chart-6)',
                `Maximum ${visualFmt(a.value ?? max, visual, visual.values[0])}`,
            );
        if (a.kind === 'median')
            return statLine(
                median,
                'var(--chart-6)',
                `Médiane ${visualFmt(median, visual, visual.values[0])}`,
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
                    isAnimationActive={animate}
                    legendType="none"
                />
            );
        return null;
    });
}

export function ChartBody({
    visual,
    rows,
    match,
    static: staticRender = false,
}: {
    visual: Visual;
    rows: Row[];
    match: ((r: Row) => boolean) | null;
    static?: boolean;
}) {
    const {
        applyCrossFilter,
        setTooltipHover,
        tooltipHover,
        graph,
        filteredTables,
    } = usePbi();

    const animate = staticRender ? false : undefined;
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
                graph,
            ),
        [
            rows,
            visual.axis,
            visual.legend,
            visual.values,
            visual.tooltips,
            visual.maxCategories,
            extra,
            extraColor,
            graph,
        ],
    );

    /** Per-series grand totals across all rows, for "percent of total" labels. */
    const seriesTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const s of series)
            totals[s] = data.reduce((sum, d) => sum + (Number(d[s]) || 0), 0);
        return totals;
    }, [data, series]);

    const cfValues = useMemo(
        () => data.map((d) => Number(d['_cf']) || 0),
        [data],
    );

    /** Per-point conditional fill; falls back to the palette color. */
    const pointFill = (d: Record<string, string | number>, fallback: string) =>
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
        matchSet ? (matchSet.has(String(d['category'])) ? 1 : 0.2) : 1;

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
    const barFill = (d: Record<string, string | number>, i: number) => {
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
        dataLabels.suffix ||
        (dataLabels.decimals !== undefined && dataLabels.decimals !== null)
            ? formatDisplayUnitValue(
                  v,
                  dataLabels.displayUnits,
                  dataLabels.decimals,
                  dataLabels.suffix,
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
            {
                ...(dataLabels.font ?? {}),
                ...(o.font ?? {}),
                color: o.color ?? o.font?.color,
            },
            {
                fontSize: o.font?.fontSize ?? visual.fontSize ?? 9,
                color:
                    o.color ||
                    dataLabels.font?.color ||
                    'var(--muted-foreground)',
                fontFamily: o.font?.fontFamily || visual.fontFamily,
            },
        );
    };

    /** Label lines for one bar/column, honoring the content dropdown. */
    const labelContentLines = (
        row: Record<string, string | number>,
        s: string,
        total: number,
    ): string[] => {
        const v = Number(row[s] ?? 0);
        const val = labelFormatter(v);
        const pct =
            total !== 0
                ? `${((v / total) * 100).toFixed(dataLabels.decimals ?? 1)}%`
                : '0%';
        const cat = String(row['category'] ?? '');
        switch (dataLabels.content) {
            case 'category':
                return [cat];
            case 'value':
                return [val];
            case 'percentOfTotal':
                return [pct];
            case 'categoryValue':
                return [cat, val];
            case 'categoryPercent':
                return [cat, pct];
            case 'valuePercent':
                return [val, pct];
            case 'all':
                return [cat, val, pct];
            default:
                return [val];
        }
    };

    /** Recharts LabelList `content` renderer: payload-aware multi-line labels.
     * `raw` is the chart dataset; the `index` recharts passes matches it 1:1
     * (normalized stacked-100 rows preserve order). */
    const renderLabelContent =
        (raw: Record<string, string | number>[], s: string) =>
        (props: {
            index?: number;
            viewBox?: {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                cx?: number;
                cy?: number;
            };
            position?: string | { x?: number; y?: number };
            offset?: number;
        }) => {
            if (props.index == null) return null;
            const row = raw[props.index];
            if (!row) return null;
            const lines = labelContentLines(row, s, seriesTotals[s] ?? 0);
            if (!lines.length) return null;
            const style = labelStyleFor(s);
            const vb = props.viewBox;
            const anchor = labelBlockAnchor(
                vb
                    ? {
                          x: vb.x,
                          y: vb.y,
                          width: vb.width,
                          height: vb.height,
                      }
                    : {},
                props.position,
                props.offset ?? 5,
            );
            const lineHeight = (style.fontSize ?? 9) * 1.2;
            const firstDy =
                anchor.block === 'end'
                    ? -(lines.length - 1) * lineHeight
                    : anchor.block === 'middle'
                      ? -((lines.length - 1) * lineHeight) / 2
                      : 0;
            return (
                <text
                    {...style}
                    x={anchor.x}
                    y={anchor.y}
                    textAnchor={anchor.textAnchor}
                >
                    {lines.map((ln, i) => (
                        <tspan
                            key={i}
                            x={anchor.x}
                            dy={i === 0 ? firstDy : lineHeight}
                        >
                            {ln}
                        </tspan>
                    ))}
                </text>
            );
        };

    /** Legacy-safe: the `showLegend` field too. */
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
                if (tooltipHover?.sourceId === visual.id) setTooltipHover(null);
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
                <div
                    className="h-full w-full overflow-auto p-2"
                    style={{
                        fontSize: visual.fontSize ?? undefined,
                        color: visual.fontColor ?? undefined,
                        fontWeight: visual.fontBold ? 700 : undefined,
                        fontStyle: visual.fontItalic ? 'italic' : undefined,
                        textDecoration: visual.fontUnderline
                            ? 'underline'
                            : undefined,
                        textAlign: visual.textAlign ?? undefined,
                    }}
                >
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
                <EmptyVisual label="Image" />
            );
        case 'button':
            return (
                <button className="m-auto rounded bg-brand px-4 py-2 text-[12px] font-medium text-brand-foreground">
                    {visual.text || 'Bouton'}
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
        return (
            <EmptyVisual
                label="Aucune donnée"
                hint="Aucune donnée ne correspond aux filtres actuels"
            />
        );

    switch (visual.type) {
        case 'card': {
            const callout = normalizeCalloutStyle(visual.callout);
            const goal = gaugeBoundValue(
                rows,
                visual.target[0],
                visual.targetValue,
            );
            const hasGoal = goal !== undefined;
            return wrap(
                <div className="flex h-full flex-wrap items-center justify-around gap-2">
                    {visual.values.map((v, i) => {
                        if (isListMeasure(v.name)) {
                            const codes = listMeasureValue(rows, v.name, {
                                tables: filteredTables,
                            });
                            const treated = listTreatment(
                                codes,
                                v.listAgg,
                                v.index,
                            );
                            if (v.listAgg) {
                                return (
                                    <div
                                        key={i}
                                        className="flex flex-col items-center"
                                    >
                                        <span className="text-xl font-semibold tabular-nums">
                                            {treated ?? '—'}
                                        </span>
                                        <CategoryLabel
                                            visual={visual}
                                            label={singleValueLabel(v, 'text')}
                                        />
                                        {visual.axis[0] && (
                                            <div className="text-[10px] text-muted-foreground">
                                                par {fieldLabel(visual.axis[0])}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            const listed =
                                v.valueAggregation === 'latest'
                                    ? [...codes].reverse()
                                    : codes;
                            return (
                                <div
                                    key={i}
                                    className="flex flex-col items-center"
                                >
                                    {listed.length ? (
                                        <div className="max-h-full overflow-auto text-center text-sm">
                                            {listed.map((code) => (
                                                <div
                                                    key={code}
                                                    className="leading-snug whitespace-nowrap"
                                                >
                                                    {code}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                    <CategoryLabel
                                        visual={visual}
                                        label={singleValueLabel(v, 'text')}
                                    />
                                    {visual.axis[0] && (
                                        <div className="text-[10px] text-muted-foreground">
                                            par {fieldLabel(visual.axis[0])}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        const type = fieldType(v.name, v.table);
                        const raw = singleValue(rows, v);
                        const numeric =
                            typeof raw === 'number' && isFinite(raw);
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
                                        par {fieldLabel(visual.axis[0])}
                                    </div>
                                )}
                                {numeric && hasGoal && (
                                    <div className="text-[10px] text-muted-foreground">
                                        Objectif {visualFmt(goal, visual, v)}
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
                            isAnimationActive={animate}
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
                            <Legend
                                wrapperStyle={{
                                    fontSize: visual.fontSize ?? 10,
                                }}
                            />
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
                            isAnimationActive={animate}
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
                        ...(d['_cf'] !== undefined ? { _cf: d['_cf'] } : {}),
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
                            isAnimationActive={animate}
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
                            <Legend
                                wrapperStyle={{
                                    fontSize: visual.fontSize ?? 10,
                                }}
                            />
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
                                    isAnimationActive={animate}
                                />
                            );
                        })}
                        {analyticsLines(visual, data, series, false, animate)}
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
                            <Legend
                                wrapperStyle={{
                                    fontSize: visual.fontSize ?? 10,
                                }}
                            />
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
                                    isAnimationActive={animate}
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
                            <Legend
                                wrapperStyle={{
                                    fontSize: visual.fontSize ?? 10,
                                }}
                            />
                        )}
                        {series.map((s, i) =>
                            i === 0 ? (
                                <Bar
                                    key={s}
                                    dataKey={s}
                                    fill={PALETTE[0]}
                                    radius={[2, 2, 0, 0]}
                                    isAnimationActive={animate}
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
                                    isAnimationActive={animate}
                                />
                            ),
                        )}
                        {analyticsLines(visual, data, series, false, animate)}
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
                      ...(axisCol
                          ? { category: String(p.raw[axisCol] ?? '') }
                          : {}),
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
                            isAnimationActive={animate}
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
                                          payload?: {
                                              category?: string | number;
                                          };
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
            const barMargin = {
                top: 8,
                right: 12,
                left: 8 + (yAxis.title ? AXIS_TITLE_LEFT_MARGIN : 0),
                bottom: xAxis.title ? AXIS_TITLE_BOTTOM_MARGIN : 0,
            };
            return plotWrap(
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bdata} layout="vertical" margin={barMargin}>
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
                            width={CATEGORY_AXIS_WIDTH}
                            {...categoryAxisProps(
                                yAxis,
                                visual,
                                true,
                                CATEGORY_AXIS_WIDTH,
                            )}
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
                                formatter={legendLabelFormatter(legend.font)}
                            />
                        )}
                        {series.map((s, i) => (
                            <Bar
                                key={s}
                                dataKey={s}
                                {...(stacked ? { stackId: 'a' } : {})}
                                fill={seriesBaseFill(i)}
                                radius={barRadius}
                                isAnimationActive={animate}
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
                                        content={renderLabelContent(bdata, s)}
                                        style={labelStyleFor(s)}
                                    />
                                )}
                            </Bar>
                        ))}
                        {analyticsLines(visual, bdata, series, true, animate)}
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
            const colMargin = {
                top: 8,
                right: 8,
                left: yAxis.title ? AXIS_TITLE_LEFT_MARGIN : 0,
                bottom: xAxis.title ? AXIS_TITLE_BOTTOM_MARGIN : 0,
            };
            return plotWrap(
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cdata} margin={colMargin}>
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
                        <YAxis
                            width={VALUE_AXIS_WIDTH}
                            {...valueAxisProps(
                                yAxis,
                                visual,
                                true,
                                VALUE_AXIS_WIDTH,
                            )}
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
                                formatter={legendLabelFormatter(legend.font)}
                            />
                        )}
                        {series.map((s, i) => (
                            <Bar
                                key={s}
                                dataKey={s}
                                {...(stacked ? { stackId: 'a' } : {})}
                                fill={seriesBaseFill(i)}
                                radius={barRadius}
                                isAnimationActive={animate}
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
                                        content={renderLabelContent(cdata, s)}
                                        style={labelStyleFor(s)}
                                    />
                                )}
                            </Bar>
                        ))}
                        {analyticsLines(visual, cdata, series, false, animate)}
                    </BarChart>
                </ResponsiveContainer>,
            );
        }
    }
}