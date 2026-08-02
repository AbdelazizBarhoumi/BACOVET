import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    ArrowLeft,
    BarChart3,
    Bookmark,
    ChevronsRight,
    Eye,
    Filter,
    Layers,
    Link2,
    Palette,
    Pencil,
    RefreshCw,
    Save,
    Smartphone,
    Table2,
    ZoomIn,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Canvas, PageTabs } from '@/components/pbi/Canvas';
import {
    DaxDialog,
    ManageMeasuresDialog,
} from '@/components/pbi/Dialogs';
import {
    BookmarksPane,
    FieldsPane,
    FiltersPane,
    SelectionPane,
    SyncSlicersPane,
    ThemesPane,
    VisualizationsPane,
} from '@/components/pbi/Panes';
import { Ribbon } from '@/components/pbi/Ribbon';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import {
    buildTables,
    fetchEndpointDatasets,
    type TableDef,
} from '@/lib/pbi/datasets';
import { buildJoinRegistry, type JoinRegistry } from '@/lib/pbi/joins';
import { PbiProvider, usePbi, type State } from '@/lib/pbi/store';
import { themeById, themeCssVars } from '@/lib/pbi/themes';
import { fetchSchema } from '@/services/endpointManagerApi';

type PageProps = {
    pageId: number;
    slug: string;
    pageName: string;
    layout: { version?: number; pbi?: State } | null;
};

function parseInitialState(layout: PageProps['layout']): State | undefined {
    const pbi = layout?.pbi;
    if (!pbi || !Array.isArray(pbi.pages) || !pbi.pages.length)
        return undefined;
    return { ...pbi, ribbonTab: 'Insert' };
}

export default function V5PageView() {
    const { props } = usePage();
    const { pageId, slug, pageName, layout } = props as unknown as PageProps;

    const initialState = useMemo(() => parseInitialState(layout), [layout]);
    const [dirty, setDirty] = useState(false);
    const onStoreChange = useCallback(() => setDirty(true), []);

    const [tables, setTables] = useState<TableDef[]>([]);
    const [joins, setJoins] = useState<JoinRegistry>({});
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    useEffect(() => {
        let stop = false;
        const load = async () => {
            try {
                const datasets = await fetchEndpointDatasets();
                if (stop) return;
                const built = buildTables(datasets);
                setTables(built);
                setFailed(false);
                try {
                    const schema = await fetchSchema();
                    if (!stop) setJoins(buildJoinRegistry(schema, built));
                } catch {
                    // shared join registry is best-effort; cross-table
                    // cross-filtering simply degrades to same-table only.
                }
            } catch {
                if (!stop) setFailed(true);
            } finally {
                if (!stop) setLoading(false);
            }
        };
        load();
        const timer = setInterval(load, 50_000);
        return () => {
            stop = true;
            clearInterval(timer);
        };
    }, [retryKey]);

    if (!slug || !pageName) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <Head title="Page introuvable" />
                <div className="mx-auto max-w-md p-8 text-center">
                    <h1 className="mb-2 text-lg font-bold">Page introuvable</h1>
                    <p className="mb-4 text-sm text-muted-foreground">
                        Aucune page avec le slug «{' '}
                        <span className="font-mono">{slug}</span> ».
                    </p>
                    <Link href="/v5">
                        <Button size="sm">Retour aux pages</Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
                <Head title={`${pageName} — BACOVET`} />
                <div className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                <p className="text-[12px] text-muted-foreground">
                    Chargement des données…
                </p>
            </div>
        );
    }

    if (failed && !tables.length) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background text-foreground">
                <Head title={`${pageName} — BACOVET`} />
                <h1 className="text-sm font-semibold">
                    Impossible de charger les données
                </h1>
                <p className="max-w-sm text-center text-[12px] text-muted-foreground">
                    Les datasets d'endpoints ne sont pas disponibles pour le
                    moment. Réessayez dans quelques instants.
                </p>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                        setLoading(true);
                        setRetryKey((k) => k + 1);
                    }}
                >
                    <RefreshCw className="mr-1 size-3.5" /> Réessayer
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-background text-foreground">
            <Head title={`${pageName} — BACOVET`} />
            <PbiProvider
                initialState={initialState}
                onChange={onStoreChange}
                tables={tables}
                joins={joins}
            >
                <Shell
                    pageId={pageId}
                    slug={slug}
                    pageName={pageName}
                    dirty={dirty}
                    setDirty={setDirty}
                />
            </PbiProvider>
            <Toaster />
        </div>
    );
}

