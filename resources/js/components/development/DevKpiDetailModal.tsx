import { X, Info } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { DevelopmentKpisResponse } from '@/services/developmentApi';
import {
    DEV_KPI_CONFIG,
    type DevKpiKey,
    type DevKpiDetailConfig,
} from './devKpiDetailConfig';

interface DevKpiDetailModalProps {
    kpiKey: DevKpiKey | null;
    kpiData: DevelopmentKpisResponse | null;
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

export default function DevKpiDetailModal({
    kpiKey,
    kpiData,
    onClose,
}: DevKpiDetailModalProps) {
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

    const config: DevKpiDetailConfig = DEV_KPI_CONFIG[kpiKey];
    const kpiValue = kpiData.kpis?.[kpiKey];
    const cardStatus = kpiValue?.status ?? 'grey';
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
                                Série 350 — Développement
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
                        <div className="group/info relative">
                            <div className="mb-2 flex items-center gap-1.5">
                                <h4 className="text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                    Formule de calcul
                                </h4>
                                {config.formula.numerator.field !== '—' && config.formula.denominator.field !== '—' && (
                                    <div className="relative">
                                        <Info className="h-3 w-3 cursor-help text-muted-foreground/60 transition-colors hover:text-muted-foreground" />
                                        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-md border border-border bg-card p-3 text-[10px] font-mono leading-relaxed normal-case tracking-normal text-muted-foreground shadow-lg opacity-0 transition-opacity duration-150 group-hover/info:pointer-events-auto group-hover/info:opacity-100">
                                            <span className="font-sans text-[11px] font-bold text-foreground">Champs technique :</span>
                                            <br />
                                            {config.formula.numerator.field} ÷ {config.formula.denominator.field} × {config.formula.multiplier}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                                {config.description}
                            </p>
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
                                {(kpiValue?.synced_at || kpiData.synced_at) && (
                                    <div>
                                        <span className="text-muted-foreground">Sync:</span>{' '}
                                        {new Date(kpiValue?.synced_at || kpiData.synced_at!).toLocaleString('fr-FR')}
                                        {kpiValue?.is_stale && (
                                            <span className="ml-1 text-warning">(obsolète)</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Google Drive notice */}
                    {config.source.status === 'google_drive' && (
                        <div className="mb-6 rounded-md border border-dashed border-border bg-secondary/30 p-4">
                            <div className="flex items-start gap-3">
                                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div>
                                    <div className="mb-1 text-xs font-bold text-muted-foreground">
                                        Source Google Drive
                                    </div>
                                    <div className="text-xs text-muted-foreground/80">
                                        Ces KPIs sont alimentés via Google Sheets. La synchronisation
                                        est effectuée 4 fois par jour.
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
