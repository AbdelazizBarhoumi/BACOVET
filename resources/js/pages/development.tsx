import { Head } from '@inertiajs/react';
import { AlertTriangle, Info } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import type { DevKpiKey } from '@/components/development/devKpiDetailConfig';
import DevKpiDetailModal from '@/components/development/DevKpiDetailModal';
import { Panel, TrafficBadge } from '@/components/widgets';
import {
    fetchDevelopmentKpis,
    fetchDevelopmentTrend,
    type DevelopmentKpisResponse,
    type TrendItem,
} from '@/services/developmentApi';

const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    fontSize: 12,
};

const KPI_META: Record<string, { label: string; fReq: string }> = {
    dev_rft:          { label: 'RFT Développement',      fReq: '350' },
    dev_livraison:    { label: 'Respect Livraison',      fReq: '351' },
    dev_nomenclature: { label: 'Fiabilité Nomenclature', fReq: '352' },
    dev_reclamations: { label: 'Réclamations Prod',      fReq: '353' },
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
    isLoading,
    onClick,
}: {
    value: number | null;
    target: number;
    isLoading: boolean;
    onClick?: () => void;
}) {
    if (isLoading) return <GaugeSkeleton />;

    const v = value ?? 0;
    const pct = Math.min(100, Math.max(0, v));
    const angle = (pct / 100) * 180;
    const color = v >= target ? 'var(--success)' : v >= target - 3 ? 'var(--warning)' : 'var(--destructive)';

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
            <div className="font-mono text-xs text-muted-foreground">Cible: ≥{target}%</div>
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
    source,
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
    source?: string;
    freq?: string;
    onClick?: () => void;
    isLoading?: boolean;
}) {
    if (isLoading) return <KpiCardSkeleton />;

    const barColor = status === 'green' ? 'bg-success'
        : status === 'orange' ? 'bg-warning'
        : status === 'red' ? 'bg-destructive'
        : 'bg-status-grey';

    return (
        <div
            className="relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card p-4 cursor-pointer transition-all hover:ring-2 hover:ring-primary/30"
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
                    <span className="font-mono text-lg text-muted-foreground">%</span>
                </div>
            </div>
            <div className="mt-auto">
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                    <span>Cible: {targetKind === 'max' ? '<' : '≥'}{target}%</span>
                    {freq && <span className="text-primary/80">Freq: {freq}</span>}
                </div>
                {source && (
                    <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/70">
                        src: {source}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DevPage() {
    const [kpis, setKpis] = useState<DevelopmentKpisResponse | null>(null);
    const [trend, setTrend] = useState<TrendItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [openModal, setOpenModal] = useState<DevKpiKey | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [k, t] = await Promise.allSettled([
                fetchDevelopmentKpis(),
                fetchDevelopmentTrend(),
            ]);

            if (k.status === 'fulfilled') setKpis(k.value);
            if (t.status === 'fulfilled') setTrend(t.value.data);

            const anyFailed = [k, t].some((r) => r.status === 'rejected');
            if (anyFailed && k.status === 'rejected') {
                setError('Erreur de connexion au serveur');
            } else {
                setError(null);
            }

            setLastSync(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur inconnue');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(fetchData, 60000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData]);

    const k = kpis?.kpis;

    const exportRows = k
        ? Object.entries(k).map(([key, v]) => ({
              kpi: `${KPI_META[key]?.fReq ?? key} ${KPI_META[key]?.label ?? key}`,
              valeur: v.value !== null ? `${v.value}%` : '—',
              cible: `${v.target_kind === 'min' ? '≥' : '≤'}${v.target}%`,
          }))
        : [];

    return (
        <>
            <Head title="Développement — BACOVET" />
            <AppShell
                page="/development"
                title="Développement & Amélioration"
                subtitle="Série 350 · KPIs mensuels"
                exportRows={exportRows}
                exportFilename="BACOVET_Dev_S350"
            >
                <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 font-mono text-xs">
                    <span className="font-bold tracking-wider text-warning uppercase">
                        Source manuelle :
                    </span>{' '}
                    <span className="text-foreground/90">
                        KPIs Série 350 alimentés via Google Sheets (Drive). Connecteur Google Sheets à activer côté Cloud pour synchronisation automatique.
                    </span>
                </div>

                {error && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div className="text-xs font-bold uppercase">{error}</div>
                    </div>
                )}

                {/* Row 1 — F-REQ-350 (KpiCard), F-REQ-351 (GaugeChart per spec), F-REQ-352 (Line chart per spec) */}
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
                        freq="Mensuel"
                        onClick={() => setOpenModal('dev_rft')}
                        isLoading={loading}
                    />

                    {/* F-REQ-351: Respect Livraison — GaugeChart per spec */}
                    <Panel title="Respect Livraison à Date (F-REQ-351)">
                        <GaugeChart
                            value={k?.dev_livraison.value ?? null}
                            target={95}
                            isLoading={loading}
                            onClick={() => setOpenModal('dev_livraison')}
                        />
                    </Panel>

                    {/* F-REQ-352: Fiabilité Nomenclature — Line chart primary per spec */}
                    <Panel title="Fiabilité Nomenclature (F-REQ-352)" right={
                        <div className="flex items-center gap-2">
                            {k?.dev_nomenclature.value != null && (
                                <span className="font-mono text-lg font-bold tabular-nums">
                                    {k.dev_nomenclature.value.toFixed(1)}%
                                </span>
                            )}
                            {k?.dev_nomenclature.status && (
                                <TrafficBadge status={k.dev_nomenclature.status as 'green' | 'orange' | 'red' | 'grey'} />
                            )}
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
                                    <Tooltip contentStyle={tooltipStyle} />
                                    <ReferenceLine y={98} stroke="var(--success)" strokeDasharray="4 4" />
                                    <Line type="monotone" dataKey="valeur" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Panel>
                </div>

                {/* Row 2 — F-REQ-353 (KpiCard + Scatter derogation) */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {/* F-REQ-353: Réclamations — KpiCard + Scatter derogation per spec */}
                    <div className="space-y-2">
                        <KpiCard
                            label={KPI_META.dev_reclamations.label}
                            fReq="353"
                            value={k?.dev_reclamations.value ?? null}
                            status={k?.dev_reclamations.status ?? 'grey'}
                            target={2}
                            targetKind="max"
                            source="Google Drive"
                            freq="Mensuel"
                            onClick={() => setOpenModal('dev_reclamations')}
                            isLoading={loading}
                        />
                        <div className="flex items-start gap-1 rounded border border-warning/30 bg-warning/5 px-2 py-1">
                            <Info className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                            <span className="font-mono text-[9px] text-muted-foreground">
                                Dérogation B-05 : Scatter Plot (Nuage) requis — données par modèle non disponibles. Affichage agrégé validé par Direction/Méthodes.
                            </span>
                        </div>
                    </div>
                </div>

                {/* Detail Table */}
                {loading ? (
                    <Panel title="Détails des Indicateurs Mensuels (Série 350)">
                        <div className="animate-pulse space-y-2">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="h-4 w-12 rounded bg-muted" />
                                    <div className="h-4 flex-1 rounded bg-muted" />
                                    <div className="h-4 w-16 rounded bg-muted" />
                                    <div className="h-4 w-12 rounded bg-muted" />
                                    <div className="h-4 w-16 rounded bg-muted" />
                                    <div className="h-4 w-16 rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    </Panel>
                ) : k ? (
                    <Panel title="Détails des Indicateurs Mensuels (Série 350)">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    <th className="py-2 text-left">ID</th>
                                    <th className="text-left">Indicateur</th>
                                    <th className="text-right">Valeur</th>
                                    <th className="text-right">Cible</th>
                                    <th className="text-right">Fréquence</th>
                                    <th className="text-right">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="font-mono">
                                {(Object.entries(k) as [string, typeof k.dev_rft][]).map(([key, data]) => {
                                    const meta = KPI_META[key];
                                    if (!meta) return null;
                                    return (
                                        <tr key={key} className="border-b border-border/50">
                                            <td className="py-2 text-primary">{meta.fReq}</td>
                                            <td>{meta.label}</td>
                                            <td className="text-right tabular-nums">
                                                {data.value !== null ? `${data.value.toFixed(1)}%` : '—'}
                                            </td>
                                            <td className="text-right text-muted-foreground">
                                                {data.target_kind === 'max' ? '<' : '≥'}{data.target}%
                                            </td>
                                            <td className="text-right text-muted-foreground">{data.frequency}</td>
                                            <td className="text-right">
                                                <TrafficBadge status={data.status as 'green' | 'orange' | 'red' | 'grey'} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Panel>
                ) : null}

                {lastSync && (
                    <div className="mt-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Dernière sync: <span className="text-foreground">{lastSync.toLocaleTimeString('fr-FR')}</span>
                    </div>
                )}

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
