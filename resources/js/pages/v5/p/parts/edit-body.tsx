import {
    BarChart3,
    Bookmark,
    ChevronsRight,
    Filter,
    Layers,
    Link2,
    Maximize2,
    Palette,
    Smartphone,
    Table2,
    ZoomIn,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Canvas, PageTabs } from '@/components/pbi/Canvas';
import { DataJsonDialog } from '@/components/pbi/DataJsonDialog';
import { DaxDialog, ManageMeasuresDialog } from '@/components/pbi/Dialogs';
import { MeasureWizardDialog } from '@/components/pbi/MeasureWizardDialog';
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
import type { Interaction } from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { themeById, themeCssVars } from '@/lib/pbi/themes';
import { cn } from '@/lib/utils';

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
                    title={`Déplier ${title}`}
                    className="mt-2 rounded px-1 py-1 text-[15px] leading-none font-bold text-muted-foreground [writing-mode:vertical-rl] hover:bg-accent"
                >
                    {title}
                </button>
                <button
                    onClick={onToggle}
                    title="Déplier"
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

export function EditBody() {
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
        setFullscreen,
        editInteractions,
        defaultInteraction,
        setDefaultInteraction,
        clearInteractions,
        drillthrough,
        clearDrillthrough,
        crossFilter,
        clearCrossFilter,
        theme,
        customThemes,
    } = usePbi();
    const [dax, setDax] = useState(false);
    const [wizard, setWizard] = useState(false);
    const [manage, setManage] = useState(false);
    const [dataJson, setDataJson] = useState(false);
    const [paneCollapsed, setPaneCollapsed] = useState<Record<string, boolean>>(
        {
            selection: false,
            bookmarks: false,
            syncSlicers: false,
            filters: false,
            visualizations: false,
            fields: false,
            themes: false,
        },
    );
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
                onOpenAssistant={() => setWizard(true)}
                onOpenManage={() => setManage(true)}
                onOpenDataJson={() => setDataJson(true)}
            />

            {editInteractions && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-brand/15 px-3 py-1 text-[11px] text-foreground">
                    <span>
                        Les interactions sont activées — sélectionnez un visuel
                        source, puis choisissez Filtre / Surbrillance / Aucune
                        sur chaque autre visuel.
                    </span>
                    <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">
                            Par défaut :
                        </span>
                        {(['filter', 'highlight', 'none'] as Interaction[]).map(
                            (m) => (
                                <button
                                    key={m}
                                    onClick={() => setDefaultInteraction(m)}
                                    className={cn(
                                        'rounded px-1.5 py-0.5 capitalize',
                                        defaultInteraction === m
                                            ? 'bg-brand text-brand-foreground'
                                            : 'hover:bg-accent',
                                    )}
                                >
                                    {m === 'filter'
                                        ? 'Filtre'
                                        : m === 'highlight'
                                          ? 'Surbrillance'
                                          : 'Aucune'}
                                </button>
                            ),
                        )}
                    </div>
                    <button
                        onClick={clearInteractions}
                        title="Supprimer chaque règle par visuel afin que la valeur par défaut s’applique à tous les visuels"
                        className="underline hover:text-brand"
                    >
                        Appliquer à tous
                    </button>
                </div>
            )}
            {crossFilter && (
                <div className="flex items-center gap-2 bg-brand/15 px-3 py-1 text-[11px]">
                    Filtré en croisant :{' '}
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
                        Effacer
                    </button>
                </div>
            )}
            {drillthrough && (
                <div className="flex items-center gap-2 bg-muted px-3 py-1 text-[11px]">
                    Exploration : {drillthrough.column} = {drillthrough.value}
                    <button onClick={clearDrillthrough} className="underline">
                        Retour
                    </button>
                </div>
            )}

            <main className="flex min-h-0 flex-1" style={themeStyle}>
                <section className="min-h-0 flex-1 overflow-auto bg-muted">
                    <h1 className="sr-only">
                        Rapport interactif — zone de dessin
                    </h1>
                    <Canvas />
                </section>
                {openPanes.selection && (
                    <PaneShell
                        title="Sélection"
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
                        title="Signets"
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
                        title="Synchroniser les segments"
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
                        title="Filtres"
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
                        title="Thèmes"
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
                    title="Visualisations"
                    icon={<BarChart3 className="size-4" />}
                    width="w-60"
                    collapsed={paneCollapsed.visualizations}
                    onToggle={() => togglePaneCollapsed('visualizations')}
                >
                    <VisualizationsPane
                        onCollapse={() =>
                            togglePaneCollapsed('visualizations')
                        }
                    />
                </PaneShell>
                <PaneShell
                    title="Champs"
                    icon={<Table2 className="size-4" />}
                    width="w-56"
                    collapsed={paneCollapsed.fields}
                    onToggle={() => togglePaneCollapsed('fields')}
                >
                    <FieldsPane
                        onCollapse={() => togglePaneCollapsed('fields')}
                    />
                </PaneShell>
            </main>

            <PageTabs />
            <footer className="flex items-center justify-between gap-4 border-t border-border bg-panel px-3 py-1 text-[10px] text-muted-foreground">
                <span>
                    {page.visuals.length} visuels ·{' '}
                    {rows.length.toLocaleString()} /{' '}
                    {tables
                        .reduce((t, td) => t + td.rows.length, 0)
                        .toLocaleString()}{' '}
                    lignes du contexte · {filters.length} filtres du rapport
                </span>
                <span className="flex items-center gap-2">
                    <button
                        onClick={() => setFullscreen(true)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="Plein écran"
                        title="Plein écran"
                    >
                        <Maximize2 className="size-3.5" />
                    </button>
                    <button
                        onClick={() =>
                            setState((s) => ({
                                ...s,
                                mobileView: !s.mobileView,
                            }))
                        }
                        className={mobileView ? 'text-brand-foreground' : ''}
                        aria-label="Disposition mobile"
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
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-32 accent-[var(--brand)]"
                        aria-label="Zoom"
                    />
                    <span className="w-9 tabular-nums">{zoom}%</span>
                </span>
            </footer>

            {dax && <DaxDialog onClose={() => setDax(false)} />}
            {wizard && (
                <MeasureWizardDialog onClose={() => setWizard(false)} />
            )}
            {manage && (
                <ManageMeasuresDialog onClose={() => setManage(false)} />
            )}
            {dataJson && (
                <DataJsonDialog open onClose={() => setDataJson(false)} />
            )}
        </div>
    );
}