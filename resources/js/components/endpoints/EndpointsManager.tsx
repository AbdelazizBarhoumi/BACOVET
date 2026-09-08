import { KeyRound, SlidersHorizontal } from 'lucide-react';
import {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { toast } from 'sonner';
import { BulkImportDialog } from '@/components/endpoints/BulkImportDialog';
import { EndpointDetailDialog } from '@/components/endpoints/EndpointDetailDialog';
import { EndpointFormDialog } from '@/components/endpoints/EndpointFormDialog';
import {
    EndpointsDisplayToggle,
    EndpointsGroupTabs,
} from '@/components/endpoints/EndpointsGroupTabs';
import {
    EndpointsTable,
    GroupedEndpointsTable,
} from '@/components/endpoints/EndpointsTable';
import { EndpointStatCards } from '@/components/endpoints/EndpointStatCards';
import {
    EndpointsToolbar,
    type ToolbarValue,
} from '@/components/endpoints/EndpointsToolbar';
import { RootKeysManager } from '@/components/endpoints/RootKeysManager';
import { RootParametersManager } from '@/components/endpoints/RootParametersManager';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Panel } from '@/components/widgets';
import { useEndpoints } from '@/hooks/use-endpoints';
import { inferEntryKeys } from '@/lib/relationship-utils';
import {
    fetchEndpoint,
    fetchRootCredentials,
    setEndpointParameter,
    triggerEndpointRefresh,
    triggerGroupRefresh,
    triggerRefresh,
    waitForRefreshCompletion,
    type EndpointEntry,
    type EndpointFilters,
    type EndpointParameterView,
    type EndpointPayload,
    type EndpointSummary,
} from '@/services/endpointManagerApi';

const SchemaPanel = lazy(() =>
    import('@/components/endpoints/SchemaPanel').then((m) => ({
        default: m.SchemaPanel,
    })),
);

const RefreshHealthPanel = lazy(() =>
    import('@/components/endpoints/RefreshHealthPanel').then((m) => ({
        default: m.RefreshHealthPanel,
    })),
);

function PanelLoading() {
    return (
        <div className="space-y-3 py-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
    );
}

const INITIAL_TOOLBAR: ToolbarValue = {
    search: '',
    method: 'all',
    source: 'all',
    status: 'all',
    enabled: 'active',
};

const SEARCH_DEBOUNCE_MS = 350;

function toFilters(
    toolbar: ToolbarValue,
    root?: string | null,
): EndpointFilters {
    return {
        search: toolbar.search.trim(),
        method: toolbar.method === 'all' ? undefined : toolbar.method,
        source: toolbar.source === 'all' ? undefined : toolbar.source,
        status_group:
            toolbar.status === 'all'
                ? undefined
                : (toolbar.status as 'ok' | 'warn' | 'error'),
        enabled:
            toolbar.enabled === 'all'
                ? 'all'
                : toolbar.enabled === 'disabled'
                  ? '0'
                  : '1',
        root: root || undefined,
    };
}

