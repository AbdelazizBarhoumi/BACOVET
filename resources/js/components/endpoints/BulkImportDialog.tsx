import {
    CheckCircle2,
    Download,
    FileUp,
    Globe,
    Loader2,
    RefreshCw,
    Search,
    TriangleAlert,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    fetchCatalogue,
    importEndpoints,
    type BulkImportMode,
    type BulkImportResult,
    type CatalogueResult,
    type ImportMode,
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
    const [mode, setMode] = useState<BulkImportMode | 'catalogue'>('csv');
    const [csvText, setCsvText] = useState('');
    const [jsonText, setJsonText] = useState('');
    const [fileName, setFileName] = useState<string | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<BulkImportResult | null>(null);

    // Catalogue state
    const [catalogueUrl, setCatalogueUrl] = useState(defaultRoot);
    const [catalogueApiKey, setCatalogueApiKey] = useState('');
    const [catalogueLoading, setCatalogueLoading] = useState(false);
    const [catalogueResult, setCatalogueResult] =
        useState<CatalogueResult | null>(null);
    const [selectedEndpoints, setSelectedEndpoints] = useState<Set<number>>(
        new Set(),
    );
    const [importingCatalogue, setImportingCatalogue] = useState(false);
    const [catalogueImportMode, setCatalogueImportMode] =
        useState<ImportMode>('append');
    const [cataloguePathKey, setCataloguePathKey] = useState('');
    const [catalogueNameKey, setCatalogueNameKey] = useState('');
    const catalogueAbortRef = useRef<AbortController | null>(null);

    const content = mode === 'csv' ? csvText : mode === 'json' ? jsonText : '';

    const preview = useMemo(
        () =>
            mode === 'catalogue'
                ? []
                : buildPreview(mode as BulkImportMode, content).slice(0, 50),
        [mode, content],
    );

    const previewWarning = useMemo(() => {
        if (mode === 'catalogue') return null;
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
        mode !== 'catalogue' &&
        content.trim().length > 0 &&
        !importing &&
        previewWarning === null;

    const handleImport = async () => {
        if (!canImport) return;
        setImporting(true);
        setResult(null);
        try {
            const res = await importEndpoints(mode as BulkImportMode, content);
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
                    : 'Échec de l\'import des endpoints',
            );
        } finally {
            setImporting(false);
        }
    };

    // ── Catalogue handlers ──────────────────────────────────────────────

    const handleDiscover = useCallback(async () => {
        const url = catalogueUrl.trim();
        if (!url) {
            toast.error('Veuillez entrer une URL de catalogue');
            return;
        }

        catalogueAbortRef.current?.abort();
        const controller = new AbortController();
        catalogueAbortRef.current = controller;

        setCatalogueLoading(true);
        setCatalogueResult(null);
        setSelectedEndpoints(new Set());
        setCataloguePathKey('');
        setCatalogueNameKey('');

        try {
            const res = await fetchCatalogue(url, {
                api_key: catalogueApiKey.trim() || undefined,
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            setCatalogueResult(res);
            if (res.success && res.endpoints.length > 0) {
                // Pre-select endpoints that are not already imported
                const toSelect = new Set<number>();
                res.endpoints.forEach((ep, i) => {
                    if (!ep.already_imported) {
                        toSelect.add(i);
                    }
                });
                setSelectedEndpoints(toSelect);
            } else if (!res.success) {
                toast.error(res.error || 'Aucun endpoint trouvé');
            }
        } catch (err) {
            if (controller.signal.aborted) return;
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de la récupération du catalogue',
            );
        } finally {
            setCatalogueLoading(false);
        }
    }, [catalogueUrl, catalogueApiKey]);

    // Re-normalize endpoints from raw items when custom key mapping is selected
    const displayEndpoints = useMemo(() => {
        if (!catalogueResult) return [];
        const hasCustomKeys = cataloguePathKey !== '' || catalogueNameKey !== '';
        if (!hasCustomKeys || !catalogueResult.raw_items?.length) {
            return catalogueResult.endpoints;
        }
        const root = catalogueResult.root;
        return catalogueResult.raw_items.map((raw) => {
            const pathVal =
                cataloguePathKey !== '' && typeof raw[cataloguePathKey] === 'string'
                    ? (raw[cataloguePathKey] as string)
                    : '';
            const nameVal =
                catalogueNameKey !== '' && typeof raw[catalogueNameKey] === 'string'
                    ? (raw[catalogueNameKey] as string)
                    : '';
            const methodVal =
                typeof raw['methode'] === 'string'
                    ? (raw['methode'] as string).toUpperCase()
                    : typeof raw['method'] === 'string'
                      ? (raw['method'] as string).toUpperCase()
                      : 'GET';
            const endpoint =
                pathVal === ''
                    ? ''
                    : /^https?:\/\//i.test(pathVal)
                      ? pathVal
                      : `${root}/${pathVal.replace(/^\/+/, '')}`;
            return {
                name:
                    nameVal ||
                    (pathVal ? pathVal.split('/').filter(Boolean).pop() ?? '—' : '—'),
                method: methodVal === 'POST' ? 'POST' : 'GET',
                endpoint,
                status: 200,
                already_imported: false,
            };
        });
    }, [catalogueResult, cataloguePathKey, catalogueNameKey]);

    const handleToggleSelect = useCallback((index: number) => {
        setSelectedEndpoints((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    }, []);

    const handleSelectAll = useCallback(() => {
        if (!catalogueResult) return;
        const all = new Set<number>();
        displayEndpoints.forEach((_, i) => all.add(i));
        setSelectedEndpoints(all);
    }, [catalogueResult, displayEndpoints]);

    const handleDeselectAll = useCallback(() => {
        setSelectedEndpoints(new Set());
    }, []);

    const handleImportCatalogue = useCallback(async () => {
        if (!catalogueResult || selectedEndpoints.size === 0) return;

        setImportingCatalogue(true);
        try {
            const selected = Array.from(selectedEndpoints).map(
                (i) => displayEndpoints[i],
            );

            // Convert to CSV format for the existing import endpoint
            const csvLines = [CSV_HEADER];
            for (const ep of selected) {
                csvLines.push(
                    [ep.name, ep.method, ep.endpoint, String(ep.status)]
                        .map((v) => `"${v.replace(/"/g, '""')}"`)
                        .join(','),
                );
            }
            const csvContent = csvLines.join('\n');

            const options =
                catalogueImportMode === 'replace'
                    ? {
                          import_mode: 'replace' as const,
                          replace_roots: [catalogueResult.root],
                      }
                    : { import_mode: 'append' as const };

            const res = await importEndpoints('csv', csvContent, options);
            if (res.success) {
                const parts: string[] = [];
                if (res.created > 0) {
                    parts.push(`${res.created} endpoint(s) importé(s)`);
                }
                if (res.removed > 0) {
                    parts.push(`${res.removed} supprimé(s)`);
                }
                if (res.skipped > 0) {
                    parts.push(`${res.skipped} ignoré(s)`);
                }
                if (parts.length > 0) {
                    toast.success(parts.join(', '));
                } else {
                    toast.info('Aucun changement — tous les endpoints existent déjà');
                }
                setCatalogueResult(null);
                setSelectedEndpoints(new Set());
                onImported();
            } else if (res.errors.length > 0) {
                toast.error('Aucun endpoint valide à importer');
            }
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec de l\'import des endpoints',
            );
        } finally {
            setImportingCatalogue(false);
        }
    }, [
        catalogueResult,
        selectedEndpoints,
        catalogueImportMode,
        displayEndpoints,
        onImported,
    ]);

    const catalogueSelectedCount = selectedEndpoints.size;
    const catalogueNewCount = displayEndpoints.filter(
        (ep, i) => !ep.already_imported && selectedEndpoints.has(i),
    ).length;
    // In replace mode, all selected endpoints count (existing ones will be replaced)
    const catalogueImportCount =
        catalogueImportMode === 'replace'
            ? catalogueSelectedCount
            : catalogueNewCount;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) {
                    setResult(null);
                    setCatalogueImportMode('append');
                    catalogueAbortRef.current?.abort();
                }
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
                    {mode !== 'catalogue' && (
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
                    )}

                    <Tabs
                        value={mode}
                        onValueChange={(v) =>
                            setMode(v as BulkImportMode | 'catalogue')
                        }
                    >
                        <TabsList>
                            <TabsTrigger value="csv">Fichier CSV</TabsTrigger>
                            <TabsTrigger value="json">JSON / Texte</TabsTrigger>
                            <TabsTrigger value="catalogue">
                                <Globe className="mr-1.5 h-3.5 w-3.5" />
                                API Catalogue
                            </TabsTrigger>
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

                        <TabsContent value="catalogue" className="space-y-3">
                            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                <span className="font-mono text-[10px] font-semibold tracking-wider text-foreground uppercase">
                                    Catalogue API
                                </span>
                                <div className="mt-1.5 space-y-1 font-mono text-[11px]">
                                    <p>
                                        Entrez l'URL complète du catalogue qui
                                        retourne la liste des endpoints disponibles.
                                    </p>
                                    <p className="mt-1 text-muted-foreground">
                                        Sélectionnez les endpoints à importer, puis
                                        cliquez sur « Approuver et importer » pour
                                        les ajouter au registre avec synchronisation
                                        automatique.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-end gap-2">
                                <div className="flex-1 space-y-1.5">
                                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        URL du catalogue
                                    </Label>
                                    <Input
                                        value={catalogueUrl}
                                        onChange={(e) =>
                                            setCatalogueUrl(e.target.value)
                                        }
                                        placeholder="http://bacovet-3216.eu1.netbird.service/data/v2/catalogue"
                                        className="h-9 font-mono text-xs"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleDiscover();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="w-48 space-y-1.5">
                                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Clé API (optionnel)
                                    </Label>
                                    <Input
                                        value={catalogueApiKey}
                                        onChange={(e) =>
                                            setCatalogueApiKey(e.target.value)
                                        }
                                        placeholder="x-api-key"
                                        type="password"
                                        className="h-9 font-mono text-xs"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleDiscover();
                                            }
                                        }}
                                    />
                                </div>
                                <Button
                                    size="sm"
                                    onClick={handleDiscover}
                                    disabled={
                                        catalogueLoading ||
                                        !catalogueUrl.trim()
                                    }
                                    className="h-9 px-4 text-[10px] tracking-wider uppercase"
                                >
                                    {catalogueLoading ? (
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Search className="mr-1.5 h-3.5 w-3.5" />
                                    )}
                                    {catalogueLoading
                                        ? 'Recherche…'
                                        : 'Découvrir'}
                                </Button>
                                {catalogueResult && catalogueResult.success && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleDiscover}
                                        disabled={catalogueLoading}
                                        className="h-9 px-3 text-[10px] tracking-wider uppercase"
                                        title="Rafraîchir la découverte pour cette racine"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>

                            {catalogueResult && catalogueResult.success && (
                                <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                                    <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                        Mode d'import
                                    </Label>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant={
                                                catalogueImportMode === 'append'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                setCatalogueImportMode('append')
                                            }
                                            className="h-7 px-3 text-[10px] tracking-wider uppercase"
                                        >
                                            Ajouter
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={
                                                catalogueImportMode === 'replace'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            onClick={() =>
                                                setCatalogueImportMode(
                                                    'replace',
                                                )
                                            }
                                            className="h-7 px-3 text-[10px] tracking-wider uppercase"
                                        >
                                            Remplacer
                                        </Button>
                                    </div>
                                    {catalogueImportMode === 'replace' && (
                                        <span className="text-[10px] text-warning">
                                            <TriangleAlert className="mr-1 inline h-3 w-3" />
                                            Tous les endpoints existants de cette
                                            racine ({catalogueResult.existing_by_root?.[catalogueResult.root.toLowerCase()] ?? 0})
                                            seront supprimés
                                        </span>
                                    )}
                                </div>
                            )}

                            {catalogueResult &&
                                catalogueResult.success &&
                                catalogueResult.available_keys?.length > 0 && (
                                    <div className="flex items-end gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                                        <div className="space-y-1.5">
                                            <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                                Clé du chemin (optionnel)
                                            </Label>
                                            <Select
                                                value={cataloguePathKey || '__auto__'}
                                                onValueChange={(v) =>
                                                    setCataloguePathKey(
                                                        v === '__auto__' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-7 w-44 font-mono text-[11px]">
                                                    <SelectValue placeholder="Auto-détecter" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__auto__">
                                                        Auto-détecter
                                                    </SelectItem>
                                                    {catalogueResult.available_keys.map(
                                                        (key) => (
                                                            <SelectItem
                                                                key={key}
                                                                value={key}
                                                                className="font-mono text-[11px]"
                                                            >
                                                                {key}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                                Clé du nom (optionnel)
                                            </Label>
                                            <Select
                                                value={catalogueNameKey || '__auto__'}
                                                onValueChange={(v) =>
                                                    setCatalogueNameKey(
                                                        v === '__auto__' ? '' : v,
                                                    )
                                                }
                                            >
                                                <SelectTrigger className="h-7 w-44 font-mono text-[11px]">
                                                    <SelectValue placeholder="Auto-détecter" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="__auto__">
                                                        Auto-détecter
                                                    </SelectItem>
                                                    {catalogueResult.available_keys.map(
                                                        (key) => (
                                                            <SelectItem
                                                                key={key}
                                                                value={key}
                                                                className="font-mono text-[11px]"
                                                            >
                                                                {key}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <span className="pb-2 text-[10px] text-muted-foreground">
                                            Remappez les champs si les clés du catalogue
                                            ne correspondent pas aux attentes.
                                        </span>
                                    </div>
                            )}

                            {catalogueResult && (
                                <div className="space-y-2">
                                    {catalogueResult.success &&
                                    catalogueResult.endpoints.length > 0 ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                                    {displayEndpoints.length}{' '}
                                                    endpoint(s) trouvé(s) —{' '}
                                                    {catalogueSelectedCount}{' '}
                                                    sélectionné(s)
                                                    {catalogueNewCount > 0 &&
                                                        ` (${catalogueNewCount} nouveau(x))`}
                                                </Label>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={handleSelectAll}
                                                        className="h-6 px-2 text-[10px] tracking-wider uppercase"
                                                    >
                                                        Tout
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={
                                                            handleDeselectAll
                                                        }
                                                        className="h-6 px-2 text-[10px] tracking-wider uppercase"
                                                    >
                                                        Aucun
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="max-h-64 overflow-auto rounded-md border border-border">
                                                <table className="w-full text-xs">
                                                    <thead className="sticky top-0 bg-background">
                                                        <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                                            <th className="w-8 px-2 py-1.5" />
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
                                                            <th className="px-2 py-1.5 text-center">
                                                                État
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="font-mono">
                                                        {displayEndpoints.map(
                                                            (ep, i) => (
                                                                <tr
                                                                    key={i}
                                                                    className={`border-b border-border/50 ${
                                                                        selectedEndpoints.has(
                                                                            i,
                                                                        )
                                                                            ? 'bg-primary/5'
                                                                            : ''
                                                                    }`}
                                                                >
                                                                    <td className="px-2 py-1.5 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedEndpoints.has(
                                                                                i,
                                                                            )}
                                                                            onChange={() =>
                                                                                handleToggleSelect(
                                                                                    i,
                                                                                )
                                                                            }
                                                                            className="h-3.5 w-3.5 rounded border-border"
                                                                        />
                                                                    </td>
                                                                    <td className="max-w-[180px] truncate px-2 py-1.5 font-semibold">
                                                                        {ep.name ||
                                                                            '—'}
                                                                    </td>
                                                                    <td className="px-2 py-1.5">
                                                                        <span
                                                                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                                                ep.method ===
                                                                                'POST'
                                                                                    ? 'bg-warning/15 text-warning'
                                                                                    : 'bg-success/15 text-success'
                                                                            }`}
                                                                        >
                                                                            {
                                                                                ep.method
                                                                            }
                                                                        </span>
                                                                    </td>
                                                                    <td className="max-w-[260px] truncate px-2 py-1.5 text-muted-foreground">
                                                                        {ep.endpoint ||
                                                                            '—'}
                                                                    </td>
                                                                    <td className="px-2 py-1.5 text-right tabular-nums">
                                                                        {ep.status ||
                                                                            '200'}
                                                                    </td>
                                                                    <td className="px-2 py-1.5 text-center">
                                                                        {ep.already_imported ? (
                                                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                                                                Importé
                                                                            </span>
                                                                        ) : (
                                                                            <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] text-success">
                                                                                Nouveau
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 rounded border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                                            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                                            {catalogueResult.error ||
                                                'Aucun endpoint trouvé à cette URL'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>

                    {mode !== 'catalogue' && previewWarning && (
                        <div className="flex items-center gap-2 rounded border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                            {previewWarning}
                        </div>
                    )}

                    {mode !== 'catalogue' && preview.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Aperçu — {preview.length}
                                {content.trim() &&
                                buildPreview(mode as BulkImportMode, content)
                                    .length > 50
                                    ? ` / ${buildPreview(mode as BulkImportMode, content).length}`
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

                    {mode !== 'catalogue' && result && (
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
                        disabled={importing || importingCatalogue}
                        className="text-[10px] tracking-wider uppercase"
                    >
                        Fermer
                    </Button>
                    {mode === 'catalogue' ? (
                        <Button
                            onClick={handleImportCatalogue}
                            disabled={
                                importingCatalogue ||
                                catalogueSelectedCount === 0 ||
                                catalogueImportCount === 0
                            }
                            className="px-6 text-[10px] tracking-wider uppercase"
                        >
                            {importingCatalogue ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {importingCatalogue
                                ? 'Import…'
                                : catalogueImportMode === 'replace'
                                  ? `Remplacer et importer (${catalogueImportCount})`
                                  : `Approuver et importer (${catalogueImportCount})`}
                        </Button>
                    ) : (
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
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
