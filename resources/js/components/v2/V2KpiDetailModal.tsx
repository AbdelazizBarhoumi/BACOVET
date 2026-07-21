import { X, Download } from 'lucide-react';
import { useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import type { V2KpiItem } from '@/services/v2ProductionApi';
import type { BreakdownData, BreakdownRow } from '../../types/production';

interface V2KpiDetailModalProps {
    kpi: V2KpiItem | null;
    breakdownData?: BreakdownData | null;
    onClose: () => void;
}

function statusColor(status: string) {
    switch (status) {
        case 'green': return 'text-green-600';
        case 'orange': return 'text-orange-500';
        case 'red':
        case 'error': return 'text-red-600';
        default: return 'text-gray-400';
    }
}

function statusBorder(status: string) {
    switch (status) {
        case 'green': return 'border-l-green-500';
        case 'orange': return 'border-l-orange-400';
        case 'red':
        case 'error': return 'border-l-red-500';
        default: return 'border-l-gray-400';
    }
}

function statusDot(status: string) {
    switch (status) {
        case 'green': return 'bg-green-500';
        case 'orange': return 'bg-orange-400';
        case 'red':
        case 'error': return 'bg-red-500';
        default: return 'bg-gray-400';
    }
}

function formatValue(value: number | string | null | undefined | unknown[], unit: string): string {
    if (value === null || value === undefined) return '-';
    if (Array.isArray(value)) {
        // If single-item array, extract the value; otherwise show count
        if (value.length === 1) {
            const single = value[0];
            if (typeof single === 'object' && single !== null && 'value' in single) {
                const v = (single as Record<string, unknown>).value;
                return typeof v === 'number' ? `${v.toFixed(1)}${unit}` : `${v}${unit}`;
            }
            return typeof single === 'number' ? `${single.toFixed(1)}${unit}` : `${single}${unit}`;
        }
        return `${value.length} éléments`;
    }
    if (typeof value === 'number') return `${value.toFixed(1)}${unit}`;
    return `${value}${unit}`;
}

function BreakdownTable({ type, rows }: { type: string; rows: BreakdownRow[] }) {
    if (!rows || rows.length === 0) return <div className="text-xs text-muted-foreground italic">Aucune donnée de ventilation disponible.</div>;

    switch (type) {
        case 'per_chain': {
            const sorted = [...rows].sort((a, b) => Number(a.value ?? 0) - Number(b.value ?? 0)).slice(0, 10);
            return (
                <table className="w-full font-mono text-xs">
                    <thead>
                        <tr className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase">
                            <th className="py-1 text-left">Chaîne</th>
                            <th className="text-right">Valeur</th>
                            <th className="w-16 text-center">Statut</th>
                            <th className="text-right">Écart</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((item, i) => (
                            <tr key={i} className="border-b border-border/50">
                                <td className="py-1.5 font-bold">{String(item.chaine)}</td>
                                <td className="text-right tabular-nums">{formatValue(Number(item.value), '%')}</td>
                                <td className="text-center"><span className={`inline-block h-2 w-2 rounded-full ${statusDot(String(item.status))}`} /></td>
                                <td className={`text-right ${Number(item.ecart) < 0 ? 'text-red-600' : 'text-green-600'}`}>{Number(item.ecart) > 0 ? `+${item.ecart}` : item.ecart}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
        case 'per_operator': {
            const sorted = [...rows].sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0)).slice(0, 15);
            return (
                <table className="w-full font-mono text-xs">
                    <thead>
                        <tr className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase">
                            <th className="py-1 text-left">Opérateur</th>
                            <th className="text-left">Chaîne</th>
                            <th className="text-right">Valeur</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((item, i) => (
                            <tr key={i} className="border-b border-border/50">
                                <td className="py-1.5 font-bold">{item.employe}</td>
                                <td>{item.chaine}</td>
                                <td className="text-right tabular-nums">{formatValue(item.value, '%')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
        }
        default:
            return (
                <table className="w-full font-mono text-xs">
                    <thead>
                        <tr className="border-b border-border text-[10px] tracking-wider text-muted-foreground uppercase">
                            {rows[0] && Object.keys(rows[0]).filter(k => !['_', '__'].includes(k)).slice(0, 5).map(k => (
                                <th key={k} className="py-1 text-left">{k}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-b border-border/50">
                                {Object.keys(row).filter(k => !['_', '__'].includes(k)).slice(0, 5).map(k => (
                                    <td key={k} className="py-1.5">{String(row[k] ?? '—')}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
    }
}

export default function V2KpiDetailModal({ kpi, breakdownData, onClose }: V2KpiDetailModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!kpi) return;
        const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [kpi, onClose]);

    if (!kpi) return null;

    const cardStatus = kpi.status || 'grey';
    const borderColor = statusBorder(cardStatus);
    const valueColor = statusColor(cardStatus);
    const unit = kpi.target_is_percentage ? '%' : '';

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    return (
        <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleBackdropClick} role="dialog" aria-modal="true">
            <div className={`relative max-h-[90vh] w-full max-w-2xl rounded-lg border border-y-0 border-l-4 border-border bg-card shadow-xl ${borderColor} flex flex-col overflow-hidden`}>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-border px-5 pt-4 pb-2">
                    <div>
                        <div className="mb-1 flex items-center gap-2">
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">{kpi.kpi_code}</span>
                        </div>
                        <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">{kpi.name}</h2>
                        <div className="mt-1 flex gap-4">
                            <span className="text-[10px] tracking-tight text-muted-foreground uppercase">Exigence: <span className="text-foreground">{kpi.kpi_code}</span></span>
                        </div>
                    </div>
                    <button onClick={onClose} className="cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-secondary">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Top stats */}
                    <div className={`mb-6 grid gap-3 ${kpi.target_readable ? 'grid-cols-3' : 'grid-cols-2'}`}>
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Valeur actuelle</div>
                            <div className={`font-mono text-2xl font-bold tabular-nums ${valueColor}`}>
                                {kpi.value === null ? '-' : formatValue(kpi.value, unit)}
                            </div>
                        </div>
                        {kpi.target_readable && (
                            <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                                <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Cible</div>
                                <div className="mt-1 font-mono text-xl font-bold text-foreground">
                                    {kpi.target_readable}
                                </div>
                            </div>
                        )}
                        <div className="rounded-md border border-border bg-secondary/30 p-3 text-center">
                            <div className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Statut</div>
                            <div className={`text-xs font-bold uppercase ${statusColor(cardStatus)} mt-2`}>
                                {cardStatus === 'green' ? '🟢 Conforme' : cardStatus === 'orange' ? '🟠 Vigilance' : cardStatus === 'red' ? '🔴 Critique' : cardStatus === 'error' ? '🔴 Erreur' : '⚪ ' + cardStatus.toUpperCase()}
                            </div>
                        </div>
                    </div>

                    {/* Formula & Source */}
                    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Formule de calcul</h4>
                            {kpi.formula_readable ? (
                                <p className="text-xs leading-relaxed text-muted-foreground">{kpi.formula_readable}</p>
                            ) : (
                                <div className="rounded border border-border bg-secondary/10 p-2 font-mono text-xs italic">Valeur brute</div>
                            )}
                        </div>
                        <div>
                            <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Source de données</h4>
                            <div className="space-y-1 font-mono text-[10px]">
                                {kpi.endpoints && kpi.endpoints.length > 0 && kpi.endpoints.map((ep, i) => (
                                    <div key={i} className="truncate"><span className="text-muted-foreground">Endpoint:</span> {ep}</div>
                                ))}
                                <div><span className="text-muted-foreground">Fréquence:</span> {kpi.refresh_frequency}</div>
                                <div><span className="text-muted-foreground">Dernière sync:</span> {kpi.last_valid_synced_at ? new Date(kpi.last_valid_synced_at).toLocaleString('fr-FR', { timeZone: 'UTC' }) : 'jamais'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown */}
                    {breakdownData?.rows && breakdownData.rows.length > 0 && (
                        <div className="mb-6">
                            <h4 className="mb-2 text-[10px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Ventilation</h4>
                            <BreakdownTable type="default" rows={breakdownData.rows} />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border bg-secondary/5 px-5 py-3">
                    <Button variant="outline" size="sm" className="h-8 gap-2 text-[10px] tracking-widest uppercase" onClick={() => {
                        const today = new Date().toISOString().slice(0, 10);
                        const wb = XLSX.utils.book_new();
                        const rows = breakdownData?.rows || [{ KPI: kpi.name, Valeur: kpi.value, Statut: kpi.status, Cible: kpi.target_readable }];
                        const ws = XLSX.utils.json_to_sheet(rows);
                        XLSX.utils.book_append_sheet(wb, ws, 'Data');
                        XLSX.writeFile(wb, `${kpi.kpi_code}_${today}.xlsx`);
                    }}>
                        <Download className="h-3 w-3" /> Exporter XLSX
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] tracking-widest uppercase" onClick={onClose}>Fermer</Button>
                </div>
            </div>
        </div>
    );
}
