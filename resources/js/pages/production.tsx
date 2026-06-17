import { Head, usePage } from '@inertiajs/react';
import { AlertTriangle, InfoIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { AppShell } from '@/components/app-shell';
import { ProductionKpiCard } from '@/components/production/ProductionKpiCard';
import type { ProductionKpiKey } from '@/components/production/productionKpiDetailConfig';
import ProductionKpiDetailModal from '@/components/production/ProductionKpiDetailModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import { Gauge, Panel, TrafficBadge } from '@/components/widgets';
import { useFilters } from '@/context/FilterContext';
import type { Status } from '@/lib/mock';
import {
    fetchProductionChainInfo,
    fetchProductionKpis,
    fetchProductionGauges,
    fetchProductionWipGauges,
    fetchProductionStoppages,
    fetchProductionOfDonuts,
    fetchProductionTrend,
    fetchProductionBreakdown,
    fetchProductionTopOps,
    fetchProductionWip,
    fetchProductionSoProgress,
    fetchCoupeCoverage,
    fetchCoupeChainCoverage,
    fetchSerigraphieCoverage,
    fetchCoupeTagging,
    fetchCoupeOfs,
    fetchCoupeQteDepartage,
    fetchSerigraphieFlux,
    fetchSerigraphieRejets,
    fetchInlineEndline,
    fetchDepartage,
    fetchTauxArchivage,
    fetchRespectTempsEstime,
    fetchTauxTempsAcceptes,
    type ChainInfo,
    type ProductionKpis,
    type GaugeItem,
    type StoppageItem,
    type OfDonutItem,
    type TrendItem,
    type TopOpItem,
    type WipAreaItem,
} from '@/services/productionApi';
import type { BreakdownData, BreakdownRow } from '../types/production';

// ─── Extra-data shape per workshop ────────────────────────────────────────────

type CoupeCoverageData = { value: number | null; status: string; unit?: string; delta_pcs?: number } | null;

type CoupeChainCoverageData = {
    value: number;
    unit: string;
    breakdown: BreakdownRow[];
} | null;

type SerigraphieCoverageData = {
    value: number | null;
    status: string;
    target?: string;
} | null;

type ExtraData = {
    /** Confection only */
    departage?: BreakdownRow[];
    /** Confection only */
    vignettes?: BreakdownRow[];
    /** Confection + Coupe */
    coupeChainCoverage?: CoupeChainCoverageData;
    /** Coupe only */
    coupeCoverage?: CoupeCoverageData;
    /** Coupe only */
    coupeTagging?: BreakdownRow[];
    /** Coupe only */
    coupeOfs?: BreakdownRow[];
    /** Coupe only */
    coupeQteDepartage?: BreakdownRow[];
    /** Sérigraphie only */
    serigraphieCoverage?: SerigraphieCoverageData;
    /** Sérigraphie only */
    seriFlux?: BreakdownRow[];
    /** Sérigraphie only */
    seriRejets?: BreakdownRow[];
    seriRejetsMetadata?: Record<string, unknown>;
    inlineEndlineData?: BreakdownRow[];

    // Methods KPIs (F-REQ-216, 218, 219)
    tauxArchivage?: { value: number | null; status: string; target: number } | null;
    respectTempsEstime?: { value: number | null; status: string; target: number } | null;
    tauxTempsAcceptes?: { value: number | null; status: string; target: number } | null;
};

// ─── Misc helpers ─────────────────────────────────────────────────────────────

const tt = {
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

// ─── ProductionTab ─────────────────────────────────────────────────────────────

function ProductionTab({
    workshop,
    chains,
    kpis,
    gauges,
    wipGauges,
    stoppages,
    ofProgress,
    soProgress,
    trend,
    topOps,
    allOps,
    wipData,
    extraData,
    loading,
    onKpiClick,
}: {
    workshop: 'confection' | 'coupe' | 'serigraphie';
    chains: ChainInfo[];
    kpis: ProductionKpis | null;
    gauges: GaugeItem[];
    wipGauges: GaugeItem[];
    stoppages: StoppageItem[];
    ofProgress: OfDonutItem[];
    soProgress: BreakdownRow[];
    trend: TrendItem[];
    topOps: TopOpItem[];
    allOps: TopOpItem[];
    wipData: WipAreaItem[];
    extraData: ExtraData;
    loading: boolean;
    onKpiClick: (key: ProductionKpiKey) => void;
}) {
    if (loading && !kpis) {
        return (
            <div className="space-y-4">
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-24 animate-pulse rounded-lg bg-muted"
                        />
                    ))}
                </div>
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <KpiCardSkeleton key={i} />
                    ))}
                </div>
                <div className="h-64 animate-pulse rounded-lg bg-muted" />
            </div>
        );
    }

    if (!kpis)
        return (
            <div className="p-8 text-center font-mono text-muted-foreground">
                Aucune donnée disponible pour le moment.
            </div>
        );

    // Destructure once for clean access throughout the render
    const {
        departage = [],
        vignettes = [],
        coupeChainCoverage = null,
        coupeCoverage = null,
        serigraphieCoverage = null,
        coupeTagging = [],
        coupeOfs = [],
        coupeQteDepartage = [],
        inlineEndlineData = [],
        seriFlux = [],
        seriRejets = [],
        seriRejetsMetadata = null,
    } = extraData;

    const [coupeOfsPage, setCoupeOfsPage] = useState(1);
    const COUPE_OFS_PAGE_SIZE = 20;
    const coupeOfsTotalPages = Math.max(1, Math.ceil(coupeOfs.length / COUPE_OFS_PAGE_SIZE));
    const coupeOfsPageItems = useMemo(() => {
        const start = (coupeOfsPage - 1) * COUPE_OFS_PAGE_SIZE;
        return coupeOfs.slice(start, start + COUPE_OFS_PAGE_SIZE);
    }, [coupeOfs, coupeOfsPage]);

    return (
        <>
            {/* Row 1 — Chain info cards */}
            {workshop !== 'serigraphie' && (
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                    {chains.map((c) => (
                        <div
                            key={c.id}
                            className="rounded-lg border border-border bg-card p-3"
                        >
                            <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`inline-block h-2 w-2 rounded-full ${
                                            c.status === 'green'
                                                ? 'bg-green-500'
                                                : c.status === 'orange'
                                                  ? 'bg-orange-400'
                                                  : c.status === 'red'
                                                    ? 'bg-red-500'
                                                    : 'bg-gray-400'
                                        }`}
                                    />
                                    <div className="text-sm font-bold tracking-wider">
                                        {c.id}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="font-mono text-[10px] text-primary uppercase">
                                        {c.of}
                                    </div>
                                    <div className="font-mono text-[9px] text-muted-foreground">
                                        QTÉ:{' '}
                                        <span className="font-bold text-foreground">
                                            {c.objectif}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 font-mono text-[10px] uppercase">
                                <KV label="Article" value={c.article} />
                                <KV
                                    label="SAM"
                                    value={
                                        typeof c.sam === 'number'
                                            ? `${c.sam} min`
                                            : c.sam
                                    }
                                />
                                <KV
                                    label="SOT"
                                    value={
                                        typeof c.sot === 'number'
                                            ? `${c.sot} min`
                                            : (c.sot ?? 'N/A')
                                    }
                                />
                                <KV label="Effectif" value={String(c.effectif)} />
                                <KV label="Eff." value={`${c.eff.toFixed(1)}%`} />
                                <KV label="WIP" value={String(c.wip)} />
                                <KV label="BPD" value={c.bpd ?? 'N/A'} />
                                <KV label="EPD" value={c.epd ?? 'N/A'} />
                                <KV label="EHD" value={c.ehd ?? 'N/A'} />
                            </div>
                            {c.br_gtd != null && (
                                <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase">
                                    <span className="text-muted-foreground">BR GTD:</span>
                                    <span
                                        className={`font-bold ${
                                            c.br_gtd <= 4
                                                ? 'text-green-600'
                                                : c.br_gtd <= 5
                                                  ? 'text-orange-500'
                                                  : 'text-red-600'
                                        }`}
                                    >
                                        {c.br_gtd.toFixed(1)}%
                                    </span>
                                </div>
                            )}
                            {(c.entree_jour != null || c.sortie_jour != null) && (
                                <div className="mt-1 flex items-center gap-3 font-mono text-[9px] text-muted-foreground uppercase">
                                    <span>
                                        Entrée:{' '}
                                        <span className="font-bold text-foreground">
                                            {c.entree_jour ?? 'N/A'}
                                        </span>
                                    </span>
                                    <span>
                                        Sortie:{' '}
                                        <span className="font-bold text-foreground">
                                            {c.sortie_jour ?? 'N/A'}
                                        </span>
                                    </span>
                                </div>
                            )}
                            {(c.hp != null || c.hs != null) && (
                                <div className="mt-2 flex gap-3 border-t border-border/30 pt-1 font-mono text-[9px] text-muted-foreground uppercase">
                                    <span>
                                        HP:{' '}
                                        <span className="font-bold text-foreground">
                                            {c.hp ?? 'N/A'}h
                                        </span>
                                    </span>
                                    <span>
                                        HS:{' '}
                                        <span className="font-bold text-foreground">
                                            {c.hs ?? 'N/A'}h
                                        </span>
                                    </span>
                                </div>
                            )}
                            {c.designation && (
                                <div className="mt-2 truncate border-t border-border/50 pt-2 text-[9px] text-muted-foreground uppercase">
                                    {c.designation}
                                </div>
                            )}
                        </div>
                    ))}
                    {chains.length === 0 && !loading && (
                        <div className="col-span-full rounded-lg border border-dashed border-border py-6 text-center font-mono text-xs tracking-widest text-muted-foreground uppercase">
                            Aucune chaîne active détectée
                        </div>
                    )}
                </div>
            )}

            {/* Row 2 — KPIs */}
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {workshop !== 'serigraphie' && (
                    <>
                        <ProductionKpiCard
                            label="Efficience Chaîne ·202"
                            value={
                                kpis.avg_efficience.value ??
                                (kpis.avg_efficience.status === 'pending' ||
                                kpis.avg_efficience.status === 'inactive'
                                    ? '-'
                                    : 'N/A')
                            }
                            target={kpis.avg_efficience.target}
                            status={kpis.avg_efficience.status as Status}
                            source="local_db:efficience_chaine"
                            isLoading={loading}
                            onClick={() => onKpiClick('efficience_chaine')}
                        />
                        <ProductionKpiCard
                            label="OWE Chaîne ·204"
                            value={
                                kpis.avg_owe.value ??
                                (kpis.avg_owe.status === 'pending' ||
                                kpis.avg_owe.status === 'inactive'
                                    ? '-'
                                    : 'N/A')
                            }
                            target={kpis.avg_owe.target}
                            status={kpis.avg_owe.status as Status}
                            source="local_db:formula"
                            isLoading={loading}
                            onClick={() => onKpiClick('owe_chaine')}
                        />
                    </>
                )}
                <ProductionKpiCard
                    label="RFT Production ·104"
                    value={
                        kpis.rft_production?.value ??
                        (kpis.rft_production?.status === 'pending' ||
                        kpis.rft_production?.status === 'inactive'
                            ? '-'
                            : 'N/A')
                    }
                    target={kpis.rft_production?.target}
                    status={kpis.rft_production?.status as Status}
                    source={kpis.rft_production?.source ?? 'local_db:pieces_ok_jour'}
                    isLoading={loading}
                    onClick={() => onKpiClick('rft_production')}
                />
                {workshop !== 'serigraphie' && (
                    <ProductionKpiCard
                        label="WIP Total ·205"
                        value={
                            kpis.total_wip.value ??
                            (kpis.total_wip.status === 'pending' ||
                            kpis.total_wip.status === 'inactive'
                                ? '-'
                                : 'N/A')
                        }
                        target={kpis.total_wip.target}
                        status={kpis.total_wip.status as Status}
                        source="local_db:wip_chaine"
                        isLoading={loading}
                        onClick={() => onKpiClick('wip_chaine')}
                    />
                )}
                {workshop !== 'serigraphie' && (
                    <ProductionKpiCard
                        label="Arrêts non planifiés ·207"
                        value={
                            kpis.total_lost_time.value ??
                            (kpis.total_lost_time.status === 'pending' ||
                            kpis.total_lost_time.status === 'inactive'
                                ? '-'
                                : 'N/A')
                        }
                        unit="min"
                        target={kpis.total_lost_time.target}
                        status={kpis.total_lost_time.status as Status}
                        source="local_db:lost_time"
                        isLoading={loading}
                        onClick={() => onKpiClick('arrets_non_planifies')}
                    />
                )}

                {(workshop === 'confection' || workshop === 'coupe') && (
                    <>
                        <ProductionKpiCard
                            label="BR GTD (Aujourd'hui) ·102"
                            value={
                                kpis.br_gtd?.value ??
                                (kpis.br_gtd?.status === 'pending' ||
                                kpis.br_gtd?.status === 'inactive'
                                    ? '-'
                                    : 'N/A')
                            }
                            target={kpis.br_gtd?.target}
                            status={kpis.br_gtd?.status as Status}
                            source="check_pass_qte"
                            isLoading={loading}
                            onClick={() => onKpiClick('br_gtd')}
                        />
                        <ProductionKpiCard
                            label="BR Bundling ·106"
                            value={
                                kpis.br_bundling?.value ??
                                (kpis.br_bundling?.status === 'pending' ||
                                kpis.br_bundling?.status === 'inactive'
                                    ? '-'
                                    : 'N/A')
                            }
                            target={kpis.br_bundling?.target}
                            status={kpis.br_bundling?.status as Status}
                            source="inspections_paquet"
                            isLoading={loading}
                            onClick={() => onKpiClick('br_bundling')}
                        />
                    </>
                )}
                <ProductionKpiCard
                    label="BR Print (Aujourd'hui) ·108"
                    value={
                        kpis.br_print?.value ??
                        (kpis.br_print?.status === 'pending' ||
                        kpis.br_print?.status === 'inactive'
                            ? '-'
                            : 'N/A')
                    }
                    target={kpis.br_print?.target}
                    status={kpis.br_print?.status as Status}
                    source="google_drive"
                    isLoading={loading}
                    onClick={() => onKpiClick('br_print')}
                />
                <ProductionKpiCard
                    label="Taux Archivage ·216"
                    value={extraData.tauxArchivage?.value ?? 'N/A'}
                    target={`≥ ${extraData.tauxArchivage?.target ?? 85}%`}
                    status={extraData.tauxArchivage?.status as Status}
                    source="GPRO Suivi Paquets"
                    isLoading={loading}
                    onClick={() => onKpiClick('taux_archivage')}
                />
                <ProductionKpiCard
                    label="Respect Temps Estimé ·218"
                    value={extraData.respectTempsEstime?.value !== null ? `${extraData.respectTempsEstime?.value}%` : 'N/A'}
                    target={`≥ ${extraData.respectTempsEstime?.target ?? 90}%`}
                    status={extraData.respectTempsEstime?.status as Status}
                    source="Drive Cotation"
                    isLoading={loading}
                    onClick={() => onKpiClick('respect_temps_estime')}
                />
                <ProductionKpiCard
                    label="Temps Acceptés V1 ·219"
                    value={extraData.tauxTempsAcceptes?.value !== null ? `${extraData.tauxTempsAcceptes?.value}%` : 'N/A'}
                    target={`≥ ${extraData.tauxTempsAcceptes?.target ?? 80}%`}
                    status={extraData.tauxTempsAcceptes?.status as Status}
                    source="Drive Gammes"
                    isLoading={loading}
                    onClick={() => onKpiClick('temps_acceptes')}
                />
            </div>

            {/* Row 3 — Gauges + Timeline */}
            {workshop !== 'serigraphie' && (
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <div className="flex flex-col gap-3 lg:col-span-2 h-full">
                        <Panel title="Efficience par Chaîne · Gauges" className="h-full">
                            <div className="flex min-h-[120px] items-end justify-around pt-2">
                                {gauges.length > 0 ? (
                                    gauges.map((c) => (
                                        <Gauge
                                            key={c.chaine}
                                            value={Number(c.efficience_pct)}
                                            label={c.chaine}
                                        />
                                    ))
                                ) : (
                                    <div className="font-mono text-xs text-muted-foreground">
                                        En attente de données...
                                    </div>
                                )}
                            </div>
                        </Panel>

                        {(workshop === 'confection' || workshop === 'coupe') && (
                            <Panel title="WIP par Chaîne · 205 Gauges" className="h-full">
                                <div className="flex min-h-[120px] items-end justify-around pt-2">
                                    {wipGauges.length > 0 ? (
                                        wipGauges.map((c) => (
                                            <div key={c.chaine} className="flex flex-col items-center">
                                                <Gauge
                                                    value={Number(c.wip)}
                                                    label={c.chaine}
                                                    max={200}
                                                    inverted={true}
                                                />
                                                {(c.raw_wip != null || c.target != null) && (
                                                    <div className="mt-1 font-mono text-[9px] text-muted-foreground">
                                                        {c.raw_wip ?? '—'} / {c.target ?? '—'}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="font-mono text-xs text-muted-foreground">
                                            En attente de données...
                                        </div>
                                    )}
                                </div>
                            </Panel>
                        )}
                    </div>

                    <Panel title="Chronologie des arrêts (Aujourd'hui)" className="h-full">
                        <div className="space-y-3 font-mono text-xs">
                            {(() => {
                                const uniqueChains = [...new Set(stoppages.map((s) => s.chaine))].sort();
                                return uniqueChains.length > 0 ? uniqueChains : ['CH1', 'CH2', 'CH3', 'CH4'];
                            })().map((ch) => (
                                <div key={ch} className="flex items-center gap-2">
                                    <div className="w-10 text-muted-foreground">{ch}</div>
                                    <div className="relative h-6 flex-1 overflow-hidden rounded bg-secondary">
                                        {stoppages
                                            .filter((s) => s.chaine === ch)
                                            .map((s, i) => (
                                                <div
                                                    key={i}
                                                    className="absolute top-0 flex h-full items-center justify-center rounded text-[10px] font-bold text-background"
                                                    style={{
                                                        left: `${((s.start - 6) / 12) * 100}%`,
                                                        width: `${Math.max((s.duration / 12) * 100, 2)}%`,
                                                        backgroundColor:
                                                            s.motif === 'MAINT'
                                                                ? 'var(--chart-4)'
                                                                : s.motif === 'MATIERE'
                                                                  ? 'var(--warning)'
                                                                  : 'var(--destructive)',
                                                    }}
                                                    title={`${s.motif} · ${Math.round(s.duration * 60)}min`}
                                                >
                                                    {s.motif[0]}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between pl-12 text-[10px] text-muted-foreground">
                            <span>06h</span>
                            <span>09h</span>
                            <span>12h</span>
                            <span>15h</span>
                            <span>18h</span>
                        </div>
                        <div className="flex gap-3 border-t border-border pt-2 text-[10px]">
                            <Legend2 color="var(--chart-4)" label="Maintenance" />
                            <Legend2 color="var(--warning)" label="Matière" />
                            <Legend2 color="var(--destructive)" label="Qualité" />
                        </div>

                        {/* F-REQ-207 Motif List */}
                        <div className="mt-4 border-t border-border pt-3">
                            <div className="mb-2 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
                                Liste des motifs d'arrêt
                            </div>
                            <div className="max-h-[120px] space-y-1 overflow-y-auto pr-2">
                                {stoppages.length > 0 ? (
                                    stoppages.map((s, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between border-b border-border/30 py-1 text-[10px] last:border-0"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 font-bold text-primary">
                                                    {s.chaine}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    Début:{' '}
                                                    {isNaN(s.start)
                                                        ? '--h--'
                                                        : `${Math.floor(s.start)}h${Math.round(
                                                              (s.start % 1) * 60,
                                                          )
                                                              .toString()
                                                              .padStart(2, '0')}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold">
                                                    {isNaN(s.duration)
                                                        ? '--'
                                                        : Math.round(s.duration * 60)}{' '}
                                                    min
                                                </span>
                                                <TrafficBadge
                                                    status={
                                                        s.motif === 'MAINT'
                                                            ? 'orange'
                                                            : s.motif === 'MATIERE'
                                                              ? 'orange'
                                                              : 'red'
                                                    }
                                                >
                                                    {s.motif}
                                                </TrafficBadge>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-[10px] text-muted-foreground italic">
                                        Aucun arrêt enregistré
                                    </div>
                                )}
                            </div>
                        </div>
                    </Panel>
                </div>
            )}

            {/* Row 4 — Workshop specific panels */}
            <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                {workshop === 'serigraphie' && (
                    <Panel title="Couverture Sérigraphie ·309">
                        <div className="flex h-[200px] flex-col items-center justify-center">
                            <div className="font-mono text-4xl font-bold">
                                {serigraphieCoverage?.value ??
                                    (serigraphieCoverage?.status === 'pending' ||
                                    serigraphieCoverage?.status === 'inactive'
                                        ? '-'
                                        : 'N/A')}
                            </div>
                            <div className="mt-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                                Pcs en attente
                            </div>
                            <div className="mt-4">
                                <TrafficBadge status={(serigraphieCoverage?.status as Status) ?? 'grey'}>
                                    {serigraphieCoverage?.status === 'green' ? 'OK' : 'Retard'}
                                </TrafficBadge>
                            </div>
                            <div className="mt-2 text-[10px] text-muted-foreground">
                                Cible:{' '}
                                {serigraphieCoverage?.target ?? '> cadence hebdo'}
                            </div>
                        </div>
                    </Panel>
                )}

                {workshop === 'coupe' && (
                    <Panel title="Couverture Coupe ·311">
                        <div className="flex h-[200px] flex-col items-center justify-center">
                            <div className="font-mono text-4xl font-bold">
                                {coupeCoverage?.value != null
                                    ? `${coupeCoverage.value} jours`
                                    : (coupeCoverage?.status === 'pending' ||
                                    coupeCoverage?.status === 'inactive'
                                        ? '-'
                                        : 'N/A')}
                            </div>
                            <div className="mt-2 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                                Reliquat à couper
                            </div>
                            <div className="mt-4">
                                <TrafficBadge status={(coupeCoverage?.status as Status) ?? 'grey'}>
                                    {coupeCoverage?.status === 'green'
                                        ? 'Flux OK'
                                        : 'Alerte Flux'}
                                </TrafficBadge>
                            </div>
                        </div>
                    </Panel>
                )}

                {(workshop === 'confection' || workshop === 'coupe') && (
                    <Panel title="Couverture Chaîne ·310">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                                data={coupeChainCoverage?.breakdown ?? []}
                                layout="vertical"
                                margin={{ left: 20, right: 20, top: 10, bottom: 10 }}
                            >
                                <CartesianGrid
                                    stroke="var(--border)"
                                    strokeDasharray="3 3"
                                />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="chaine"
                                    type="category"
                                    width={60}
                                    tick={{
                                        fill: 'var(--muted-foreground)',
                                        fontSize: 10,
                                    }}
                                />
                                <Tooltip />
                                <Bar
                                    dataKey="value"
                                    name="Jours"
                                    fill="var(--primary)"
                                    radius={[0, 4, 4, 0]}
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Panel>
                )}
            </div>

            {/* Row 5 — OF progress */}
            {workshop !== 'serigraphie' && (
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <Panel title="Taux d'avancement OF ·305">
                        <div className="grid min-h-[140px] grid-cols-2 gap-2 sm:grid-cols-4">
                            {ofProgress.length > 0 ? (
                                ofProgress.map((o) => (
                                    <div key={o.of} className="flex flex-col items-center">
                                        <ResponsiveContainer width="100%" height={120}>
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { v: o.pct },
                                                        { v: Math.max(0, 100 - o.pct) },
                                                    ]}
                                                    dataKey="v"
                                                    innerRadius={32}
                                                    outerRadius={48}
                                                    startAngle={90}
                                                    endAngle={-270}
                                                >
                                                    <Cell
                                                        key="done"
                                                        fill={
                                                            o.statut === 'termine'
                                                                ? 'var(--success)'
                                                                : 'var(--chart-4)'
                                                        }
                                                    />
                                                    <Cell key="remaining" fill="var(--muted)" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="max-w-full truncate font-mono text-xs font-bold">
                                            {o.of}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground">
                                            {Math.round(o.pct)}%
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full flex items-center justify-center font-mono text-xs text-muted-foreground italic">
                                    Chargement des OFs...
                                </div>
                            )}
                        </div>
                    </Panel>

                    <Panel title="SO Progress par Chaîne ·304">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={soProgress} layout="vertical">
                                <CartesianGrid
                                    stroke="var(--border)"
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    type="number"
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                />
                                <YAxis
                                    dataKey="chaine"
                                    type="category"
                                    width={80}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                />
                                <Tooltip contentStyle={tt} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar
                                    dataKey="realise"
                                    name="Réalisé"
                                    stackId="a"
                                    fill="var(--chart-4)"
                                />
                                <Bar
                                    dataKey="restant"
                                    name="Restant"
                                    stackId="a"
                                    fill="var(--muted)"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Panel>
                </div>
            )}

            {/* Row 6 — Operators & Additional Panels */}
            {workshop !== 'serigraphie' && (
                <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {workshop === 'confection' && (
                        <>
                            <Panel title="Efficience Départage ·208">
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={departage}>
                                        <CartesianGrid
                                            stroke="var(--border)"
                                            strokeDasharray="3 3"
                                        />
                                        <XAxis
                                            dataKey="employe"
                                            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                        />
                                        <YAxis
                                            unit="%"
                                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                        />
                                        <Tooltip contentStyle={tt} />
                                        <Bar
                                            dataKey="eff"
                                            name="Efficience"
                                            fill="var(--chart-1)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Panel>
                            <Panel title="Efficience Vignettes ·209">
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={vignettes}>
                                        <CartesianGrid
                                            stroke="var(--border)"
                                            strokeDasharray="3 3"
                                        />
                                        <XAxis
                                            dataKey="employe"
                                            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                        />
                                        <YAxis
                                            unit="%"
                                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                        />
                                        <Tooltip contentStyle={tt} />
                                        <Bar
                                            dataKey="eff"
                                            name="Efficience"
                                            fill="var(--chart-2)"
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Panel>
                        </>
                    )}

                    <Panel title="Top Opérateurs (Aujourd'hui) ·210">
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={topOps} layout="vertical">
                                <CartesianGrid
                                    stroke="var(--border)"
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    type="number"
                                    unit="%"
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                />
                                <YAxis
                                    dataKey="nom"
                                    type="category"
                                    width={80}
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                />
                                <Tooltip contentStyle={tt} />
                                <ReferenceLine
                                    x={90}
                                    stroke="var(--success)"
                                    strokeDasharray="4 4"
                                />
                                <Bar
                                    dataKey="eff"
                                    name="Efficience"
                                    fill="var(--primary)"
                                    radius={[0, 4, 4, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Panel>

                    <Panel title="Flux Coupe & Engagement ·206">
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={wipData}>
                                <CartesianGrid
                                    stroke="var(--border)"
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                />
                                <YAxis
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                />
                                <Tooltip contentStyle={tt} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Area
                                    type="monotone"
                                    dataKey="sortie"
                                    name="Sortie coupe"
                                    stroke="var(--success)"
                                    fill="var(--success)"
                                    fillOpacity={0.25}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="engagement"
                                    name="Engagement"
                                    stroke="var(--warning)"
                                    fill="var(--warning)"
                                    fillOpacity={0.25}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Panel>
                </div>
            )}

            {workshop !== 'serigraphie' && (
                <div className="mb-4 grid grid-cols-1 gap-3">
                    <Panel title="Efficience par Opérateur ·201 (Aujourd'hui)">
                        <ResponsiveContainer width="100%" height={300}>
                            <ComposedChart data={allOps}>
                                <CartesianGrid
                                    stroke="var(--border)"
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    dataKey="nom"
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    unit="%"
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    unit="m"
                                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                />
                                <Tooltip contentStyle={tt} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar
                                    yAxisId="left"
                                    dataKey="eff"
                                    name="Efficience %"
                                    fill="var(--primary)"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="min_std"
                                    name="Minutes Prod (Std)"
                                    stroke="var(--success)"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </Panel>
                </div>
            )}

            {/* Row 7 — Trend */}
            {workshop !== 'serigraphie' && (
                <Panel title="Efficience Cumulée ·203">
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={trend}>
                            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                            <XAxis
                                dataKey="jour"
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                            />
                            <YAxis
                                domain={[0, 100]}
                                unit="%"
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                            />
                            <Tooltip contentStyle={tt} />
                            <ReferenceLine y={85} stroke="var(--success)" strokeDasharray="4 4" />
                            <Line
                                type="monotone"
                                dataKey="eff"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Panel>
            )}

            {/* Sprint 5 — Coupe specific tables */}
            {workshop === 'coupe' && (
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <Panel title="Tagging Réel vs Théorique ·217">
                        <div className="overflow-x-auto">
                            <table className="w-full font-mono text-xs">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground uppercase">
                                        <th className="py-2 text-left">Chaîne</th>
                                        <th className="py-2 text-left">Shift</th>
                                        <th className="py-2 text-right">Théorique</th>
                                        <th className="py-2 text-right">Réel</th>
                                        <th className="py-2 text-right">Écart</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupeTagging.length > 0 ? (
                                        coupeTagging.map((t, i) => (
                                            <tr key={i} className="border-b border-border/50">
                                                <td className="py-2 font-bold">{t.chaine}</td>
                                                <td className="py-2 text-muted-foreground">{t.shift ?? '—'}</td>
                                                <td className="py-2 text-right">{t.tag_theorique}</td>
                                                <td className="py-2 text-right">{t.tag_reel}</td>
                                                <td
                                                    className={`py-2 text-right font-bold ${
                                                        (Number(t.ecart_pct) || 0) < 0
                                                            ? 'text-destructive'
                                                            : 'text-success'
                                                    }`}
                                                >
                                                    {t.ecart_pct}%
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="py-4 text-center italic text-muted-foreground"
                                            >
                                                Aucune donnée
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Panel>

                    <Panel title={`Liste des OF actifs (Coupe) ·${coupeOfs.length}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full font-mono text-xs">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground uppercase">
                                        <th className="py-2 text-left">OF</th>
                                        <th className="py-2 text-left">Article</th>
                                        <th className="py-2 text-left">Désignation</th>
                                        <th className="py-2 text-right">Qté</th>
                                        <th className="py-2 text-center">Début</th>
                                        <th className="py-2 text-center">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupeOfsPageItems.length > 0 ? (
                                        coupeOfsPageItems.map((o, i) => (
                                            <tr key={i} className="border-b border-border/50">
                                                <td className="py-2 font-bold">{o.of_number}</td>
                                                <td
                                                    className="max-w-[100px] truncate py-2"
                                                    title={o.designation?.toString() ?? undefined}
                                                >
                                                    {o.article}
                                                </td>
                                                <td
                                                    className="max-w-[120px] truncate py-2 text-muted-foreground"
                                                    title={o.designation?.toString() ?? undefined}
                                                >
                                                    {o.designation ?? '—'}
                                                </td>
                                                <td className="py-2 text-right">{o.quantite}</td>
                                                <td className="py-2 text-center">{o.dt_debut}</td>
                                                <td className="py-2 text-center">
                                                    {o.statut ? (
                                                        <span
                                                            className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                                                o.statut === 'termine'
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : o.statut === 'en_cours'
                                                                      ? 'bg-blue-100 text-blue-700'
                                                                      : 'bg-gray-100 text-gray-600'
                                                            }`}
                                                        >
                                                            {o.statut}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="py-4 text-center italic text-muted-foreground"
                                            >
                                                Chargement...
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {coupeOfs.length > COUPE_OFS_PAGE_SIZE && (
                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {coupeOfsPage} / {coupeOfsTotalPages} pages
                                </span>
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCoupeOfsPage((p) => Math.max(1, p - 1));
                                                }}
                                                className={coupeOfsPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: coupeOfsTotalPages }, (_, i) => i + 1)
                                            .filter((p) => {
                                                if (coupeOfsTotalPages <= 7) return true;
                                                if (p === 1 || p === coupeOfsTotalPages) return true;
                                                if (Math.abs(p - coupeOfsPage) <= 1) return true;
                                                return false;
                                            })
                                            .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                                                if (idx > 0 && typeof arr[idx - 1] === 'number' && p - (arr[idx - 1] as number) > 1) {
                                                    acc.push('ellipsis');
                                                }
                                                acc.push(p);
                                                return acc;
                                            }, [])
                                            .map((item, idx) =>
                                                item === 'ellipsis' ? (
                                                    <PaginationItem key={`e-${idx}`}>
                                                        <span className="px-2 text-muted-foreground">...</span>
                                                    </PaginationItem>
                                                ) : (
                                                    <PaginationItem key={item}>
                                                        <PaginationLink
                                                            href="#"
                                                            isActive={item === coupeOfsPage}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                setCoupeOfsPage(item);
                                                            }}
                                                        >
                                                            {item}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ),
                                            )}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCoupeOfsPage((p) => Math.min(coupeOfsTotalPages, p + 1));
                                                }}
                                                className={coupeOfsPage === coupeOfsTotalPages ? 'pointer-events-none opacity-50' : ''}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </Panel>

                    <Panel title="Quantité Départage par OF ·303" className="lg:col-span-2">
                        <div className="overflow-x-auto">
                            <table className="w-full font-mono text-xs">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground uppercase">
                                        <th className="py-2 text-left">OF</th>
                                        <th className="py-2 text-left">Article</th>
                                        <th className="py-2 text-right">Qté</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupeQteDepartage.length > 0 ? (
                                        coupeQteDepartage.map((d, i) => (
                                            <tr key={i} className="border-b border-border/50">
                                                <td className="py-2 font-bold">{d.of}</td>
                                                <td className="py-2">{d.article}</td>
                                                <td className="py-2 text-right font-bold text-primary">
                                                    {d.quantite}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={3}
                                                className="py-4 text-center italic text-muted-foreground"
                                            >
                                                Aucun départage
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Panel>

                    <Panel title="Comparaison Inline vs Endline" className="lg:col-span-2">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={inlineEndlineData}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="var(--border)"
                                />
                                <XAxis
                                    dataKey="chaine"
                                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                />
                                <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                                <Tooltip contentStyle={tt} />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar
                                    dataKey="inline"
                                    name="Inline"
                                    fill="var(--chart-1)"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="endline"
                                    name="Endline"
                                    fill="var(--chart-3)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Panel>
                </div>
            )}

            {/* Sprint 5 — Sérigraphie specific panels */}
            {workshop === 'serigraphie' && (
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <Panel title="Flux Entrée vs Sortie ·309">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={seriFlux}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke="var(--border)"
                                />
                                <XAxis
                                    dataKey="article"
                                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                                    interval={0}
                                    angle={-45}
                                    textAnchor="end"
                                    height={60}
                                />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip
                                    contentStyle={tt}
                                    formatter={(value: number, name: string, props: { payload?: Record<string, unknown> }) => {
                                        const couleur = props.payload?.couleur;
                                        return [
                                            value,
                                            name + (couleur ? ` (${couleur})` : ''),
                                        ];
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Bar
                                    dataKey="entree"
                                    name="Entrée"
                                    fill="var(--chart-4)"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="sortie"
                                    name="Sortie"
                                    fill="var(--chart-2)"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </Panel>

                    <Panel title="Rejets Sérigraphie ·309">
                        <div className="overflow-x-auto">
                            <table className="w-full font-mono text-xs">
                                <thead>
                                    <tr className="border-b border-border text-muted-foreground uppercase">
                                        <th className="py-2 text-left">ID Colis</th>
                                        <th className="py-2 text-left">Référence</th>
                                        <th className="py-2 text-left">Motif</th>
                                        <th className="py-2 text-right">Qté</th>
                                        <th className="py-2 text-center">Date rejet</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seriRejets.length > 0 ? (
                                        seriRejets.map((r, i) => (
                                            <tr key={i} className="border-b border-border/50">
                                                <td className="py-2 font-bold">{r.id_colis}</td>
                                                <td className="py-2 text-muted-foreground">{r.reference ?? '—'}</td>
                                                <td className="py-2 text-destructive">
                                                    {r.motif}
                                                </td>
                                                <td className="py-2 text-right">{r.qtte}</td>
                                                <td className="py-2 text-center text-muted-foreground">
                                                    {r.date_rejet
                                                        ? new Date(String(r.date_rejet)).toLocaleDateString('fr-FR')
                                                        : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="py-4 text-center italic text-muted-foreground"
                                            >
                                                Aucun rejet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {!!seriRejetsMetadata?.br_print_note && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] italic text-muted-foreground">
                                <InfoIcon className="h-3 w-3" />
                                {String(seriRejetsMetadata?.br_print_note)}
                            </div>
                        )}
                    </Panel>
                </div>
            )}
        </>
    );
}

// ─── Small helpers ─────────────────────────────────────────────────────────────

function KV({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-muted-foreground">{label}</div>
            <div className="truncate font-bold text-foreground">{value}</div>
        </div>
    );
}

function Legend2({ color, label }: { color: string; label: string }) {
    return (
        <div className="inline-flex items-center gap-1.5 tracking-wider text-muted-foreground uppercase">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
            {label}
        </div>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProductionPage() {
    const [chains, setChains] = useState<ChainInfo[]>([]);
    const [kpis, setKpis] = useState<ProductionKpis | null>(null);
    const [gauges, setGauges] = useState<GaugeItem[]>([]);
    const [wipGauges, setWipGauges] = useState<GaugeItem[]>([]);
    const [stoppages, setStoppages] = useState<StoppageItem[]>([]);
    const [ofProgress, setOfProgress] = useState<OfDonutItem[]>([]);
    const [soProgress, setSoProgress] = useState<BreakdownRow[]>([]);
    const [trend, setTrend] = useState<TrendItem[]>([]);
    const [topOps, setTopOps] = useState<TopOpItem[]>([]);
    const [allOps, setAllOps] = useState<TopOpItem[]>([]);
    const [wipData, setWipData] = useState<WipAreaItem[]>([]);

    // Workshop-specific state
    const [coupeCoverage, setCoupeCoverage] = useState<CoupeCoverageData>(null);
    const [coupeChainCoverage, setCoupeChainCoverage] = useState<CoupeChainCoverageData>(null);
    const [serigraphieCoverage, setSerigraphieCoverage] = useState<SerigraphieCoverageData>(null);
    const [departage, setDepartage] = useState<BreakdownRow[]>([]);
    const [vignettes, setVignettes] = useState<BreakdownRow[]>([]);

    // Sprint 5 - Coupe & Sérigraphie
    const [coupeTagging, setCoupeTagging] = useState<BreakdownRow[]>([]);
    const [coupeOfs, setCoupeOfs] = useState<BreakdownRow[]>([]);
    const [coupeQteDepartage, setCoupeQteDepartage] = useState<BreakdownRow[]>([]);
    const [seriFlux, setSeriFlux] = useState<BreakdownRow[]>([]);
    const [seriRejets, setSeriRejets] = useState<BreakdownRow[]>([]);
    const [seriRejetsMetadata, setSeriRejetsMetadata] = useState<Record<string, unknown> | undefined>(undefined);
    const [inlineEndlineData, setInlineEndlineData] = useState<BreakdownRow[]>([]);

    // Methods KPIs (F-REQ-216, 218, 219)
    const [tauxArchivage, setTauxArchivage] = useState<{ value: number | null; status: string; target: number } | null>(null);
    const [respectTempsEstime, setRespectTempsEstime] = useState<{ value: number | null; status: string; target: number } | null>(null);
    const [tauxTempsAcceptes, setTauxTempsAcceptes] = useState<{ value: number | null; status: string; target: number } | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState<'confection' | 'coupe' | 'serigraphie'>(
        'confection',
    );

    // Modal state
    const [selectedKpi, setSelectedKpi] = useState<ProductionKpiKey | null>(null);
    const [breakdownData, setBreakdownData] = useState<BreakdownData | null>(null);

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const { getFilterParams } = useFilters();
    const { url } = usePage();

    // Sync activeTab with URL ?tab=... parameter
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'confection' || tab === 'coupe' || tab === 'serigraphie') {
            setActiveTab(tab);
        }
    }, [url]);

    const fetchData = useCallback(async () => {
        try {
            const filters = getFilterParams();

            const promises: Promise<unknown>[] = [
                fetchProductionChainInfo(filters),
                fetchProductionKpis(filters),
                fetchTauxArchivage(),
                fetchRespectTempsEstime(),
                fetchTauxTempsAcceptes(),
            ];

            if (activeTab !== 'serigraphie') {
                promises.push(
                    fetchProductionGauges(filters),
                    fetchProductionWipGauges(filters),
                    fetchProductionStoppages(filters),
                    fetchProductionOfDonuts(filters),
                    fetchProductionSoProgress(filters),
                    fetchProductionTrend(filters),
                    fetchProductionTopOps(filters),
                    fetchProductionTopOps({ ...filters, all: '1' }),
                    fetchProductionWip(filters),
                );
            }

            if (activeTab === 'confection') {
                promises.push(
                    fetchDepartage('OP221', filters),
                    fetchDepartage('OP213', filters),
                    fetchCoupeChainCoverage(filters),
                );
            } else if (activeTab === 'coupe') {
                promises.push(
                    fetchCoupeCoverage(filters),
                    fetchCoupeChainCoverage(filters),
                    fetchCoupeTagging(filters),
                    fetchCoupeOfs(filters),
                    fetchCoupeQteDepartage(filters),
                    fetchInlineEndline(filters),
                );
            } else if (activeTab === 'serigraphie') {
                promises.push(
                    fetchSerigraphieCoverage(filters),
                    fetchSerigraphieFlux(filters),
                    fetchSerigraphieRejets(filters),
                );
            }

            const results = await Promise.allSettled(promises);

            let idx = 0;
            const nextResult = () => results[idx++];

            const chainsRes = nextResult();
            const kpisRes = nextResult();
            if (chainsRes.status === 'fulfilled') {
                setChains((chainsRes.value as { data: ChainInfo[] }).data);
            }
            if (kpisRes.status === 'fulfilled') setKpis(kpisRes.value as ProductionKpis);

            const archivageRes = nextResult();
            const respectRes = nextResult();
            const tempsAcceptesRes = nextResult();
            if (archivageRes.status === 'fulfilled') setTauxArchivage(archivageRes.value as { value: number | null; status: string; target: number });
            if (respectRes.status === 'fulfilled') setRespectTempsEstime(respectRes.value as { value: number | null; status: string; target: number });
            if (tempsAcceptesRes.status === 'fulfilled') setTauxTempsAcceptes(tempsAcceptesRes.value as { value: number | null; status: string; target: number });

            if (activeTab !== 'serigraphie') {
                const gaugesRes     = nextResult();
                const wipGaugesRes  = nextResult();
                const stoppagesRes  = nextResult();
                const ofRes         = nextResult();
                const soRes         = nextResult();
                const trendRes      = nextResult();
                const topOpsRes     = nextResult();
                const allOpsRes     = nextResult();
                const wipRes        = nextResult();

                if (gaugesRes.status    === 'fulfilled') setGauges((gaugesRes.value as { data: GaugeItem[] }).data);
                if (wipGaugesRes.status === 'fulfilled') setWipGauges((wipGaugesRes.value as { data: GaugeItem[] }).data);
                if (stoppagesRes.status === 'fulfilled') setStoppages((stoppagesRes.value as { data: StoppageItem[] }).data);
                if (ofRes.status        === 'fulfilled') setOfProgress((ofRes.value as { data: OfDonutItem[] }).data);
                if (soRes.status        === 'fulfilled') setSoProgress((soRes.value as { data: BreakdownRow[] }).data);
                if (trendRes.status     === 'fulfilled') setTrend((trendRes.value as { data: TrendItem[] }).data);
                if (topOpsRes.status    === 'fulfilled') setTopOps((topOpsRes.value as { data: TopOpItem[] }).data);
                if (allOpsRes.status    === 'fulfilled') setAllOps((allOpsRes.value as { data: TopOpItem[] }).data);
                if (wipRes.status       === 'fulfilled') setWipData((wipRes.value as { data: WipAreaItem[] }).data);
            }

            if (activeTab === 'confection') {
                const depRes       = nextResult();
                const vigRes       = nextResult();
                const chainCovRes  = nextResult();
                if (depRes.status      === 'fulfilled') setDepartage((depRes.value as { data: BreakdownRow[] }).data);
                if (vigRes.status      === 'fulfilled') setVignettes((vigRes.value as { data: BreakdownRow[] }).data);
                if (chainCovRes.status === 'fulfilled') setCoupeChainCoverage(chainCovRes.value as CoupeChainCoverageData);
            } else if (activeTab === 'coupe') {
                const coupeCovRes       = nextResult();
                const coupeChainRes     = nextResult();
                const taggingRes        = nextResult();
                const ofsRes            = nextResult();
                const qteDepRes         = nextResult();
                const inlineEndRes      = nextResult();

                if (coupeCovRes.status   === 'fulfilled') setCoupeCoverage(coupeCovRes.value as CoupeCoverageData);
                if (coupeChainRes.status === 'fulfilled') setCoupeChainCoverage(coupeChainRes.value as CoupeChainCoverageData);
                if (taggingRes.status    === 'fulfilled') setCoupeTagging((taggingRes.value as { data: BreakdownRow[] }).data);
                if (ofsRes.status        === 'fulfilled') setCoupeOfs((ofsRes.value as { data: BreakdownRow[] }).data);
                if (qteDepRes.status     === 'fulfilled') setCoupeQteDepartage((qteDepRes.value as { data: BreakdownRow[] }).data);
                if (inlineEndRes.status  === 'fulfilled') {
                    const raw = (inlineEndRes.value as { data: Record<string, unknown>[] }).data;
                    const grouped = new Map<string, { chaine: string; inline: number; endline: number }>();
                    for (const row of raw) {
                        const chaine = String(row.shortname ?? row.chaine ?? '');
                        if (!grouped.has(chaine)) grouped.set(chaine, { chaine, inline: 0, endline: 0 });
                        const g = grouped.get(chaine)!;
                        const count = Number(row.count ?? 0);
                        if (row.opera === 'inline') g.inline += count;
                        else if (row.opera === 'endline') g.endline += count;
                    }
                    setInlineEndlineData([...grouped.values()]);
                }
            } else if (activeTab === 'serigraphie') {
                const seriCovRes    = nextResult();
                const fluxRes       = nextResult();
                const rejetsRes     = nextResult();

                if (seriCovRes.status === 'fulfilled') setSerigraphieCoverage(seriCovRes.value as SerigraphieCoverageData);
                if (fluxRes.status    === 'fulfilled') setSeriFlux((fluxRes.value as { data: BreakdownRow[] }).data);
                if (rejetsRes.status  === 'fulfilled') {
                    const val = rejetsRes.value as { data: BreakdownRow[]; metadata?: Record<string, unknown> };
                    setSeriRejets(val.data);
                    setSeriRejetsMetadata(val.metadata);
                }
            }

            const criticalFailed = [chainsRes, kpisRes].some((r) => r.status === 'rejected');
            if (criticalFailed) {
                setError(
                    'Erreur de connexion au serveur — Certaines données peuvent être manquantes',
                );
            } else {
                setError(null);
            }

            setLastSync(new Date());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, [getFilterParams, activeTab]);

    const handleKpiClick = useCallback(
        async (key: ProductionKpiKey) => {
            setSelectedKpi(key);
            setBreakdownData(null);
            try {
                const filters = { ...getFilterParams(), atelier: activeTab };
                const res = await fetchProductionBreakdown(key, filters);
                setBreakdownData(res);
            } catch (e) {
                console.error('Failed to fetch breakdown:', e);
            }
        },
        [getFilterParams, activeTab],
    );

    useEffect(() => {
        // Reset all state on tab switch to avoid stale/ghost data
        setChains([]);
        setKpis(null);
        setGauges([]);
        setWipGauges([]);
        setStoppages([]);
        setOfProgress([]);
        setSoProgress([]);
        setTrend([]);
        setTopOps([]);
        setAllOps([]);
        setWipData([]);
        setCoupeCoverage(null);
        setCoupeChainCoverage(null);
        setSerigraphieCoverage(null);
        setDepartage([]);
        setVignettes([]);
        setLoading(true);

        fetchData();
        intervalRef.current = setInterval(fetchData, 60_000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData]);

    const exportRows = chains.map((c) => ({
        chaine:         c.id,
        of:             c.of,
        article:        c.article,
        designation:    c.designation,
        sam:            c.sam,
        sot:            c.sot,
        effectif:       c.effectif,
        objectif:       c.objectif,
        efficience_pct: c.eff,
        wip:            c.wip,
        bpd:            c.bpd,
        epd:            c.epd,
        ehd:            c.ehd,
    }));

    const sharedTabProps = {
        chains,
        kpis,
        gauges,
        wipGauges,
        stoppages,
        ofProgress,
        soProgress,
        trend,
        topOps,
        allOps,
        wipData,
        loading,
        onKpiClick: handleKpiClick,
    } as const;

    return (
        <>
            <Head title="Production — BACOVET" />
            <AppShell
                page="/production"
                title="Production & Flux"
                subtitle="Série 200 · Performance Atelier"
                exportRows={exportRows}
                exportFilename="BACOVET_Production_S200"
            >
                {error && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div className="text-xs font-bold tracking-wider uppercase">
                            {error}
                        </div>
                    </div>
                )}

                <Tabs
                    value={activeTab}
                    onValueChange={(v) =>
                        setActiveTab(v as 'confection' | 'coupe' | 'serigraphie')
                    }
                >
                    <TabsList>
                        <TabsTrigger
                            value="confection"
                            className="text-xs tracking-wider uppercase"
                        >
                            Confection
                        </TabsTrigger>
                        <TabsTrigger
                            value="coupe"
                            className="text-xs tracking-wider uppercase"
                        >
                            Coupe
                        </TabsTrigger>
                        <TabsTrigger
                            value="serigraphie"
                            className="text-xs tracking-wider uppercase"
                        >
                            Sérigraphie
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="confection">
                        <ProductionTab
                            {...sharedTabProps}
                            workshop="confection"
                            extraData={{
                                departage,
                                vignettes,
                                coupeChainCoverage,
                                tauxArchivage,
                                respectTempsEstime,
                                tauxTempsAcceptes
                            }}
                            />
                            </TabsContent>

                            <TabsContent value="coupe">
                            <ProductionTab
                            {...sharedTabProps}
                            workshop="coupe"
                            extraData={{
                                coupeCoverage,
                                coupeChainCoverage,
                                coupeTagging,
                                coupeOfs,
                                coupeQteDepartage,
                                inlineEndlineData,
                                tauxArchivage,
                                respectTempsEstime,
                                tauxTempsAcceptes
                            }}
                            />
                            </TabsContent>

                            <TabsContent value="serigraphie">
                            <ProductionTab
                            {...sharedTabProps}
                            workshop="serigraphie"
                            extraData={{
                                serigraphieCoverage,
                                seriFlux,
                                seriRejets,
                                seriRejetsMetadata,
                                inlineEndlineData,
                                tauxArchivage,
                                respectTempsEstime,
                                tauxTempsAcceptes
                            }}
                            />
                    </TabsContent>
                </Tabs>

                {lastSync && !loading && (
                    <div className="mt-4 text-center font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        Dernière sync:{' '}
                        <span className="text-foreground">
                            {lastSync.toLocaleTimeString('fr-FR')}
                        </span>
                    </div>
                )}
            </AppShell>

            <ProductionKpiDetailModal
                kpiKey={selectedKpi}
                kpiData={kpis}
                extraData={{
                    tauxArchivage,
                    respectTempsEstime,
                    tauxTempsAcceptes,
                }}
                breakdownData={breakdownData}
                onClose={() => setSelectedKpi(null)}
            />
        </>
    );
}