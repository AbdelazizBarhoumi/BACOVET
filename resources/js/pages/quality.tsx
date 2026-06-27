import { Head } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bar,
    CartesianGrid,
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
import { BigNumberCard, Panel } from '@/components/widgets';
import { useFilters } from '@/context/FilterContext';
import { useLiveData } from '@/hooks/use-live-data';
import {
    fetchQualityKpis,
    fetchQualityQpTeams,
    fetchQualityAnnualTrend,
    fetchQualityParetoRft,
    fetchQualityParetoInspection,
    type QualityKpis,
    type QpTeam,
    type AnnualTrendItem,
    type ParetoItem,
    type KpiStatus,
} from '@/services/qualityApi';

const tooltipStyle = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '8px 12px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
};

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

    return (
        <div
            className={`flex h-full flex-col ${onClick ? 'cursor-pointer rounded-lg transition-all' : ''} ${kpi.status === 'red' || kpi.status === 'orange' ? 'animate-flash-alert' : ''}`}
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

export default function QualityPage() {
    const [kpis, setKpis] = useState<QualityKpis | null>(null);
    const [qpTeams, setQpTeams] = useState<{
        best: PodiumTeam[];
        worst: PodiumTeam[];
    }>({
        best: [],
        worst: [],
    });
    const [trend, setTrend] = useState<AnnualTrendItem[]>([]);
    const [paretoRft, setParetoRft] = useState<ParetoItem[]>([]);
    const [paretoInsp, setParetoInsp] = useState<ParetoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openModal, setOpenModal] = useState<KpiKey | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { getFilterParams } = useFilters();
    const { refreshIntervalSec, recordFetchSuccess, recordFetchError } = useLiveData();

    const fetchData = useCallback(async () => {
        try {
            const filters = getFilterParams();
            const [
                kpisRes,
                teamsRes,
                trendRes,
                paretoRftRes,
                paretoInspRes,
            ] = await Promise.allSettled([
                fetchQualityKpis(filters),
                fetchQualityQpTeams(filters),
                fetchQualityAnnualTrend(),
                fetchQualityParetoRft(filters),
                fetchQualityParetoInspection(filters),
            ]);

            if (kpisRes.status === 'fulfilled') setKpis(kpisRes.value);
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
                });
            }
            if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data);
            if (paretoRftRes.status === 'fulfilled')
                setParetoRft(paretoRftRes.value.data);
            if (paretoInspRes.status === 'fulfilled')
                setParetoInsp(paretoInspRes.value.data);

            const anyFailed = [
                kpisRes,
                teamsRes,
                trendRes,
                paretoRftRes,
                paretoInspRes,
            ].some((r) => r.status === 'rejected');

            if (anyFailed && kpisRes.status === 'rejected') {
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
    }, [getFilterParams, recordFetchError, recordFetchSuccess]);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(fetchData, refreshIntervalSec * 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData, refreshIntervalSec]);

    return (
        <>
            <Head title="Qualité — BACOVET" />
            <AppShell
                page="/quality"
                title="Qualité"
                subtitle="Série 100 · Performance Qualité"
            >
                {error && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div className="text-xs font-bold uppercase">
                            {error}
                        </div>
                    </div>
                )}

                {/* Row 1: F-REQ-101, 102, 104, 106 */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="BR (Blocking Rate annuel)"
                        kpi={
                            kpis?.br_commande ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="DIVA"
                        onClick={() => setOpenModal('br_commande')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR GTD (jour en cours)"
                        kpi={
                            kpis?.br_gtd_jour ?? { value: null, status: 'grey' }
                        }
                        target="≤ 5%"
                        source="DIVA"
                        onClick={() => setOpenModal('br_gtd_jour')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="RFT (Right First Time — jour en cours)"
                        kpi={kpis?.rft_jour ?? { value: null, status: 'grey' }}
                        target="≥ 98%"
                        source="gpro-prod"
                        onClick={() => setOpenModal('rft_jour')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Bundling (jour en cours)"
                        kpi={
                            kpis?.br_bundling_jour ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="gpro-prod"
                        onClick={() => setOpenModal('br_bundling_jour')}
                        trend={trend
                            .map((d) => d.br_bundling)
                            .filter((v): v is number => v !== null)}
                        isLoading={loading}
                    />
                </div>

                {/* Row 2: F-REQ-103, 105, 107, 108 */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="BR GTD DDA (annuel)"
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
                        label="RFT DDA (annuel)"
                        kpi={kpis?.rft_annee ?? { value: null, status: 'grey' }}
                        target="≥ 98%"
                        source="gpro-prod"
                        onClick={() => setOpenModal('rft_annee')}
                        trend={trend
                            .map((d) => d.rft)
                            .filter((v): v is number => v !== null)}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Bundling DDA (annuel)"
                        kpi={
                            kpis?.br_bundling_annee ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="gpro-prod"
                        onClick={() => setOpenModal('br_bundling_annee')}
                        trend={trend
                            .map((d) => d.br_bundling)
                            .filter((v): v is number => v !== null)}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Print (jour en cours)"
                        kpi={kpis?.br_print ?? { value: null, status: 'grey' }}
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_print')}
                        isLoading={loading}
                    />
                </div>

                {/* Row 3: F-REQ-109, 110, 111, 112 */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="BR Print DDA (annuel)"
                        kpi={
                            kpis?.br_print_dda ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_print_dda')}
                        trend={trend
                            .map((d) => d.br_print)
                            .filter((v): v is number => v !== null)}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Care Label (jour en cours)"
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
                        label="BR Care Label DDA (annuel)"
                        kpi={
                            kpis?.br_care_label_dda ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_care_label_dda')}
                        trend={trend
                            .map((d) => d.br_care_label)
                            .filter((v): v is number => v !== null)}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Accessoires (jour en cours)"
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

                {/* Row 4: F-REQ-113, 114, 115, 120 */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="BR Accessoires DDA (annuel)"
                        kpi={
                            kpis?.br_accessoires_dda ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_accessoires_dda')}
                        trend={trend
                            .map((d) => d.br_accessoires)
                            .filter((v): v is number => v !== null)}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR Compo (jour en cours)"
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
                        label="BR Compo DDA (annuel)"
                        kpi={
                            kpis?.br_compo_dda ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="Google Drive"
                        onClick={() => setOpenModal('br_compo_dda')}
                        trend={trend
                            .map((d) => d.br_compo)
                            .filter((v): v is number => v !== null)}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="BR IN (jour en cours)"
                        kpi={
                            kpis?.br_in_jour ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="DRIVE"
                        onClick={() => setOpenModal('br_in_jour')}
                        isLoading={loading}
                    />
                </div>

                {/* Row 5: F-REQ-121 */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <KpiCard
                        label="BR IN DDA (annuel)"
                        kpi={
                            kpis?.br_in_dda ?? {
                                value: null,
                                status: 'grey',
                            }
                        }
                        target="≤ 5%"
                        source="DRIVE"
                        onClick={() => setOpenModal('br_in_dda')}
                        isLoading={loading}
                    />
                </div>

                {/* F-REQ-118 & F-REQ-119: QP Team Podiums */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <QpTeamPodium
                        title="Best QP Team (Top 3 chaines)"
                        teams={qpTeams.best}
                        variant="best"
                        isLoading={loading}
                    />
                    <QpTeamPodium
                        title="Low QP Team (3 chaines à améliorer)"
                        teams={qpTeams.worst}
                        variant="worst"
                        isLoading={loading}
                    />
                </div>

                {/* F-REQ-116 & F-REQ-117: Pareto Charts */}
                <Panel title="Pareto des défauts">
                    <Tabs defaultValue="rft">
                        <TabsList>
                            <TabsTrigger
                                value="rft"
                                className="text-xs tracking-wider uppercase"
                            >
                                Pareto Defects RFT (jour en cours)
                            </TabsTrigger>
                            <TabsTrigger
                                value="colis"
                                className="text-xs tracking-wider uppercase"
                            >
                                Pareto Defects Inspection Colis (BR IN + BR GTD)
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
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                                            labelStyle={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 11, marginBottom: 4 }}
                                            itemStyle={{ fontSize: 11 }}
                                        />
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
                                        <Tooltip
                                            contentStyle={tooltipStyle}
                                            cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                                            labelStyle={{ color: 'var(--foreground)', fontWeight: 700, fontSize: 11, marginBottom: 4 }}
                                            itemStyle={{ fontSize: 11 }}
                                        />
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
                    </Tabs>
                </Panel>

                <KpiDetailModal
                    kpiKey={openModal}
                    kpiData={kpis}
                    trendData={trend}
                    onClose={() => setOpenModal(null)}
                />
            </AppShell>
        </>
    );
}
