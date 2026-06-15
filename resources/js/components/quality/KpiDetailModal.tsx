import { X, Info, Download } from 'lucide-react';
import { useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import type {
    QualityKpis,
    KpiCard as KpiCardType,
    BrChartItem,
    AnnualTrendItem,
} from '@/services/qualityApi';
import { KPI_DETAIL_CONFIG, type KpiKey } from './kpiDetailConfig';

interface KpiDetailModalProps {
    kpiKey: KpiKey | null;
    kpiData: QualityKpis | null;
    brChartData: BrChartItem[];
    trendData: AnnualTrendItem[];
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

function statusDot(status: string) {
    switch (status) {
        case 'green':
            return 'bg-green-500';
        case 'orange':
            return 'bg-orange-400';
        case 'red':
            return 'bg-red-500';
        default:
            return 'bg-gray-400';
    }
}

function formatValue(value: number | null, unit: string): string {
    if (value === null || value === undefined) return '—';
    return `${value.toFixed(1)}${unit}`;
}

function Sparkline({ data, status }: { data: number[]; status: string }) {
    if (data.length < 2) return null;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const w = 120;
    const h = 40;
    const pad = 2;
    const color =
        status === 'green'
            ? '#16a34a'
            : status === 'orange'
              ? '#ea580c'
              : '#dc2626';

    const points = data
        .map((v, i) => {
            const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
            const y = h - pad - ((v - min) / range) * (h - 2 * pad);
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <div className="flex justify-center">
            <svg width={w} height={h}>
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
}

function BrBreakdownTable({
    brChartData,
    target,
}: {
    brChartData: BrChartItem[];
    target: number;
}) {
    if (brChartData.length === 0) return null;
    const sorted = [...brChartData].sort(
        (a, b) => (b.defect_pct ?? 0) - (a.defect_pct ?? 0),
    );
    const top = sorted.slice(0, 10);

    return (
        <table className="w-full font-mono text-xs">
            <thead>
                <tr className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase">
                    <th className="py-1 text-left">Étape/Chaîne</th>
                    <th className="text-right">Valeur</th>
                    <th className="w-16 text-center">Statut</th>
                    <th className="text-right">Écart</th>
                </tr>
            </thead>
            <tbody>
                {top.map((item) => {
                    const diff =
                        item.defect_pct != null
                            ? item.defect_pct - target
                            : null;
                    const diffStr =
                        diff != null
                            ? diff > 0
                                ? `+${diff.toFixed(1)}`
                                : `${diff.toFixed(1)}`
                            : '—';
                    const diffColor =
                        diff != null
                            ? diff > 0
                                ? 'text-red-600'
                                : 'text-green-600'
                            : 'text-muted-foreground';
                    return (
                        <tr
                            key={item.stage}
                            className="border-b border-border/50"
                        >
                            <td className="py-1.5 font-bold">{item.stage}</td>
                            <td className="text-right tabular-nums">
                                {item.defect_pct != null
                                    ? `${item.defect_pct.toFixed(1)}%`
                                    : '—'}
                            </td>
                            <td className="text-center">
                                <span
                                    className={`inline-block h-2 w-2 rounded-full ${statusDot(item.status)}`}
                                />
                            </td>
                            <td className={`text-right ${diffColor}`}>
                                {diffStr}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default function KpiDetailModal({
    kpiKey,
    kpiData,
    brChartData,
    trendData,
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

    const config = KPI_DETAIL_CONFIG[kpiKey];

    const kpiKeyMap: Record<KpiKey, keyof QualityKpis> = {
        br_cgl: 'br_cgl',
        br_gtd_jour: 'br_gtd_jour',
        rft_jour: 'rft_jour',
        br_bundling_jour: 'br_bundling_jour',
        br_gtd_dda: 'br_gtd_annee',
        rft_annee: 'rft_annee',
        br_bundling_annee: 'br_bundling_annee',
        br_print: 'br_print',
        br_print_dda: 'br_print_dda',
        br_care_label_jour: 'br_care_label_jour',
        br_care_label_dda: 'br_care_label_dda',
        br_accessoires_jour: 'br_accessoires_jour',
        br_accessoires_dda: 'br_accessoires_dda',
        br_compo_jour: 'br_compo_jour',
        br_compo_dda: 'br_compo_dda',
    };

    const card = kpiData[kpiKeyMap[kpiKey]] as KpiCardType | undefined;
    if (!card) return null;

    const cardStatus = card.status || 'grey';
    const isLive = config.source.status === 'live';
    const borderColor = statusBorder(cardStatus);
    const valueColor = statusColor(cardStatus);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    const trendValues = trendData
        .map((d) => (kpiKey.includes('rft') ? d.rft : d.br_gtd))
        .filter((v): v is number => v !== null)
        .slice(-7);

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
                                Série 100 — Qualité Produits
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
                                    {config.id}
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
                            <div className="flex items-center gap-2 font-mono text-[10px]">
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

                    {/* Breakdown & Viz */}
                    {isLive ? (
                        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                            <div className="md:col-span-2">
                                <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                    Ventilation par étape
                                </h4>
                                {config.breakdownAvailable ? (
                                    <BrBreakdownTable
                                        brChartData={brChartData}
                                        target={config.target.value}
                                    />
                                ) : (
                                    <div className="text-xs text-muted-foreground italic">
                                        Ventilation non disponible pour ce KPI.
                                    </div>
                                )}
                            </div>
                            <div className="border-l border-border pl-6">
                                <h4 className="mb-2 text-center text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                    Tendance
                                </h4>
                                <div className="flex h-full min-h-[100px] items-center justify-center">
                                    {config.trendAvailable &&
                                    trendValues.length >= 2 ? (
                                        <Sparkline
                                            data={trendValues}
                                            status={cardStatus}
                                        />
                                    ) : (
                                        <div className="text-[10px] text-muted-foreground italic">
                                            Non disponible
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
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
                                            ? 'Action requise: équipe DIVA'
                                            : 'CODE BLOQUANT: B-01'}
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
                                const exportRows =
                                    config.breakdownAvailable &&
                                    brChartData.length > 0
                                        ? brChartData.map((item) => ({
                                              Étape: item.stage,
                                              Valeur:
                                                  item.defect_pct != null
                                                      ? `${item.defect_pct.toFixed(2)}%`
                                                      : '—',
                                              Statut: item.status,
                                          }))
                                        : [
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
                                    `BACOVET_Qualite_${kpiKey}_${today}.xlsx`,
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
