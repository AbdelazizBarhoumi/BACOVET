import { Head } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import QpTeamPodium, {
    type QpTeam as PodiumTeam,
} from '@/components/QpTeamPodium';
import type { KpiKey } from '@/components/quality/kpiDetailConfig';
import KpiDetailModal from '@/components/quality/KpiDetailModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BigNumberCard, Panel, TrafficBadge } from '@/components/widgets';
import { useFilters } from '@/context/FilterContext';
import {
    fetchQualityKpis,
    fetchQualityBrChart,
    fetchQualityQpTeams,
    fetchQualityAnnualTrend,
    fetchQualityParetoRft,
    fetchQualityParetoInspection,
    fetchQualityParetoFg,
    type QualityKpis,
    type BrChartItem,
    type QpTeam,
    type Alert,
    type AnnualTrendItem,
    type ParetoItem,
    type KpiStatus,
} from '@/services/qualityApi';

const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    fontSize: 12,
};

function barFill(status: KpiStatus): string {
    switch (status) {
        case 'green':
            return 'var(--success)';
        case 'orange':
            return 'var(--warning)';
        case 'red':
            return 'var(--destructive)';
        default:
            return 'var(--muted-foreground)';
    }
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
    if (data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 80;
    const h = 24;
    const pad = 2;
    const points = data
        .map((v, i) => {
            const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
            const y = h - pad - ((v - min) / range) * (h - 2 * pad);
            return `${x},${y}`;
        })
        .join(' ');
    return (
        <svg width={w} height={h} className="mt-1 inline-block">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

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
    kpi,
    unit = '%',
    target,
    source,
    freq,
    onClick,
    trend,
    isLoading,
}: {
    label: string;
    kpi: {
        value: number | null;
        status: KpiStatus;
        blocker?: string | null;
        source?: string;
    };
    unit?: string;
    target?: string;
    source?: string;
    freq?: string;
    onClick?: () => void;
    trend?: number[];
    isLoading?: boolean;
}) {
    if (isLoading) {
        return <KpiCardSkeleton />;
    }

    if (kpi.status === 'pending' || kpi.status === 'inactive') {
        const msg =
            kpi.blocker === 'B-02'
                ? 'En attente API DIVA'
                : kpi.blocker === 'B-01'
                  ? 'Activation requise (B-01)'
                  : kpi.source === 'google_drive'
                    ? 'Source: Google Drive — Données mises à jour 4×/jour'
                    : 'Données indisponibles';
        return (
            <div
                className={`relative flex h-full flex-col justify-center overflow-hidden rounded-lg border border-border bg-card p-4 ${onClick ? 'cursor-pointer transition-all hover:ring-2 hover:ring-primary/30' : ''}`}
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
            className={`flex h-full flex-col ${onClick ? 'cursor-pointer rounded-lg transition-all' : ''}`}
            onClick={onClick}
        >
            <BigNumberCard
                label={label}
                value={kpi.value ?? 'N/A'}
                unit={unit}
                target={target}
                status={kpi.status as 'green' | 'orange' | 'red' | 'grey'}
                source={source}
                freq={freq}
                isLoading={isLoading}
            />
            {trend && trend.length >= 2 && (
                <div className="shrink-0 px-4 pb-2">
                    <Sparkline
                        data={trend}
                        color={
                            kpi.status === 'green'
                                ? '#16a34a'
                                : kpi.status === 'orange'
                                  ? '#ea580c'
                                  : kpi.status === 'red'
                                    ? '#dc2626'
                                    : '#6b7280'
                        }
                    />
                </div>
            )}
        </div>
    );
}

function generateAlerts(
    kpis: QualityKpis | null,
    brChart: BrChartItem[],
): Alert[] {
    if (!kpis) return [];
    const alerts: Alert[] = [];
    const now = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const push = (cond: boolean, type: string, level: Alert['level']) => {
        if (cond) alerts.push({ type, level, message: now });
    };

    const rftJour = kpis.rft_jour.value;
    const brBundling = kpis.br_bundling_jour.value;

    if (rftJour !== null) {
        push(rftJour < 95, 'RFT CRITIQUE — En dessous de 95%', 'red');
        push(
            rftJour >= 95 && rftJour < 98,
            'RFT EN BAISSE — Sous la cible de 98%',
            'orange',
        );
    }

    const brGtdJour = kpis.br_gtd_jour.value;
    if (brGtdJour !== null) {
        push(brGtdJour > 5, 'BR GTD CRITIQUE — Dépassement du seuil', 'red');
        push(
            brGtdJour > 4 && brGtdJour <= 5,
            'BR GTD VIGILANCE — Approche du seuil',
            'orange',
        );
    }

    if (brBundling !== null) {
        push(
            brBundling > 5,
            'BR BUNDLING CRITIQUE — Dépassement du seuil',
            'red',
        );
        push(
            brBundling > 4 && brBundling <= 5,
            'BR BUNDLING VIGILANCE',
            'orange',
        );
    }

    // Check stages from brChart — only alert on stages with actual data
    brChart.forEach((item) => {
        if (item.defect_pct !== null) {
            if (item.defect_pct > 5) {
                alerts.push({
                    type: `${item.stage} — Taux de rejet critique`,
                    level: 'red',
                    message: `${item.defect_pct}% — dépassement du seuil 5%`,
                });
            } else if (item.defect_pct > 4) {
                alerts.push({
                    type: `${item.stage} — Taux de rejet en vigilance`,
                    level: 'orange',
                    message: `${item.defect_pct}% — approche du seuil 5%`,
                });
            }
        }
    });

    if (alerts.length === 0) {
        alerts.push({
            type: 'Aucune alerte — Tous les indicateurs sont dans les objectifs',
            level: 'green',
            message: now,
        });
    }

    return alerts.slice(0, 8);
}

export default function QualityPage() {
    const [kpis, setKpis] = useState<QualityKpis | null>(null);
    const [brChart, setBrChart] = useState<BrChartItem[]>([]);
    const [qpTeams, setQpTeams] = useState<{
        best: PodiumTeam[];
        worst: PodiumTeam[];
        is_partial: boolean;
    }>({
        best: [],
        worst: [],
        is_partial: true,
    });
    const [trend, setTrend] = useState<AnnualTrendItem[]>([]);
    const [paretoRft, setParetoRft] = useState<ParetoItem[]>([]);
    const [paretoInsp, setParetoInsp] = useState<ParetoItem[]>([]);
    const [paretoFg, setParetoFg] = useState<ParetoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [openModal, setOpenModal] = useState<KpiKey | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { getFilterParams } = useFilters();

    const fetchData = useCallback(async () => {
        try {
            const filters = getFilterParams();
            const [
                kpisRes,
                brRes,
                teamsRes,
                trendRes,
                paretoRftRes,
                paretoInspRes,
                paretoFgRes,
            ] = await Promise.allSettled([
                fetchQualityKpis(filters),
                fetchQualityBrChart(filters),
                fetchQualityQpTeams(filters),
                fetchQualityAnnualTrend(),
                fetchQualityParetoRft(filters),
                fetchQualityParetoInspection(filters),
                fetchQualityParetoFg(filters),
            ]);

            if (kpisRes.status === 'fulfilled') setKpis(kpisRes.value);
            if (brRes.status === 'fulfilled') setBrChart(brRes.value.data);
            if (teamsRes.status === 'fulfilled') {
                const t = teamsRes.value;
                const mapTeam = (team: QpTeam, rank: number): PodiumTeam => ({
                    rank,
                    chain: team.chain,
                    score: team.score,
                    max_score: team.max_score,
                    rft_ok: team.rft_ok,
                    br_in_ok: team.br_in_ok ?? false,
                    br_gtd_ok: team.br_gtd_ok ?? false,
                    br_ok: team.br_ok ?? false,
                    defect_pct: team.defect_pct,
                    partial_score: team.partial_score,
                });
                setQpTeams({
                    best: t.best.map((team, i) => mapTeam(team, i + 1)),
                    worst: t.worst.map((team, i) => mapTeam(team, i + 1)),
                    is_partial: t.is_partial,
                });
            }
            if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data);
            if (paretoRftRes.status === 'fulfilled')
                setParetoRft(paretoRftRes.value.data);
            if (paretoInspRes.status === 'fulfilled')
                setParetoInsp(paretoInspRes.value.data);
            if (paretoFgRes.status === 'fulfilled')
                setParetoFg(paretoFgRes.value.data);

            const anyFailed = [
                kpisRes,
                brRes,
                teamsRes,
                trendRes,
                paretoRftRes,
                paretoInspRes,
                paretoFgRes,
            ].some((r) => r.status === 'rejected');

            if (anyFailed && kpisRes.status === 'rejected') {
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
    }, [getFilterParams]);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(fetchData, 60000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData]);

    const alerts = generateAlerts(kpis, brChart);

    const exportRows = kpis
        ? [
              {
                  kpi: 'BR CGL (année)',
                  valeur: kpis.br_cgl.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR GTD (jour)',
                  valeur: kpis.br_gtd_jour.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR GTD DDA (année)',
                  valeur: kpis.br_gtd_annee.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'RFT (jour)',
                  valeur: kpis.rft_jour.value ?? '—',
                  cible: '≥ 98%',
              },
              {
                  kpi: 'RFT DDA (année)',
                  valeur: kpis.rft_annee.value ?? '—',
                  cible: '≥ 98%',
              },
              {
                  kpi: 'BR Bundling (jour)',
                  valeur: kpis.br_bundling_jour.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Bundling DDA',
                  valeur: kpis.br_bundling_annee.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Print (jour)',
                  valeur: kpis.br_print.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Print DDA',
                  valeur: kpis.br_print_dda.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Care Label (jour)',
                  valeur: kpis.br_care_label_jour.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Care Label DDA',
                  valeur: kpis.br_care_label_dda.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Accessoires (jour)',
                  valeur: kpis.br_accessoires_jour.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Accessoires DDA',
                  valeur: kpis.br_accessoires_dda.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Compo (jour)',
                  valeur: kpis.br_compo_jour.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Compo DDA',
                  valeur: kpis.br_compo_dda.value ?? '—',
                  cible: '≤ 5%',
              },
              {
                  kpi: 'BR Commande (DDA)',
                  valeur: kpis.br_commande.value ?? '—',
                  cible: '≤ 5%',
              },
              ...brChart.map((s) => ({
                  kpi: `BR ${s.stage}`,
                  valeur: s.defect_pct ?? '—',
                  cible: '≤ 5%',
              })),
          ]
        : [];

    return (
        <>
            <Head title="Qualité — BACOVET" />
            <AppShell
                page="/quality"
                title="Qualité"
                subtitle="Série 100 · Performance Qualité"
                exportRows={exportRows}
                exportFilename="BACOVET_Qualite_S100"
            >
                {error && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div className="text-xs font-bold uppercase">
                            {error}
                        </div>
                    </div>
                )}

                {/* Section A — KPI Cards Row 1 */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="BR CGL (DDA)"
                        kpi={kpis?.br_cgl ?? { value: null, status: 'grey' }}
                        target="≤ 5%"
                        source="DIVA"
                        onClick={() => setOpenModal('br_cgl')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR GTD (Ce jour)"
                        kpi={
                            kpis?.br_gtd_jour ?? { value: null, status: 'grey' }
                        }
                        target="≤ 5%"
                        source="DIVA"
                        onClick={() => setOpenModal('br_gtd_jour')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="RFT (Ce jour)"
                        kpi={kpis?.rft_jour ?? { value: null, status: 'grey' }}
                        target="≥ 98%"
                        source="GPRO"
                        onClick={() => setOpenModal('rft_jour')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Bundling (Ce jour)"
                        kpi={
                            kpis?.br_bundling_jour ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="GPRO"
                        onClick={() => setOpenModal('br_bundling_jour')}
                        isLoading={loading}
                    />
                </div>

                {/* Section A — KPI Cards Row 2 */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="BR GTD DDA (Année)"
                        kpi={
                            kpis?.br_gtd_annee ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="DIVA"
                        onClick={() => setOpenModal('br_gtd_dda')}
                        trend={trend
                            .map((d) => d.br_gtd)
                            .filter((v): v is number => v !== null)}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="RFT DDA (Année)"
                        kpi={kpis?.rft_annee ?? { value: null, status: 'grey' }}
                        target="≥ 98%"
                        source="GPRO"
                        onClick={() => setOpenModal('rft_annee')}
                        trend={trend
                            .map((d) => d.rft)
                            .filter((v): v is number => v !== null)}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Bundling DDA (Année)"
                        kpi={
                            kpis?.br_bundling_annee ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="GPRO"
                        onClick={() => setOpenModal('br_bundling_annee')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Print (Ce jour)"
                        kpi={kpis?.br_print ?? { value: null, status: 'grey' }}
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_print')}
                        isLoading={loading}
                    />
                </div>

                {/* Section A — KPI Cards Row 3 (Google Drive — Sprint 7) */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="BR Print DDA (Année)"
                        kpi={
                            kpis?.br_print_dda ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_print_dda')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Care Label (Ce jour)"
                        kpi={
                            kpis?.br_care_label_jour ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_care_label_jour')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Care Label DDA (Année)"
                        kpi={
                            kpis?.br_care_label_dda ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_care_label_dda')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Accessoires (Ce jour)"
                        kpi={
                            kpis?.br_accessoires_jour ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_accessoires_jour')}
                        isLoading={loading}
                    />
                </div>
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="BR Accessoires DDA (Année)"
                        kpi={
                            kpis?.br_accessoires_dda ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_accessoires_dda')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Compo (Ce jour)"
                        kpi={
                            kpis?.br_compo_jour ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_compo_jour')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Compo DDA (Année)"
                        kpi={
                            kpis?.br_compo_dda ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_compo_dda')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Commande (DDA)"
                        kpi={
                            kpis?.br_commande ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_commande')}
                        isLoading={loading}
                    />
                </div>

                {/* Section B — BR Bar Chart + Alerts */}
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <Panel
                        title="Taux de rejet (BR) par étape de contrôle"
                        className="lg:col-span-2"
                    >
                        {brChart.length === 0 ? (
                            <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                                {loading
                                    ? 'Chargement...'
                                    : 'Aucune donnée disponible'}
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={brChart.map((d) => ({
                                        ...d,
                                        chartValue: d.defect_pct ?? 0,
                                    }))}
                                >
                                    <CartesianGrid
                                        stroke="var(--border)"
                                        strokeDasharray="3 3"
                                    />
                                    <XAxis
                                        dataKey="stage"
                                        tick={{
                                            fill: 'var(--muted-foreground)',
                                            fontSize: 11,
                                        }}
                                    />
                                    <YAxis
                                        unit="%"
                                        tick={{
                                            fill: 'var(--muted-foreground)',
                                            fontSize: 11,
                                        }}
                                        domain={[0, 10]}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        formatter={(
                                            value: unknown,
                                            _name: string,
                                            props: { payload?: BrChartItem },
                                        ) => {
                                            const original =
                                                props.payload?.defect_pct;
                                            return [
                                                original != null
                                                    ? `${original}%`
                                                    : 'Données non disponibles',
                                                'BR',
                                            ];
                                        }}
                                    />
                                    <ReferenceLine
                                        y={5}
                                        stroke="var(--warning)"
                                        strokeDasharray="4 4"
                                        label={{
                                            value: 'Cible 5%',
                                            fill: 'var(--warning)',
                                            fontSize: 10,
                                        }}
                                    />
                                    <Bar
                                        dataKey="chartValue"
                                        radius={[4, 4, 0, 0]}
                                    >
                                        {brChart.map((d, i) => (
                                            <Cell
                                                key={i}
                                                fill={
                                                    d.defect_pct != null
                                                        ? barFill(d.status)
                                                        : 'var(--muted)'
                                                }
                                                opacity={
                                                    d.defect_pct != null
                                                        ? 1
                                                        : 0.3
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </Panel>

                    <Panel title="Dernières alertes qualité">
                        <div className="space-y-2">
                            {alerts.map((a, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <TrafficBadge status={a.level} />
                                        <div className="min-w-0">
                                            <div className="truncate text-xs font-bold tracking-wider uppercase">
                                                {a.type}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-mono text-[10px] text-muted-foreground">
                                        {a.message}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>

                {/* Section C — Podiums Équipes QP */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <QpTeamPodium
                        title="Meilleure Équipe QP"
                        teams={qpTeams.best}
                        variant="best"
                        isLoading={loading}
                    />
                    <QpTeamPodium
                        title="Équipe à Améliorer"
                        teams={qpTeams.worst}
                        variant="worst"
                        isLoading={loading}
                    />
                </div>
                {qpTeams.is_partial && (
                    <div className="-mt-2 mb-4 text-center font-mono text-[10px] text-muted-foreground">
                        Score partiel — données DIVA + DRIVE en attente
                    </div>
                )}

                {/* Section D — Pareto Tabs */}
                <Panel title="Pareto des défauts">
                    <Tabs defaultValue="rft">
                        <TabsList>
                            <TabsTrigger
                                value="rft"
                                className="text-xs tracking-wider uppercase"
                            >
                                Pareto RFT
                            </TabsTrigger>
                            <TabsTrigger
                                value="colis"
                                className="text-xs tracking-wider uppercase"
                            >
                                Pareto Inspection Colis
                            </TabsTrigger>
                            <TabsTrigger
                                value="fg"
                                className="text-xs tracking-wider uppercase"
                            >
                                Pareto FG (Colis)
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="rft">
                            {paretoRft.length === 0 ? (
                                <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                                    {loading
                                        ? 'Chargement...'
                                        : 'Aucune donnée disponible'}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <ComposedChart
                                        data={paretoRft}
                                        layout="vertical"
                                    >
                                        <CartesianGrid
                                            stroke="var(--border)"
                                            strokeDasharray="3 3"
                                        />
                                        <XAxis
                                            type="number"
                                            tick={{
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 11,
                                            }}
                                        />
                                        <YAxis
                                            dataKey="label"
                                            type="category"
                                            width={130}
                                            tick={{
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 11,
                                            }}
                                        />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11 }}
                                        />
                                        <ReferenceLine
                                            x={0}
                                            stroke="var(--warning)"
                                            strokeDasharray="4 4"
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill="var(--primary)"
                                            radius={[0, 4, 4, 0]}
                                            name="Quantité"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke="var(--destructive)"
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            name="Cumulé %"
                                            xAxisId={0}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </TabsContent>
                        <TabsContent value="colis">
                            {paretoInsp.length === 0 ? (
                                <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                                    {loading
                                        ? 'Chargement...'
                                        : 'Aucune donnée disponible'}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <ComposedChart
                                        data={paretoInsp}
                                        layout="vertical"
                                    >
                                        <CartesianGrid
                                            stroke="var(--border)"
                                            strokeDasharray="3 3"
                                        />
                                        <XAxis
                                            type="number"
                                            tick={{
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 11,
                                            }}
                                        />
                                        <YAxis
                                            dataKey="label"
                                            type="category"
                                            width={130}
                                            tick={{
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 11,
                                            }}
                                        />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11 }}
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill="var(--chart-4)"
                                            radius={[0, 4, 4, 0]}
                                            name="Occurrences"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke="var(--destructive)"
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            name="Cumulé %"
                                            xAxisId={0}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </TabsContent>
                        <TabsContent value="fg">
                            {paretoFg.length === 0 ? (
                                <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                                    {loading
                                        ? 'Chargement...'
                                        : 'Aucune donnée disponible'}
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <ComposedChart
                                        data={paretoFg}
                                        layout="vertical"
                                    >
                                        <CartesianGrid
                                            stroke="var(--border)"
                                            strokeDasharray="3 3"
                                        />
                                        <XAxis
                                            type="number"
                                            tick={{
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 11,
                                            }}
                                        />
                                        <YAxis
                                            dataKey="label"
                                            type="category"
                                            width={130}
                                            tick={{
                                                fill: 'var(--muted-foreground)',
                                                fontSize: 11,
                                            }}
                                        />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Legend
                                            wrapperStyle={{ fontSize: 11 }}
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill="var(--chart-2)"
                                            radius={[0, 4, 4, 0]}
                                            name="Rejets FG"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="cumulative"
                                            stroke="var(--destructive)"
                                            strokeWidth={2}
                                            dot={{ r: 3 }}
                                            name="Cumulé %"
                                            xAxisId={0}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            )}
                        </TabsContent>
                    </Tabs>
                </Panel>

                {/* Section F — KPI Summary Table */}
                {loading ? (
                    <Panel
                        title="Synthèse des indicateurs Qualité"
                        className="mt-4"
                    >
                        <div className="animate-pulse space-y-2">
                            {[...Array(6)].map((_, i) => (
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
                ) : kpis ? (
                    <Panel
                        title="Synthèse des indicateurs Qualité"
                        className="mt-4"
                    >
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    <th className="py-2 text-left">KPI ID</th>
                                    <th className="text-left">Indicateur</th>
                                    <th className="text-right">Valeur</th>
                                    <th className="text-right">Cible</th>
                                    <th className="text-right">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="font-mono">
                                {[
                                    [
                                        'BR CGL (DDA)',
                                        'BR CGL (DDA)',
                                        kpis.br_cgl.value,
                                        '≤ 5%',
                                        kpis.br_cgl.status,
                                    ],
                                    [
                                        'BR GTD (jour)',
                                        'BR GTD (jour)',
                                        kpis.br_gtd_jour.value,
                                        '≤ 5%',
                                        kpis.br_gtd_jour.status,
                                    ],
                                    [
                                        'BR GTD DDA (année)',
                                        'BR GTD DDA (année)',
                                        kpis.br_gtd_annee.value,
                                        '≤ 5%',
                                        kpis.br_gtd_annee.status,
                                    ],
                                    [
                                        'RFT Prod (jour)',
                                        'RFT Prod (jour)',
                                        kpis.rft_jour.value,
                                        '≥ 98%',
                                        kpis.rft_jour.status,
                                    ],
                                    [
                                        'RFT DDA (année)',
                                        'RFT DDA (année)',
                                        kpis.rft_annee.value,
                                        '≥ 98%',
                                        kpis.rft_annee.status,
                                    ],
                                    [
                                        'BR Bundling (jour)',
                                        'BR Bundling (jour)',
                                        kpis.br_bundling_jour.value,
                                        '≤ 5%',
                                        kpis.br_bundling_jour.status,
                                    ],
                                    [
                                        'BR Bundling DDA',
                                        'BR Bundling DDA',
                                        kpis.br_bundling_annee.value,
                                        '≤ 5%',
                                        kpis.br_bundling_annee.status,
                                    ],
                                    [
                                        'BR Print (jour)',
                                        'BR Print (jour)',
                                        kpis.br_print.value,
                                        '≤ 5%',
                                        kpis.br_print.status,
                                    ],
                                    [
                                        'BR Print DDA',
                                        'BR Print DDA',
                                        kpis.br_print_dda.value,
                                        '≤ 5%',
                                        kpis.br_print_dda.status,
                                    ],
                                    [
                                        'BR Care Label (jour)',
                                        'BR Care Label (jour)',
                                        kpis.br_care_label_jour.value,
                                        '≤ 5%',
                                        kpis.br_care_label_jour.status,
                                    ],
                                    [
                                        'BR Care Label DDA',
                                        'BR Care Label DDA',
                                        kpis.br_care_label_dda.value,
                                        '≤ 5%',
                                        kpis.br_care_label_dda.status,
                                    ],
                                    [
                                        'BR Accessoires (jour)',
                                        'BR Accessoires (jour)',
                                        kpis.br_accessoires_jour.value,
                                        '≤ 5%',
                                        kpis.br_accessoires_jour.status,
                                    ],
                                    [
                                        'BR Accessoires DDA',
                                        'BR Accessoires DDA',
                                        kpis.br_accessoires_dda.value,
                                        '≤ 5%',
                                        kpis.br_accessoires_dda.status,
                                    ],
                                    [
                                        'BR Compo (jour)',
                                        'BR Compo (jour)',
                                        kpis.br_compo_jour.value,
                                        '≤ 5%',
                                        kpis.br_compo_jour.status,
                                    ],
                                    [
                                        'BR Compo DDA',
                                        'BR Compo DDA',
                                        kpis.br_compo_dda.value,
                                        '≤ 5%',
                                        kpis.br_compo_dda.status,
                                    ],
                                    [
                                        'BR Commande (DDA)',
                                        'BR Commande (DDA)',
                                        kpis.br_commande.value,
                                        '≤ 5%',
                                        kpis.br_commande.status,
                                    ],
                                ].map((r, i) => (
                                    <tr
                                        key={i}
                                        className="border-b border-border/50"
                                    >
                                        <td className="py-2 text-primary">
                                            {r[0] as string}
                                        </td>
                                        <td>{r[1] as string}</td>
                                        <td className="text-right tabular-nums">
                                            {r[2] != null
                                                ? `${(r[2] as number).toFixed(1)}%`
                                                : '—'}
                                        </td>
                                        <td className="text-right text-muted-foreground">
                                            {r[3] as string}
                                        </td>
                                        <td className="text-right">
                                            <TrafficBadge
                                                status={
                                                    r[4] === 'inactive' ||
                                                    r[4] === 'pending' ||
                                                    r[4] === 'grey'
                                                        ? 'grey'
                                                        : (r[4] as
                                                              | 'green'
                                                              | 'orange'
                                                              | 'red')
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {lastSync && (
                            <div className="mt-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Dernière sync:{' '}
                                <span className="text-foreground">
                                    {lastSync.toLocaleTimeString('fr-FR')}
                                </span>
                            </div>
                        )}
                    </Panel>
                ) : null}

                <KpiDetailModal
                    kpiKey={openModal}
                    kpiData={kpis}
                    brChartData={brChart}
                    trendData={trend}
                    onClose={() => setOpenModal(null)}
                />
            </AppShell>
        </>
    );
}
