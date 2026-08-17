import {
    CheckCircle2,
    Download,
    FileUp,
    Loader2,
    TriangleAlert,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    importEndpoints,
    type BulkImportMode,
    type BulkImportResult,
} from '@/services/endpointManagerApi';

const CSV_HEADER = 'name,method,endpoint,status';

const CSV_EXAMPLE = [
    'ItemTrxEnq (SDT),GET,https://api.example.com/api/data/itemtrxenq,200',
    'OrdreFabrication (QCM),GET,https://api.example.com/api/data/ordre_fabrication,200',
].join('\n');

const JSON_EXAMPLE = `[
  {
    "name": "ItemTrxEnq (SDT)",
    "method": "GET",
    "endpoint": "https://api.example.com/api/data/itemtrxenq",
    "status": 200
  }
]`;

const TEXTAREA_CLASS =
    'min-h-[160px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

type PreviewRow = {
    name: string;
    method: string;
    endpoint: string;
    status: string;
};

function parseCsv(text: string): Record<string, string>[] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    const pushField = () => {
        row.push(field);
        field = '';
    };
    const pushRow = () => {
        pushField();
        rows.push(row);
        row = [];
    };

    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += c;
            }
        } else if (c === '"') {
            inQuotes = true;
        } else if (c === ',') {
            pushField();
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && text[i + 1] === '\n') i++;
            pushRow();
        } else {
            field += c;
        }
    }

    if (field !== '' || row.length > 0) pushRow();

    const cleaned = rows.filter((r) => r.some((v) => v.trim() !== ''));
    if (cleaned.length === 0) return [];

    const [header, ...body] = cleaned;
    const headers = header.map((h) => h.trim().toLowerCase());

    return body.map((values) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
            obj[h] = (values[i] ?? '').trim();
        });
        return obj;
    });
}

function buildPreview(mode: BulkImportMode, text: string): PreviewRow[] {
    const trimmed = text.trim();
    if (!trimmed) return [];

    if (mode === 'csv') {
        return parseCsv(trimmed).map((row) => ({
            name: row.name ?? '',
            method: row.method ?? '',
            endpoint: row.endpoint ?? '',
            status: row.status ?? '',
        }));
    }

    let decoded: unknown;
    try {
        decoded = JSON.parse(trimmed);
    } catch {
        return [];
    }

    const list = Array.isArray(decoded)
        ? decoded
        : decoded &&
            typeof decoded === 'object' &&
            Array.isArray((decoded as { endpoints?: unknown }).endpoints)
          ? ((decoded as { endpoints: unknown[] }).endpoints as unknown[])
          : [];

    return list
        .filter(
            (item): item is Record<string, unknown> =>
                !!item && typeof item === 'object',
        )
        .map((item) => ({
            name: String(item.name ?? ''),
            method: String(item.method ?? ''),
            endpoint: String(item.endpoint ?? ''),
            status: item.status === undefined ? '' : String(item.status),
        }));
}