export function EndpointsManager() {
    const {
        items,
        stats,
        total,
        page,
        perPage,
        loading,
        refreshing,
        error,
        applyFilters,
        goToPage,
        create,
        update,
        remove,
        duplicate,
        toggleEnabled,
        toggleRoot,
        refresh,
    } = useEndpoints();

    const [toolbar, setToolbar] = useState<ToolbarValue>(INITIAL_TOOLBAR);
    const [detailEntry, setDetailEntry] = useState<EndpointEntry | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<EndpointEntry | null>(
        null,
    );
    const [saving, setSaving] = useState(false);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);
    const [refreshingRoot, setRefreshingRoot] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [togglingRoot, setTogglingRoot] = useState<string | null>(null);
    const [disabledRoots, setDisabledRoots] = useState<string[]>([]);
    const [importOpen, setImportOpen] = useState(false);
    const [activeRoot, setActiveRoot] = useState<string | null>(null);
    const [display, setDisplay] = useState<'flat' | 'grouped'>('grouped');
    const [refreshAll, setRefreshAll] = useState(false);
    const [refreshAllElapsed, setRefreshAllElapsed] = useState(0);
    const [keysOpen, setKeysOpen] = useState(false);
    const [keysSelectedRoot, setKeysSelectedRoot] = useState<string | null>(
        null,
    );
    const [keyedRoots, setKeyedRoots] = useState<string[]>([]);
    const [paramsOpen, setParamsOpen] = useState(false);
    const [paramBusyId, setParamBusyId] = useState<string | null>(null);
    const [rootInfo, setRootInfo] = useState<
        {
            root: string;
            count: number;
            disabled: boolean;
            disabled_count: number;
        }[]
    >([]);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const editAbortRef = useRef<AbortController | null>(null);
    const detailAbortRef = useRef<AbortController | null>(null);

    const [globalRoot, setGlobalRoot] = useState('');

    const loadKeyedRoots = useCallback(async () => {
        try {
            const data = await fetchRootCredentials();
            setRootInfo(
                data.roots.map((root) => ({
                    root: root.root,
                    count: root.count,
                    disabled: root.disabled,
                    disabled_count: root.disabled_count,
                })),
            );
            setKeyedRoots(
                data.roots
                    .filter((root) => root.has_api_key)
                    .map((root) => root.root),
            );
            setDisabledRoots(
                data.roots
                    .filter((root) => root.disabled)
                    .map((root) => root.root),
            );
        } catch {
            setRootInfo([]);
            setKeyedRoots([]);
            setDisabledRoots([]);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadKeyedRoots();
        }, 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load the default root for new endpoints: saved setting first, then .env config.
    useEffect(() => {
        let cancelled = false;
        fetch('/api/settings/novacity_base_url', {
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled) return;
                if (data?.value) {
                    setGlobalRoot(String(data.value));
                    return;
                }
                fetch('/novacity-config', {
                    headers: { Accept: 'application/json' },
                })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((config) => {
                        if (cancelled || !config?.base_url) return;
                        setGlobalRoot(String(config.base_url));
                    })
                    .catch(() => {});
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, []);

    // Debounced search: typing applies filters after a short pause.
    useEffect(() => {
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }
        searchTimerRef.current = setTimeout(() => {
            applyFilters(toFilters(toolbar, activeRoot));
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toolbar, activeRoot]);

    const handleToolbarChange = useCallback((next: ToolbarValue) => {
        setToolbar(next);
    }, []);

    const handleRefresh = useCallback(() => {
        applyFilters(toFilters(toolbar, activeRoot));
    }, [applyFilters, toolbar, activeRoot]);

    const handleRefreshAll = useCallback(async () => {
        if (refreshAll) return;
        const startedAt = Date.now();
        setRefreshAll(true);
        setRefreshAllElapsed(0);
        const timer = window.setInterval(() => {
            setRefreshAllElapsed(Math.floor((Date.now() - startedAt) / 1000));
        }, 1000);
        try {
            const launched = await triggerRefresh();
            if (!launched.queued) {
                toast.info('Un rafraîchissement est déjà en cours…');
            }

            const result = await waitForRefreshCompletion();
            if (result) {
                if (result.never_started) {
                    toast.error(
                        result.output ||
                            'Le rafraîchissement n’a pas démarré — réessayez.',
                    );
                } else {
                    toast.success(
                        `Rafraîchissement terminé — ${result.meta?.ok ?? 0} ok, ${result.meta?.failed ?? 0} en échec`,
                    );
                }
            } else {
                toast.warning('Le rafraîchissement est toujours en cours.');
            }
            applyFilters(toFilters(toolbar, activeRoot));
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec du rafraîchissement',
            );
        } finally {
            window.clearInterval(timer);
            setRefreshAll(false);
            setRefreshAllElapsed(0);
        }
    }, [refreshAll, applyFilters, toolbar, activeRoot]);

    const handleRootSelect = useCallback((root: string | null) => {
        setActiveRoot(root);
    }, []);

    const handleOpenKeys = useCallback((root: string | null) => {
        setKeysSelectedRoot(root);
        setKeysOpen(true);
    }, []);

    const handleRootsChanged = useCallback(() => {
        void loadKeyedRoots();
        void refresh(undefined, { quiet: true });
    }, [loadKeyedRoots, refresh]);

    const handleParamsChanged = useCallback(() => {
        void refresh(undefined, { quiet: true });
    }, [refresh]);

    const handleParameterChange = useCallback(
        async (
            summary: EndpointSummary,
            parameter: EndpointParameterView,
            value: string,
        ) => {
            if (paramBusyId) return;
            setParamBusyId(summary.id);
            try {
                await setEndpointParameter(summary.id, parameter.name, value);
                toast.success(
                    `« ${summary.name} » — ${parameter.name}=${value} enregistré. Rafraîchissez pour recharger les données.`,
                );
                applyFilters(toFilters(toolbar, activeRoot));
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : `Échec du changement de paramètre de « ${summary.name} »`,
                );
            } finally {
                setParamBusyId(null);
            }
        },
        [paramBusyId, applyFilters, toolbar, activeRoot],
    );

    const handleRefreshGroup = useCallback(
        async (root: string) => {
            if (refreshingRoot) return;
            setRefreshingRoot(root);
            try {
                const result = await triggerGroupRefresh(root);
                if (result.success) {
                    toast.success(
                        `Rafraîchissement du groupe terminé — ${result.meta?.ok ?? 0} ok, ${result.meta?.failed ?? 0} en échec`,
                    );
                } else {
                    toast.error(
                        `Échec du rafraîchissement du groupe (code de sortie ${result.exit_code})`,
                    );
                }
                applyFilters(toFilters(toolbar, activeRoot));
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : 'Échec du rafraîchissement du groupe',
                );
            } finally {
                setRefreshingRoot(null);
            }
        },
        [refreshingRoot, applyFilters, toolbar, activeRoot],
    );

    const handleNew = useCallback(() => {
        setEditingEntry(null);
        setFormOpen(true);
    }, []);

    const openEntry = useCallback(async (entryId: string) => {
        detailAbortRef.current?.abort();
        const controller = new AbortController();
        detailAbortRef.current = controller;
        setDetailLoading(true);
        try {
            const full = await fetchEndpoint(entryId, controller.signal);
            if (controller.signal.aborted) return;
            setDetailEntry(full);
        } catch (err) {
            if (controller.signal.aborted) return;
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Échec du chargement de l'entrée",
            );
        } finally {
            setDetailLoading(false);
            if (detailAbortRef.current === controller) {
                detailAbortRef.current = null;
            }
        }
    }, []);

    const handleView = useCallback(
        (summary: EndpointSummary) => {
            void openEntry(summary.id);
        },
        [openEntry],
    );

    const handleEdit = useCallback(async (summary: EndpointSummary) => {
        editAbortRef.current?.abort();
        const controller = new AbortController();
        editAbortRef.current = controller;
        try {
            const full = await fetchEndpoint(summary.id, controller.signal);
            if (controller.signal.aborted) return;
            setEditingEntry(full);
            setFormOpen(true);
        } catch (err) {
            if (controller.signal.aborted) return;
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Échec du chargement de l'entrée",
            );
        }
    }, []);

    const handleSubmit = useCallback(
        async (payload: EndpointPayload) => {
            editAbortRef.current?.abort();
            const controller = new AbortController();
            editAbortRef.current = controller;
            setSaving(true);
            try {
                const result = editingEntry
                    ? await update(editingEntry.id, payload, controller.signal)
                    : await create(payload, controller.signal);
                if (controller.signal.aborted) return;
                if (result) {
                    toast.success(
                        editingEntry ? 'Endpoint mis à jour' : 'Endpoint créé',
                    );
                    setFormOpen(false);
                } else {
                    toast.error(
                        error ||
                            (editingEntry
                                ? 'Échec de la mise à jour'
                                : 'Échec de la création'),
                    );
                }
            } finally {
                setSaving(false);
                if (editAbortRef.current === controller) {
                    editAbortRef.current = null;
                }
            }
        },
        [editingEntry, create, update, error],
    );

    const handleFormOpenChange = useCallback((open: boolean) => {
        if (!open) {
            editAbortRef.current?.abort();
        }
        setFormOpen(open);
    }, []);

    const handleDetailOpenChange = useCallback((open: boolean) => {
        if (!open) {
            detailAbortRef.current?.abort();
            setDetailEntry(null);
        }
    }, []);

    const handleDelete = useCallback(
        async (summary: EndpointSummary) => {
            if (
                !window.confirm(
                    `Supprimer « ${summary.name} » ? Cette action est irréversible.`,
                )
            ) {
                return;
            }
            const ok = await remove(summary.id);
            if (ok) {
                toast.success('Endpoint supprimé');
            } else {
                toast.error(error || 'Échec de la suppression');
            }
        },
        [remove, error],
    );

    const handleDuplicate = useCallback(
        async (summary: EndpointSummary) => {
            const result = await duplicate(summary.id);
            if (result) {
                toast.success(`Dupliqué en tant que « ${result.name} »`);
            } else {
                toast.error(error || 'Échec de la duplication');
            }
        },
        [duplicate, error],
    );

    const handleToggle = useCallback(
        async (summary: EndpointSummary, disabled: boolean) => {
            if (togglingId) return;
            setTogglingId(summary.id);
            try {
                const result = await toggleEnabled(summary.id, disabled);
                if (result) {
                    toast.success(
                        disabled
                            ? `« ${summary.name} » désactivé — retiré des datasets`
                            : `« ${summary.name} » réactivé`,
                    );
                } else {
                    toast.error(
                        error || 'Échec de l’activation / désactivation',
                    );
                }
            } finally {
                setTogglingId(null);
            }
        },
        [togglingId, toggleEnabled, error],
    );

    const handleToggleRoot = useCallback(
        async (root: string, disabled: boolean) => {
            if (togglingRoot) return;
            setTogglingRoot(root);
            try {
                const result = await toggleRoot(root, disabled);
                if (result) {
                    toast.success(
                        result.disabled
                            ? `Racine désactivée — ${result.count} endpoint(s) retirés des datasets`
                            : `Racine réactivée — ${result.count} endpoint(s) restaurés`,
                    );
                    void loadKeyedRoots();
                    applyFilters(toFilters(toolbar, activeRoot));
                } else {
                    toast.error(
                        error || 'Échec de la désactivation de la racine',
                    );
                }
            } finally {
                setTogglingRoot(null);
            }
        },
        [
            togglingRoot,
            toggleRoot,
            loadKeyedRoots,
            applyFilters,
            toolbar,
            activeRoot,
            error,
        ],
    );

    const handleRefreshOne = useCallback(
        async (summary: EndpointSummary) => {
            setRefreshingId(summary.id);
            try {
                const result = await triggerEndpointRefresh(summary.id);
                if (result.success) {
                    const entry = result.entry;
                    toast.success(
                        entry?.last_error
                            ? `Échec du rafraîchissement de « ${entry.name} » : ${entry.last_error}`
                            : `« ${entry?.name ?? summary.name} » rafraîchi`,
                    );
                } else {
                    toast.error(
                        `Échec du rafraîchissement de « ${summary.name} » (code de sortie ${result.exit_code})`,
                    );
                }
                applyFilters(toFilters(toolbar, activeRoot));
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : `Échec du rafraîchissement de « ${summary.name} »`,
                );
            } finally {
                setRefreshingId(null);
            }
        },
        [applyFilters, toolbar, activeRoot],
    );

    const sources = Object.keys(stats?.by_source ?? {});

    const rootGroups = useMemo(
        () =>
            rootInfo.map((root) => ({
                root: root.root,
                count: root.disabled
                    ? 0
                    : Math.max(0, root.count - root.disabled_count),
            })),
        [rootInfo],
    );

    const knownRoots = useMemo(() => {
        const set = new Set<string>();
        for (const root of rootInfo) set.add(root.root);
        for (const root of keyedRoots) set.add(root);
        if (globalRoot) set.add(globalRoot);
        return [...set].sort((a, b) => a.localeCompare(b));
    }, [rootInfo, keyedRoots, globalRoot]);

    const detailKeys = useMemo(
        () => (detailEntry ? inferEntryKeys(detailEntry) : null),
        [detailEntry],
    );

    return (
        <>
            <Tabs defaultValue="endpoints">
                <TabsList>
                    <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                    <TabsTrigger value="schema">
                        Schéma &amp; jointures
                    </TabsTrigger>
                    <TabsTrigger value="health">
                        État du rafraîchissement
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="endpoints" className="space-y-4">
                    {error && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                            {error}
                        </div>
                    )}

                    <EndpointStatCards stats={stats} />

                    <Panel
                        title="Endpoints"
                        right={
                            <div className="flex flex-wrap items-center gap-2">
                                <EndpointsGroupTabs
                                    groups={rootGroups}
                                    active={activeRoot}
                                    onSelect={handleRootSelect}
                                    onRefreshGroup={handleRefreshGroup}
                                    refreshingRoot={refreshingRoot}
                                    keyedRoots={keyedRoots}
                                    disabledRoots={disabledRoots}
                                    togglingRoot={togglingRoot}
                                    onToggleRoot={handleToggleRoot}
                                />
                                <EndpointsDisplayToggle
                                    value={display}
                                    onChange={setDisplay}
                                />
                                <EndpointsToolbar
                                    value={toolbar}
                                    onChange={handleToolbarChange}
                                    onRefresh={handleRefreshAll}
                                    onNew={handleNew}
                                    onImport={() => setImportOpen(true)}
                                    loading={loading}
                                    refreshing={refreshAll || refreshing}
                                    refreshingElapsed={refreshAllElapsed}
                                    sources={sources}
                                />
                                <div className="h-5 w-px bg-border" />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 font-mono text-[10px] tracking-wider uppercase"
                                    onClick={() => setParamsOpen(true)}
                                    title="Définir les listes de paramètres (ex. chaine) par racine"
                                >
                                    <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
                                    Paramètres
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 font-mono text-[10px] tracking-wider uppercase"
                                    onClick={() => handleOpenKeys(null)}
                                    title="Gérer les clés API par racine"
                                >
                                    <KeyRound className="mr-1.5 h-3.5 w-3.5 text-warning" />
                                    Clés
                                </Button>
                            </div>
                        }
                    >
                        {display === 'grouped' ? (
                            <GroupedEndpointsTable
                                items={items}
                                loading={loading}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDuplicate={handleDuplicate}
                                onDelete={handleDelete}
                                onRefreshOne={handleRefreshOne}
                                onToggle={handleToggle}
                                onToggleRoot={handleToggleRoot}
                                togglingRoot={togglingRoot}
                                disabledRoots={disabledRoots}
                                togglingId={togglingId}
                                refreshingId={refreshingId}
                                page={page}
                                perPage={perPage}
                                total={total}
                                onPageChange={goToPage}
                                defaultRoot={activeRoot ?? globalRoot}
                                onOpenKeys={handleOpenKeys}
                                onParameterChange={handleParameterChange}
                                paramBusyId={paramBusyId}
                            />
                        ) : (
                            <EndpointsTable
                                items={items}
                                loading={loading}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDuplicate={handleDuplicate}
                                onDelete={handleDelete}
                                onRefreshOne={handleRefreshOne}
                                onToggle={handleToggle}
                                togglingId={togglingId}
                                refreshingId={refreshingId}
                                page={page}
                                perPage={perPage}
                                total={total}
                                onPageChange={goToPage}
                                defaultRoot={activeRoot ?? globalRoot}
                                onParameterChange={handleParameterChange}
                                paramBusyId={paramBusyId}
                            />
                        )}
                    </Panel>
                </TabsContent>

                <TabsContent value="schema">
                    <Suspense fallback={<PanelLoading />}>
                        <SchemaPanel
                            onOpenEntry={(entryId) => void openEntry(entryId)}
                        />
                    </Suspense>
                </TabsContent>

                <TabsContent value="health">
                    <Suspense fallback={<PanelLoading />}>
                        <RefreshHealthPanel
                            onRefreshed={handleRefresh}
                            onOpenEntry={(entryId) => void openEntry(entryId)}
                        />
                    </Suspense>
                </TabsContent>
            </Tabs>

            <EndpointFormDialog
                open={formOpen}
                onOpenChange={handleFormOpenChange}
                entry={editingEntry}
                defaultRoot={activeRoot ?? globalRoot}
                roots={knownRoots}
                busy={saving}
                onSubmit={handleSubmit}
            />

            <EndpointDetailDialog
                open={!!detailEntry}
                onOpenChange={handleDetailOpenChange}
                entry={detailEntry}
                loading={detailLoading}
                keys={detailKeys ?? undefined}
            />

            <RootKeysManager
                open={keysOpen}
                onOpenChange={setKeysOpen}
                selectedRoot={keysSelectedRoot}
                onChanged={handleRootsChanged}
            />

            <RootParametersManager
                open={paramsOpen}
                onOpenChange={setParamsOpen}
                selectedRoot={activeRoot}
                roots={knownRoots}
                onChanged={handleParamsChanged}
            />

            <BulkImportDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                defaultRoot={activeRoot ?? globalRoot}
                onImported={() => {
                    refresh();
                }}
            />
        </>
    );
}
