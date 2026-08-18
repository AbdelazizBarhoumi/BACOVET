import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Area,
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
    Pie,
    PieChart,
    ReferenceArea,
    ReferenceDot,
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
import { CfSvgGlyph, CfSvgIcon } from '@/components/pbi/CfIcon';
import { GaugeVisual } from '@/components/pbi/GaugeVisual';
import {
    cfAggToAgg,
    conditionalColor,
    conditionalIcon,
    parseColorCell,
} from '@/lib/pbi/conditionalFormat';
import { iconById, type CFIcon } from '@/lib/pbi/icons';
import {
    ANALYTICS_DEFAULT_COLOR,
    aggregate,
    buildChartData,
    buildParetoData,
    buildScatterData,
    fieldLabel,
    fieldType,
    formatAxisDefTick,
    formatDisplayUnitValue,
    gaugeBoundValue,
    isListMeasure,
    listMeasureValue,
    listTreatment,
    normalizeAxes,
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
    STACKED_EMPTY_FILL,
    wellForReference,
    type AnalyticsLine,
    type AxisDef,
    type AxisStyle,
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
import { ClockVisual } from './clock';
import {
    AXIS_TITLE_GAP,
    AXIS_TITLE_RESERVE,
    CATEGORY_AXIS_WIDTH,
    CalloutValue,
    CategoryLabel,
    EmptyVisual,
    GRIDLINE_DASH,
    PALETTE,
    ShapeVisual,
    VALUE_AXIS_WIDTH,
    axisDefProps,
    axisPropsFor,
    categoryAxisProps,
    chartTooltip,
    estimateCategoryAxisLane,
    fontStyleProps,
    labelBlockAnchor,
    labelPosition,
    legendLabelFormatter,
    tooltipStyle,
    valueAxisProps,
    valueFmtFor,
    valueTickFmt,
    visualFmt,
} from './shared';
import { SlicerVisual } from './slicer';
import { TableVisual } from './table';

function normalize(data: Record<string, string | number>[], series: string[]) {
    return data.map((d) => {
        const total = series.reduce((t, s) => t + (Number(d[s]) || 0), 0);
        const out: Record<string, string | number> = {
            category: d['category'] as string,
        };
        if (d['_cf'] !== undefined) out['_cf'] = d['_cf'];
        if (d['_cfx'] !== undefined) out['_cfx'] = d['_cfx'];
        if (total <= 0) {
            series.forEach((s) => (out[s] = 0));
        } else {
            series.forEach(
                (s) => (out[s] = ((Number(d[s]) || 0) / total) * 100),
            );
        }
        return out;
    });
}

/** Estimate the pixel width of the widest tick label a value axis can emit for
 * `keys` across `data`, so the axis lane hugs the labels and a title stays
 * tight against them instead of floating at a fixed wide gutter. Capped at
 * `VALUE_AXIS_WIDTH` so very long numbers keep the room they need. */
function estimateValueAxisWidth(
    data: Record<string, string | number>[],
    keys: string[],
    fmt: (n: number) => string,
    fontSize: number,
): number {
    const values = new Set<number>([0]);
    for (const d of data)
        for (const k of keys) {
            const n = Number(d[k]);
            if (Number.isFinite(n)) values.add(n);
        }
    let maxChars = 0;
    for (const v of values) maxChars = Math.max(maxChars, fmt(v).length);
    const est = Math.ceil(maxChars * fontSize * 0.62) + 12;
    return Math.min(VALUE_AXIS_WIDTH, Math.max(30, est));
}

const A_STAT_LABEL: Record<string, string> = {
    average: 'Moyenne',
    min: 'Minimum',
    max: 'Maximum',
    median: 'Médiane',
};

function analyticsLines(
    visual: Visual,
    data: Record<string, string | number>[],
    series: string[],
    horizontal = false,
    animate = true,
    axisRef: { xAxisId?: string; yAxisId?: string } = {},
    statGroups: { id: string; token?: string; keys: string[] }[] = [],
    tip?: (
        title: string,
        value: string,
    ) =>
        | {
              onMouseEnter: (
                  e: React.MouseEvent<SVGElement, MouseEvent>,
              ) => void;
              onMouseMove: (
                  e: React.MouseEvent<SVGElement, MouseEvent>,
              ) => void;
              onMouseLeave: () => void;
          }
        | undefined,
) {
    if (!visual.analytics.length || !series.length) return null;
    const groups = statGroups.length
        ? statGroups
        : [{ id: 'y0', token: undefined, keys: series }];
    const fmt = (v: number) => visualFmt(v, visual, visual.values[0]);
    /** Stats over every numeric value the given series plot (this is what the
     * value axis itself scales, so min/max/avg/median match the axis scale). */
    const statsFor = (keys: string[]) => {
        const vals = keys.flatMap((k) => data.map((d) => Number(d[k]) || 0));
        const n = vals.length;
        const avg = n ? vals.reduce((a, b) => a + b, 0) / n : 0;
        const max = Math.max(...vals, 0);
        const min = n ? Math.min(...vals) : 0;
        const sorted = [...vals].sort((a, b) => a - b);
        const median = sorted.length
            ? sorted.length % 2
                ? sorted[Math.floor(sorted.length / 2)]!
                : (sorted[sorted.length / 2 - 1]! +
                      sorted[sorted.length / 2]!) /
                  2
            : 0;
        return { avg, max, min, median };
    };
    /** The value-axis groups this line applies to. `a.axes` restricts a line to
     * a subset of the visual's value axes (undefined = every axis). */
    const axisGroups = (a: { axes?: string[] }) =>
        groups.filter((g) => !a.axes || a.axes.includes(g.id));
    /** Stat line (average/constant/min/max/median) positioned on the value axis
     * of the group it belongs to (bound only when the axis carries an id). */
    const statLine = (
        value: number,
        color: string,
        label: string,
        token: string | undefined,
        title: string,
        tipValue: string,
    ) => (
        <ReferenceLine
            key={`stat:${label}:${token ?? 'legacy'}`}
            {...(horizontal ? { x: value } : { y: value })}
            stroke={color}
            strokeDasharray="4 4"
            label={{
                value: label,
                fontSize: 9,
                fill: 'var(--muted-foreground)',
            }}
            {...(token ? { [horizontal ? 'xAxisId' : 'yAxisId']: token } : {})}
            {...(tip ? tip(title, tipValue) : {})}
        />
    );
    /** Effective stroke/fill for an analytics line on one axis group: the
     * per-axis override wins, then the line's own color, then the kind
     * default. */
    const lineColor = (a: AnalyticsLine, g: { id: string }) =>
        a.axisColors?.[g.id] ?? a.color ?? ANALYTICS_DEFAULT_COLOR[a.kind];
    return visual.analytics.map((a) => {
        if (
            a.kind === 'average' ||
            a.kind === 'min' ||
            a.kind === 'max' ||
            a.kind === 'median'
        ) {
            const target = axisGroups(a);
            if (!target.length) return null;
            return target.map((g) => {
                const s = statsFor(g.keys);
                const v =
                    a.kind === 'average'
                        ? s.avg
                        : a.kind === 'min'
                          ? (a.axisValues?.[g.id] ?? a.value ?? s.min)
                          : a.kind === 'max'
                            ? (a.axisValues?.[g.id] ?? a.value ?? s.max)
                            : s.median;
                return statLine(
                    v,
                    lineColor(a, g),
                    `${A_STAT_LABEL[a.kind]!} ${fmt(v)}`,
                    g.token,
                    A_STAT_LABEL[a.kind]!,
                    fmt(v),
                );
            });
        }
        if (a.kind === 'constant') {
            const target = axisGroups(a);
            if (!target.length) return null;
            return target.map((g) => {
                const max = statsFor(g.keys).max;
                const v = a.axisValues?.[g.id] ?? a.value ?? max * 0.8;
                return statLine(
                    v,
                    lineColor(a, g),
                    'Objectif',
                    g.token,
                    'Objectif',
                    fmt(v),
                );
            });
        }
        if (a.kind === 'category') {
            if (!a.category) return null;
            return (
                <ReferenceLine
                    key={`category:${a.category}`}
                    {...(horizontal ? { y: a.category } : { x: a.category })}
                    stroke={a.color ?? ANALYTICS_DEFAULT_COLOR.category}
                    strokeDasharray="6 3"
                    label={{
                        value: a.category,
                        fontSize: 9,
                        fill: 'var(--muted-foreground)',
                    }}
                    {...(tip ? tip('Catégorie', a.category) : {})}
                    {...axisRef}
                />
            );
        }
        if (a.kind === 'band') {
            if (a.value === undefined || a.value2 === undefined) return null;
            if (!axisGroups(a).length) return null;
            const lo = Math.min(a.value, a.value2);
            const hi = Math.max(a.value, a.value2);
            return (
                <ReferenceArea
                    key={`band:${lo}:${hi}`}
                    {...(horizontal ? { x1: lo, x2: hi } : { y1: lo, y2: hi })}
                    fill={a.color ?? ANALYTICS_DEFAULT_COLOR.band}
                    fillOpacity={0.08}
                    stroke="none"
                    {...(tip ? tip('Bande', `${fmt(lo)} – ${fmt(hi)}`) : {})}
                    {...axisRef}
                />
            );
        }
        if (a.kind === 'trend' || a.kind === 'forecast')
            return (
                <Line
                    key={`trend:${a.kind}`}
                    type="linear"
                    dataKey="__trend"
                    stroke={a.color ?? ANALYTICS_DEFAULT_COLOR[a.kind]}
                    strokeDasharray={a.kind === 'forecast' ? '6 3' : '3 3'}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={animate}
                    legendType="none"
                    {...axisRef}
                />
            );
        return null;
    });
}

/** Least-squares slope/intercept fit of `key` across the row order, returned
 * as one fitted value per row (the x positions are the row indices). */
function leastSquaresFit(
    data: Record<string, string | number>[],
    key: string,
): number[] {
    const ys = data.map((d) => Number(d[key]) || 0);
    const n = ys.length;
    if (n < 2) return ys;
    let sx = 0,
        sy = 0,
        sxy = 0,
        sxx = 0;
    for (let i = 0; i < n; i++) {
        const y = ys[i]!;
        if (!isFinite(y)) return ys.slice();
        sx += i;
        sy += y;
        sxy += i * y;
        sxx += i * i;
    }
    const denom = n * sxx - sx * sx;
    const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    const intercept = (sy - slope * sx) / n;
    return ys.map((_, i) => intercept + slope * i);
}

/** A point in plot-fraction space (0..1 across each axis of the plot box). */
type Pt = { x: number; y: number };

/** A "nice" step (1/2/5 × 10^k) of at least `x`, mirroring how recharts picks
 * value-axis tick steps. */
function niceStep(x: number): number {
    if (!(x > 0)) return 1;
    const pow = 10 ** Math.floor(Math.log10(x));
    const f = x / pow;
    if (f <= 1) return pow;
    if (f <= 2) return 2 * pow;
    if (f <= 5) return 5 * pow;
    return 10 * pow;
}

/** A 1/2/5-style domain covering `[lo, hi]`, matching the numeric value axis'
 * auto "nice" range so plot-fraction coordinates line up with the drawn axis. */
function niceDomain(lo: number, hi: number): [number, number] {
    if (!isFinite(lo) || !isFinite(hi)) return [0, 1];
    if (lo === hi) {
        const pad = Math.abs(lo * 0.1) || 1;
        return [lo - pad, hi + pad];
    }
    const step = niceStep((hi - lo) / 4);
    let dlo = Math.floor(lo / step) * step;
    let dhi = Math.ceil(hi / step) * step;
    while (dlo > lo) dlo -= step;
    while (dhi < hi) dhi += step;
    return dlo === dhi ? [dlo - step, dhi + step] : [dlo, dhi];
}

/** One sample point of a cubic Bézier (control points `c1`/`c2`) evaluated at
 * `u ∈ [0,1]` between `p0` and `p1`. */
function cubicPoint(p0: Pt, c1: Pt, c2: Pt, p1: Pt, u: number): Pt {
    const mt = 1 - u;
    return {
        x:
            mt * mt * mt * p0.x +
            3 * mt * mt * u * c1.x +
            3 * mt * u * u * c2.x +
            u * u * u * p1.x,
        y:
            mt * mt * mt * p0.y +
            3 * mt * mt * u * c1.y +
            3 * mt * u * u * c2.y +
            u * u * u * p1.y,
    };
}

/** One segment of a monotone cubic spline: two knots plus the two control
 * points d3's `curveMonotoneX/Y` emits (see `monotoneCubics`). */
interface Cubic {
    p0: Pt;
    c1: Pt;
    c2: Pt;
    p1: Pt;
}

/** Control points of the Steffen monotone cubic recharts renders for
 * `type="monotone"`, one per input segment. The curve interpolates along the
 * *abscissa* — the category axis for vertical charts (`splineAlongY = false`,
 * X is monotone), or along Y for horizontal charts. For a run of fewer than
 * 3 points recharts falls back to straight lines, so the input is returned
 * as degenerate (linear) segments. */
function monotoneCubics(pts: Pt[], splineAlongY: boolean): Cubic[] {
    const n = pts.length;
    if (n < 3) {
        const out: Cubic[] = [];
        for (let i = 0; i < n - 1; i++) {
            const p0 = pts[i]!;
            const p1 = pts[i + 1]!;
            out.push({
                p0,
                c1: {
                    x: (2 * p0.x + p1.x) / 3,
                    y: (2 * p0.y + p1.y) / 3,
                },
                c2: {
                    x: (p0.x + 2 * p1.x) / 3,
                    y: (p0.y + 2 * p1.y) / 3,
                },
                p1,
            });
        }
        return out;
    }
    /** Monotone abscissa is x when interpolating along X, else y. */
    const uOf = (p: Pt) => (splineAlongY ? p.y : p.x);
    const vOf = (p: Pt) => (splineAlongY ? p.x : p.y);
    const mk = (u: number, v: number): Pt =>
        splineAlongY ? { x: v, y: u } : { x: u, y: v };
    const U = pts.map(uOf);
    const V = pts.map(vOf);
    const sign = (z: number) => (z < 0 ? -1 : 1);
    /** Tangents: Steffen `slope3` for interior points (a harmonic blend of the
     * two secant slopes clamped to the smaller), one-sided `slope2` at each
     * end — matching d3's per-segment behavior exactly. */
    const slope3 = (i: number) => {
        const h0 = U[i]! - U[i - 1]!;
        const h1 = U[i + 1]! - U[i]!;
        const s0 = (V[i]! - V[i - 1]!) / (h0 !== 0 ? h0 : h1 < 0 ? -0 : 0);
        const s1 = (V[i + 1]! - V[i]!) / (h1 !== 0 ? h1 : h0 < 0 ? -0 : 0);
        const p = (s0 * h1 + s1 * h0) / (h0 + h1);
        const m =
            (sign(s0) + sign(s1)) *
            Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p));
        return Number.isFinite(m) ? m : 0;
    };
    const slope2 = (i: number, t: number) => {
        const h = U[i]! - U[i - 1]!;
        return h ? ((3 * (V[i]! - V[i - 1]!)) / h - t) / 2 : t;
    };
    const tangents: number[] = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) tangents[i] = slope3(i);
    if (n >= 3) {
        tangents[0] = slope2(1, tangents[1]!);
        tangents[n - 1] = slope2(n - 1, tangents[n - 2]!);
    }
    const out: Cubic[] = [];
    for (let i = 0; i < n - 1; i++) {
        const x0 = U[i]!;
        const y0 = V[i]!;
        const x1 = U[i + 1]!;
        const y1 = V[i + 1]!;
        const dx = (x1 - x0) / 3;
        out.push({
            p0: mk(x0, y0),
            c1: mk(x0 + dx, y0 + dx * tangents[i]!),
            c2: mk(x1 - dx, y1 - dx * tangents[i + 1]!),
            p1: mk(x1, y1),
        });
    }
    return out;
}

