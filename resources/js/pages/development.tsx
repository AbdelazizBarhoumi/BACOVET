import { Head } from '@inertiajs/react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis,
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import type { DevKpiKey } from '@/components/development/devKpiDetailConfig';
import DevKpiDetailModal from '@/components/development/DevKpiDetailModal';
import { Panel, TrafficBadge } from '@/components/widgets';
import { useLiveData } from '@/hooks/use-live-data';
import {
    fetchDevelopmentKpis,
    fetchDevelopmentTrend,
    fetchReclamationsScatter,
    type DevelopmentKpisResponse,
    type ScatterItem,
    type TrendItem,
} from '@/services/developmentApi';

const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '8px 12px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
};

const KPI_META: Record<string, { label: string; fReq: string }> = {
    dev_rft:          { label: 'RFT Développement (Right First Time)',      fReq: '350' },
    dev_livraison:    { label: 'Taux de respect de livraison à date',      fReq: '351' },
    dev_nomenclature: { label: 'Taux de fiabilité de nomenclature', fReq: '352' },
    dev_reclamations: { label: '% Réclamations de la production',      fReq: '353' },
};

function KpiCardSkeleton() {
    return (
        <div className="relative h-full animate-pulse overflow-hidden rounded-lg border border-border bg-card p-4">
            <div className="absolute top-0 left-0 h-full w-1 bg-muted" />
            <div className="mb-3 h-3 w-24 rounded bg-muted" />
            <div className="mb-2 h-8 w-20 rounded bg-muted" />
            <div className="mb-2 h-3 w-16 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
        </div>
    );
}

function GaugeSkeleton() {
    return (
        <div className="flex flex-col items-center gap-3 py-4 animate-pulse">
            <div className="h-24 w-44 rounded-full bg-muted" />
            <div className="h-3 w-16 rounded bg-muted" />
        </div>
    );
}

