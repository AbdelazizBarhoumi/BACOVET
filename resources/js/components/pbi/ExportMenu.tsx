import {
    Download,
    FileText,
    Image as ImageIcon,
    Loader2,
    Presentation,
    Table2,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
    collectReportDatasets,
    datasetsToWorkbook,
    type ExportDeps,
} from '@/lib/pbi/exportData';
import {
    captureElement,
    captureNodes,
    downloadPng,
    exportFilename,
    imagesToPdf,
    imagesToPptx,
    nextFrame,
} from '@/lib/pbi/exportRender';
import { usePbi } from '@/lib/pbi/store';
import { ExportSurface } from './ExportSurface';

type ExportKind = 'pdf' | 'pdf-current' | 'png' | 'xlsx' | 'pptx';

export function ExportMenu() {
    const {
        state,
        tables,
        joins,
        crossFilter,
        interactionFor,
        tableRows,
        measures,
        graph,
        smartNetwork,
    } = usePbi();
    const surfaceRef = useRef<HTMLDivElement | null>(null);
    const [busy, setBusy] = useState<ExportKind | null>(null);
    const [progress, setProgress] = useState<{ done: number; total: number }>({
        done: 0,
        total: 0,
    });

    const measureExpressions = useMemo(
        () =>
            measures.reduce<Record<string, string>>((acc, m) => {
                if (m.expression) acc[m.name] = m.expression;
                return acc;
            }, {}),
        [measures],
    );

    const deps: ExportDeps = {
        tables,
        joins,
        graph,
        smartNetwork,
        crossFilter,
        interactionFor,
        measureExpressions,
    };

    const run = async (kind: ExportKind) => {
        if (busy) return;
        setBusy(kind);
        setProgress({ done: 0, total: 0 });
        try {
            if (kind === 'xlsx') {
                await exportExcel();
            } else {
                await exportImages(kind);
            }
            toast.success('Export terminé');
        } catch {
            toast.error("Échec de l'export");
        } finally {
            setBusy(null);
            setProgress({ done: 0, total: 0 });
        }
    };

    const exportExcel = async () => {
        const datasets = collectReportDatasets(state.pages, tableRows, deps);
        const wb = await datasetsToWorkbook(datasets);
        const XLSX = await import('xlsx');
        XLSX.writeFile(wb, exportFilename('rapport', 'xlsx'));
    };

    const pageNodes = (): HTMLElement[] => {
        const root = surfaceRef.current;
        if (!root) throw new Error('surface not mounted');
        return Array.from(
            root.querySelectorAll<HTMLElement>('[data-export-page]'),
        );
    };

    const currentPageIndex = () =>
        Math.max(
            0,
            state.pages.findIndex((p) => p.id === state.activePageId),
        );

    const exportImages = async (kind: ExportKind) => {
        // Let the surface commit + charts paint before capturing.
        await nextFrame();
        await nextFrame();
        await nextFrame();
        const nodes = pageNodes();
        if (!nodes.length) throw new Error('empty surface');

        if (kind === 'png') {
            const dataUrl = await captureElement(
                nodes[currentPageIndex()] ?? nodes[0]!,
                2,
            );
            downloadPng(
                dataUrl,
                exportFilename(
                    state.pages[currentPageIndex()]?.name ?? 'page',
                    'png',
                ),
            );
            return;
        }

        const scale = kind === 'pdf' || kind === 'pdf-current' ? 2 : 2;
        const target =
            kind === 'pdf-current'
                ? [nodes[currentPageIndex()] ?? nodes[0]!]
                : nodes;
        const pngs = await captureNodes(
            target,
            scale,
            'Capture',
            (done, total) => setProgress({ done, total }),
        );
        if (kind === 'pdf' || kind === 'pdf-current') {
            await imagesToPdf(pngs, (done, total) =>
                setProgress({ done, total }),
            );
        } else {
            await imagesToPptx(pngs, (done, total) =>
                setProgress({ done, total }),
            );
        }
    };

    return (
        <>
            {busy && (
                <div className="fixed bottom-4 left-1/2 z-50 w-72 -translate-x-1/2 rounded-lg border border-border bg-panel p-3 shadow-lg">
                    <div className="mb-1 flex items-center gap-2 text-[12px]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="font-medium">Export en cours…</span>
                        {progress.total > 0 && (
                            <span className="ml-auto text-muted-foreground">
                                {progress.done}/{progress.total}
                            </span>
                        )}
                    </div>
                    <Progress
                        value={
                            progress.total
                                ? (progress.done / progress.total) * 100
                                : undefined
                        }
                    />
                </div>
            )}

            {busy && <ExportSurface pages={state.pages} ref={surfaceRef} />}

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px]"
                        disabled={!!busy}
                    >
                        <Download className="mr-1 h-3.5 w-3.5" /> Exporter
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel className="text-[11px]">
                        Exporter le rapport
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        disabled={!!busy}
                        onSelect={() => run('pdf')}
                    >
                        <FileText className="mr-2 h-3.5 w-3.5" />
                        PDF — toutes les pages
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={!!busy}
                        onSelect={() => run('pdf-current')}
                    >
                        <FileText className="mr-2 h-3.5 w-3.5" />
                        PDF — page actuelle
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={!!busy}
                        onSelect={() => run('png')}
                    >
                        <ImageIcon className="mr-2 h-3.5 w-3.5" />
                        Image PNG — page actuelle
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={!!busy}
                        onSelect={() => run('pptx')}
                    >
                        <Presentation className="mr-2 h-3.5 w-3.5" />
                        PowerPoint — toutes les pages
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        disabled={!!busy}
                        onSelect={() => run('xlsx')}
                    >
                        <Table2 className="mr-2 h-3.5 w-3.5" />
                        Excel — toutes les données
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
