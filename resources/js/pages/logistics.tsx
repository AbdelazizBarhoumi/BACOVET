import { Head } from '@inertiajs/react';
import { AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import type { KpiKey } from '@/components/logistics/kpiDetailConfig';
import LogisticsKpiDetailModal from '@/components/logistics/LogisticsKpiDetailModal';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
    BigNumberCard,
    Gauge,
    Panel,
    TrafficBadge,
} from '@/components/widgets';
import { useFilters } from '@/context/FilterContext';
import { useLiveData } from '@/hooks/use-live-data';
import {
    fetchLogisticsKpis,
    fetchLogisticsStockKpis,
    fetchLogisticsStockComposition,
    fetchLogisticsOfs,
    fetchLogisticsCoverage,
    fetchLogisticsStockSearch,
    fetchLogisticsStockReliability,
    type LogisticsKpis,
    type StockKpis,
    type StockComposition,
    type LogisticsOfs,
    type LogisticsCoverage,
    type StockSearchItem,
    type StockReliability,
} from '@/services/logisticsApi';

function toStatus(s: string | undefined): 'green' | 'orange' | 'red' | 'grey' {
    if (s === 'green' || s === 'orange' || s === 'red' || s === 'grey') return s;
    return 'grey';
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

function PanelSkeleton() {
    return (
        <div className="animate-pulse rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
                <div className="h-3 w-32 rounded bg-muted" />
            </div>
            <div className="p-4">
                <div className="h-32 rounded bg-muted/50" />
            </div>
        </div>
    );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="animate-pulse rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
                <div className="h-3 w-40 rounded bg-muted" />
            </div>
            <div className="p-4">
                {Array.from({ length: rows }).map((_, i) => (
                    <div
                        key={i}
                        className="mb-2 flex gap-4 border-b border-border/50 py-2"
                    >
                        <div className="h-3 w-20 rounded bg-muted" />
                        <div className="h-3 w-32 rounded bg-muted" />
                        <div className="h-3 w-16 rounded bg-muted" />
                        <div className="h-3 w-16 rounded bg-muted" />
                        <div className="h-3 w-16 rounded bg-muted" />
                    </div>
                ))}
            </div>
        </div>
    );
}

const tt = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    padding: '8px 12px',
    fontSize: 12,
    fontFamily: 'var(--font-mono)',
};
const PIE_COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--success)',
    'var(--warning)',
    'var(--muted-foreground)',
];

