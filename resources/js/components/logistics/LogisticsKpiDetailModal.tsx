import { X, Info, Download } from 'lucide-react';
import { useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import type { LogisticsKpis, KpiStatus } from '@/services/logisticsApi';
import {
    KPI_DETAIL_CONFIG as LOGISTICS_KPI_DETAIL_CONFIG,
    type KpiKey,
} from './kpiDetailConfig';

interface KpiDetailModalProps {
    kpiKey: KpiKey | null;
    kpiData: LogisticsKpis | null;
    onClose: () => void;
}

function statusColor(status: string) {
    switch (status) {
        case 'green':
            return 'text-green-600';
        case 'orange':
            return 'text-orange-500';
        case 'red':
            return 'text-red-600';
        default:
            return 'text-gray-400';
    }
}

function statusBorder(status: string) {
    switch (status) {
        case 'green':
            return 'border-l-green-500';
        case 'orange':
            return 'border-l-orange-400';
        case 'red':
            return 'border-l-red-500';
        default:
            return 'border-l-gray-400';
    }
}

function formatValue(value: number | null, unit: string): string {
    if (value === null || value === undefined) return '—';
    return `${value.toFixed(1)}${unit}`;
}

export default function LogisticsKpiDetailModal({
    kpiKey,
    kpiData,
    onClose,
}: KpiDetailModalProps) {
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

    if (!kpiKey || !kpiData) return null;

    const config = LOGISTICS_KPI_DETAIL_CONFIG[kpiKey];

    // Extract the relevant KPI card from the response
    let card: { value: number | null; status: KpiStatus } | undefined;
    switch (kpiKey) {
        case 'dot':
            card = kpiData.dot;
            break;
        case 'hot':
            card = kpiData.hot;
            break;
        case 'respect_plan':
            card = kpiData.respect_plan;
            break;
        case 'lead_time':
            card = kpiData.lead_time;
            break;
        default:
            return null;
    }

    if (!card) return null;

    const cardStatus = card.status || 'grey';
    const isLive = config.source.status === 'live';
    const borderColor = statusBorder(cardStatus);
    const valueColor = statusColor(cardStatus);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

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
                                Série 300 — Logistique & Planning
                            </span>
                        </div>
                        <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">
                            {config.label}
                        </h2>
                        <div className="mt-1 flex gap-4">
                            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
                                Vue:{' '}
                                <span className="text-foreground">
                                    {config.period === 'jour'
                                        ? 'Quotidienne'
                                        : 'Annuelle'}
                                </span>
                            </span>
                            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">
                                Exigence:{' '}
                                <span className="text-foreground">
                                    F-REQ-{config.id}
                                </span>
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

                    {/* Top stat boxes */}
                    <div className="mb-6 grid grid-cols-3 gap-3">
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Valeur actuelle
                            </div>
                            <div
                                className={`font-mono text-2xl font-bold tabular-nums ${valueColor}`}
                            >
                                {formatValue(
                                    card.value,
                                    config.formula.resultUnit,
                                )}
                            </div>
                        </div>
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Cible
                            </div>
                            <div className="mt-1 font-mono text-xl font-bold text-foreground">
                                {config.target.operator} {config.target.value}
                                {config.formula.resultUnit}
                            </div>
                        </div>
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                                Statut
                            </div>
                            <div
                                className={`text-xs font-bold uppercase ${statusColor(cardStatus)} mt-2`}
                            >
                                {cardStatus === 'green'
                                    ? '🟢 Conforme'
                                    : cardStatus === 'orange'
                                      ? '🟠 Vigilance'
                                      : cardStatus === 'red'
                                        ? '🔴 Critique'
                                        : '⚪ ' + cardStatus.toUpperCase()}
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
                                <div className="font-bold">
                                    {config.formula.multiplier}
                                </div>
                            </div>
                        </div>
                        <div>
                            <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                Source de données
                            </h4>
                            <div className="space-y-1 font-mono text-[10px]">
                                <div>
                                    <span className="text-muted-foreground">
                                        Système:
                                    </span>{' '}
                                    {config.source.system}
                                </div>
                                <div className="truncate">
                                    <span className="text-muted-foreground">
                                        Endpoint:
                                    </span>{' '}
                                    {config.source.novacityEndpoint || 'N/A'}
                                </div>
                                <div>
                                    <span className="text-muted-foreground">
                                        Fréquence:
                                    </span>{' '}
                                    {config.source.frequency}
                                </div>
                                {kpiData.synced_at && (
                                    <div>
                                        <span className="text-muted-foreground">
                                            Sync:
                                        </span>{' '}
                                        {new Date(
                                            kpiData.synced_at,
                                        ).toLocaleString('fr-FR')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Unavailable data notice */}
                    {!isLive && (
                        <div className="mb-6 rounded-md border border-dashed border-border bg-secondary/30 p-4">
                            <div className="flex items-start gap-3">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                    <div className="mb-1 text-xs font-bold text-muted-foreground">
                                        Données indisponibles
                                    </div>
                                    <div className="text-xs text-muted-foreground/80">
                                        {config.thresholds.grey ||
                                            'Source en attente de connexion.'}
                                    </div>
                                    <div className="mt-1 font-mono text-[10px] text-primary/70 uppercase">
                                        {config.source.status === 'pending'
                                            ? 'Action requise: équipe GPRO Planning'
                                            : 'CODE BLOQUANT'}
                                    </div>
                                </div>
                            </div>
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
                                <span className="text-muted-foreground">
                                    Vert:
                                </span>{' '}
                                {config.thresholds.green}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-orange-400" />
                                <span className="text-muted-foreground">
                                    Orange:
                                </span>{' '}
                                {config.thresholds.orange}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                <span className="text-muted-foreground">
                                    Rouge:
                                </span>{' '}
                                {config.thresholds.red}
                            </div>
                            {config.thresholds.grey && (
                                <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-gray-400" />
                                    <span className="text-muted-foreground">
                                        Gris:
                                    </span>{' '}
                                    {config.thresholds.grey}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border bg-secondary/5 px-5 py-3">
                    {isLive ? (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-2 text-[10px] tracking-widest uppercase"
                            onClick={() => {
                                const today = new Date()
                                    .toISOString()
                                    .slice(0, 10);
                                const wb = XLSX.utils.book_new();
                                const exportRows = [
                                    {
                                        KPI: config.label,
                                        Valeur:
                                            card.value != null
                                                ? `${card.value.toFixed(1)}%`
                                                : '—',
                                        Statut: card.status,
                                        Cible: `${config.target.operator}${config.target.value}%`,
                                    },
                                ];
                                const ws = XLSX.utils.json_to_sheet(exportRows);
                                XLSX.utils.book_append_sheet(wb, ws, 'Data');
                                XLSX.writeFile(
                                    wb,
                                    `BACOVET_Logistique_${kpiKey}_${today}.xlsx`,
                                );
                            }}
                        >
                            <Download className="h-3 w-3" /> Exporter XLSX
                        </Button>
                    ) : (
                        <div />
                    )}
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[10px] tracking-widest uppercase"
                        onClick={onClose}
                    >
                        Fermer
                    </Button>
                </div>
            </div>
        </div>
    );
}