function GaugeChart({
    value,
    target,
    status,
    isStale,
    isLoading,
    onClick,
}: {
    value: number | null;
    target: number;
    status: string;
    isStale?: boolean;
    isLoading: boolean;
    onClick?: () => void;
}) {
    if (isLoading) return <GaugeSkeleton />;

    const v = value ?? 0;
    const pct = Math.min(100, Math.max(0, v));
    const angle = (pct / 100) * 180;
    const color = status === 'green' ? 'var(--success)' : status === 'orange' ? 'var(--warning)' : status === 'red' ? 'var(--destructive)' : 'var(--muted)';

    return (
        <div
            className="flex flex-col items-center gap-3 py-4 cursor-pointer transition-all hover:ring-2 hover:ring-primary/30 rounded-lg"
            onClick={onClick}
        >
            <div className="relative h-24 w-44">
                <svg viewBox="0 0 200 110" className="h-full w-full">
                    <path d="M10,100 A90,90 0 0,1 190,100" fill="none" stroke="var(--muted)" strokeWidth="14" strokeLinecap="round" />
                    {value !== null && (
                        <path d="M10,100 A90,90 0 0,1 190,100" fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(angle / 180) * 283} 283`} />
                    )}
                    <text x="100" y="92" textAnchor="middle" className="font-mono font-bold" fontSize="26" fill="currentColor">
                        {value !== null ? `${v.toFixed(1)}%` : '—'}
                    </text>
                </svg>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                <span>Cible: ≥{target}%</span>
                {isStale && <Clock className="h-3 w-3 text-warning" />}
            </div>
        </div>
    );
}

function KpiCard({
    label,
    fReq,
    value,
    status,
    target,
    targetKind,
    unit,
    source,
    isStale,
    freq,
    onClick,
    isLoading,
}: {
    label: string;
    fReq: string;
    value: number | null;
    status: string;
    target: number;
    targetKind: 'min' | 'max';
    unit?: string;
    source?: string;
    isStale?: boolean;
    freq?: string;
    onClick?: () => void;
    isLoading?: boolean;
}) {
    if (isLoading) return <KpiCardSkeleton />;

    const displayUnit = unit ?? '%';
    const barColor = status === 'green' ? 'bg-success'
        : status === 'orange' ? 'bg-warning'
        : status === 'red' ? 'bg-destructive'
        : 'bg-status-grey';

    return (
        <div
            className={`relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card p-4 cursor-pointer transition-all hover:ring-2 hover:ring-primary/30 ${status === 'red' || status === 'orange' ? 'animate-flash-alert' : ''}`}
            onClick={onClick}
        >
            <div className={`absolute top-0 left-0 h-full w-1 ${barColor}`} />
            <div className="mb-2 flex items-start justify-between">
                <div className="font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                    {label} ·{fReq}
                </div>
                <TrafficBadge status={status as 'green' | 'orange' | 'red' | 'grey'} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-center">
                <div className="flex items-baseline gap-1">
                    <span className="font-mono text-4xl font-bold tabular-nums">
                        {value !== null ? value.toFixed(1) : '—'}
                    </span>
                    <span className="font-mono text-lg text-muted-foreground">{displayUnit}</span>
                </div>
            </div>
            <div className="mt-auto">
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    <span>Cible: {targetKind === 'max' ? '<' : '≥'}{target}{displayUnit}</span>
                    {freq && <span className="text-primary/80">Freq: {freq}</span>}
                </div>
                {source && (
                    <div className="mt-1 flex items-center gap-1 truncate font-mono text-[10px] text-muted-foreground/70">
                        <span>src: {source}</span>
                        {isStale && <span title="Données obsolètes"><Clock className="h-3 w-3 shrink-0 text-warning" /></span>}
                    </div>
                )}
            </div>
        </div>
    );
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterItem }> }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div style={tooltipStyle}>
            <div className="font-bold text-foreground">{d.mois} — {d.modele}</div>
            <div className="text-muted-foreground">Réclamations: {d.reclamations} / {d.total}</div>
            <div className="text-muted-foreground">Taux: {d.valeur.toFixed(1)}%</div>
        </div>
    );
}

export default function DevPage() {
    const [kpis, setKpis] = useState<DevelopmentKpisResponse | null>(null);
    const [trend, setTrend] = useState<TrendItem[]>([]);
    const [scatter, setScatter] = useState<ScatterItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [openModal, setOpenModal] = useState<DevKpiKey | null>(null);
    const { refreshIntervalSec, recordFetchSuccess, recordFetchError } = useLiveData();

    const fetchData = useCallback(async () => {
        try {
            const [k, t, s] = await Promise.allSettled([
                fetchDevelopmentKpis(),
                fetchDevelopmentTrend(),
                fetchReclamationsScatter(),
            ]);

            if (k.status === 'fulfilled') setKpis(k.value);
            if (t.status === 'fulfilled') setTrend(t.value.data);
            if (s.status === 'fulfilled') setScatter(s.value.data);

            const anyFailed = [k, t, s].some((r) => r.status === 'rejected');
            if (anyFailed && k.status === 'rejected') {
                setError('Erreur de connexion au serveur');
                recordFetchError();
            } else {
                setError(null);
                recordFetchSuccess();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur inconnue');
            recordFetchError();
        } finally {
            setLoading(false);
        }
    }, [recordFetchError, recordFetchSuccess]);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(fetchData, refreshIntervalSec * 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData, refreshIntervalSec]);

    const k = kpis?.kpis;

    return (
        <>
            <Head title="Développement — BACOVET" />
            <AppShell
                page="/developpement"
                title="Développement"
            >
                {error && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div className="text-xs font-bold uppercase">{error}</div>
                    </div>
                )}

                {/* Row 1 — F-REQ-350 (KpiCard), F-REQ-351 (GaugeChart), F-REQ-352 (LineChart) */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {/* F-REQ-350: RFT — KpiCard */}
                    <KpiCard
                        label={KPI_META.dev_rft.label}
                        fReq="350"
                        value={k?.dev_rft.value ?? null}
                        status={k?.dev_rft.status ?? 'grey'}
                        target={95}
                        targetKind="min"
                        source="Google Drive"
                        isStale={k?.dev_rft.is_stale}
                        freq="Mensuel"
                        onClick={() => setOpenModal('dev_rft')}
                        isLoading={loading}
                    />

                    {/* F-REQ-351: Respect Livraison — GaugeChart */}
                    <Panel title="Taux de respect de livraison à date">
                        <GaugeChart
                            value={k?.dev_livraison.value ?? null}
                            target={95}
                            status={k?.dev_livraison.status ?? 'grey'}
                            isStale={k?.dev_livraison.is_stale}
                            isLoading={loading}
                            onClick={() => setOpenModal('dev_livraison')}
                        />
                    </Panel>

                    {/* F-REQ-352: Fiabilité Nomenclature — Line Chart */}
                    <Panel title="Taux de fiabilité de nomenclature" right={
                        <div className="flex items-center gap-2">
                            {k?.dev_nomenclature.value != null && (
                                <span className="font-mono text-lg font-bold tabular-nums">
                                    {k.dev_nomenclature.value.toFixed(1)}%
                                </span>
                            )}
                            {k?.dev_nomenclature.status && (
                                <TrafficBadge status={k.dev_nomenclature.status as 'green' | 'orange' | 'red' | 'grey'} />
                            )}
                            {k?.dev_nomenclature.is_stale && <span title="Données obsolètes"><Clock className="h-3.5 w-3.5 text-warning" /></span>}
                        </div>
                    }>
                        {loading ? (
                            <div className="flex h-[160px] items-center justify-center">
                                <div className="animate-pulse h-[140px] w-full rounded bg-muted" />
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={160}>
                                <LineChart data={trend}>
                                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                                    <XAxis dataKey="mois" tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                                    <YAxis domain={[92, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                                        labelStyle={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 11, marginBottom: 4 }}
                                        itemStyle={{ fontSize: 11 }}
                                    />
                                    <ReferenceLine y={98} stroke="var(--success)" strokeDasharray="4 4" />
                                    <Line type="monotone" dataKey="valeur" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Panel>
                </div>

                {/* Row 2 — F-REQ-353: Scatter Plot + KpiCard */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {/* F-REQ-353: Réclamations — KpiCard */}
                    <KpiCard
                        label={KPI_META.dev_reclamations.label}
                        fReq="353"
                        value={k?.dev_reclamations.value ?? null}
                        status={k?.dev_reclamations.status ?? 'grey'}
                        target={2}
                        targetKind="max"
                        source="Google Drive"
                        isStale={k?.dev_reclamations.is_stale}
                        freq="Mensuel"
                        onClick={() => setOpenModal('dev_reclamations')}
                        isLoading={loading}
                    />

                    {/* F-REQ-353: Réclamations — Scatter Plot */}
                    <Panel title="% Réclamations — Tendance par modèle" className="md:col-span-2">
                        {loading ? (
                            <div className="flex h-[200px] items-center justify-center">
                                <div className="animate-pulse h-[180px] w-full rounded bg-muted" />
                            </div>
                        ) : scatter.length === 0 ? (
                            <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
                                Aucune donnée
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="mois"
                                        type="category"
                                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                    />
                                    <YAxis
                                        dataKey="valeur"
                                        type="number"
                                        domain={[0, 'auto']}
                                        tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                        label={{ value: '%', position: 'insideTopLeft', fontSize: 10, fill: 'var(--muted-foreground)' }}
                                    />
                                    <ZAxis dataKey="total" range={[40, 200]} />
                                    <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                    <Scatter
                                        data={scatter}
                                        fill="var(--primary)"
                                        fillOpacity={0.6}
                                    />
                                </ScatterChart>
                            </ResponsiveContainer>
                        )}
                    </Panel>
                </div>

                {/* KPI Detail Modal */}
                <DevKpiDetailModal
                    kpiKey={openModal}
                    kpiData={kpis}
                    onClose={() => setOpenModal(null)}
                />
            </AppShell>
        </>
    );
}