export function BulkImportDialog({
    open,
    onOpenChange,
    defaultRoot = '',
    onImported,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultRoot?: string;
    onImported: () => void;
}) {
    const [mode, setMode] = useState<BulkImportMode>('csv');
    const [csvText, setCsvText] = useState('');
    const [jsonText, setJsonText] = useState('');
    const [fileName, setFileName] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<BulkImportResult | null>(null);

    const content = mode === 'csv' ? csvText : jsonText;

    const preview = useMemo(
        () => buildPreview(mode, content).slice(0, 50),
        [mode, content],
    );

    const previewWarning = useMemo(() => {
        if (!content.trim()) return null;
        if (mode === 'csv') {
            const rows = parseCsv(content.trim());
            const headers = rows.length
                ? Object.keys(rows[0])
                : Object.keys(
                      (parseCsv(CSV_HEADER + '\n' + content.trim())[0] ??
                          {}) as Record<string, string>,
                  );
            const required = ['name', 'endpoint'];
            const missing = required.filter((col) => !headers.includes(col));
            if (missing.length > 0) {
                return `Colonnes requises manquantes : ${missing.join(', ')}`;
            }
            return null;
        }
        try {
            JSON.parse(content.trim());
            return null;
        } catch {
            return 'JSON invalide — vérifiez la syntaxe.';
        }
    }, [mode, content]);

    const handleFile = (file: File | undefined) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result ?? '');
            setCsvText(text);
            setFileName(file.name);
            setResult(null);
        };
        reader.readAsText(file);
    };

    const downloadTemplate = () => {
        const blob = new Blob([CSV_HEADER + '\n' + CSV_EXAMPLE + '\n'], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'endpoints-template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const canImport =
        content.trim().length > 0 && !importing && previewWarning === null;

    const handleImport = async () => {
        if (!canImport) return;
        setImporting(true);
        setResult(null);
        try {
            const res = await importEndpoints(mode, content);
            setResult(res);
            if (res.created > 0) {
                toast.success(
                    `${res.created} endpoint(s) importé(s)${res.skipped > 0 ? `, ${res.skipped} ignoré(s)` : ''}`,
                );
                onImported();
            } else if (res.errors.length > 0) {
                toast.error('Aucun endpoint valide à importer');
            }
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de l’import des endpoints',
            );
        } finally {
            setImporting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) setResult(null);
                onOpenChange(next);
            }}
        >
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="font-mono text-sm tracking-wider uppercase">
                        Import en masse d'endpoints
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        <span className="font-mono text-[10px] font-semibold tracking-wider text-foreground uppercase">
                            Structure attendue
                        </span>
                        <div className="mt-1.5 space-y-1 font-mono text-[11px]">
                            <p>
                                Chaque ligne = un endpoint. Colonnes CSV :{' '}
                                <span className="text-foreground">
                                    name, method (GET|POST), endpoint (URL
                                    complète), status (100–599, optionnel)
                                </span>
                                .
                            </p>
                            <p>
                                Format JSON : tableau d'objets avec les mêmes
                                clés, ex. :
                            </p>
                            <pre className="mt-1 overflow-auto rounded bg-background px-2 py-1.5 text-[10px] leading-relaxed">
                                {JSON_EXAMPLE}
                            </pre>
                            <p className="mt-1 text-muted-foreground">
                                Les doublons (endpoint déjà enregistré) sont
                                ignorés. Après l'import, les endpoints GET
                                éligibles sont rafraîchis automatiquement pour
                                alimenter les jeux de données (data.json +
                                dataset).
                            </p>
                            {defaultRoot && (
                                <p className="mt-1 text-muted-foreground">
                                    Racine par défaut :{' '}
                                    <span className="text-foreground">
                                        {defaultRoot}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    <Tabs
                        value={mode}
                        onValueChange={(v) => setMode(v as BulkImportMode)}
                    >
                        <TabsList>
                            <TabsTrigger value="csv">Fichier CSV</TabsTrigger>
                            <TabsTrigger value="json">JSON / Texte</TabsTrigger>
                        </TabsList>

                        <TabsContent value="csv" className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 font-mono text-[10px] tracking-wider uppercase"
                                    onClick={() =>
                                        document
                                            .getElementById('bulk-csv-file')
                                            ?.click()
                                    }
                                >
                                    <FileUp className="mr-1 h-3 w-3" />{' '}
                                    {fileName || 'Choisir un fichier CSV'}
                                </Button>
                                <input
                                    id="bulk-csv-file"
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={(e) =>
                                        handleFile(e.target.files?.[0])
                                    }
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 font-mono text-[10px] tracking-wider uppercase"
                                    onClick={downloadTemplate}
                                >
                                    <Download className="mr-1 h-3 w-3" /> Modèle
                                    CSV
                                </Button>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    Contenu CSV (ou collez le texte ici)
                                </Label>
                                <textarea
                                    value={csvText}
                                    onChange={(e) => {
                                        setCsvText(e.target.value);
                                        setFileName(null);
                                    }}
                                    placeholder={`${CSV_HEADER}\n${CSV_EXAMPLE}`}
                                    className={TEXTAREA_CLASS}
                                    spellCheck={false}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="json" className="space-y-1.5">
                            <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Texte JSON
                            </Label>
                            <textarea
                                value={jsonText}
                                onChange={(e) => setJsonText(e.target.value)}
                                placeholder={JSON_EXAMPLE}
                                className={TEXTAREA_CLASS}
                                spellCheck={false}
                            />
                        </TabsContent>
                    </Tabs>

                    {previewWarning && (
                        <div className="flex items-center gap-2 rounded border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                            {previewWarning}
                        </div>
                    )}

                    {preview.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Aperçu — {preview.length}
                                {content.trim() &&
                                buildPreview(mode, content).length > 50
                                    ? ` / ${buildPreview(mode, content).length}`
                                    : ''}{' '}
                                ligne(s)
                            </Label>
                            <div className="max-h-56 overflow-auto rounded-md border border-border">
                                <table className="w-full text-xs">
                                    <thead className="sticky top-0 bg-background">
                                        <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                            <th className="px-2 py-1.5 text-left">
                                                Nom
                                            </th>
                                            <th className="px-2 py-1.5 text-left">
                                                Méthode
                                            </th>
                                            <th className="px-2 py-1.5 text-left">
                                                Endpoint
                                            </th>
                                            <th className="px-2 py-1.5 text-right">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {preview.map((row, i) => (
                                            <tr
                                                key={i}
                                                className="border-b border-border/50"
                                            >
                                                <td className="max-w-[180px] truncate px-2 py-1.5 font-semibold">
                                                    {row.name || '—'}
                                                </td>
                                                <td className="px-2 py-1.5">
                                                    {row.method || '—'}
                                                </td>
                                                <td className="max-w-[260px] truncate px-2 py-1.5 text-muted-foreground">
                                                    {row.endpoint || '—'}
                                                </td>
                                                <td className="px-2 py-1.5 text-right tabular-nums">
                                                    {row.status || '200'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-2">
                            <div
                                className={`flex items-center gap-2 rounded border px-3 py-2 text-xs ${
                                    result.errors.length > 0
                                        ? 'border-warning/30 bg-warning/10 text-warning'
                                        : 'border-success/30 bg-success/10 text-success'
                                }`}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                {result.created} importé(s), {result.skipped}{' '}
                                ignoré(s), {result.errors.length} erreur(s)
                            </div>
                            {result.errors.length > 0 && (
                                <div className="max-h-40 overflow-auto rounded-md border border-border p-2 font-mono text-[10px]">
                                    {result.errors.map((err, i) => (
                                        <div
                                            key={i}
                                            className="flex gap-2 py-0.5 text-destructive"
                                        >
                                            <span className="shrink-0 text-muted-foreground">
                                                Ligne {err.row} :
                                            </span>
                                            <span>{err.error}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={importing}
                        className="text-[10px] tracking-wider uppercase"
                    >
                        Fermer
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!canImport}
                        className="px-6 text-[10px] tracking-wider uppercase"
                    >
                        {importing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        {importing ? 'Import…' : 'Importer'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
