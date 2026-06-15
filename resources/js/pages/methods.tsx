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
import type { MethodsKpiKey } from '@/components/methods/methodsKpiDetailConfig';
import MethodsKpiDetailModal from '@/components/methods/MethodsKpiDetailModal';
import { BigNumberCard, Panel, TrafficBadge } from '@/components/widgets';
import { useFilters } from '@/context/FilterContext';
import {
    fetchMethodesKpis,
    fetchMethodesTaggingChart,
    fetchMethodesDetailTable,
    type MethodsKpisResponse,
    type TaggingChartItem,
    type DetailTableItem,
    type KpiStatus,
} from '@/services/methodsApi';

const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    fontSize: 12,
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

function KpiCard({
    label,
    value,
    status,
    unit = '%',
    target,
    source,
    freq,
    onClick,
    isLoading,
    blockerMsg,
}: {
    label: string;
    value: number | null;
    status: KpiStatus;
    unit?: string;
    target?: string;
    source?: string;
    freq?: string;
    onClick?: () => void;
    isLoading?: boolean;
    blockerMsg?: string;
}) {
    if (isLoading) return <KpiCardSkeleton />;

    if (status === 'pending' || status === 'inactive' || status === 'grey') {
        const msg = blockerMsg ?? 'Données indisponibles';
        return (
            <div
                className={`relative flex h-full flex-col justify-center overflow-hidden rounded-lg border border-border bg-card p-4 cursor-pointer transition-all hover:ring-2 hover:ring-primary/30`}
                onClick={onClick}
            >
                <div className="absolute top-0 left-0 h-full w-1 bg-status-grey" />
                <div className="mb-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                    {label}
                </div>
                <div className="mb-1 font-mono text-2xl font-bold text-muted-foreground tabular-nums">
                    —
                </div>
                <div className="font-mono text-[10px] text-muted-foreground/70">
                    {msg}
                </div>
                {target && (
                    <div className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Cible: {target}
                    </div>
                )}
                {source && (
                    <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground/70">
                        src: {source}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="flex h-full flex-col cursor-pointer rounded-lg transition-all"
            onClick={onClick}
        >
            <BigNumberCard
                label={label}
                value={value ?? 'N/A'}
                unit={unit}
                target={target}
                status={status as 'green' | 'orange' | 'red' | 'grey'}
                source={source}
                freq={freq}
            />
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
    const color = v >= target ? 'var(--success)' : v >= target - 5 ? 'var(--warning)' : 'var(--destructive)';

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
            <div className="font-mono text-xs text-muted-foreground">Cible: {target}%</div>
        </div>
    );
}

export default function MethodsPage() {
    const [kpis, setKpis] = useState<MethodsKpisResponse | null>(null);
    const [tagging, setTagging] = useState<TaggingChartItem[]>([]);
    const [details, setDetails] = useState<DetailTableItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [openModal, setOpenModal] = useState<MethodsKpiKey | null>(null);

    const { filters } = useFilters();
    const ligneFilter = filters.ligne || '';

    const fetchData = useCallback(async () => {
        const methodFilters = ligneFilter ? { chaine: ligneFilter } : undefined;
        try {
            const [k, t, d] = await Promise.allSettled([
                fetchMethodesKpis(methodFilters),
                fetchMethodesTaggingChart(methodFilters),
                fetchMethodesDetailTable(),
            ]);

            if (k.status === 'fulfilled') setKpis(k.value);
            if (t.status === 'fulfilled') setTagging(t.value.data);
            if (d.status === 'fulfilled') setDetails(d.value.data);

            const anyFailed = [k, t, d].some((r) => r.status === 'rejected');
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
    }, [ligneFilter]);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(fetchData, 60000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData]);

    const exportRows = kpis
        ? [
              { kpi: 'F-REQ-216 Taux archivage', valeur: kpis.f_req_216.value ?? '—', cible: '85%' },
              { kpi: 'F-REQ-217 Fiabilité données', valeur: kpis.f_req_217.value ?? '—', cible: '95%' },
              { kpi: 'F-REQ-218 Respect temps estimé', valeur: kpis.f_req_218.value ?? '—', cible: '90%' },
              { kpi: 'F-REQ-219 Temps acceptés 1ère version', valeur: kpis.f_req_219.value ?? '—', cible: '≥80%' },
          ]
        : [];

    return (
        <>
            <Head title="Méthodes & Planning — BACOVET" />
            <AppShell
                page="/methods"
                title="Méthodes & Amélioration Continue"
                subtitle="Série · F-REQ-216 → 219"
                exportRows={exportRows}
                exportFilename="BACOVET_Methodes"
            >
                {error && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div className="text-xs font-bold uppercase">{error}</div>
                    </div>
                )}

                {/* F-REQ-217 Proxy banner */}
                {kpis?.f_req_217?.is_proxy && !loading && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <div className="font-mono text-xs">
                            <span className="font-bold tracking-wider text-warning uppercase">Proxy F-REQ-217 : </span>
                            <span className="text-foreground/90">
                                {kpis.f_req_217.proxy_note}
                            </span>
                        </div>
                    </div>
                )}

                {/* Row 1 — 2 Gauge Charts */}
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Panel title="Taux d'Archivage Suivi Paquets (F-REQ-216)">
                        <GaugeChart
                            value={kpis?.f_req_216?.value ?? null}
                            target={85}
                            isLoading={loading}
                            onClick={() => setOpenModal('f_req_216')}
                        />
                        {kpis?.f_req_216?.blocker && (
                            <div className="mt-2 rounded border border-warning/40 bg-warning/10 px-2 py-1 text-center font-mono text-[10px] text-warning">
                                Source: Base suivi production — Données en attente ({kpis.f_req_216.blocker})
                            </div>
                        )}
                    </Panel>

                    <Panel title="Fiabilité Données Système (F-REQ-217)">
                        <GaugeChart
                            value={kpis?.f_req_217?.value ?? null}
                            target={95}
                            isLoading={loading}
                            onClick={() => setOpenModal('f_req_217')}
                        />
                        {kpis?.f_req_217?.status && !loading && (
                            <div className="text-center">
                                <TrafficBadge status={kpis.f_req_217.status as 'green' | 'orange' | 'red' | 'grey'} />
                            </div>
                        )}
                    </Panel>
                </div>

                {/* Row 2 — 2 BigNumber Cards */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <KpiCard
                        label="Respect Temps Estimé (F-REQ-218)"
                        value={kpis?.f_req_218?.value ?? null}
                        status={kpis?.f_req_218?.status ?? 'grey'}
                        target="90%"
                        source="Base rendement + Logiciel Cotation"
                        freq="Freq: Au démarrage"
                        onClick={() => setOpenModal('f_req_218')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="Temps Acceptés 1ère Version (F-REQ-219)"
                        value={kpis?.f_req_219?.value ?? null}
                        status={kpis?.f_req_219?.status ?? 'grey'}
                        target="≥80%"
                        source="Fichier déchiffrage + Logiciel Cotation"
                        freq="Freq: Déchiffrage"
                        onClick={() => setOpenModal('f_req_219')}
                        isLoading={loading}
                    />
                </div>

                {/* Row 3 — Detail Table */}
                {loading ? (
                    <Panel title="Tableau Récapitulatif Indicateurs" className="mb-4">
                        <div className="animate-pulse space-y-2">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="h-4 w-20 rounded bg-muted" />
                                    <div className="h-4 flex-1 rounded bg-muted" />
                                    <div className="h-4 w-16 rounded bg-muted" />
                                    <div className="h-4 w-12 rounded bg-muted" />
                                    <div className="h-4 w-16 rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    </Panel>
                ) : details.length > 0 ? (
                    <Panel title="Tableau Récapitulatif Indicateurs" className="mb-4">
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
                                {details.map((row, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                        <td className="py-2 text-primary">{row.id}</td>
                                        <td>{row.indicateur}</td>
                                        <td className="text-right tabular-nums">{row.valeur ?? '—'}</td>
                                        <td className="text-right">{row.cible}</td>
                                        <td className="text-right text-muted-foreground">{row.frequence}</td>
                                        <td className="text-right">
                                            {row.blocker ? (
                                                <span className="text-[10px] text-warning">En attente ({row.blocker})</span>
                                            ) : row.status ? (
                                                <TrafficBadge status={row.status as 'green' | 'orange' | 'red' | 'grey'} />
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Panel>
                ) : null}

                {/* Row 4 — Tagging Fiabilité Line Chart */}
                <Panel title="Fiabilité Tagging par Chaîne et Shift">
                    {loading ? (
                        <div className="flex h-[250px] items-center justify-center">
                            <div className="animate-pulse h-[200px] w-full rounded bg-muted" />
                        </div>
                    ) : tagging.length === 0 ? (
                        <div className="flex h-[200px] items-center justify-center text-muted-foreground italic">
                            Aucune donnée de tagging pour aujourd'hui
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={tagging}>
                                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                                <XAxis
                                    dataKey={(d) => `${d.chaine}-${d.shift}`}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                />
                                <YAxis
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                    label={{ value: 'Écart %', angle: -90, position: 'insideLeft', fontSize: 10 }}
                                />
                                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, 'Écart']} />
                                <ReferenceLine y={0} stroke="var(--success)" strokeDasharray="4 4" />
                                <ReferenceLine y={5} stroke="var(--destructive)" strokeDasharray="4 4" />
                                <ReferenceLine y={-5} stroke="var(--destructive)" strokeDasharray="4 4" />
                                <Line
                                    type="monotone"
                                    dataKey="ecart_pct"
                                    stroke="var(--primary)"
                                    strokeWidth={2}
                                    dot={(props: { cx: number; cy: number; payload: TaggingChartItem; index: number }) => {
                                        const { cx, cy, payload, index } = props;
                                        const color = payload.status === 'green' ? 'var(--success)'
                                            : payload.status === 'orange' ? 'var(--warning)'
                                            : 'var(--destructive)';
                                        return <circle key={index} cx={cx} cy={cy} r={4} fill={color} />;
                                    }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </Panel>

                {lastSync && (
                    <div className="mt-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Dernière sync: <span className="text-foreground">{lastSync.toLocaleTimeString('fr-FR')}</span>
                    </div>
                )}

                {/* KPI Detail Modal */}
                <MethodsKpiDetailModal
                    kpiKey={openModal}
                    kpiData={kpis}
                    onClose={() => setOpenModal(null)}
                />
            </AppShell>
        </>
    );
}
