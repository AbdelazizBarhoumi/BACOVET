import { X, Download, Award, Info } from 'lucide-react';
import { useEffect, useRef } from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
} from 'recharts';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import type { ProductionKpis } from '@/services/productionApi';
import type { BreakdownData, BreakdownRow } from '../../types/production';
import {
    PRODUCTION_KPI_DETAIL_CONFIG,
    type ProductionKpiKey,
} from './productionKpiDetailConfig';


interface ProductionKpiDetailModalProps {
    kpiKey: ProductionKpiKey | null;
    kpiData: ProductionKpis | null;
    breakdownData?: BreakdownData | null;
    onClose: () => void;
}

function statusColor(status: string) {
    switch (status) {
        case 'green':
            return 'text-green-600';
        case 'orange':
            return 'text-orange-500';
        case 'red':
            return 'text-red-600';
        default:
            return 'text-gray-400';
    }
}

function statusBorder(status: string) {
    switch (status) {
        case 'green':
            return 'border-l-green-500';
        case 'orange':
            return 'border-l-orange-400';
        case 'red':
            return 'border-l-red-500';
        default:
            return 'border-l-gray-400';
    }
}

function statusDot(status: string) {
    switch (status) {
        case 'green':
            return 'bg-green-500';
        case 'orange':
            return 'bg-orange-400';
        case 'red':
            return 'bg-red-500';
        default:
            return 'bg-gray-400';
    }
}

function formatValue(
    value: number | string | null | undefined,
    unit: string,
): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') return `${value.toFixed(1)}${unit}`;
    return `${value}${unit}`;
}

// ─── Mini Visualizations ───────────────────────────────────────────────────

function GaugeViz({
    value,
    status,
    max = 100,
}: {
    value: number;
    status: string;
    max?: number;
}) {
    const pct = Math.min(100, Math.max(0, (value / max) * 100));
    const angle = (pct / 100) * 180;
    const color =
        status === 'green'
            ? 'var(--success)'
            : status === 'orange'
              ? 'var(--warning)'
              : 'var(--destructive)';

    return (
        <div className="flex justify-center">
            <svg viewBox="0 0 200 110" className="h-20 w-32">
                <path
                    d="M10,100 A90,90 0 0,1 190,100"
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth="14"
                    strokeLinecap="round"
                />
                <path
                    d="M10,100 A90,90 0 0,1 190,100"
                    fill="none"
                    stroke={color}
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={`${(angle / 180) * 283} 283`}
                />
                <text
                    x="100"
                    y="92"
                    textAnchor="middle"
                    className="font-mono font-bold"
                    fontSize="26"
                    fill="currentColor"
                >
                    {value.toFixed(0)}%
                </text>
            </svg>
        </div>
    );
}

