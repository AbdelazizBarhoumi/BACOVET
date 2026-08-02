import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    datasetToCsv,
    datasetsToWorkbook,
    visualExportData,
    type ExportDeps,
} from '@/lib/pbi/exportData';
import { exportFilename } from '@/lib/pbi/exportRender';
import { visualTable, type Visual } from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';

/** Hover action on a visual (view mode) to download its data as CSV or Excel. */
export function VisualExportButton({ visual }: { visual: Visual }) {
    const { rows, tableRows, tables, joins, crossFilter, interactionFor } =
        usePbi();
    const [busy, setBusy] = useState(false);

    const deps: ExportDeps = { tables, joins, crossFilter, interactionFor };
    const base = tableRows[visualTable(visual)] ?? rows;

    const run = async (kind: 'csv' | 'xlsx') => {
        if (busy) return;
        const ds = visualExportData(visual, base, deps);
        if (!ds || !ds.rows.length) {
            toast.error('Aucune donnée à exporter pour ce visuel');
            return;
        }
        setBusy(true);
        try {
            if (kind === 'csv') {
                const blob = new Blob([datasetToCsv(ds)], {
                    type: 'text/csv;charset=utf-8',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = exportFilename(
                    visual.name || visual.title || 'visual',
                    'csv',
                );
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            } else {
                const wb = await datasetsToWorkbook([ds]);
                const XLSX = await import('xlsx');
                XLSX.writeFile(
                    wb,
                    exportFilename(visual.name || visual.title || 'visual', 'xlsx'),
                );
            }
            toast.success('Export terminé');
        } catch {
            toast.error("Échec de l'export");
        } finally {
            setBusy(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    aria-label="Exporter les données du visuel"
                    className="flex items-center gap-1 rounded px-1 text-[10px] text-muted-foreground hover:text-foreground"
                    disabled={busy}
                >
                    {busy ? (
                        <Loader2 className="size-3 animate-spin" />
                    ) : (
                        <FileSpreadsheet className="size-3" />
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => run('csv')}>
                    <FileText className="mr-2 h-3.5 w-3.5" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => run('xlsx')}>
                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
