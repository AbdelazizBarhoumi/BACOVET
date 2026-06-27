import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    Legend,
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import type { KpiKey } from '@/components/logistics/kpiDetailConfig';
import LogisticsKpiDetailModal from '@/components/logistics/LogisticsKpiDetailModal';
import { Progress } from '@/components/ui/progress';
import {
    BigNumberCard,
    Gauge,
    Panel,
    TrafficBadge,
} from '@/components/widgets';
import { useLiveData } from '@/hooks/use-live-data';
import {
    fetchLogisticsKpis,
    fetchLogisticsStockKpis,
    fetchLogisticsStockComposition,
    fetchLogisticsOfs,
    fetchLogisticsStockReliability,
    type LogisticsKpis,
    type StockKpis,
    type StockComposition,
    type LogisticsOfs,
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
    const [kpis, setKpis] = useState<LogisticsKpis | null>(null);
    const [stockKpis, setStockKpis] = useState<StockKpis | null>(null);
    const [stockComp, setStockComp] = useState<StockComposition | null>(null);
    const [ofsData, setOfsData] = useState<LogisticsOfs | null>(null);
    const [stockReliability, setStockReliability] =
        useState<StockReliability | null>(null);
    const [loading, setLoading] = useState(true);
    const [_error, setError] = useState<string | null>(null);
    const [openModal, setOpenModal] = useState<KpiKey | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { refreshIntervalSec, recordFetchSuccess, recordFetchError } = useLiveData();

    const fetchData = useCallback(async () => {
        try {
            const [
                kpisRes,
                stockKpisRes,
                stockCompRes,
                ofsRes,
                reliabilityRes,
            ] = await Promise.allSettled([
                fetchLogisticsKpis(),
                fetchLogisticsStockKpis(),
                fetchLogisticsStockComposition(),
                fetchLogisticsOfs(),
                fetchLogisticsStockReliability(),
            ]);

            if (kpisRes.status === 'fulfilled') setKpis(kpisRes.value);
            if (stockKpisRes.status === 'fulfilled')
                setStockKpis(stockKpisRes.value);
            if (stockCompRes.status === 'fulfilled')
                setStockComp(stockCompRes.value);
            if (ofsRes.status === 'fulfilled') setOfsData(ofsRes.value);
            if (reliabilityRes.status === 'fulfilled')
                setStockReliability(reliabilityRes.value);

            const anyFailed = [
                kpisRes,
                stockKpisRes,
                stockCompRes,
                ofsRes,
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
    }, [recordFetchError, recordFetchSuccess]);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(fetchData, refreshIntervalSec * 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData, refreshIntervalSec]);

    return (
        <>
            <Head title="Logistique & Planning — BACOVET" />
            <AppShell
                page="/logistics"
                title="Logistique & Planning"
            >
                {/* ── A — Indicateurs de livraison (F-REQ-218/335/336/337/338) ── */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                    {loading ? (
                        <>
                            <KpiCardSkeleton />
                            <KpiCardSkeleton />
                            <KpiCardSkeleton />
                            <KpiCardSkeleton />
                            <KpiCardSkeleton />
                        </>
                    ) : (
                        <>
                            <div className={toStatus(stockKpis?.archivage?.status) === 'red' || toStatus(stockKpis?.archivage?.status) === 'orange' ? 'animate-flash-alert' : ''}>
                                <BigNumberCard
                                    label="Taux d'archivage suivi paquets"
                                    value={stockKpis?.archivage?.value ?? '—'}
                                    target="≥ 85%"
                                    status={toStatus(stockKpis?.archivage?.status)}
                                    source="etat_avancement"
                                    onClick={() => setOpenModal('archivage')}
                                />
                                {stockKpis?.archivage?.note && (
                                    <div className="mt-0.5 rounded bg-muted/50 px-1.5 py-0.5 text-center font-mono text-[8px] font-bold tracking-wider text-muted-foreground uppercase">
                                        {stockKpis.archivage.note}
                                    </div>
                                )}
                            </div>
                            <div className={toStatus(kpis?.dot?.status) === 'red' || toStatus(kpis?.dot?.status) === 'orange' ? 'animate-flash-alert' : ''}>
                                <BigNumberCard
                                    label="DOT (Delivery On Time)"
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
                                    label="HOT (Handover On Time)"
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
                                    label="Respect Planification"
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
                                    label="Lead Time Global"
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

                {/* ── B — Suivi stock: Rotation (F-REQ-316/317/318) / Mort (F-REQ-319/320/321) / Occupation (F-REQ-322/323/324) ── */}
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {loading ? (
                        <>
                            <PanelSkeleton />
                            <PanelSkeleton />
                            <PanelSkeleton />
                        </>
                    ) : (
                        <>
                            <Panel title="Taux de rotation stock (F-REQ-317/318/319)">
                                <div className="grid grid-cols-1 gap-3 pt-2">
                                    {[
                                        { key: 'accessoires' as const, label: 'Accessoires', fReq: '317' },
                                        { key: 'tissu' as const, label: 'Tissu', fReq: '318' },
                                        { key: 'fg' as const, label: 'FG', fReq: '319' },
                                    ].map((cat) => (
                                        <div key={cat.key} className="rounded-md border border-border bg-secondary/40 p-3 text-center">
                                            <div className="font-mono text-[10px] text-muted-foreground uppercase">
                                                {cat.label} (F-REQ-{cat.fReq})
                                            </div>
                                            <div className="font-mono text-2xl font-bold tabular-nums">
                                                {stockKpis?.rotation?.[cat.key]?.stock_moyen?.toLocaleString('fr-FR') ?? '—'}
                                            </div>
                                            <div className="font-mono text-[9px] text-muted-foreground/70">
                                                Stock moyen
                                            </div>
                                            {stockKpis?.rotation?.[cat.key]?.note && (
                                                <div className="mt-1 font-mono text-[8px] text-muted-foreground/60">
                                                    {stockKpis.rotation[cat.key].note}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                            <Panel title="Taux de stock mort (F-REQ-320/321/322)">
                                <div className="grid grid-cols-1 gap-3 pt-2">
                                    {[
                                        { key: 'accessoires' as const, label: 'Accessoires', fReq: '320' },
                                        { key: 'tissu' as const, label: 'Tissu', fReq: '321' },
                                        { key: 'fg' as const, label: 'FG', fReq: '322' },
                                    ].map((cat) => (
                                        <div key={cat.key} className="rounded-md border border-border bg-secondary/40 p-3 text-center">
                                            <div className="font-mono text-[10px] text-muted-foreground uppercase">
                                                {cat.label} (F-REQ-{cat.fReq})
                                            </div>
                                            <div className="font-mono text-[9px] text-muted-foreground">
                                                Articles sans mouvement 365j: {stockKpis?.stock_mort?.[cat.key]?.nb_articles_sans_mvt?.toLocaleString('fr-FR') ?? '—'}
                                            </div>
                                            <div className="font-mono text-2xl font-bold tabular-nums">
                                                {stockKpis?.stock_mort?.[cat.key]?.value != null
                                                    ? `${stockKpis?.stock_mort?.[cat.key]?.value?.toFixed(2)}%`
                                                    : '—'}
                                            </div>
                                            <TrafficBadge
                                                status={toStatus(stockKpis?.stock_mort?.[cat.key]?.status)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                            <Panel title="Taux d'occupation (F-REQ-323/324/325)">
                                <div className="grid grid-cols-1 gap-3 pt-2">
                                    {[
                                        { key: 'accessoires' as const, label: 'Accessoires', fReq: '323' },
                                        { key: 'tissu' as const, label: 'Tissu', fReq: '324' },
                                        { key: 'fg' as const, label: 'FG', fReq: '325' },
                                    ].map((cat) => (
                                        <div key={cat.key} className="rounded-md border border-border bg-secondary/40 p-3 text-center">
                                            <div className="font-mono text-[10px] text-muted-foreground uppercase">
                                                {cat.label} (F-REQ-{cat.fReq})
                                            </div>
                                            <div className="flex items-end justify-around">
                                                <Gauge
                                                    value={stockKpis?.occupation?.[cat.key]?.value ?? 0}
                                                    label=""
                                                    max={100}
                                                />
                                            </div>
                                            <div className="mt-1 grid grid-cols-2 gap-1 text-center">
                                                <div className="font-mono text-[9px] text-muted-foreground">
                                                    Rouleaux: {stockKpis?.occupation?.[cat.key]?.nb_rouleaux?.toLocaleString('fr-FR') ?? '—'}
                                                </div>
                                                <div className="font-mono text-[9px] text-muted-foreground">
                                                    Capacité: {stockKpis?.occupation?.[cat.key]?.total_conteneurs?.toLocaleString('fr-FR') ?? '—'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        </>
                    )}
                </div>

                {stockReliability && (
                    <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                        {[
                            { title: 'Fiabilité stock — Accessoires (F-REQ-314)', data: stockReliability.accessoires },
                            { title: 'Fiabilité stock — Tissu (F-REQ-315)', data: stockReliability.tissu },
                            { title: 'Fiabilité stock — FG (F-REQ-316)', data: stockReliability.fg },
                        ].map((item) => (
                            <Panel key={item.title} title={item.title}>
                                <div className="flex flex-col items-center py-2">
                                    <Gauge
                                        value={item.data.value ?? 0}
                                        label=""
                                        max={100}
                                    />
                                    <div className="mt-1 text-center font-mono text-[10px] text-muted-foreground">
                                        Cible: {item.data.target}%
                                    </div>
                                    {item.data.note && (
                                        <div className="mt-1 text-center font-mono text-[8px] text-muted-foreground/70">
                                            {item.data.note}
                                        </div>
                                    )}
                                </div>
                            </Panel>
                        ))}
                    </div>
                )}

                {/* ── C — Stock Composition Pie Charts (F-REQ-332/333/334) ── */}
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
                                title: 'STOCK / Provenance',
                                data: (stockComp?.provenance ?? []).map(
                                    (p) => ({
                                        name: p.name,
                                        value: p.value,
                                    }),
                                ),
                            },
                            {
                                title: 'STOCK / Brand',
                                data: (stockComp?.famille ?? []).map((p) => ({
                                    name: p.name,
                                    value: p.value,
                                })),
                            },
                            {
                                title: 'STOCK / Typologie',
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

                {/* ── D — Suivi OF et flux: Livraison (F-REQ-326/327/328) + Délai (F-REQ-329/330/331) ── */}
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {loading ? (
                        <>
                            <PanelSkeleton />
                            <PanelSkeleton />
                        </>
                    ) : (
                        <>
                            <Panel title="Taux de commandes livrées à temps (F-REQ-326/327/328)">
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { key: 'accessoires' as const, label: 'Accessoires', fReq: '326' },
                                        { key: 'tissu' as const, label: 'Tissu', fReq: '327' },
                                        { key: 'fg' as const, label: 'FG', fReq: '328' },
                                    ].map((cat) => (
                                        <div key={cat.key} className="rounded-md border border-border bg-secondary/40 p-3 text-center">
                                            <div className="font-mono text-[10px] text-muted-foreground uppercase">
                                                {cat.label} (F-REQ-{cat.fReq})
                                            </div>
                                            <div className="font-mono text-2xl font-bold tabular-nums">
                                                {ofsData?.livraison?.[cat.key]?.value != null
                                                    ? `${ofsData.livraison[cat.key].value}%`
                                                    : '—'}
                                            </div>
                                            <TrafficBadge
                                                status={toStatus(ofsData?.livraison?.[cat.key]?.status)}
                                            />
                                            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                                                {ofsData?.livraison?.[cat.key]?.transfert_total?.toLocaleString('fr-FR') ?? '—'}{' '}
                                                /{' '}
                                                {ofsData?.livraison?.[cat.key]?.total_ofs?.toLocaleString('fr-FR') ?? '—'}{' '}
                                                OFs
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                            <Panel title="Délai de livraison d'une commande (F-REQ-329/330/331)">
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { key: 'accessoires' as const, label: 'Accessoires', fReq: '329' },
                                        { key: 'tissu' as const, label: 'Tissu', fReq: '330' },
                                        { key: 'fg' as const, label: 'FG', fReq: '331' },
                                    ].map((cat) => (
                                        <div key={cat.key} className="rounded-md border border-border bg-secondary/40 p-3 text-center">
                                            <div className="font-mono text-[10px] text-muted-foreground uppercase">
                                                {cat.label} (F-REQ-{cat.fReq})
                                            </div>
                                            <div className="font-mono text-2xl font-bold tabular-nums">
                                                {ofsData?.delai_moyen?.[cat.key]?.value != null
                                                    ? `${parseFloat(String(ofsData.delai_moyen[cat.key].value)).toFixed(1)} j`
                                                    : '—'}
                                            </div>
                                            <TrafficBadge
                                                status={toStatus(ofsData?.delai_moyen?.[cat.key]?.status)}
                                            />
                                            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                                                Sur{' '}
                                                {ofsData?.delai_moyen?.[cat.key]?.nb_ofs?.toLocaleString('fr-FR') ?? '—'}{' '}
                                                OFs
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        </>
                    )}
                </div>

                {/* ── E — OF en cours ── */}
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
                                    <th className="text-right">BPD</th>
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
                                            {o.bpd ?? '—'}
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
                                            colSpan={7}
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