/** Exact crossings of two monotone cubic segments, located by scanning sub-
 * windows of their shared abscissa range and bisecting each sign change.
 * Returns `[]` when the segments do not cross. Both curves are monotone in
 * their abscissa, so a crossing abscissa is a zero of the ordinate gap; the
 * returned points carry the fraction of the plot box in *both* coordinates
 * (`cat` is the abscissa fraction used to place markers, `ord` the ordinate
 * fraction used to recover the value on a shared axis). */
function cubicCrossings(a: Cubic, b: Cubic, splineAlongY: boolean): Pt[] {
    const absc = (p: Pt) => (splineAlongY ? p.y : p.x);
    const ord = (p: Pt) => (splineAlongY ? p.x : p.y);
    const aLo = absc(a.p0);
    const aHi = absc(a.p1);
    const bLo = absc(b.p0);
    const bHi = absc(b.p1);
    const lo = Math.max(aLo, bLo);
    const hi = Math.min(aHi, bHi);
    if (lo > hi) return [];
    /** Abscissa-monotone cubic: bisect the parameter whose abscissa is `t`. */
    const uAt = (seg: Cubic, t: number) => {
        let u0 = 0;
        let u1 = 1;
        for (let i = 0; i < 40; i++) {
            const m = (u0 + u1) / 2;
            const a = absc(cubicPoint(seg.p0, seg.c1, seg.c2, seg.p1, m));
            if (a < t) u0 = m;
            else u1 = m;
        }
        return (u0 + u1) / 2;
    };
    const at = (seg: Cubic, t: number): Pt => {
        const u = uAt(seg, t);
        return cubicPoint(seg.p0, seg.c1, seg.c2, seg.p1, u);
    };
    const gap = (t: number) => ord(at(a, t)) - ord(at(b, t));
    const out: Pt[] = [];
    const SEGS = 8;
    let l = lo;
    let gL = gap(l);
    for (let s = 1; s <= SEGS; s++) {
        const h = lo + ((hi - lo) * s) / SEGS;
        const gH = gap(h);
        if (Math.abs(gL) < 1e-9) {
            out.push(at(a, l));
        } else if (gL * gH < 0) {
            let lo2 = l;
            let hi2 = h;
            let gl2 = gL;
            for (let i = 0; i < 60; i++) {
                const m = (lo2 + hi2) / 2;
                const gm = gap(m);
                if (gl2 * gm <= 0) hi2 = m;
                else {
                    lo2 = m;
                    gl2 = gm;
                }
            }
            out.push(at(a, (lo2 + hi2) / 2));
        }
        l = h;
        gL = gH;
    }
    return out;
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

    // Clear a lingering cross-chart hover lens when this visual actually
    // unmounts. Runs exactly once per mount (empty deps), so the hover
    // update below cannot cascade into the mount/unmount loop the tooltip
    // content's own cleanup caused.
    useEffect(() => {
        return () => {
            if (tooltipHover?.sourceId === visual.id) setTooltipHover(null);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const animate = false;
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

    const { data, series, seriesMeta } = useMemo(() => {
        const built = buildChartData(
            rows,
            visual.axis,
            visual.legend,
            visual.values,
            visual.tooltips,
            visual.maxCategories,
            extra,
            extraColor,
            graph,
        );
        if (visual.type !== 'pareto') return built;
        return buildParetoData(
            built,
            visual.axes?.find((a) => a.lockRange)?.id ?? 'pct',
        );
    }, [
        rows,
        visual.axis,
        visual.legend,
        visual.values,
        visual.tooltips,
        visual.maxCategories,
        extra,
        extraColor,
        graph,
        visual.type,
        visual.axes,
    ]);

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

    /** Per-point icon when the format is an icon style; undefined otherwise. */
    const cfIconFor = (
        row: Record<string, string | number> | undefined,
    ): CFIcon | undefined => {
        if (cf.style !== 'icons' || !row) return undefined;
        const raw = row['_cf'];
        const n =
            typeof raw === 'number' && isFinite(raw)
                ? raw
                : typeof raw === 'string' &&
                    raw.trim() !== '' &&
                    isFinite(Number(raw))
                  ? Number(raw)
                  : null;
        const id = conditionalIcon(cf, n, cfValues);
        if (!id) return undefined;
        return iconById(cf.iconSet, id);
    };

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
    const gridlinesStyle = normalizeGridlinesStyle(visual.gridlines);
    const bars = normalizeBarStyle(visual.bars);
    const dataLabels = normalizeDataLabelStyle(visual.dataLabels);
    const legend = normalizeLegendStyle(visual.legendStyle);
    const plotArea = normalizePlotAreaStyle(visual.plotArea);

    /** Multi-axis system: normalized value axes + series→axis binding. When the
     * visual has no explicit `axes` (legacy) this stays empty so rendering
     * falls back to the classic single `xAxis`/`yAxis` styling. */
    const valueAxes = useMemo(
        () => (visual.axes?.length ? normalizeAxes(visual.axes) : []),
        [visual.axes],
    );
    const axesById = useMemo(
        () => new Map(valueAxes.map((a) => [a.id, a])),
        [valueAxes],
    );
    const metaByKey = useMemo(
        () => new Map(seriesMeta.map((m) => [m.key, m])),
        [seriesMeta],
    );
    /** Resolved axis overrides for a series key. */
    const resolveSeries = (s: string) => {
        const meta = metaByKey.get(s);
        const axisId =
            meta && axesById.has(meta.axisId) ? meta.axisId : valueAxes[0]?.id;
        const axis = axesById.get(axisId) ?? valueAxes[0];
        const type =
            meta?.type ??
            (visual.seriesType === 'line' || visual.seriesType === 'area'
                ? visual.seriesType
                : 'bar');
        return { meta, axis, axisId, type } as const;
    };
    /** Recharts axis id token for binding series to a value axis. */
    const rtAxisId = (id: string) => `axis-${id}`;
    const gridlines = gridlinesStyle;

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

    /** Data labels for the Pareto cumulative-% line, read from the locked pct
     * axis (`AxisDef.lineLabels`). Only the synthetic running `__paretoPct:*`
     * series bind to that axis, so `lineLabels` never styles the bars. */
    const lockedAxis = valueAxes.find((a) => a.lockRange);
    const lineLabels = normalizeDataLabelStyle(lockedAxis?.lineLabels);

    /** Default cumulative-line label style (percent display, since the locked
     * axis plots 0–1 fractions). */
    const lineLabelBaseStyle = fontStyleProps(lineLabels.font, {
        fontSize: visual.fontSize ?? 9,
        color: 'var(--muted-foreground)',
        fontFamily: visual.fontFamily,
    });

    /** Cumulative-line values are 0–1 fractions: `auto` display units mean
     * "show percent", matching the locked axis' own percent ticks. */
    const lineLabelFormatter = (v: number) =>
        formatDisplayUnitValue(
            v,
            lineLabels.displayUnits === 'auto'
                ? 'percent'
                : lineLabels.displayUnits,
            lineLabels.decimals,
            lineLabels.suffix,
        );

    /** Per-series cumulative-line label style, merging the base with any
     * override. Overrides are keyed by the base series name (measure label /
     * legend bucket), matching `buildParetoData`'s `__paretoPct:<key>` keys. */
    const lineLabelStyleFor = (s: string) => {
        const key = s.startsWith('__paretoPct:')
            ? s.slice('__paretoPct:'.length)
            : s;
        const o =
            lineLabels.applyTo === 'perSeries'
                ? lineLabels.seriesStyles?.[key]
                : undefined;
        if (!o) return lineLabelBaseStyle;
        return fontStyleProps(
            {
                ...(lineLabels.font ?? {}),
                ...(o.font ?? {}),
                color: o.color ?? o.font?.color,
            },
            {
                fontSize: o.font?.fontSize ?? visual.fontSize ?? 9,
                color:
                    o.color ||
                    lineLabels.font?.color ||
                    'var(--muted-foreground)',
                fontFamily: o.font?.fontFamily || visual.fontFamily,
            },
        );
    };

    /** Label lines for one cumulative-line point, honoring the content
     * dropdown. The line's value is already a fraction of the total, so
     * `percentOfTotal` shows it as-is. */
    const lineLabelContentLines = (
        row: Record<string, string | number>,
        s: string,
    ): string[] => {
        const v = Number(row[s] ?? 0);
        const val = lineLabelFormatter(v);
        const cat = String(row['category'] ?? '');
        switch (lineLabels.content) {
            case 'category':
                return [cat];
            case 'value':
                return [val];
            case 'percentOfTotal':
                return [val];
            case 'categoryValue':
                return [cat, val];
            case 'categoryPercent':
                return [cat, val];
            case 'valuePercent':
                return [val, val];
            case 'all':
                return [cat, val];
            default:
                return [val];
        }
    };

    /** Shared multi-line <text> block for a data-label content renderer. When
     * `icon` is set it is drawn as the first line, pushing the text lines
     * down so the block stays centered/anchored as a whole. */
    const labelLinesNode = (
        props: {
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
        },
        lines: string[],
        style: {
            fontSize?: number;
            fill?: string;
            fontFamily?: string;
            fontWeight?: number;
            fontStyle?: string;
            textDecoration?: string;
        },
        icon?: CFIcon,
    ) => {
        if (!lines.length && !icon) return null;
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
        const n = lines.length + (icon ? 1 : 0);
        const firstDy =
            anchor.block === 'end'
                ? -(n - 1) * lineHeight
                : anchor.block === 'middle'
                  ? -((n - 1) * lineHeight) / 2
                  : 0;
        return (
            <text
                {...style}
                x={anchor.x}
                y={anchor.y}
                textAnchor={anchor.textAnchor}
            >
                {icon && (
                    <tspan
                        key="cf-icon"
                        x={anchor.x}
                        dy={firstDy}
                        fill={icon.color}
                        stroke="none"
                    >
                        <CfSvgGlyph icon={icon} fontSize={style.fontSize} />
                    </tspan>
                )}
                {lines.map((ln, i) => (
                    <tspan
                        key={i}
                        x={anchor.x}
                        dy={i === 0 && !icon ? firstDy : lineHeight}
                    >
                        {ln}
                    </tspan>
                ))}
            </text>
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
            if (!lines.length && !cfIconFor(row)) return null;
            return labelLinesNode(
                props,
                lines,
                labelStyleFor(s),
                cfIconFor(row),
            );
        };

    /** Recharts LabelList `content` renderer for the Pareto cumulative-% line
     * (`__paretoPct:*` running series), sharing the same multi-line geometry but
     * formatting its 0–1 fraction values as percentages. */
    const renderLineLabelContent =
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
            const lines = lineLabelContentLines(row, s);
            if (!lines.length) return null;
            return labelLinesNode(props, lines, lineLabelStyleFor(s));
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
    const chartBoxRef = useRef<HTMLDivElement>(null);
    const [tip, setTip] = useState<{
        x: number;
        y: number;
        title: string;
        value: string;
    } | null>(null);

    const plotWrap = (chart: React.ReactElement) =>
        wrap(
            <div
                ref={chartBoxRef}
                className="relative h-full w-full"
                style={plotStyle}
            >
                {chart}
                {tip && (
                    <div
                        className="pointer-events-none absolute z-10 max-w-48 rounded px-2 py-1 text-[11px] shadow-lg"
                        style={{
                            ...tooltipStyle,
                            left: tip.x + 12,
                            top: tip.y + 12,
                        }}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-muted-foreground">
                                {tip.title}
                            </span>
                            <span className="font-semibold tabular-nums">
                                {tip.value}
                            </span>
                        </div>
                    </div>
                )}
            </div>,
        );

    /** Point renderer for line/area/combo: clickable dots, dimmed during
     * highlight. When the conditional format is an icon style, the resolved
     * icon replaces the dot. */
    const pointDot = (color: string) => {
        if (!axisCol) return false;
        return ({
            cx,
            cy,
            payload,
        }: {
            cx?: number;
            cy?: number;
            payload?: Record<string, string | number>;
        }) => {
            if (cx == null) return <g />;
            const icon = cfIconFor(payload);
            const dim = matchSet
                ? !matchSet.has(String(payload?.category))
                : false;
            if (icon) {
                return (
                    <g
                        opacity={dim ? 0.25 : 1}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPointClick(payload);
                        }}
                    >
                        <CfSvgIcon
                            icon={icon}
                            size={matchSet ? 14 : 12}
                            x={cx}
                            y={cy ?? 0}
                        />
                    </g>
                );
            }
            return (
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
            );
        };
    };

    const hasValues = visual.values.length > 0;
    /** Mouse handlers that float the analytics tooltip under the cursor.
     * Disabled for static renders (exports) and visuals without value fields. */
    const tipProps = (title: string, value: string) => {
        if (staticRender || !hasValues) return undefined;
        const move = (e: React.MouseEvent<SVGElement, MouseEvent>) => {
            const r = chartBoxRef.current?.getBoundingClientRect();
            if (!r) return;
            setTip({
                x: e.clientX - r.left,
                y: e.clientY - r.top,
                title,
                value,
            });
        };
        return {
            onMouseEnter: move,
            onMouseMove: move,
            onMouseLeave: () => setTip(null),
        };
    };
    /** Same as `tipProps` but for ReferenceDot, whose recharts Dot shape
     * forwards its own render props as the first handler argument and the
     * real DOM event second (`adaptEventHandlers`). */
    const dotTipProps = (title: string, value: string) => {
        if (staticRender || !hasValues) return undefined;
        const move = (
            _props: unknown,
            e: React.MouseEvent<SVGCircleElement>,
        ) => {
            const r = chartBoxRef.current?.getBoundingClientRect();
            if (!r) return;
            setTip({
                x: e.clientX - r.left,
                y: e.clientY - r.top,
                title,
                value,
            });
        };
        return {
            onMouseEnter: move,
            onMouseMove: move,
            onMouseLeave: () => setTip(null),
        };
    };
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

    /**
     * Unified cartesian renderer. When a visual has multiple value axes
     * (`visual.axes.length > 1`) each coordinate system gets its own value
     * axis (X for the horizontal/bar family, Y for the vertical/column one)
     * and every series binds to the axis referenced by its `WellField.axisId`
     * via `seriesMeta`. Mixed `seriesType` values plot as bars, lines or areas
     * side by side on their respective scales.
     */
    const renderCartesian = (
        chartData: Record<string, string | number>[],
        horizontal: boolean,
    ) => {
        /** The line family (line / area / stacked area / combo) draws its
         * series as lines and areas by default and never stacks when a legend
         * field is present (only the bar/column family does). */
        const lineFamily = ['line', 'area', 'stackedArea', 'combo'].includes(
            visual.type,
        );
        const stackedKind =
            visual.type === 'stackedColumn' ||
            visual.type === 'stacked100Column' ||
            visual.type === 'stackedBar' ||
            visual.type === 'stacked100Bar' ||
            visual.type === 'ribbon' ||
            visual.type === 'stackedArea';
        const stacked =
            stackedKind || (!lineFamily && visual.legend.length > 0)
                ? true
                : undefined;
        /** A `trend`/`forecast` analytics line draws a least-squares fit of the
         * primary series, injected here as a synthetic `__trend` column so the
         * series renderers and shared data pipeline don't have to know about it. */
        const fitActive = visual.analytics.some(
            (a) => (a.kind === 'trend' || a.kind === 'forecast') && series[0],
        );
        const fit = fitActive ? leastSquaresFit(chartData, series[0]!) : [];
        const plotData = fitActive
            ? (chartData.map((d, i) => ({
                  ...d,
                  __trend: fit[i]!,
              })) as Record<string, string | number>[])
            : chartData;
        const showIntersections = visual.analytics.some(
            (a) => a.kind === 'intersections',
        );
        const crosshair = visual.analytics.some((a) => a.kind === 'crosshair');
        /** 100 % stacked charts plot each category as a share of its own row
         * total, so their value axis is a fixed 0–100 scale — a wider range
         * (custom min/max or auto-scaling) would leave empty space above the
         * bars. These overrides pin the domain and label the ticks in %. */
        const is100 =
            visual.type === 'stacked100Column' ||
            visual.type === 'stacked100Bar';
        /** Draw style of one series. */
        const typeOfSeries = (s: string, i: number) =>
            (visual.legend.length ? visual.values[0] : visual.values[i])
                ?.seriesType ??
            (metaByKey.get(s)?.running
                ? 'line'
                : visual.type === 'line'
                  ? 'line'
                  : visual.type === 'area' || visual.type === 'stackedArea'
                    ? 'area'
                    : visual.type === 'combo'
                      ? i === 0
                          ? 'bar'
                          : 'line'
                      : 'bar');
        /** Whether any series draws as a bar. A bar switches the category axis
         * to a band scale (line points at band centers, `(i+0.5)/n`) instead
         * of the point scale used by pure line/area charts (points evenly from
         * edge to edge, `i/(n-1)`). */
        const hasBar = series.some((s, i) => typeOfSeries(s, i) === 'bar');
        /** Amber dots and full-height guide lines where two line/area series
         * — or a line/area series and an enabled `constant` (Objectif) line —
         * actually cross. Only series that *draw* as lines/areas qualify, and
         * stacked visuals are skipped (their geometry has no meaningful
         * crossings). Every pair of eligible series is compared regardless of
         * which value axis they sit on: each series is projected onto the plot
         * box in *fraction* coordinates using its own value axis' "nice"
         * domain, then rebuilt as the exact Steffen monotone cubics recharts
         * draws for `type="monotone"`. Each pair of overlapping segments is
         * bisected on their shared abscissa window to the true crossing — so a
         * marker sits exactly where the two rendered curves intersect on
         * screen, even across axes with wildly different scales. The dot
         * (whose y is only comparable on a shared scale) is drawn only when
         * both series share a value axis. The same bisection runs each
         * eligible series against the straight constant line, projected to a
         * fraction on the constant's own axis the same way — the dot lands on
         * the constant line at the category where the curve crosses it.
         *
         * The hidden `xsec`/`ysec` numeric axis maps category fractions back
         * onto the categorical axis (edge-to-edge on a point scale, band
         * centers once a bar is present), so each marker's coordinate is the
         * inverse of the fraction the crossing was found at. */
        /** Single source of truth for a value axis' effective range: the same
         * numbers the intersection math assumes. 100 % charts pin `[0,100]`; an
         * explicit min/max (on an `AxisDef` or the legacy `AxisStyle`) pins that
         * side (the other falls back to the data extent); otherwise auto axes
         * use the "nice" extent so plot-fraction coordinates line up with what
         * recharts actually draws. Stacked visuals extend across per-category
         * sums of the bound series, matching how stacked bars/areas stack. */
        const resolvedDomain = (
            keys: string[],
            axis: AxisDef | undefined,
            legacy: AxisStyle | undefined,
        ): [number, number] => {
            if (is100) return [0, 100];
            let lo = Infinity;
            let hi = -Infinity;
            if (stacked) {
                lo = 0;
                hi = 0;
                for (const d of plotData) {
                    let sum = 0;
                    for (const k of keys) {
                        const v = Number(d[k]);
                        if (isFinite(v)) sum += v;
                    }
                    if (sum < lo) lo = sum;
                    if (sum > hi) hi = sum;
                }
            } else {
                for (const k of keys) {
                    for (const d of plotData) {
                        const v = Number(d[k]);
                        if (!isFinite(v)) continue;
                        if (v < lo) lo = v;
                        if (v > hi) hi = v;
                    }
                }
            }
            const min = axis ? axis.min : legacy?.min;
            const max = axis ? axis.max : legacy?.max;
            const auto = axis
                ? axis.auto
                : min === undefined && max === undefined;
            if (!auto && (min !== undefined || max !== undefined))
                return [
                    min !== undefined && Number.isFinite(min)
                        ? min
                        : Number.isFinite(lo)
                          ? lo
                          : 0,
                    max !== undefined && Number.isFinite(max)
                        ? max
                        : Number.isFinite(hi)
                          ? hi
                          : 1,
                ];
            return niceDomain(lo, hi);
        };
        const intersectionDots = (): React.ReactElement[] => {
            const n = plotData.length;
            if (n < 2) return [];
            const fmt = (v: number) => visualFmt(v, visual, visual.values[0]);
            /** Color of the series×series markers — the intersections line's
             * own color when set, else the amber default. */
            const ixColor =
                visual.analytics.find((a) => a.kind === 'intersections')
                    ?.color ?? ANALYTICS_DEFAULT_COLOR.intersections;
            /** Category index → plot fraction along the category axis. */
            const catFrac = (i: number) =>
                hasBar ? (i + 0.5) / n : i / (n - 1);
            /** Effective domain of each value axis — the single source defined
             * once above and passed to the rendered axes themselves. */
            const domains = new Map<string, [number, number]>();
            for (const s of series) {
                const id = resolveSeries(s).axisId;
                if (domains.has(id)) continue;
                const keys = series.filter(
                    (k) => resolveSeries(k).axisId === id,
                );
                domains.set(
                    id,
                    resolvedDomain(
                        keys,
                        id ? axesById.get(id) : undefined,
                        id ? undefined : horizontal ? xAxis : yAxis,
                    ),
                );
            }
            const fracOf = (
                s: string,
                d: [number, number],
                i: number,
            ): Pt | null => {
                const v = Number(plotData[i]![s]);
                if (!isFinite(v)) return null;
                const span = d[1] - d[0] || 1;
                return horizontal
                    ? { x: (v - d[0]) / span, y: catFrac(i) }
                    : { x: catFrac(i), y: (d[1] - v) / span };
            };
            /** Marker coordinate on the hidden category-fraction axis. */
            const markerCoord = (cat: number) =>
                hasBar ? cat * n : cat * (n - 1);
            const eligible: { s: string; i: number; id: string }[] = [];
            series.forEach((s, i) => {
                const t = typeOfSeries(s, i);
                if (t !== 'line' && t !== 'area') return;
                eligible.push({ s, i, id: resolveSeries(s).axisId });
            });
            /** Contiguous runs of non-null points: recharts leaves a gap where
             * a series has no value, so each run is its own spline. */
            const runsOf = (pts: (Pt | null)[]): Pt[][] => {
                const runs: Pt[][] = [];
                let cur: Pt[] = [];
                for (const p of pts) {
                    if (p) cur.push(p);
                    else if (cur.length) {
                        runs.push(cur);
                        cur = [];
                    }
                }
                if (cur.length) runs.push(cur);
                return runs;
            };
            const dots: React.ReactElement[] = [];
            for (let p = 0; p < eligible.length; p++)
                for (let q = p + 1; q < eligible.length; q++) {
                    const A = eligible[p]!;
                    const B = eligible[q]!;
                    const dA = domains.get(A.id) ?? [0, 1];
                    const dB = domains.get(B.id) ?? [0, 1];
                    const rawA = plotData.map((_, i) => fracOf(A.s, dA, i));
                    const rawB = plotData.map((_, i) => fracOf(B.s, dB, i));
                    const seen = new Set<string>();
                    for (const runA of runsOf(rawA))
                        for (const runB of runsOf(rawB)) {
                            const cubicsA = monotoneCubics(runA, horizontal);
                            const cubicsB = monotoneCubics(runB, horizontal);
                            for (let i = 0; i < cubicsA.length; i++)
                                for (let j = 0; j < cubicsB.length; j++) {
                                    const crosses = cubicCrossings(
                                        cubicsA[i]!,
                                        cubicsB[j]!,
                                        horizontal,
                                    );
                                    for (const c of crosses) {
                                        const cat = horizontal ? c.y : c.x;
                                        if (seen.has(cat.toFixed(4))) continue;
                                        seen.add(cat.toFixed(4));
                                        const coord = markerCoord(cat);
                                        const span = horizontal
                                            ? ({
                                                  y: coord,
                                                  yAxisId: 'xsec',
                                              } as const)
                                            : ({
                                                  x: coord,
                                                  xAxisId: 'xsec',
                                              } as const);
                                        const axisBind = multi
                                            ? ({
                                                  [horizontal
                                                      ? 'xAxisId'
                                                      : 'yAxisId']: rtAxisId(
                                                      A.id,
                                                  ),
                                              } as const)
                                            : {};
                                        /** Actual value of each series at the
                                         * crossing. They can differ when the
                                         * series sit on different value axes:
                                         * the crossing is a shared pixel
                                         * position, not a shared value. */
                                        const vA = horizontal
                                            ? dA[0] + c.x * (dA[1] - dA[0])
                                            : dA[1] - c.y * (dA[1] - dA[0]);
                                        const vB = horizontal
                                            ? dB[0] + c.x * (dB[1] - dB[0])
                                            : dB[1] - c.y * (dB[1] - dB[0]);
                                        const tipValue =
                                            A.id === B.id
                                                ? fmt(vA)
                                                : `${metaByKey.get(A.s)?.label ?? A.s}: ${fmt(vA)} • ${metaByKey.get(B.s)?.label ?? B.s}: ${fmt(vB)}`;
                                        if (A.id === B.id) {
                                            dots.push(
                                                <ReferenceDot
                                                    key={`xsec:${A.s}:${B.s}:${i}:${j}`}
                                                    r={3}
                                                    fill={ixColor}
                                                    stroke="var(--card)"
                                                    strokeWidth={1}
                                                    {...span}
                                                    {...(horizontal
                                                        ? { x: vA }
                                                        : { y: vA })}
                                                    {...axisBind}
                                                    {...dotTipProps(
                                                        'Intersection',
                                                        tipValue,
                                                    )}
                                                />,
                                            );
                                        }
                                        dots.push(
                                            <ReferenceLine
                                                key={`xsec-line:${A.s}:${B.s}:${i}:${j}`}
                                                {...span}
                                                stroke={ixColor}
                                                strokeOpacity={0.35}
                                                strokeDasharray="3 3"
                                                strokeWidth={1}
                                                {...axisBind}
                                                {...tipProps(
                                                    'Intersection',
                                                    tipValue,
                                                )}
                                            />,
                                        );
                                    }
                                }
                        }
                }
            /** Crossings between eligible line/area series and the enabled
             * `constant` (Objectif) lines. Same math as the pair loop, but one
             * side is the straight constant line projected onto the plot box
             * from the constant's own value axis — so each marker lands exactly
             * where the curve meets the rendered constant line. The dot is
             * bound to the constant's axis (its value is the constant itself),
             * so it reads correctly even when the crossing series sits on a
             * different axis. */
            for (const cA of visual.analytics) {
                if (cA.kind !== 'constant' || !cA.enabled) continue;
                /** Axis ids this constant applies to (undefined axes = every
                 * value axis / the legacy single axis). */
                const constTargets = cA.axes
                    ? new Set(cA.axes)
                    : new Set(series.map((s) => resolveSeries(s).axisId));
                for (const axisId of constTargets) {
                    const keys = axisId
                        ? series.filter(
                              (s) => resolveSeries(s).axisId === axisId,
                          )
                        : series;
                    if (!keys.length) continue;
                    const d = domains.get(axisId) ?? [0, 1];
                    let max = 0;
                    for (const k of keys)
                        for (const row of plotData) {
                            const v = Number(row[k]);
                            if (isFinite(v) && v > max) max = v;
                        }
                    const constVal =
                        cA.axisValues?.[axisId] ?? cA.value ?? max * 0.8;
                    if (!isFinite(constVal)) continue;
                    const spanD = d[1] - d[0] || 1;
                    const frac = horizontal
                        ? (constVal - d[0]) / spanD
                        : (d[1] - constVal) / spanD;
                    if (frac < 0 || frac > 1) continue;
                    const constCubics = monotoneCubics(
                        horizontal
                            ? [
                                  { x: frac, y: 0 },
                                  { x: frac, y: 1 },
                              ]
                            : [
                                  { x: 0, y: frac },
                                  { x: 1, y: frac },
                              ],
                        horizontal,
                    );
                    if (!constCubics.length) continue;
                    const constSeen = new Set<string>();
                    for (const s of eligible) {
                        const sd = domains.get(s.id) ?? [0, 1];
                        const raw = plotData.map((_, i) => fracOf(s.s, sd, i));
                        for (const run of runsOf(raw)) {
                            const cubics = monotoneCubics(run, horizontal);
                            for (const cubic of cubics) {
                                const crosses = cubicCrossings(
                                    cubic,
                                    constCubics[0]!,
                                    horizontal,
                                );
                                for (const c of crosses) {
                                    const cat = horizontal ? c.y : c.x;
                                    if (constSeen.has(cat.toFixed(4))) continue;
                                    constSeen.add(cat.toFixed(4));
                                    const coord = markerCoord(cat);
                                    const span = horizontal
                                        ? ({
                                              y: coord,
                                              yAxisId: 'xsec',
                                          } as const)
                                        : ({
                                              x: coord,
                                              xAxisId: 'xsec',
                                          } as const);
                                    const axisBind = multi
                                        ? ({
                                              [horizontal
                                                  ? 'xAxisId'
                                                  : 'yAxisId']:
                                                  rtAxisId(axisId),
                                          } as const)
                                        : {};
                                    dots.push(
                                        <ReferenceDot
                                            key={`xsec:const:${constVal}:${axisId}:${s.s}:${cat.toFixed(4)}`}
                                            r={3}
                                            fill={ixColor}
                                            stroke="var(--card)"
                                            strokeWidth={1}
                                            {...span}
                                            {...(horizontal
                                                ? { x: constVal }
                                                : { y: constVal })}
                                            {...axisBind}
                                            {...dotTipProps(
                                                'Intersection',
                                                fmt(constVal),
                                            )}
                                        />,
                                        <ReferenceLine
                                            key={`xsec-line:const:${constVal}:${axisId}:${s.s}:${cat.toFixed(4)}`}
                                            {...span}
                                            stroke={ixColor}
                                            strokeOpacity={0.35}
                                            strokeDasharray="3 3"
                                            strokeWidth={1}
                                            {...axisBind}
                                            {...tipProps(
                                                'Intersection',
                                                fmt(constVal),
                                            )}
                                        />,
                                    );
                                }
                            }
                        }
                    }
                }
            }
            return dots;
        };
        const gridH = horizontal ? gridlines.vertical : gridlines.horizontal;
        const gridV = horizontal ? gridlines.horizontal : gridlines.vertical;
        const multi = valueAxes.length > 1;
        const primary = valueAxes[0];
        const pctTick = (v: number) =>
            `${Number.isInteger(v) ? v : v.toFixed(1)} %`;
        const valueAxisOverrides = is100
            ? {
                  domain: [0, 100] as [number, number],
                  tickFormatter: pctTick,
              }
            : {};
        /** Tick-lane size for a value axis: sized to the widest tick label when
         * labels are shown (so the title hugs them), otherwise a thin lane so a
         * line/title axis adds no dead band. */
        const axisLane = (axis: AxisDef) => {
            if (!axis.showLabels)
                return (
                    (axis.showLine || axis.showTitle ? 8 : 0) + (axis.gap ?? 0)
                );
            const keys = series.filter(
                (s) => resolveSeries(s).axisId === axis.id,
            );
            return (
                estimateValueAxisWidth(
                    plotData,
                    keys,
                    (v) =>
                        formatAxisDefTick(v, {
                            displayUnits: axis.displayUnits,
                            numberFormat: axis.numberFormat,
                            decimals: axis.decimals,
                            suffix: axis.suffix,
                        }),
                    visual.fontSize ?? 10,
                ) + (axis.gap ?? 0)
            );
        };
        /** Lane for the single-value-axis (legacy) path, sized to the widest
         * tick label across all series. */
        const fallbackLane = (style: AxisStyle) =>
            estimateValueAxisWidth(
                plotData,
                series,
                (v) =>
                    formatDisplayUnitValue(
                        v,
                        style.displayUnits,
                        style.decimals,
                        style.suffix,
                    ),
                visual.fontSize ?? 10,
            ) + (style.gap ?? 0);
        /** Empty-space fill for a stacked bar's track. Only applied on stacked
         * charts. Multi-axis visuals read it from the series' own value axis;
         * legacy ones from the style of the value axis (X for horizontal bars,
         * Y for vertical columns). */
        const emptyFill = (s: string): string | undefined =>
            stacked
                ? (resolveSeries(s).axis?.emptyColor ??
                  (horizontal ? xAxis : yAxis).emptyColor ??
                  STACKED_EMPTY_FILL)
                : undefined;
        /** Series keys plotted on a given value axis. */
        const boundKeys = (axis: AxisDef) =>
            series.filter((s) => resolveSeries(s).axisId === axis.id);
        /** Full-plot track behind stacked AREAS. Recharts `Area` has no
         * per-series `background` like `Bar`, so we paint a `ReferenceArea`
         * band (not a series → absent from legend & tooltip) that spans the
         * whole category axis and the value axis' domain 0→top. */
        const emptyBands = (): React.ReactElement[] | null => {
            if (visual.type !== 'stackedArea' || !stacked) return null;
            const cats = plotData.map((d) => String(d['category'] ?? ''));
            if (!cats.length) return null;
            const legacyStyle = horizontal ? xAxis : yAxis;
            /** Top of the plotted domain, so the band exactly matches the
             * rendered value axis' range. */
            const topFor = (axis: AxisDef | undefined, keys: string[]) =>
                resolvedDomain(keys, axis, legacyStyle)[1];
            const bottomFor = (axis: AxisDef | undefined) => {
                if (axis && !axis.auto && axis.min !== undefined)
                    return axis.min;
                if (!axis && legacyStyle.min !== undefined)
                    return legacyStyle.min;
                return 0;
            };
            const colorOf = (axis: AxisDef | undefined) =>
                axis?.emptyColor ??
                legacyStyle.emptyColor ??
                STACKED_EMPTY_FILL;
            const bands: React.ReactElement[] = [];
            const push = (
                axis: AxisDef | undefined,
                idToken: boolean,
                keys: string[],
            ) => {
                if (!keys.length) return;
                bands.push(
                    <ReferenceArea
                        key={`empty-fill:${axis?.id ?? 'legacy'}`}
                        x1={cats[0]}
                        x2={cats[cats.length - 1]}
                        y1={bottomFor(axis)}
                        y2={topFor(axis, keys)}
                        fill={colorOf(axis)}
                        stroke="none"
                        ifOverflow="extendDomain"
                        {...(horizontal
                            ? {
                                  xAxisId: idToken
                                      ? rtAxisId(axis!.id)
                                      : undefined,
                              }
                            : {
                                  yAxisId: idToken
                                      ? rtAxisId(axis!.id)
                                      : undefined,
                              })}
                    />,
                );
            };
            if (valueAxes.length > 1)
                for (const axis of valueAxes) push(axis, true, boundKeys(axis));
            else if (valueAxes.length === 1) push(valueAxes[0], false, series);
            else push(undefined, false, series);
            return bands;
        };
        const valueElement = (axis: AxisDef): React.ReactElement =>
            horizontal ? (
                <XAxis
                    key={`axis:${axis.id}`}
                    type="number"
                    xAxisId={rtAxisId(axis.id)}
                    height={axisLane(axis)}
                    {...axisDefProps(axis, visual, false)}
                    {...valueAxisOverrides}
                    domain={resolvedDomain(boundKeys(axis), axis, undefined)}
                />
            ) : (
                <YAxis
                    key={`axis:${axis.id}`}
                    yAxisId={rtAxisId(axis.id)}
                    width={axisLane(axis)}
                    {...axisDefProps(axis, visual, true, axisLane(axis))}
                    {...valueAxisOverrides}
                    domain={resolvedDomain(boundKeys(axis), axis, undefined)}
                />
            );
        const hasTitleAt = (pos: string) =>
            valueAxes.some((a) => a.position === pos && a.showTitle && a.title);
        /** Bottom/top axis titles are stacked under the lane and recharts anchors
         * them at the SVG edge minus the margin, so the margin must fit the title
         * glyphs (their font size) on top of the tick lane. Side (rotated) titles
         * only need `AXIS_TITLE_RESERVE`. */
        const titleLine = (font: { fontSize?: number } | undefined) =>
            (font?.fontSize ?? 11) + AXIS_TITLE_GAP + 2;
        const titlePadY =
            !horizontal && !multi && yAxis.title ? AXIS_TITLE_RESERVE : 0;
        const titlePadX =
            (!horizontal || !multi) && xAxis.title
                ? titleLine(xAxis.titleFont)
                : 0;
        const multiTitleLeft = multi && !horizontal && hasTitleAt('left');
        const multiTitleRight = multi && !horizontal && hasTitleAt('right');
        const multiTitleBottom = multi && horizontal && hasTitleAt('bottom');
        const multiTitleTop = multi && horizontal && hasTitleAt('top');
        const margin = {
            top: 8 + (multiTitleTop ? titleLine(undefined) : 0),
            right: (multiTitleRight ? AXIS_TITLE_RESERVE : 0) + 8,
            left:
                (horizontal && yAxis.title ? AXIS_TITLE_RESERVE : 0) +
                titlePadY +
                (multiTitleLeft ? AXIS_TITLE_RESERVE : 0),
            bottom: titlePadX + (multiTitleBottom ? titleLine(undefined) : 0),
        };
        const gridRef = multi
            ? {
                  [horizontal ? 'xAxisId' : 'yAxisId']: rtAxisId(
                      (valueAxes.find((a) => a.showGridlines) ?? valueAxes[0])
                          ?.id ?? 'y0',
                  ),
              }
            : {};
        return (
            <ComposedChart
                data={plotData}
                margin={margin}
                {...(horizontal ? { layout: 'vertical' as const } : {})}
            >
                <CartesianGrid
                    stroke={gridlines.color}
                    horizontal={gridH}
                    vertical={gridV}
                    strokeDasharray={GRIDLINE_DASH[gridlines.style]}
                    {...gridRef}
                />
                {emptyBands()}
                {horizontal ? (
                    <YAxis
                        type="category"
                        dataKey="category"
                        width={CATEGORY_AXIS_WIDTH + (yAxis.gap ?? 0)}
                        {...categoryAxisProps(
                            yAxis,
                            visual,
                            true,
                            CATEGORY_AXIS_WIDTH,
                        )}
                    />
                ) : (
                    <XAxis
                        dataKey="category"
                        height={
                            estimateCategoryAxisLane(visual.fontSize ?? 10) +
                            (xAxis.gap ?? 0)
                        }
                        {...categoryAxisProps(xAxis, visual, false)}
                    />
                )}
                {showIntersections &&
                    !stacked &&
                    plotData.length > 0 &&
                    (horizontal ? (
                        <YAxis
                            yAxisId="xsec"
                            type="number"
                            domain={[
                                0,
                                hasBar ? plotData.length : plotData.length - 1,
                            ]}
                            hide
                            width={0}
                        />
                    ) : (
                        <XAxis
                            xAxisId="xsec"
                            type="number"
                            domain={[
                                0,
                                hasBar ? plotData.length : plotData.length - 1,
                            ]}
                            hide
                            height={0}
                        />
                    ))}
                {multi ? (
                    valueAxes.map(valueElement)
                ) : horizontal ? (
                    <XAxis
                        type="number"
                        height={
                            primary ? axisLane(primary) : fallbackLane(xAxis)
                        }
                        {...(primary
                            ? axisDefProps(
                                  primary,
                                  visual,
                                  false,
                                  axisLane(primary),
                              )
                            : valueAxisProps(xAxis, visual, false))}
                        {...valueAxisOverrides}
                        domain={resolvedDomain(
                            primary ? boundKeys(primary) : series,
                            primary,
                            primary ? undefined : xAxis,
                        )}
                    />
                ) : (
                    <YAxis
                        width={
                            primary ? axisLane(primary) : fallbackLane(yAxis)
                        }
                        {...(primary
                            ? axisDefProps(
                                  primary,
                                  visual,
                                  true,
                                  axisLane(primary),
                              )
                            : valueAxisProps(yAxis, visual, true))}
                        {...valueAxisOverrides}
                        domain={resolvedDomain(
                            primary ? boundKeys(primary) : series,
                            primary,
                            primary ? undefined : yAxis,
                        )}
                    />
                )}
                <Tooltip
                    content={chartTooltip(visual)}
                    isAnimationActive={false}
                    cursor={
                        crosshair
                            ? {
                                  stroke:
                                      visual.analytics.find(
                                          (a) => a.kind === 'crosshair',
                                      )?.color ??
                                      ANALYTICS_DEFAULT_COLOR.crosshair,
                                  strokeWidth: 1,
                                  strokeDasharray: '3 3',
                              }
                            : undefined
                    }
                />
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
                {series.map((s, i) => {
                    const { axisId, axis } = resolveSeries(s);
                    const ref = multi
                        ? ({
                              [horizontal ? 'xAxisId' : 'yAxisId']:
                                  rtAxisId(axisId),
                          } as const)
                        : {};
                    /** Effective draw style for this slot: an explicit per-
                     * value-field choice (series picker) wins, then a running/
                     * Pareto cumulative series draws as a line, then the visual
                     * type's own default (line charts draw lines, areas draw
                     * areas, combo draws a bar then lines). */
                    const field = visual.legend.length
                        ? visual.values[0]
                        : visual.values[i];
                    const type =
                        field?.seriesType ??
                        (metaByKey.get(s)?.running
                            ? 'line'
                            : visual.type === 'line'
                              ? 'line'
                              : visual.type === 'area' ||
                                  visual.type === 'stackedArea'
                                ? 'area'
                                : visual.type === 'combo'
                                  ? i === 0
                                      ? 'bar'
                                      : 'line'
                                  : 'bar');
                    const color = seriesBaseFill(i);
                    const lineColor = axis?.lineColor || color;
                    if (type === 'line')
                        return (
                            <Line
                                key={s}
                                type="monotone"
                                dataKey={s}
                                name={metaByKey.get(s)?.label ?? s}
                                stroke={lineColor}
                                strokeWidth={2}
                                dot={pointDot(lineColor)}
                                isAnimationActive={animate}
                                {...ref}
                            >
                                {metaByKey.get(s)?.running &&
                                    lineLabels.show && (
                                        <LabelList
                                            position={labelPosition(
                                                lineLabels.position,
                                                horizontal,
                                            )}
                                            content={renderLineLabelContent(
                                                plotData,
                                                s,
                                            )}
                                            style={lineLabelStyleFor(s)}
                                        />
                                    )}
                            </Line>
                        );
                    if (type === 'area')
                        return (
                            <Area
                                key={s}
                                type="monotone"
                                dataKey={s}
                                name={metaByKey.get(s)?.label ?? s}
                                stroke={color}
                                fill={color}
                                fillOpacity={0.25}
                                {...(stacked ? { stackId: 's' } : {})}
                                isAnimationActive={animate}
                                {...ref}
                            />
                        );
                    return (
                        <Bar
                            key={s}
                            dataKey={s}
                            name={metaByKey.get(s)?.label ?? s}
                            {...(stacked ? { stackId: 'a' } : {})}
                            fill={color}
                            radius={barRadius}
                            isAnimationActive={animate}
                            onClick={onPointClick}
                            {...(emptyFill(s)
                                ? { background: { fill: emptyFill(s) } }
                                : {})}
                            {...ref}
                        >
                            {plotData.map((d, idx) => (
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
                                        horizontal,
                                    )}
                                    content={renderLabelContent(plotData, s)}
                                    style={labelStyleFor(s)}
                                />
                            )}
                        </Bar>
                    );
                })}
                {analyticsLines(
                    visual,
                    plotData,
                    series,
                    horizontal,
                    animate,
                    multi
                        ? {
                              [horizontal ? 'xAxisId' : 'yAxisId']: rtAxisId(
                                  series[0]
                                      ? resolveSeries(series[0]).axisId
                                      : 'y0',
                              ),
                          }
                        : {},
                    multi
                        ? valueAxes
                              .map((axis) => ({
                                  id: axis.id,
                                  token: rtAxisId(axis.id),
                                  keys: boundKeys(axis),
                              }))
                              .filter((g) => g.keys.length)
                        : [{ id: 'y0', token: undefined, keys: series }],
                    tipProps,
                )}
                {showIntersections && !stacked && intersectionDots()}
            </ComposedChart>
        );
    };

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
                    className="scrollbar-none h-full w-full overflow-auto p-2"
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
        case 'clock':
            return <ClockVisual visual={visual} />;
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

    /** Props recharts passes to a LabelList `content` renderer (loosely typed:
     * `viewBox` is a cartesian or polar geometry). */
    type CfLabelProps = {
        index?: number;
        value?: number | string;
        position?: string | { x?: number; y?: number };
        offset?: number;
        viewBox?: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            cx?: number;
            cy?: number;
            innerRadius?: number;
            outerRadius?: number;
            startAngle?: number;
            endAngle?: number;
            clockWise?: boolean;
        };
    };

    /** Pie/donut slice label: value with the conditional icon prepended. */
    const renderPieLabel = () => (props: CfLabelProps) => {
        const row = props.index != null ? data[props.index] : undefined;
        const icon = cfIconFor(row);
        const vb = props.viewBox;
        if (!vb || vb.cx == null || vb.cy == null) return null;
        const mid = ((vb.startAngle ?? 0) + (vb.endAngle ?? 0)) / 2;
        const r = ((vb.innerRadius ?? 0) + (vb.outerRadius ?? 0)) / 2;
        const rad = (-mid * Math.PI) / 180;
        const x = vb.cx + Math.cos(rad) * r;
        const y = vb.cy + Math.sin(rad) * r;
        const fs = visual.fontSize ?? 9;
        return (
            <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fs}
                fill="var(--foreground)"
                stroke="none"
            >
                {icon && <CfSvgGlyph icon={icon} fontSize={fs * 1.15} />}
                <tspan>
                    {valueFmtFor(
                        Number(props.value ?? 0),
                        visual,
                        visual.values[0],
                    )}
                </tspan>
            </text>
        );
    };

    /** Funnel section label: category with the conditional icon prepended,
     * plus the formatted value beneath it. */
    const renderFunnelLabel = () => (props: CfLabelProps) => {
        const row = props.index != null ? data[props.index] : undefined;
        const icon = cfIconFor(row);
        const key = series[0] ?? 'value';
        const val = row ? Number(row[key]) : Number.NaN;
        const lines = [String(props.value ?? '')];
        if (isFinite(val))
            lines.push(valueFmtFor(val, visual, visual.values[0]));
        if (!icon && !lines[0] && !lines[1]) return null;
        return labelLinesNode(
            props,
            lines,
            { fontSize: 10, fill: 'var(--foreground)' },
            icon,
        );
    };

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
                                        <div className="scrollbar-none max-h-full overflow-auto text-center text-sm">
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
                                    content={renderPieLabel()}
                                    style={{ fontSize: visual.fontSize ?? 9 }}
                                />
                            )}
                        </Pie>
                        <Tooltip
                            content={chartTooltip(visual)}
                            isAnimationActive={false}
                        />
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
                ...(d['_cf'] !== undefined ? { _cf: d['_cf'] } : {}),
                fill:
                    matchSet && !matchSet.has(String(d['category']))
                        ? 'rgba(148,163,184,0.2)'
                        : pointFill(d, PALETTE[i % PALETTE.length]),
            }));
            const renderTreemapTile = (node: {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                name?: string;
                category?: string | number;
                value?: number;
                _cf?: string | number;
                fill?: string;
            }) => {
                const x = node.x ?? 0;
                const y = node.y ?? 0;
                const width = node.width ?? 0;
                const height = node.height ?? 0;
                const icon = cfIconFor(node);
                const fs = visual.fontSize ?? 9;
                return (
                    <g>
                        <rect
                            x={x}
                            y={y}
                            width={width}
                            height={height}
                            fill={node.fill ?? 'var(--chart-1)'}
                            stroke="var(--card)"
                        />
                        {width > 40 && height > 18 && (
                            <text
                                x={x + 4}
                                y={y + fs}
                                fontSize={fs}
                                fill="var(--card)"
                                stroke="none"
                            >
                                {icon && (
                                    <CfSvgGlyph
                                        icon={icon}
                                        fontSize={fs * 1.15}
                                    />
                                )}
                                <tspan>
                                    {String(node.name ?? node.category ?? '')}
                                </tspan>
                            </text>
                        )}
                        {width > 60 && height > 30 && node.value != null && (
                            <text
                                x={x + 4}
                                y={y + fs * 2.2}
                                fontSize={fs * 0.9}
                                fill="var(--card)"
                                stroke="none"
                                opacity={0.85}
                            >
                                {valueFmtFor(
                                    Number(node.value) || 0,
                                    visual,
                                    visual.values[0],
                                )}
                            </text>
                        )}
                    </g>
                );
            };
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={tm}
                        dataKey="size"
                        nameKey="name"
                        stroke="var(--card)"
                        content={
                            renderTreemapTile as unknown as React.ReactElement
                        }
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
                        <Tooltip
                            content={chartTooltip(visual)}
                            isAnimationActive={false}
                        />
                    </Treemap>
                </ResponsiveContainer>,
            );
        }
        case 'funnel':
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                        <Tooltip
                            content={chartTooltip(visual)}
                            isAnimationActive={false}
                        />
                        <Funnel
                            dataKey={series[0] ?? 'value'}
                            data={data}
                            isAnimationActive={animate}
                            onClick={onPointClick}
                        >
                            <LabelList
                                position="right"
                                dataKey="category"
                                content={renderFunnelLabel()}
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
            const renderWaterfallIcon = () => (props: CfLabelProps) => {
                const row =
                    props.index != null ? wdata[props.index] : undefined;
                const icon = cfIconFor(row);
                if (!icon) return null;
                return labelLinesNode(
                    props,
                    [],
                    { fontSize: 10, fill: 'var(--foreground)' },
                    icon,
                );
            };
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
                            tickFormatter={valueTickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        <Tooltip
                            content={chartTooltip(visual)}
                            isAnimationActive={false}
                        />
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
                            {cf.style === 'icons' && labelsShown && (
                                <LabelList
                                    content={renderWaterfallIcon()}
                                    style={{ fontSize: 10 }}
                                />
                            )}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>,
            );
        }
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
                      ...(p.raw['_cf'] != null
                          ? { _cf: p.raw['_cf'] as string | number }
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
            const renderScatterShape = (point: {
                cx?: number;
                cy?: number;
                payload?: Record<string, string | number>;
            }) => {
                if (point.cx == null) return <g />;
                const icon = cfIconFor(point.payload);
                const dim =
                    matchSet && !matchSet.has(String(point.payload?.category));
                if (icon) {
                    return (
                        <g opacity={dim ? 0.25 : 1}>
                            <CfSvgIcon
                                icon={icon}
                                size={18}
                                x={point.cx}
                                y={point.cy ?? 0}
                            />
                        </g>
                    );
                }
                return (
                    <circle
                        cx={point.cx}
                        cy={point.cy ?? 0}
                        r={4}
                        fill={
                            dim
                                ? 'rgba(148,163,184,0.25)'
                                : (seriesColor ?? 'var(--chart-1)')
                        }
                    />
                );
            };
            return wrap(
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid stroke="var(--border)" />
                        <XAxis
                            dataKey={scXKey}
                            type="number"
                            tickFormatter={valueTickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        <YAxis
                            dataKey={scYKey}
                            type="number"
                            tickFormatter={valueTickFmt(visual)}
                            {...axisPropsFor(visual)}
                        />
                        {visual.type === 'bubble' && (
                            <ZAxis dataKey={scZKey} range={[40, 500]} />
                        )}
                        <Tooltip
                            content={chartTooltip(visual)}
                            isAnimationActive={false}
                        />
                        <Scatter
                            data={scData}
                            fill={seriesColor ?? 'var(--chart-1)'}
                            isAnimationActive={animate}
                            onClick={onPointClick}
                            shape={renderScatterShape}
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
            return plotWrap(
                <ResponsiveContainer width="100%" height="100%">
                    {renderCartesian(bdata, true)}
                </ResponsiveContainer>,
            );
        }
        case 'table':
        case 'matrix':
            return <TableVisual visual={visual} rows={rows} match={match} />;
        case 'pareto':
            return plotWrap(
                <ResponsiveContainer width="100%" height="100%">
                    {renderCartesian(data, false)}
                </ResponsiveContainer>,
            );
        default: {
            // column, stackedColumn, stacked100Column, ribbon, line, area,
            // stackedArea, combo (all vertical cartesian layouts)
            const cdata =
                visual.type === 'stacked100Column'
                    ? normalize(data, series)
                    : data;
            return plotWrap(
                <ResponsiveContainer width="100%" height="100%">
                    {renderCartesian(cdata, false)}
                </ResponsiveContainer>,
            );
        }
    }
}
