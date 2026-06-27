import { Head } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/app-shell';
import type { MethodsKpiKey } from '@/components/methods/methodsKpiDetailConfig';
import MethodsKpiDetailModal from '@/components/methods/MethodsKpiDetailModal';
import { BigNumberCard, Panel, TrafficBadge } from '@/components/widgets';
import { useFilters } from '@/context/FilterContext';
import { useLiveData } from '@/hooks/use-live-data';
import {
    fetchMethodesKpis,
    fetchArchivageDetail,
    fetchRespectTempsDetail,
    fetchTempsAcceptesDetail,
    fetchFiabiliteDetail,
    type MethodsKpisResponse,
    type ArchivageDetailItem,
    type RespectTempsDetailItem,
    type TempsAcceptesDetailItem,
    type FiabiliteDetailItem,
    type KpiStatus,
} from '@/services/methodsApi';

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
            className={`flex h-full flex-col cursor-pointer rounded-lg transition-all ${status === 'red' || status === 'orange' ? 'animate-flash-alert' : ''}`}
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
    const [archivageDetail, setArchivageDetail] = useState<ArchivageDetailItem[]>([]);
    const [respectTempsDetail, setRespectTempsDetail] = useState<RespectTempsDetailItem[]>([]);
    const [tempsAcceptesDetail, setTempsAcceptesDetail] = useState<TempsAcceptesDetailItem[]>([]);
    const [fiabiliteDetail, setFiabiliteDetail] = useState<FiabiliteDetailItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [openModal, setOpenModal] = useState<MethodsKpiKey | null>(null);

    const { filters } = useFilters();
    const { refreshIntervalSec, recordFetchSuccess, recordFetchError } = useLiveData();
    const ligneFilter = filters.ligne || '';

    const fetchData = useCallback(async () => {
        const methodFilters: Record<string, string> = {};
        if (ligneFilter) methodFilters.chaine = ligneFilter;
        if (filters.marque) methodFilters.marque = filters.marque;
        if (filters.of) methodFilters.of = filters.of;
        try {
            const [k, arch, resp, temps, fiab] = await Promise.allSettled([
                fetchMethodesKpis(methodFilters),
                fetchArchivageDetail(),
                fetchRespectTempsDetail(),
                fetchTempsAcceptesDetail(),
                fetchFiabiliteDetail(methodFilters),
            ]);

            if (k.status === 'fulfilled') setKpis(k.value);
            if (arch.status === 'fulfilled') setArchivageDetail(arch.value.data);
            if (resp.status === 'fulfilled') setRespectTempsDetail(resp.value.data);
            if (temps.status === 'fulfilled') setTempsAcceptesDetail(temps.value.data);
            if (fiab.status === 'fulfilled') setFiabiliteDetail(fiab.value.data);

            const anyFailed = [k, arch, resp, temps, fiab].some((r) => r.status === 'rejected');
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
    }, [ligneFilter, filters.marque, filters.of, recordFetchError, recordFetchSuccess]);

    useEffect(() => {
        fetchData();
        intervalRef.current = setInterval(fetchData, refreshIntervalSec * 1000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchData, refreshIntervalSec]);

    return (
        <>
            <Head title="Méthodes & Planning — BACOVET" />
            <AppShell
                page="/methods"
                title="Méthodes"
                subtitle="Série 200 · Méthodes & Amélioration Continue"
            >
                {error && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div className="text-xs font-bold uppercase">{error}</div>
                    </div>
                )}
                {/* Row  BigNumber Cards */}
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <KpiCard
                        label="Taux de respect du temps estimé par ARTICLE"
                        value={kpis?.f_req_218?.value ?? null}
                        status={kpis?.f_req_218?.status ?? 'grey'}
                        target="90%"
                        source="Base rendement + Logiciel Cotation"
                        freq="Freq: Journalière"
                        onClick={() => setOpenModal('f_req_218')}
                        isLoading={loading}
                    />
                    <KpiCard
                        label="Taux des temps acceptés dès la première version par ARTICLE"
                        value={kpis?.f_req_219?.value ?? null}
                        status={kpis?.f_req_219?.status ?? 'grey'}
                        target="≥80%"
                        source="Fichier déchiffrage + Logiciel Cotation"
                        freq="Freq: Hebdomadaire"
                        onClick={() => setOpenModal('f_req_219')}
                        isLoading={loading}
                    />
                </div>
                {/* Row Gauge Charts */}
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Panel title="Taux d'archivage suivi paquets">
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

                    <Panel title="Taux de fiabilité des données système par OF">
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



                {/* KPI Detail Modal */}
                <MethodsKpiDetailModal
                    kpiKey={openModal}
                    kpiData={kpis}
                    detailData={
                        openModal === 'f_req_216' ? archivageDetail
                            : openModal === 'f_req_217' ? fiabiliteDetail
                                : openModal === 'f_req_218' ? respectTempsDetail
                                    : openModal === 'f_req_219' ? tempsAcceptesDetail
                                        : null
                    }
                    onClose={() => setOpenModal(null)}
                />
            </AppShell>
        </>
    );
}
