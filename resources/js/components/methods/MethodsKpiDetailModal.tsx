import { X, Info } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { MethodsKpisResponse, FiabiliteDetailItem, ArchivageDetailItem, RespectTempsDetailItem, TempsAcceptesDetailItem } from '@/services/methodsApi';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
import {
    METHODS_KPI_CONFIG,
    type MethodsKpiKey,
    type MethodsKpiDetailConfig,
} from './methodsKpiDetailConfig';

interface MethodsKpiDetailModalProps {
    kpiKey: MethodsKpiKey | null;
    kpiData: MethodsKpisResponse | null;
    detailData?: (FiabiliteDetailItem | ArchivageDetailItem | RespectTempsDetailItem | TempsAcceptesDetailItem)[] | null;
    onClose: () => void;
}

function statusColor(status: string) {
    switch (status) {
        case 'green': return 'text-green-600';
        case 'orange': return 'text-orange-500';
        case 'red': return 'text-red-600';
        default: return 'text-gray-400';
    }
}

function statusBorder(status: string) {
    switch (status) {
        case 'green': return 'border-l-green-500';
        case 'orange': return 'border-l-orange-400';
        case 'red': return 'border-l-red-500';
        default: return 'border-l-gray-400';
    }
}

function formatValue(value: number | null, unit: string): string {
    if (value === null || value === undefined) return '—';
    return `${value.toFixed(1)}${unit}`;
}