function SparklineViz({ data, status }: { data: BreakdownRow[]; status: string }) {
    if (!data || data.length < 2)
        return (
            <div className="flex h-10 items-center justify-center text-[10px] text-muted-foreground">
                Pas assez de données
            </div>
        );
    const values = data.map((d) => (typeof d.value === 'number' ? d.value : 0));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const w = 120;
    const h = 40;
    const pad = 2;
    const color =
        status === 'green'
            ? '#16a34a'
            : status === 'orange'
              ? '#ea580c'
              : '#dc2626';

    const points = values
        .map((v, i) => {
            const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
            const y = h - pad - ((v - min) / range) * (h - 2 * pad);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <div className="flex justify-center">
            <svg width={w} height={h}>
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}

function DonutViz({ value, status }: { value: number; status: string }) {
    const data = [
        { name: 'Done', value: value },
        { name: 'Remaining', value: Math.max(0, 100 - value) },
    ];
    const color =
        status === 'green'
            ? 'var(--success)'
            : status === 'orange'
              ? 'var(--warning)'
              : 'var(--destructive)';

    return (
        <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        innerRadius={30}
                        outerRadius={45}
                        paddingAngle={2}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                    >
                        <Cell fill={color} />
                        <Cell fill="var(--muted-foreground)" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

function TimelineViz({ data, status }: { data: BreakdownRow[]; status: string }) {
    if (!data || data.length === 0)
        return (
            <div className="flex h-10 items-center justify-center text-[10px] text-muted-foreground">
                Pas assez de données
            </div>
        );
    const color =
        status === 'green'
            ? '#16a34a'
            : status === 'orange'
              ? '#ea580c'
              : '#dc2626';

    const chartData = data.map((d) => ({
        name: `${d.chaine} — ${d.motif}`,
        minutes: Number(d.minutes_perdues ?? (d.duration != null ? Number(d.duration) * 60 : 0)),
    }));

    return (
        <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ left: -20, right: 10, top: 0, bottom: 0 }}
                >
                    <XAxis
                        dataKey="name"
                        type="category"
                        fontSize={8}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={40}
                    />
                    <YAxis fontSize={8} tickLine={false} axisLine={false} />
                    <Bar
                        dataKey="minutes"
                        fill={color}
                        radius={[2, 2, 0, 0]}
                        barSize={14}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function HorizontalBarViz({ data }: { data: BreakdownRow[] }) {
    if (!data || data.length === 0) return null;
    const topData = data.slice(0, 5).map((d) => ({
        name: d.employe || d.chaine || d.of,
        value: d.efficience_pct || d.value,
    }));

    return (
        <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={topData}
                    layout="vertical"
                    margin={{ left: -20, right: 10, top: 0, bottom: 0 }}
                >
                    <XAxis type="number" hide />
                    <YAxis
                        dataKey="name"
                        type="category"
                        width={60}
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Bar
                        dataKey="value"
                        fill="var(--primary)"
                        radius={[0, 2, 2, 0]}
                        barSize={12}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

// ─── Breakdown Tables ──────────────────────────────────────────────────────

function BreakdownTable({
    type,
    rows,
    target: _target,
}: {
    type: string;
    rows: BreakdownRow[];
    target: number | string;
}) {
    if (!rows || rows.length === 0)
        return (
            <div className="text-xs text-muted-foreground italic">
                Aucune donnée de ventilation disponible.
            </div>
        );

    switch (type) {
        case 'per_chain': {
            const sorted = [...rows]
                .sort((a, b) => Number(a.value ?? 0) - Number(b.value ?? 0))
                .slice(0, 10);
            return (
                <table className="w-full font-mono text-xs">
                    <thead>
                        <tr className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase">
                            <th className="py-1 text-left">Chaîne</th>
                            <th className="text-right">Valeur</th>
                            <th className="w-16 text-center">Statut</th>
                            <th className="text-right">Écart</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((item, i) => (
                            <tr key={i} className="border-b border-border/50">
                                <td className="py-1.5 font-bold">
                                    {String(item.chaine)}
                                </td>
                                <td className="text-right tabular-nums">
                                    {formatValue(Number(item.value), '%')}
                                </td>
                                <td className="text-center">
                                    <span
                                        className={`inline-block h-2 w-2 rounded-full ${statusDot(String(item.status))}`}
                                    />
                                </td>
                                <td
                                    className={`text-right ${Number(item.ecart) < 0 ? 'text-red-600' : 'text-green-600'}`}
                                >
                                    {Number(item.ecart) > 0
                                        ? `+${item.ecart}`
                                        : item.ecart}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
        case 'per_operator': {
            const sorted = [...rows]
                .sort((a, b) => (Number(b.value ?? 0) - Number(a.value ?? 0)))
                .slice(0, 15);
            return (
                <table className="w-full font-mono text-xs">
                    <thead>
                        <tr className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase">
                            <th className="py-1 text-left">Opérateur</th>
                            <th className="text-left">Chaîne</th>
                            <th className="text-right">Valeur</th>
                            <th className="w-10 text-center">Rang</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((item, i) => (
                            <tr key={i} className="border-b border-border/50">
                                <td className="flex items-center gap-1.5 py-1.5 font-bold">
                                    {i === 0 && (
                                        <Award className="h-3 w-3 text-yellow-500" />
                                    )}
                                    {i === 1 && (
                                        <Award className="h-3 w-3 text-gray-400" />
                                    )}
                                    {i === 2 && (
                                        <Award className="h-3 w-3 text-amber-600" />
                                    )}
                                    {item.employe}
                                </td>
                                <td>{item.chaine}</td>
                                <td className="text-right tabular-nums">
                                    {formatValue(item.value, '%')}
                                </td>
                                <td className="text-center">{i + 1}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
        case 'per_of': {
            return (
                <table className="w-full font-mono text-xs">
                    <thead>
                        <tr className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase">
                            <th className="py-1 text-left">N° OF</th>
                            <th className="text-left">Article</th>
                            <th className="text-right">Avancement</th>
                            <th className="text-center">Statut</th>
                            <th className="text-right">EPD</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((item, i) => (
                            <tr key={i} className="border-b border-border/50">
                                <td className="py-1.5 font-bold">{item.of}</td>
                                <td>{item.article}</td>
                                <td className="text-right tabular-nums">
                                    {formatValue(item.avancement_pct, '%')}
                                </td>
                                <td className="text-center">
                                    <span
                                        className={`inline-block h-2 w-2 rounded-full ${statusDot(String(item.status))}`}
                                    />
                                </td>
                                <td className="text-right">
                                    {item.epd || '—'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
        case 'timeline': {
            return (
                <div className="space-y-2 font-mono text-xs">
                    {rows.map((item, i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between border-b border-border/50 py-1.5"
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-8 font-bold text-primary">
                                    {String(item.chaine)}
                                </span>
                                <span className="text-muted-foreground">
                                    {String(item.motif)}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="tabular-nums">
                                    {item.minutes_perdues ?? item.duration
                                        ? `${Math.round(Number(item.minutes_perdues ?? (Number(item.duration) * 60)))} min`
                                        : '—'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
        default:
            return null;
    }
}

export default function ProductionKpiDetailModal({
    kpiKey,
    kpiData,
    breakdownData,
    onClose,
}: ProductionKpiDetailModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!kpiKey) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [kpiKey, onClose]);

    if (!kpiKey || !kpiData) {
        return null;
    }

    const config = PRODUCTION_KPI_DETAIL_CONFIG[kpiKey];
    if (!config) {
        console.log('Modal Render: Early return due to missing config', {
            kpiKey,
        });
        return null;
    }

    const seriesNum = parseInt(config.id.replace('F-REQ-', ''));
    const series =
        seriesNum < 200
            ? 'Série 100 — Performance Qualité'
            : seriesNum < 300
              ? 'Série 200 — Performance Production & Flux'
              : seriesNum < 350
                ? 'Série 300 — Logistique & Planning'
                : 'Série 350 — Développement';

    // Find the KPI card in the response.
    // Map our kpiKey to what's in the ProductionKpis response
    const kpiMap: Record<string, string> = {
        efficience_chaine: 'avg_efficience',
        owe_chaine: 'avg_owe',
        wip_chaine: 'total_wip',
        arrets_non_planifies: 'total_lost_time',
        rft_production: 'rft_production',
        br_gtd: 'br_gtd',
        br_bundling: 'br_bundling',
        br_print: 'br_print',
    };

    // Extra KPIs come from a separate API call, not from kpiData
    const responseKey = kpiMap[kpiKey] || kpiKey;

    let card = (kpiData as unknown as Record<string, {value: number, status: string}>)?.[responseKey];
    card = card || {
        value: 0,
        status: 'grey',
        target: config.target.value,
    };

    const cardStatus = card.status || 'grey';
    const isLive = config.source.status === 'live';
    const isPending =
        config.source.status === 'pending' ||
        config.source.status === 'inactive' ||
        config.source.status === 'blocked';
    const borderColor = statusBorder(cardStatus);
    const valueColor = statusColor(cardStatus);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
        >
            <div
                className={`relative max-h-[90vh] w-full max-w-2xl rounded-lg border border-y-0 border-l-4 border-border bg-card shadow-xl ${borderColor} flex flex-col overflow-hidden`}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border px-5 pt-4 pb-2">
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                                {config.id}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">
                                {series}
                            </span>
                        </div>
                        <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">
                            {config.label}
                        </h2>
                        <div className="mt-1 flex gap-4">
                            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
                                Vue:{' '}
                                <span className="text-foreground">
                                    {config.view}
                                </span>
                            </span>
                            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
                                Exigence:{' '}
                                <span className="text-foreground">
                                    {config.id}
                                </span>
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-secondary"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Top stats */}
                    <div className="mb-6 grid grid-cols-3 gap-3">
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Valeur actuelle
                            </div>
                            <div
                                className={`font-mono text-2xl font-bold tabular-nums ${valueColor}`}
                            >
                                {isPending && card.value === null
                                    ? '-'
                                    : formatValue(
                                          card.value,
                                          config.formula.resultUnit,
                                      )}
                            </div>
                        </div>
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Cible
                            </div>
                            <div className="mt-1 font-mono text-xl font-bold text-foreground">
                                {config.target.operator} {config.target.value}
                                {config.formula.resultUnit}
                            </div>
                        </div>
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Statut
                            </div>
                            <div
                                className={`text-xs font-bold uppercase ${statusColor(cardStatus)} mt-2`}
                            >
                                {cardStatus === 'green'
                                    ? '🟢 Conforme'
                                    : cardStatus === 'orange'
                                      ? '🟠 Vigilance'
                                      : cardStatus === 'red'
                                        ? '🔴 Critique'
                                        : '⚪ ' + cardStatus.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* Formula & Source */}
                    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        {config.formula.numerator.field !== 'N/A' && config.formula.denominator.field !== 'N/A' ? (
                            <div className="group/info relative">
                                <div className="mb-2 flex items-center gap-1.5">
                                    <h4 className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                        Formule de calcul
                                    </h4>
                                    {config.formula.numerator.field !== '—' && config.formula.denominator.field !== '—' && (
                                        <div className="relative">
                                            <Info className="h-3 w-3 cursor-help text-muted-foreground/60 transition-colors hover:text-muted-foreground" />
                                            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-md border border-border bg-card p-3 text-[10px] font-mono leading-relaxed normal-case tracking-normal text-muted-foreground shadow-lg opacity-0 transition-opacity duration-150 group-hover/info:pointer-events-auto group-hover/info:opacity-100">
                                                <span className="font-sans text-[11px] font-bold text-foreground">Champs technique :</span>
                                                <br />
                                                {config.formula.type === 'raw value'
                                                    ? `Valeur brute: ${config.formula.field || config.formula.numerator.field}`
                                                    : config.formula.operator === 'subtraction'
                                                        ? `${config.formula.numerator.field} − ${config.formula.denominator.field}`
                                                        : `${config.formula.numerator.field} ÷ ${config.formula.denominator.field}${config.formula.multiplier ? ` × ${config.formula.multiplier}` : ''}`
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    {config.description}
                                </p>
                            </div>
                        ) : (
                            <div>
                                <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                    Formule de calcul
                                </h4>
                                {config.formula.type === 'raw value' ? (
                                    <div className="rounded border border-border bg-secondary/10 p-2 font-mono text-xs italic">
                                        Valeur brute:{' '}
                                        {config.formula.field ||
                                            config.formula.numerator.field}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                                        <div className="flex-1 rounded border border-border bg-secondary/10 p-1.5 text-center">
                                            <div className="truncate text-[8px] opacity-70">
                                                {config.formula.numerator.label}
                                            </div>
                                            <div className="truncate font-bold">
                                                {config.formula.numerator.field}
                                            </div>
                                        </div>
                                        <div className="text-muted-foreground">
                                            {config.formula.operator ===
                                            'subtraction'
                                                ? '−'
                                                : '÷'}
                                        </div>
                                        <div className="flex-1 rounded border border-border bg-secondary/10 p-1.5 text-center">
                                            <div className="truncate text-[8px] opacity-70">
                                                {config.formula.denominator.label}
                                            </div>
                                            <div className="truncate font-bold">
                                                {config.formula.denominator.field}
                                            </div>
                                        </div>
                                        {config.formula.multiplier && (
                                            <>
                                                <div className="text-muted-foreground">
                                                    ×
                                                </div>
                                                <div className="font-bold">
                                                    {config.formula.multiplier}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div>
                            <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                Source de données
                            </h4>
                            <div className="space-y-1 font-mono text-[10px]">
                                <div>
                                    <span className="text-muted-foreground">
                                        Système:
                                    </span>{' '}
                                    {config.source.system}
                                </div>
                                {(config.source.novacityEndpoint || config.source.mysqlTable) && (
                                    <div className="truncate">
                                        <span className="text-muted-foreground">
                                            Source:
                                        </span>{' '}
                                        {config.source.novacityEndpoint || config.source.mysqlTable}
                                    </div>
                                )}
                                <div>
                                    <span className="text-muted-foreground">
                                        Fréquence:
                                    </span>{' '}
                                    {config.source.frequency}
                                </div>
                                {breakdownData?.synced_at && (
                                    <div>
                                        <span className="text-muted-foreground">
                                            Sync:
                                        </span>{' '}
                                        {new Date(
                                            breakdownData.synced_at,
                                        ).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Breakdown & Viz — hide entirely when both are 'none' */}
                    {(config.breakdownType !== 'none' || config.miniVizType !== 'none') && (
                        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                            {config.breakdownType !== 'none' && (
                                <div className={config.miniVizType !== 'none' ? 'md:col-span-2' : 'md:col-span-3'}>
                                    <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                        Ventilation
                                    </h4>
                                    <BreakdownTable
                                        type={config.breakdownType}
                                        rows={breakdownData?.rows || []}
                                        target={config.target.value}
                                    />
                                </div>
                            )}
                            {config.miniVizType !== 'none' && (
                                <div className={config.breakdownType !== 'none' ? 'border-l border-border pl-6' : ''}>
                                    <h4 className="mb-2 text-center text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                        Visualisation
                                    </h4>
                                    <div className="flex h-full min-h-[100px] items-center justify-center">
                                        {config.miniVizType === 'gauge' && (
                                            <GaugeViz
                                                value={Number(card.value) || 0}
                                                status={cardStatus}
                                            />
                                        )}
                                        {config.miniVizType === 'sparkline' && (
                                            <SparklineViz
                                                data={breakdownData?.trend || []}
                                                status={cardStatus}
                                            />
                                        )}
                                        {config.miniVizType === 'donut' && (
                                            <DonutViz
                                                value={Number(card.value) || 0}
                                                status={cardStatus}
                                            />
                                        )}
                                        {config.miniVizType === 'timeline' && (
                                            <TimelineViz
                                                data={breakdownData?.rows || []}
                                                status={cardStatus}
                                            />
                                        )}
                                        {config.miniVizType ===
                                            'horizontal_bar' && (
                                            <HorizontalBarViz
                                                data={breakdownData?.rows || []}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rules */}
                    <div className="mt-4">
                        <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                            Règles d'alerte
                        </h4>
                        <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-500" />{' '}
                                <span className="text-muted-foreground">
                                    Vert:
                                </span>{' '}
                                {config.thresholds.green}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-orange-400" />{' '}
                                <span className="text-muted-foreground">
                                    Orange:
                                </span>{' '}
                                {config.thresholds.orange}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500" />{' '}
                                <span className="text-muted-foreground">
                                    Rouge:
                                </span>{' '}
                                {config.thresholds.red}
                            </div>
                            {config.thresholds.grey && (
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-gray-400" />{' '}
                                    <span className="text-muted-foreground">
                                        Gris:
                                    </span>{' '}
                                    {config.thresholds.grey}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border bg-secondary/5 px-5 py-3">
                    {isLive ? (
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-2 text-[10px] tracking-widest uppercase"
                            onClick={() => {
                                const today = new Date()
                                    .toISOString()
                                    .slice(0, 10);
                                const wb = XLSX.utils.book_new();
                                const rows = breakdownData?.rows || [
                                    {
                                        KPI: config.label,
                                        Valeur: card.value,
                                        Statut: card.status,
                                        Cible: config.target.value,
                                    },
                                ];
                                const ws = XLSX.utils.json_to_sheet(rows);
                                XLSX.utils.book_append_sheet(wb, ws, 'Data');
                                XLSX.writeFile(
                                    wb,
                                    `${kpiKey}_${config.view}_${today}.xlsx`,
                                );
                            }}
                        >
                            <Download className="h-3 w-3" /> Exporter XLSX
                        </Button>
                    ) : (
                        <div />
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[10px] tracking-widest uppercase"
                        onClick={onClose}
                    >
                        Fermer
                    </Button>
                </div>
            </div>
        </div>
    );
}
