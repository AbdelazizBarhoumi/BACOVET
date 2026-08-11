import { useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import {
    aggregate,
    buildChartData,
    fieldLabel,
    measureLabel,
    type Row,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { EmptyVisual, axisPropsFor, chartTooltip, tickFmt, visualFmt } from './shared';

export function SmartNarrative({
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
            <EmptyVisual label="Récit intelligent — ajoutez une catégorie et une mesure" />
        );
    const sorted = [...data].sort((a, b) => Number(b[key]) - Number(a[key]));
    const top = sorted[0]!;
    const bottom = sorted[sorted.length - 1]!;
    const total = data.reduce((t, d) => t + Number(d[key]), 0);
    return (
        <div className="h-full overflow-auto p-2 text-[11px] leading-relaxed text-foreground">
            <p>
                <strong>{key}</strong> totalise{' '}
                <strong>{visualFmt(total, visual, visual.values[0])}</strong>{' '}
                sur {data.length}{' '}
                {visual.axis[0] ? fieldLabel(visual.axis[0]) : 'catégories'} et{' '}
                {rows.length.toLocaleString()} lignes dans le contexte de filtre
                actuel.
            </p>
            <p className="mt-2">
                <strong>{top['category']}</strong> a enregistré la valeur la
                plus élevée, soit{' '}
                {visualFmt(Number(top[key]), visual, visual.values[0])} (
                {((Number(top[key]) / (total || 1)) * 100).toFixed(1)}% du
                total), tandis que <strong>{bottom['category']}</strong> a été
                la plus faible à{' '}
                {visualFmt(Number(bottom[key]), visual, visual.values[0])}.
            </p>
            <p className="mt-2 text-muted-foreground">
                Le résumé se met à jour automatiquement lorsque les filtres
                changent.
            </p>
        </div>
    );
}

export function KeyInfluencers({ visual, rows }: { visual: Visual; rows: Row[] }) {
    const dim = visual.axis[0]?.name;
    const measure = visual.values[0];
    if (!dim || !measure)
        return (
            <EmptyVisual label="Facteurs principaux — ajoutez un champ et une mesure" />
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
                Quels facteurs influencent{' '}
                <strong>{measureLabel(measure)}</strong> à la hausse ?
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

export function DecompositionTree({ visual, rows }: { visual: Visual; rows: Row[] }) {
    const [path, setPath] = useState<{ col: string; val: string }[]>([]);
    const measure = visual.values[0];
    const levels = (
        visual.drillFields.length ? visual.drillFields : visual.axis
    ).map((f) => f.name);
    if (!measure || !levels.length)
        return (
            <EmptyVisual label="Arbre de décomposition — ajoutez des champs d'explication et une mesure" />
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

export function QnaVisual({ visual, rows }: { visual: Visual; rows: Row[] }) {
    const { graph } = usePbi();
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
            : textKey
              ? [{ table: '', name: textKey, agg: 'count' }]
              : [],
        [],
        undefined,
        undefined,
        undefined,
        graph,
    );
    return (
        <div className="flex h-full flex-col gap-1">
            <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Posez une question sur vos données"
                className="rounded border border-border bg-background px-2 py-1 text-[11px] placeholder:text-muted-foreground/50"
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

export function ScriptVisual({
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

export function MapVisual({
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
    if (!key)
        return (
            <EmptyVisual label="Carte — ajoutez un emplacement et une mesure" />
        );
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