export default function LogisticsPage() {
    const [q, setQ] = useState('');
    const [searchPage, setSearchPage] = useState(1);

    const [kpis, setKpis] = useState<LogisticsKpis | null>(null);
    const [stockKpis, setStockKpis] = useState<StockKpis | null>(null);
    const [stockComp, setStockComp] = useState<StockComposition | null>(null);
    const [ofsData, setOfsData] = useState<LogisticsOfs | null>(null);
    const [coverageData, setCoverageData] =
        useState<LogisticsCoverage | null>(null);
    const [stockRows, setStockRows] = useState<StockSearchItem[]>([]);
    const [stockTotal, setStockTotal] = useState(0);
    const [stockTotalPages, setStockTotalPages] = useState(1);
    const [stockReliability, setStockReliability] =
        useState<StockReliability | null>(null);
    const [loading, setLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [openModal, setOpenModal] = useState<KpiKey | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { getFilterParams } = useFilters();
    const { refreshIntervalSec, recordFetchSuccess, recordFetchError } = useLiveData();

    const fetchData = useCallback(async () => {
        try {
            const filters = getFilterParams();
            const [
                kpisRes,
                stockKpisRes,
                stockCompRes,
                ofsRes,
                coverageRes,
                searchRes,
                reliabilityRes,
            ] = await Promise.allSettled([
                fetchLogisticsKpis(),
                fetchLogisticsStockKpis(),
                fetchLogisticsStockComposition(),
                fetchLogisticsOfs(),
                fetchLogisticsCoverage(),
                fetchLogisticsStockSearch({
                    q,
                    page: searchPage.toString(),
                    ...filters,
                }),
                fetchLogisticsStockReliability(),
            ]);

            if (kpisRes.status === 'fulfilled') setKpis(kpisRes.value);
            if (stockKpisRes.status === 'fulfilled')
                setStockKpis(stockKpisRes.value);
            if (stockCompRes.status === 'fulfilled')
                setStockComp(stockCompRes.value);
            if (ofsRes.status === 'fulfilled') setOfsData(ofsRes.value);
            if (coverageRes.status === 'fulfilled')
                setCoverageData(coverageRes.value);
            if (searchRes.status === 'fulfilled') {
                setStockRows(searchRes.value.data);
                setStockTotal(searchRes.value.total);
                setStockTotalPages(searchRes.value.total_pages);
            }
            if (reliabilityRes.status === 'fulfilled')
                setStockReliability(reliabilityRes.value);

            const anyFailed = [
                kpisRes,
                stockKpisRes,
                stockCompRes,
                ofsRes,
                coverageRes,
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
    }, [q, searchPage, getFilterParams, recordFetchError, recordFetchSuccess]);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(fetchData, refreshIntervalSec * 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData, refreshIntervalSec]);

    const exportRows = stockRows.map((s) => ({
        code: s.code_mp,
        designation: s.designation,
        famille: s.famille,
        couleur: s.couleur,
        magasin: s.idmagasin ?? '',
        qtte: s.qtte,
        reserve: s.qtte_reserve,
    }));

    return (
        <>
            <Head title="Logistique & Planning — BACOVET" />
            <AppShell
                page="/logistics"
                title="Logistique & Planning"
                subtitle="Série 300 · Supply Chain"
                exportRows={exportRows}
                exportFilename="BACOVET_Stock_S300"
            >
                {/* A — Delivery Performance */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {loading ? (
                        <>
                            <KpiCardSkeleton />
                            <KpiCardSkeleton />
                            <KpiCardSkeleton />
                            <KpiCardSkeleton />
                        </>
                    ) : (
                        <>
                            <div className={toStatus(kpis?.dot?.status) === 'red' || toStatus(kpis?.dot?.status) === 'orange' ? 'animate-flash-alert' : ''}>
                                <BigNumberCard
                                    label="DOT ·334"
                                    value={kpis?.dot?.value ?? '—'}
                                    target="≥ 95%"
                                    status={toStatus(kpis?.dot?.status)}
                                    source={kpis?.dot?.source ?? 'GPRO Planning'}
                                    onClick={() => setOpenModal('dot')}
                                />
                                {kpis?.dot?.is_fallback && (
                                    <div className="mt-0.5 rounded bg-muted/50 px-1.5 py-0.5 text-center font-mono text-[8px] font-bold tracking-wider text-muted-foreground uppercase">
                                        Estimé — pas de données Drive
                                    </div>
                                )}
                            </div>
                            <div className={toStatus(kpis?.hot?.status) === 'red' || toStatus(kpis?.hot?.status) === 'orange' ? 'animate-flash-alert' : ''}>
                                <BigNumberCard
                                    label="HOT ·335"
                                    value={kpis?.hot?.value ?? '—'}
                                    target="≥ 95%"
                                    status={toStatus(kpis?.hot?.status)}
                                    source={kpis?.hot?.source ?? 'GPRO Planning'}
                                    onClick={() => setOpenModal('hot')}
                                />
                                {kpis?.hot?.is_fallback && (
                                    <div className="mt-0.5 rounded bg-muted/50 px-1.5 py-0.5 text-center font-mono text-[8px] font-bold tracking-wider text-muted-foreground uppercase">
                                        Estimé — pas de données Drive
                                    </div>
                                )}
                                {kpis?.hot?.note && (
                                    <div className="mt-1 font-mono text-[9px] text-muted-foreground/70 px-1">
                                        {kpis.hot.note}
                                    </div>
                                )}
                            </div>
                            <div className={toStatus(kpis?.respect_plan?.status) === 'red' || toStatus(kpis?.respect_plan?.status) === 'orange' ? 'animate-flash-alert' : ''}>
                                <BigNumberCard
                                    label="Respect Planification ·336"
                                    value={kpis?.respect_plan?.value ?? '—'}
                                    target="≥ 95%"
                                    status={toStatus(kpis?.respect_plan?.status)}
                                    source={
                                        kpis?.respect_plan?.source ?? 'qte_produite'
                                    }
                                    onClick={() => setOpenModal('respect_plan')}
                                />
                            </div>
                            <div className={toStatus(kpis?.lead_time?.status) === 'red' || toStatus(kpis?.lead_time?.status) === 'orange' ? 'animate-flash-alert' : ''}>
                                <BigNumberCard
                                    label="Lead Time Global ·337"
                                    value={kpis?.lead_time?.value ?? '—'}
                                    unit="j"
                                    target="≤ 32 j"
                                    status={toStatus(kpis?.lead_time?.status)}
                                    source={kpis?.lead_time?.source ?? 'sync_gpro_of_dates'}
                                    onClick={() => setOpenModal('lead_time')}
                                />
                                {kpis?.lead_time?.is_fallback && (
                                    <div className="mt-0.5 rounded bg-muted/50 px-1.5 py-0.5 text-center font-mono text-[8px] font-bold tracking-wider text-muted-foreground uppercase">
                                        Estimé — constante 32j
                                    </div>
                                )}
                                {kpis?.lead_time?.note && (
                                    <div className="mt-1 font-mono text-[9px] text-muted-foreground/70 px-1">
                                        {kpis.lead_time.note}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {kpis?.next_export && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        <div className="font-mono text-xs tracking-wider uppercase">
                            <span className="font-bold text-primary">
                                Alerte prochain export :
                            </span>{' '}
                            {kpis.next_export}
                        </div>
                    </div>
                )}

                {/* B — Stock KPIs */}
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {loading ? (
                        <>
                            <PanelSkeleton />
                            <PanelSkeleton />
                            <PanelSkeleton />
                        </>
                    ) : (
                        <>
                            <Panel title="Stock Moyen ·316/317/318">
                                <div className="pt-2">
                                    <div className="mb-2 text-center font-mono text-2xl font-bold tabular-nums">
                                        {stockKpis?.rotation?.stock_moyen?.toLocaleString(
                                            'fr-FR',
                                        ) ?? '—'}
                                    </div>
                                    <div className="mb-1 text-center font-mono text-[10px] text-muted-foreground uppercase">
                                        Quantité totale en stock
                                    </div>
                                    {stockKpis?.rotation?.note && (
                                        <div className="text-center font-mono text-[9px] text-muted-foreground/70">
                                            {stockKpis.rotation.note}
                                        </div>
                                    )}
                                </div>
                            </Panel>
                            <Panel title="Taux de Stock Mort ·319/320/321">
                                <div className="grid grid-cols-1 gap-2 pt-2">
                                    <div className="rounded-md border border-border bg-secondary/40 p-3 text-center">
                                        <div className="font-mono text-[10px] text-muted-foreground uppercase">
                                            Articles sans mouvement 365j
                                        </div>
                                        <div className="font-mono text-2xl font-bold tabular-nums">
                                            {stockKpis?.stock_mort?.nb_articles_sans_mvt?.toLocaleString(
                                                'fr-FR',
                                            ) ?? '—'}
                                        </div>
                                    </div>
                                    <div className="rounded-md border border-border bg-secondary/40 p-3 text-center">
                                        <div className="font-mono text-[10px] text-muted-foreground uppercase">
                                            Taux stock mort
                                        </div>
                                        <div className="font-mono text-2xl font-bold tabular-nums">
                                            {stockKpis?.stock_mort?.value != null
                                                ? `${stockKpis.stock_mort.value.toFixed(2)}%`
                                                : '—'}
                                        </div>
                                        <TrafficBadge
                                            status={toStatus(
                                                stockKpis?.stock_mort?.status,
                                            )}
                                        />
                                    </div>
                                </div>
                            </Panel>
                            <Panel title="Taux d'Occupation ·322/323/324">
                                <div className="flex items-end justify-around pt-2">
                                    <Gauge
                                        value={
                                            stockKpis?.occupation?.value ?? 0
                                        }
                                        label="Global"
                                    />
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                                    <div className="font-mono text-[10px] text-muted-foreground">
                                        Rouleaux:{' '}
                                        {stockKpis?.occupation?.nb_rouleaux?.toLocaleString(
                                            'fr-FR',
                                        ) ?? '—'}
                                    </div>
                                    <div className="font-mono text-[10px] text-muted-foreground">
                                        Capacité totale:{' '}
                                        {stockKpis?.occupation?.total_conteneurs?.toLocaleString(
                                            'fr-FR',
                                        ) ?? '—'}
                                    </div>
                                </div>
                            </Panel>
                        </>
                    )}
                </div>

                {/* C — Pies */}
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {loading ? (
                        <>
                            <PanelSkeleton />
                            <PanelSkeleton />
                            <PanelSkeleton />
                        </>
                    ) : (
                        [
                            {
                                title: 'Stock par Provenance ·332',
                                data: (stockComp?.provenance ?? []).map(
                                    (p) => ({
                                        name: p.name,
                                        value: p.value,
                                    }),
                                ),
                            },
                            {
                                title: 'Stock par Marque ·333',
                                data: (stockComp?.famille ?? []).map((p) => ({
                                    name: p.name,
                                    value: p.value,
                                })),
                            },
                            {
                                title: 'Stock par Typologie ·331',
                                data: (stockComp?.typologie ?? []).map((p) => ({
                                    name: p.name,
                                    value: p.value,
                                })),
                            },
                        ].map((p) => (
                            <Panel key={p.title} title={p.title}>
                                {p.data.length === 0 ? (
                                    <div className="flex h-[220px] items-center justify-center">
                                        <div className="text-center">
                                            <div className="font-mono text-2xl text-muted-foreground/30">—</div>
                                            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                                                Aucune donnée disponible
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', height: 220, minWidth: 200 }}>
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie
                                                    data={p.data}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={75}
                                                    paddingAngle={2}
                                                >
                                                    {p.data.map((_, i) => (
                                                        <Cell
                                                            key={i}
                                                            style={{
                                                                fill: PIE_COLORS[
                                                                    i %
                                                                        PIE_COLORS.length
                                                                ],
                                                            }}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={tt}
                                                    cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                                                    labelStyle={{ color: 'var(--muted-foreground)', fontWeight: 700, fontSize: 11, marginBottom: 4 }}
                                                    itemStyle={{ color: 'var(--muted-foreground)', fontSize: 11 }}
                                                />
                                                <Legend
                                                    content={({ payload }) => (
                                                        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-1">
                                                            {payload?.map((entry, i) => (
                                                                <div key={i} className="flex items-center gap-1 font-mono text-[10px] text-foreground/80">
                                                                    <span
                                                                        className="inline-block h-2 w-2 rounded-full"
                                                                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                                                                    />
                                                                    {entry.value}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </Panel>
                        ))
                    )}
                </div>

                {/* D — OF & delivery */}
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {loading ? (
                        <>
                            <PanelSkeleton />
                            <PanelSkeleton />
                        </>
                    ) : (
                        <>
                            <Panel title="Commandes Livrées à Temps ·325/326/327">
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="rounded-md border border-border bg-secondary/40 p-3 text-center">
                                        <div className="font-mono text-[10px] text-muted-foreground uppercase">
                                            Taux de livraison
                                        </div>
                                        <div className="font-mono text-2xl font-bold tabular-nums">
                                            {ofsData?.livraison?.value != null
                                                ? `${ofsData.livraison.value}%`
                                                : '—'}
                                        </div>
                                        <TrafficBadge
                                            status={toStatus(
                                                ofsData?.livraison?.status,
                                            )}
                                        />
                                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                                            {ofsData?.livraison?.transfert_total?.toLocaleString(
                                                'fr-FR',
                                            ) ?? '—'}{' '}
                                            /{' '}
                                            {ofsData?.livraison?.total_ofs?.toLocaleString(
                                                'fr-FR',
                                            ) ?? '—'}{' '}
                                            OFs
                                        </div>
                                    </div>
                                </div>
                            </Panel>
                            <Panel title="Délai de Livraison Moyen ·328/329/330">
                                <div className="grid grid-cols-1 gap-2">
                                    <div className="rounded-md border border-border bg-secondary/40 p-3 text-center">
                                        <div className="font-mono text-[10px] text-muted-foreground uppercase">
                                            Délai moyen
                                        </div>
                                        <div className="font-mono text-2xl font-bold tabular-nums">
                                            {ofsData?.delai_moyen?.value != null
                                                ? `${parseFloat(
                                                      String(
                                                          ofsData.delai_moyen
                                                              .value,
                                                      ),
                                                  ).toFixed(1)} j`
                                                : '—'}
                                        </div>
                                        <TrafficBadge
                                            status={toStatus(
                                                ofsData?.delai_moyen?.status,
                                            )}
                                        />
                                        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                                            Sur{' '}
                                            {ofsData?.delai_moyen?.nb_ofs?.toLocaleString(
                                                'fr-FR',
                                            ) ?? '—'}{' '}
                                            OFs
                                        </div>
                                    </div>
                                </div>
                            </Panel>
                        </>
                    )}
                </div>

                {/* E — OF list */}
                {loading ? (
                    <TableSkeleton rows={5} />
                ) : (
                    <Panel title="OF en Cours" className="mb-4">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    <th className="py-2 text-left">OF</th>
                                    <th className="text-left">Avancement</th>
                                    <th className="text-right">
                                        Qté prévue
                                    </th>
                                    <th className="text-right">
                                        Qté réalisée
                                    </th>
                                    <th className="text-right">EPD</th>
                                    <th className="text-right">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="font-mono">
                                {(ofsData?.ofs ?? []).map((o) => (
                                    <tr
                                        key={o.of}
                                        className="border-b border-border/50"
                                    >
                                        <td className="py-2 text-primary">
                                            {o.of}
                                        </td>
                                        <td className="w-1/3 pr-4">
                                            <div className="flex items-center gap-2">
                                                <Progress
                                                    value={o.avancement_pct}
                                                    className="h-1.5"
                                                />
                                                <span className="text-xs tabular-nums">
                                                    {o.avancement_pct}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-right tabular-nums">
                                            {o.quantite_prevue?.toLocaleString(
                                                'fr-FR',
                                            )}
                                        </td>
                                        <td className="text-right tabular-nums">
                                            {o.quantite_realisee?.toLocaleString(
                                                'fr-FR',
                                            )}
                                        </td>
                                        <td className="text-right tabular-nums text-muted-foreground">
                                            {o.epd ?? '—'}
                                        </td>
                                        <td className="text-right">
                                            <span
                                                className={`rounded px-2 py-0.5 text-[10px] tracking-wider uppercase ${o.statut === 'termine' ? 'bg-success/15 text-success' : 'bg-chart-4/20 text-foreground'}`}
                                            >
                                                {o.statut}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {(!ofsData?.ofs ||
                                    ofsData.ofs.length === 0) && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="py-6 text-center text-xs text-muted-foreground"
                                        >
                                            Aucune donnée disponible
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </Panel>
                )}

                {/* F — Couverture */}
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {loading ? (
                        <>
                            <PanelSkeleton />
                            <PanelSkeleton />
                            <PanelSkeleton />
                        </>
                    ) : (
                        [
                            {
                                title: 'Couverture Chaîne ·310',
                                data: coverageData?.chaine ?? [],
                                target: 10,
                            },
                            {
                                title: 'Couverture Coupe ·311',
                                data: coverageData?.coupe ?? [],
                                target: 7,
                            },
                            {
                                title: 'Couverture Sérigraphie ·309',
                                data: coverageData?.serigraphie ?? [],
                                target: 5,
                            },
                        ].map((c) => (
                            <Panel key={c.title} title={c.title}>
                                {c.data.length === 0 ? (
                                    <div className="flex h-[180px] items-center justify-center">
                                        <div className="text-center">
                                            <div className="font-mono text-2xl text-muted-foreground/30">—</div>
                                            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                                                Aucune donnée disponible
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={180}>
                                        <BarChart data={c.data}>
                                            <CartesianGrid
                                                stroke="var(--border)"
                                                strokeDasharray="3 3"
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{
                                                    fill: 'var(--muted-foreground)',
                                                    fontSize: 11,
                                                }}
                                            />
                                            <YAxis
                                                unit="j"
                                                tick={{
                                                    fill: 'var(--muted-foreground)',
                                                    fontSize: 11,
                                                }}
                                            />
                                            <Tooltip contentStyle={tt} />
                                            <Bar
                                                dataKey="jours"
                                                radius={[4, 4, 0, 0]}
                                            >
                                                {c.data.map((d, i) => (
                                                    <Cell
                                                        key={i}
                                                        fill={
                                                            d.jours >= c.target
                                                                ? 'var(--success)'
                                                                : 'var(--destructive)'
                                                        }
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </Panel>
                        ))
                    )}
                </div>

                {/* G — Stock Reliability (F-REQ-313/314/315) — pending placeholders */}
                {stockReliability && (
                    <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                        {[
                            {
                                title: 'Fiabilité Stock Accessoires ·313',
                                data: stockReliability.accessoires,
                            },
                            {
                                title: 'Fiabilité Stock Tissu ·314',
                                data: stockReliability.tissu,
                            },
                            {
                                title: 'Fiabilité Stock FG ·315',
                                data: stockReliability.fg,
                            },
                        ].map((item) => (
                            <Panel key={item.title} title={item.title}>
                                <div className="flex flex-col items-center py-4">
                                    <div className="mb-2 text-center font-mono text-2xl font-bold">
                                        {item.data.value != null
                                            ? `${item.data.value}%`
                                            : '—'}
                                    </div>
                                    <TrafficBadge
                                        status={toStatus(item.data.status)}
                                    />
                                    <div className="mt-2 text-center font-mono text-[10px] text-muted-foreground">
                                        Cible: {item.data.target}%
                                    </div>
                                    <div className="mt-1 text-center font-mono text-[9px] text-muted-foreground/70">
                                        {item.data.note}
                                    </div>
                                </div>
                            </Panel>
                        ))}
                    </div>
                )}

                {/* H — Stock table */}
                {loading ? (
                    <TableSkeleton rows={8} />
                ) : (
                    <Panel
                        title="Stock Matières Premières"
                        right={
                            <Input
                                value={q}
                                onChange={(e) => {
                                    setQ(e.target.value);
                                    setSearchPage(1);
                                }}
                                placeholder="Rechercher code, désignation…"
                                className="h-7 w-64 border-border bg-secondary text-xs"
                            />
                        }
                    >
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    <th className="py-2 text-left">Code MP</th>
                                    <th className="text-left">
                                        Désignation
                                    </th>
                                    <th className="text-left">Famille</th>
                                    <th className="text-left">Couleur</th>
                                    <th className="text-left">Magasin</th>
                                    <th className="text-right">Qté stock</th>
                                    <th className="text-right">
                                        Qté réservée
                                    </th>
                                    <th className="text-right">
                                        Qté disponible
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="font-mono">
                                {stockRows.map((s, idx) => (
                                    <tr
                                        key={`${s.code_mp}-${s.famille}-${s.couleur}-${idx}`}
                                        className="border-b border-border/50"
                                    >
                                        <td className="py-2 text-primary">
                                            {s.code_mp}
                                        </td>
                                        <td>{s.designation}</td>
                                        <td className="text-muted-foreground">
                                            {s.famille}
                                        </td>
                                        <td className="text-muted-foreground">
                                            {s.couleur}
                                        </td>
                                        <td className="text-muted-foreground">
                                            {s.idmagasin ?? '—'}
                                        </td>
                                        <td className="text-right tabular-nums">
                                            {s.qtte?.toLocaleString('fr-FR')}
                                        </td>
                                        <td className="text-right tabular-nums">
                                            {s.qtte_reserve?.toLocaleString(
                                                'fr-FR',
                                            )}
                                        </td>
                                        <td className={`text-right tabular-nums font-bold ${s.qtte_disponible < 0 ? 'text-destructive' : ''}`}>
                                            {s.qtte_disponible?.toLocaleString(
                                                'fr-FR',
                                            )}
                                            {s.qtte_disponible < 0 && (
                                                <AlertCircle className="ml-1 inline h-3 w-3 text-destructive" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {stockRows.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="py-6 text-center text-xs text-muted-foreground"
                                        >
                                            Aucun résultat
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        {stockTotalPages > 1 && (
                            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                    {stockTotal} résultat(s) — page{' '}
                                    {searchPage}/{stockTotalPages}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        disabled={searchPage <= 1}
                                        onClick={() =>
                                            setSearchPage((p) => p - 1)
                                        }
                                        className="rounded border border-border px-2 py-1 text-[10px] uppercase disabled:opacity-40"
                                    >
                                        ← Préc
                                    </button>
                                    <button
                                        disabled={
                                            searchPage >= stockTotalPages
                                        }
                                        onClick={() =>
                                            setSearchPage((p) => p + 1)
                                        }
                                        className="rounded border border-border px-2 py-1 text-[10px] uppercase disabled:opacity-40"
                                    >
                                        Suiv →
                                    </button>
                                </div>
                            </div>
                        )}
                    </Panel>
                )}

                {/* KPI Detail Modal */}
                <LogisticsKpiDetailModal
                    kpiKey={openModal}
                    kpiData={kpis}
                    onClose={() => setOpenModal(null)}
                />
            </AppShell>
        </>
    );
}