function Shell({
    pageId,
    slug,
    pageName,
    dirty,
    setDirty,
}: {
    pageId: number;
    slug: string;
    pageName: string;
    dirty: boolean;
    setDirty: (v: boolean) => void;
}) {
    const { state } = usePbi();
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const savingRef = useRef(false);

    const save = async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        try {
            // Measures live in the shared library, not the per-page layout.
            const { measures: _measures, ...pbi } = state;
            await axios.put(`/api/v5/builder-pages/${pageId}`, {
                layout: { version: 2, pbi },
            });
            toast.success('Layout enregistré');
            setDirty(false);
        } catch {
            toast.error("Échec de l'enregistrement du layout");
        } finally {
            savingRef.current = false;
        }
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border bg-panel px-3">
                <div className="flex min-w-0 items-center gap-3">
                    <Link href="/v5">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-[11px] tracking-wider uppercase"
                        >
                            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Pages
                        </Button>
                    </Link>
                    <div className="min-w-0">
                        <div className="truncate text-[13px] font-bold">
                            {pageName}
                        </div>
                        <div className="truncate font-mono text-[10px] text-muted-foreground">
                            /v5/p/{slug}
                        </div>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {mode === 'edit' ? (
                        <>
                            <Button
                                size="sm"
                                onClick={save}
                                className="h-8 text-[11px]"
                            >
                                <Save className="mr-1 h-3.5 w-3.5" />
                                Enregistrer{dirty ? ' *' : ''}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-[11px]"
                                onClick={() => setMode('view')}
                            >
                                <Eye className="mr-1 h-3.5 w-3.5" /> Voir
                            </Button>
                        </>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[11px]"
                            onClick={() => setMode('edit')}
                        >
                            <Pencil className="mr-1 h-3.5 w-3.5" /> Modifier
                        </Button>
                    )}
                </div>
            </header>

            {mode === 'view' ? <ViewBody /> : <EditBody /> }
        </div>
    );
}

function ViewBody() {
    const { page, rows, selected, tables } = usePbi();
    return (
        <div className="flex min-h-0 flex-1 flex-col bg-muted">
            <main className="flex min-h-0 flex-1 overflow-auto">
                <section className="min-h-0 flex-1 overflow-auto">
                    <Canvas readOnly />
                </section>
            </main>
            <PageTabs readOnly />
            <footer className="flex items-center justify-between border-t border-border bg-panel px-3 py-1 text-[10px] text-muted-foreground">
                <span>
                    {page.name} · {page.visuals.length} visual(s) ·{' '}
                    {tables.length} dataset(s) · {rows.length.toLocaleString()}{' '}
                    lignes · {selected ? '1 sélectionné' : ''}
                </span>
            </footer>
        </div>
    );
}