export default function MethodsKpiDetailModal({
    kpiKey,
    kpiData,
    detailData,
    onClose,
}: MethodsKpiDetailModalProps) {
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

    const [detailPage, setDetailPage] = useState(1);
    const DETAIL_PAGE_SIZE = 10;

    useEffect(() => {
        setDetailPage(1);
    }, [kpiKey]);

    if (!kpiKey || !kpiData) return null;

    const config: MethodsKpiDetailConfig = METHODS_KPI_CONFIG[kpiKey];
    const kpiValue = kpiData[kpiKey];
    const cardStatus = kpiValue?.status ?? 'grey';
    const borderColor = statusBorder(cardStatus);
    const valueColor = statusColor(cardStatus);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const totalPages = detailData ? Math.ceil(detailData.length / DETAIL_PAGE_SIZE) : 0;
    const pagedData = detailData?.slice((detailPage - 1) * DETAIL_PAGE_SIZE, detailPage * DETAIL_PAGE_SIZE);

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
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border px-5 pt-4 pb-2">
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                                F-REQ-{config.id}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground uppercase">
                                Méthodes & Amélioration Continue
                            </span>
                        </div>
                        <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">
                            {config.label}
                        </h2>
                        <div className="mt-1 flex gap-4">
                            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
                                Période: <span className="text-foreground">{config.period}</span>
                            </span>
                            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
                                Exigence: <span className="text-foreground">F-REQ-{config.id}</span>
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

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    <p className="mb-5 text-xs text-muted-foreground">
                        {config.description}
                    </p>

                    {/* Proxy disclaimer for F-REQ-217 */}
                    {(kpiKey === 'f_req_217' && (kpiValue as { is_proxy?: boolean; proxy_note?: string })?.is_proxy) && (
                        <div className="mb-5 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                            <div className="font-mono text-[10px]">
                                <span className="font-bold tracking-wider text-warning uppercase">Proxy : </span>
                                <span className="text-foreground/80">{(kpiValue as { proxy_note?: string }).proxy_note}</span>
                            </div>
                        </div>
                    )}

                    {/* Top stat boxes */}
                    <div className="mb-6 grid grid-cols-3 gap-3">
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Valeur actuelle
                            </div>
                            <div className={`font-mono text-2xl font-bold tabular-nums ${valueColor}`}>
                                {formatValue(kpiValue?.value ?? null, config.formula.resultUnit)}
                            </div>
                        </div>
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Cible
                            </div>
                            <div className="mt-1 font-mono text-xl font-bold text-foreground">
                                {config.target.operator} {config.target.value}{config.formula.resultUnit}
                            </div>
                        </div>
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Statut
                            </div>
                            <div className={`text-xs font-bold uppercase ${valueColor} mt-2`}>
                                {cardStatus === 'green' ? '🟢 Conforme'
                                    : cardStatus === 'orange' ? '🟠 Vigilance'
                                    : cardStatus === 'red' ? '🔴 Critique'
                                    : `⚪ ${cardStatus.toUpperCase()}`}
                            </div>
                        </div>
                    </div>

                    {/* Formula & Source */}
                    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                Formule de calcul
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                                <div className="flex-1 rounded border border-border bg-secondary/10 p-1.5 text-center">
                                    <div className="truncate text-[8px] opacity-70">
                                        {config.formula.numerator.label}
                                    </div>
                                    <div className="truncate font-bold">
                                        {config.formula.numerator.field}
                                    </div>
                                </div>
                                <div className="text-muted-foreground">÷</div>
                                <div className="flex-1 rounded border border-border bg-secondary/10 p-1.5 text-center">
                                    <div className="truncate text-[8px] opacity-70">
                                        {config.formula.denominator.label}
                                    </div>
                                    <div className="truncate font-bold">
                                        {config.formula.denominator.field}
                                    </div>
                                </div>
                                <div className="text-muted-foreground">×</div>
                                <div className="font-bold">{config.formula.multiplier}</div>
                            </div>
                        </div>
                        <div>
                            <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                Source de données
                            </h4>
                            <div className="space-y-1 font-mono text-[10px]">
                                <div>
                                    <span className="text-muted-foreground">Système:</span>{' '}
                                    {config.source.system}
                                </div>
                                <div className="truncate">
                                    <span className="text-muted-foreground">Table:</span>{' '}
                                    {config.source.mysqlTable || 'N/A'}
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Fréquence:</span>{' '}
                                    {config.source.frequency}
                                </div>
                                {kpiData.synced_at && (
                                    <div>
                                        <span className="text-muted-foreground">Sync:</span>{' '}
                                        {new Date(kpiData.synced_at).toLocaleString('fr-FR')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Unavailable data notice */}
                    {config.source.status !== 'live' && (
                        <div className="mb-6 rounded-md border border-dashed border-border bg-secondary/30 p-4">
                            <div className="flex items-start gap-3">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                    <div className="mb-1 text-xs font-bold text-muted-foreground">
                                        Données indisponibles
                                    </div>
                                    <div className="text-xs text-muted-foreground/80">
                                        {config.thresholds.grey || 'Source en attente de connexion.'}
                                    </div>
                                    <div className="mt-1 font-mono text-[10px] text-primary/70 uppercase">
                                        {config.source.status === 'pending'
                                            ? 'Source: ' + config.source.system
                                            : 'CODE BLOQUANT: B-05'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Detail drill-down table */}
                    {detailData && detailData.length > 0 && kpiKey && (
                        <div className="mb-6">
                            <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                Données détaillées
                            </h4>
                            <div className="rounded-md border border-border">
                                <table className="w-full text-[10px] font-mono">
                                    <thead className="bg-secondary/50">
                                        <tr className="border-b border-border text-muted-foreground uppercase tracking-wider">
                                            {kpiKey === 'f_req_217' && (
                                                <>
                                                    <th className="px-2 py-1.5 text-left">Chaîne</th>
                                                    <th className="px-2 py-1.5 text-left">Shift</th>
                                                    <th className="px-2 py-1.5 text-right">Tag Théo.</th>
                                                    <th className="px-2 py-1.5 text-right">Tag Réel</th>
                                                    <th className="px-2 py-1.5 text-right">Écart %</th>
                                                    <th className="px-2 py-1.5 text-right">|Écart|</th>
                                                    <th className="px-2 py-1.5 text-right">Statut</th>
                                                </>
                                            )}
                                            {kpiKey === 'f_req_216' && (
                                                <>
                                                    <th className="px-2 py-1.5 text-left">OF Numéro</th>
                                                    <th className="px-2 py-1.5 text-center">Soldé</th>
                                                    <th className="px-2 py-1.5 text-center">Archivé</th>
                                                </>
                                            )}
                                            {kpiKey === 'f_req_218' && (
                                                <>
                                                    <th className="px-2 py-1.5 text-left">Article</th>
                                                    <th className="px-2 py-1.5 text-right">Cotation</th>
                                                    <th className="px-2 py-1.5 text-right">Production</th>
                                                    <th className="px-2 py-1.5 text-right">Diff.</th>
                                                    <th className="px-2 py-1.5 text-right">Respecté</th>
                                                </>
                                            )}
                                            {kpiKey === 'f_req_219' && (
                                                <>
                                                    <th className="px-2 py-1.5 text-left">Article</th>
                                                    <th className="px-2 py-1.5 text-right">Total</th>
                                                    <th className="px-2 py-1.5 text-right">Acceptées V1</th>
                                                    <th className="px-2 py-1.5 text-right">Taux %</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {kpiKey === 'f_req_217' && (pagedData as FiabiliteDetailItem[] | undefined)?.map((row, i) => (
                                            <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                                                <td className="px-2 py-1">{row.chaine}</td>
                                                <td className="px-2 py-1">{row.shift}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{row.tag_theorique}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{row.tag_reel}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{row.ecart_pct}%</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{row.ecart_abs}%</td>
                                                <td className="px-2 py-1 text-right">
                                                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                                                        row.status === 'green' ? 'bg-green-500' : row.status === 'orange' ? 'bg-orange-400' : 'bg-red-500'
                                                    }`} />
                                                </td>
                                            </tr>
                                        ))}
                                        {kpiKey === 'f_req_216' && (pagedData as ArchivageDetailItem[] | undefined)?.map((row, i) => (
                                            <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                                                <td className="px-2 py-1">{row.of_numero}</td>
                                                <td className="px-2 py-1 text-center">{row.est_solde ? '✓' : '—'}</td>
                                                <td className="px-2 py-1 text-center">{row.est_archive ? '✓' : '—'}</td>
                                            </tr>
                                        ))}
                                        {kpiKey === 'f_req_218' && (pagedData as RespectTempsDetailItem[] | undefined)?.map((row, i) => (
                                            <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                                                <td className="px-2 py-1">{row.article}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{row.temps_cotation} min</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{row.temps_production} min</td>
                                                <td className={`px-2 py-1 text-right tabular-nums ${row.difference > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                    {row.difference > 0 ? '+' : ''}{row.difference}
                                                </td>
                                                <td className="px-2 py-1 text-right">
                                                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${row.est_respecte ? 'bg-green-500' : 'bg-red-500'}`} />
                                                </td>
                                            </tr>
                                        ))}
                                        {kpiKey === 'f_req_219' && (pagedData as TempsAcceptesDetailItem[] | undefined)?.map((row, i) => (
                                            <tr key={i} className="border-b border-border/50 hover:bg-secondary/30">
                                                <td className="px-2 py-1">{row.article}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{row.nb_gammes_total}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{row.nb_acceptees_v1}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{row.taux_pct ?? '—'}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {totalPages > 1 && (
                                <div className="mt-3 flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">
                                        {detailPage} / {totalPages} pages ({detailData.length} lignes)
                                    </span>
                                    <Pagination>
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setDetailPage((p) => Math.max(1, p - 1));
                                                    }}
                                                    className={detailPage === 1 ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                .filter((p) => {
                                                    if (totalPages <= 7) return true;
                                                    if (p === 1 || p === totalPages) return true;
                                                    if (Math.abs(p - detailPage) <= 1) return true;
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
                                                                isActive={item === detailPage}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    setDetailPage(item);
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
                                                        setDetailPage((p) => Math.min(totalPages, p + 1));
                                                    }}
                                                    className={detailPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                                                />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Alert rules */}
                    <div className="mt-4">
                        <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                            Règles d'alerte
                        </h4>
                        <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-muted-foreground">Vert:</span>{' '}
                                {config.thresholds.green}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-orange-400" />
                                <span className="text-muted-foreground">Orange:</span>{' '}
                                {config.thresholds.orange}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                <span className="text-muted-foreground">Rouge:</span>{' '}
                                {config.thresholds.red}
                            </div>
                            {config.thresholds.grey && (
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                                    <span className="text-muted-foreground">Gris:</span>{' '}
                                    {config.thresholds.grey}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end border-t border-border bg-secondary/5 px-5 py-3">
                    <button
                        onClick={onClose}
                        className="rounded px-4 py-2 font-mono text-[10px] tracking-widest uppercase text-muted-foreground hover:bg-secondary"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}