function PaneShell({
    title,
    icon,
    width,
    collapsed,
    onToggle,
    children,
}: {
    title: string;
    icon: React.ReactNode;
    width: string;
    collapsed: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    if (collapsed) {
        return (
            <aside className="flex min-h-0 w-9 shrink-0 flex-col items-center border-l border-border bg-panel py-2">
                <button
                    onClick={onToggle}
                    title={title}
                    className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                >
                    {icon}
                </button>
                <button
                    onClick={onToggle}
                    title={`Expand ${title}`}
                    className="mt-2 rounded px-1 py-1 font-bold text-[15px] leading-none text-muted-foreground hover:bg-accent [writing-mode:vertical-rl]"
                >
                    {title}
                </button>
                <button
                    onClick={onToggle}
                    title="Expand"
                    className="mt-auto rounded p-1 text-muted-foreground hover:bg-accent"
                >
                    <ChevronsRight className="size-4 rotate-180" />
                </button>
            </aside>
        );
    }
    return (
        <aside
            className={`min-h-0 shrink-0 overflow-hidden border-l border-border bg-panel ${width}`}
        >
            {children}
        </aside>
    );
}

function EditBody() {
    const {
        page,
        rows,
        tables,
        filters,
        openPanes,
        zoom,
        setZoom,
        mobileView,
        setState,
        editInteractions,
        drillthrough,
        clearDrillthrough,
        crossFilter,
        clearCrossFilter,
        theme,
        customThemes,
    } = usePbi();
    const [dax, setDax] = useState(false);
    const [manage, setManage] = useState(false);
    const [paneCollapsed, setPaneCollapsed] = useState<
        Record<string, boolean>
    >({
        selection: false,
        bookmarks: false,
        syncSlicers: false,
        filters: false,
        visualizations: false,
        fields: false,
        themes: false,
    });
    const togglePaneCollapsed = (key: string) =>
        setPaneCollapsed((p) => ({ ...p, [key]: !p[key] }));

    const activeTheme =
        customThemes.find((t) => t.id === theme) ?? themeById(theme);
    const themeStyle = useMemo(
        () => themeCssVars(activeTheme) as React.CSSProperties,
        [activeTheme],
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Ribbon
                onOpenDax={() => setDax(true)}
                onOpenManage={() => setManage(true)}
            />

            {editInteractions && (
                <div className="bg-brand/15 px-3 py-1 text-[11px] text-foreground">
                    Edit interactions is on — select a source visual, then
                    choose Filter / Highlight / None on each other visual.
                </div>
            )}
            {crossFilter && (
                <div className="flex items-center gap-2 bg-brand/15 px-3 py-1 text-[11px]">
                    Cross-filtered:{' '}
                    <span className="font-medium">
                        {crossFilter.table
                            ? `${crossFilter.table}[${crossFilter.column}]`
                            : crossFilter.column}{' '}
                        = {crossFilter.value}
                    </span>
                    <button
                        onClick={clearCrossFilter}
                        className="underline hover:text-brand"
                    >
                        Clear
                    </button>
                </div>
            )}
            {drillthrough && (
                <div className="flex items-center gap-2 bg-muted px-3 py-1 text-[11px]">
                    Drillthrough: {drillthrough.column} = {drillthrough.value}
                    <button onClick={clearDrillthrough} className="underline">
                        Back
                    </button>
                </div>
            )}

            <main
                className="flex min-h-0 flex-1"
                style={themeStyle}
            >
                <section className="min-h-0 flex-1 overflow-auto bg-muted">
                    <h1 className="sr-only">Interactive report canvas</h1>
                    <Canvas />
                </section>
                {openPanes.selection && (
                    <PaneShell
                        title="Selection"
                        icon={<Layers className="size-4" />}
                        width="w-56"
                        collapsed={paneCollapsed.selection}
                        onToggle={() => togglePaneCollapsed('selection')}
                    >
                        <SelectionPane
                            onCollapse={() => togglePaneCollapsed('selection')}
                        />
                    </PaneShell>
                )}
                {openPanes.bookmarks && (
                    <PaneShell
                        title="Bookmarks"
                        icon={<Bookmark className="size-4" />}
                        width="w-52"
                        collapsed={paneCollapsed.bookmarks}
                        onToggle={() => togglePaneCollapsed('bookmarks')}
                    >
                        <BookmarksPane
                            onCollapse={() => togglePaneCollapsed('bookmarks')}
                        />
                    </PaneShell>
                )}
                {openPanes.syncSlicers && (
                    <PaneShell
                        title="Sync slicers"
                        icon={<Link2 className="size-4" />}
                        width="w-52"
                        collapsed={paneCollapsed.syncSlicers}
                        onToggle={() => togglePaneCollapsed('syncSlicers')}
                    >
                        <SyncSlicersPane
                            onCollapse={() =>
                                togglePaneCollapsed('syncSlicers')
                            }
                        />
                    </PaneShell>
                )}
                {openPanes.filters && (
                    <PaneShell
                        title="Filters"
                        icon={<Filter className="size-4" />}
                        width="w-56"
                        collapsed={paneCollapsed.filters}
                        onToggle={() => togglePaneCollapsed('filters')}
                    >
                        <FiltersPane
                            onCollapse={() => togglePaneCollapsed('filters')}
                        />
                    </PaneShell>
                )}
                {openPanes.themes && (
                    <PaneShell
                        title="Themes"
                        icon={<Palette className="size-4" />}
                        width="w-64"
                        collapsed={paneCollapsed.themes}
                        onToggle={() => togglePaneCollapsed('themes')}
                    >
                        <ThemesPane
                            onCollapse={() => togglePaneCollapsed('themes')}
                        />
                    </PaneShell>
                )}
                <PaneShell
                    title="Visualizations"
                    icon={<BarChart3 className="size-4" />}
                    width="w-60"
                    collapsed={paneCollapsed.visualizations}
                    onToggle={() => togglePaneCollapsed('visualizations')}
                >
                    <VisualizationsPane
                        onCollapse={() => togglePaneCollapsed('visualizations')}
                    />
                </PaneShell>
                <PaneShell
                    title="Fields"
                    icon={<Table2 className="size-4" />}
                    width="w-56"
                    collapsed={paneCollapsed.fields}
                    onToggle={() => togglePaneCollapsed('fields')}
                >
                    <FieldsPane onCollapse={() => togglePaneCollapsed('fields')} />
                </PaneShell>
            </main>

            <PageTabs />
                    <footer className="flex items-center justify-between gap-4 border-t border-border bg-panel px-3 py-1 text-[10px] text-muted-foreground">
                        <span>
                            {page.visuals.length} visuals ·{' '}
                            {rows.length.toLocaleString()} of{' '}
                            {tables
                                .reduce((t, td) => t + td.rows.length, 0)
                                .toLocaleString()}{' '}
                            rows in context · {filters.length} report filters
                        </span>
                        <span className="flex items-center gap-2">
                            <button
                                onClick={() =>
                                    setState((s) => ({
                                        ...s,
                                        mobileView: !s.mobileView,
                                    }))
                                }
                                className={
                                    mobileView ? 'text-brand-foreground' : ''
                                }
                                aria-label="Mobile layout"
                            >
                                <Smartphone className="size-3.5" />
                            </button>
                            <ZoomIn className="size-3.5" />
                            <input
                                type="range"
                                min={30}
                                max={200}
                                step={5}
                                value={zoom}
                                onChange={(e) =>
                                    setZoom(Number(e.target.value))
                                }
                                className="w-32 accent-[var(--brand)]"
                                aria-label="Zoom"
                            />
                            <span className="w-9 tabular-nums">{zoom}%</span>
                        </span>
                    </footer>

            {dax && <DaxDialog onClose={() => setDax(false)} />}
            {manage && (
                <ManageMeasuresDialog onClose={() => setManage(false)} />
            )}
        </div>
    );
}
