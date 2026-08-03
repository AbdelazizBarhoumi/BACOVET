import { Head } from '@inertiajs/react';
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
import { AppShell } from '@/components/app-shell';
import { EndpointDetailDialog } from '@/components/endpoints/EndpointDetailDialog';
import { EndpointFormDialog } from '@/components/endpoints/EndpointFormDialog';
import { EndpointsTable } from '@/components/endpoints/EndpointsTable';
import { EndpointStatCards } from '@/components/endpoints/EndpointStatCards';
import {
    EndpointsToolbar,
    type ToolbarValue,
} from '@/components/endpoints/EndpointsToolbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Panel } from '@/components/widgets';
import { useEndpoints } from '@/hooks/use-endpoints';
import { inferEntryKeys } from '@/lib/relationship-utils';
import {
    fetchEndpoint,
    triggerEndpointRefresh,
    type EndpointEntry,
    type EndpointFilters,
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
};

const SEARCH_DEBOUNCE_MS = 350;

function toFilters(toolbar: ToolbarValue): EndpointFilters {
    return {
        search: toolbar.search.trim(),
        method: toolbar.method === 'all' ? undefined : toolbar.method,
        source: toolbar.source === 'all' ? undefined : toolbar.source,
        status_group:
            toolbar.status === 'all'
                ? undefined
                : (toolbar.status as 'ok' | 'warn' | 'error'),
    };
}

export default function EndpointsPage() {
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
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rootTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const editAbortRef = useRef<AbortController | null>(null);
    const detailAbortRef = useRef<AbortController | null>(null);

    const [globalRoot, setGlobalRoot] = useState('');
    const [rootSaved, setRootSaved] = useState(false);

    // Load the global endpoint root: saved setting first, then .env config.
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

    const handleRootChange = useCallback((value: string) => {
        setGlobalRoot(value);
        setRootSaved(false);
        if (rootTimerRef.current) {
            clearTimeout(rootTimerRef.current);
        }
        rootTimerRef.current = setTimeout(() => {
            const xsrf = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(xsrf
                        ? { 'X-XSRF-TOKEN': decodeURIComponent(xsrf[1]) }
                        : {}),
                },
                body: JSON.stringify({
                    key: 'novacity_base_url',
                    value: value.trim(),
                }),
            })
                .then((r) => r.ok)
                .then((ok) => setRootSaved(ok))
                .catch(() => setRootSaved(false));
        }, 600);
    }, []);

    useEffect(
        () => () => {
            if (rootTimerRef.current) {
                clearTimeout(rootTimerRef.current);
            }
        },
        [],
    );

    // Debounced search: typing applies filters after a short pause.
    useEffect(() => {
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }
        searchTimerRef.current = setTimeout(() => {
            applyFilters(toFilters(toolbar));
        }, SEARCH_DEBOUNCE_MS);
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toolbar]);

    const handleToolbarChange = useCallback((next: ToolbarValue) => {
        setToolbar(next);
    }, []);

    const handleRefresh = useCallback(() => {
        applyFilters(toFilters(toolbar));
    }, [applyFilters, toolbar]);

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
                err instanceof Error ? err.message : 'Failed to load entry',
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
                err instanceof Error ? err.message : 'Failed to load entry',
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
                        editingEntry ? 'Endpoint updated' : 'Endpoint created',
                    );
                    setFormOpen(false);
                } else {
                    toast.error(
                        error ||
                            (editingEntry ? 'Update failed' : 'Create failed'),
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
                    `Delete "${summary.name}"? This cannot be undone.`,
                )
            ) {
                return;
            }
            const ok = await remove(summary.id);
            if (ok) {
                toast.success('Endpoint deleted');
            } else {
                toast.error(error || 'Delete failed');
            }
        },
        [remove, error],
    );

    const handleDuplicate = useCallback(
        async (summary: EndpointSummary) => {
            const result = await duplicate(summary.id);
            if (result) {
                toast.success(`Duplicated as "${result.name}"`);
            } else {
                toast.error(error || 'Duplicate failed');
            }
        },
        [duplicate, error],
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
                            ? `Refresh failed for "${entry.name}": ${entry.last_error}`
                            : `"${entry?.name ?? summary.name}" refreshed`,
                    );
                } else {
                    toast.error(
                        `Refresh failed for "${summary.name}" (exit code ${result.exit_code})`,
                    );
                }
                applyFilters(toFilters(toolbar));
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : `Refresh failed for "${summary.name}"`,
                );
            } finally {
                setRefreshingId(null);
            }
        },
        [applyFilters, toolbar],
    );

    const sources = Object.keys(stats?.by_source ?? {});

    const detailKeys = useMemo(
        () => (detailEntry ? inferEntryKeys(detailEntry) : null),
        [detailEntry],
    );

    return (
        <>
            <Head title="Endpoints — BACOVET" />
            <AppShell
                page="/endpoints"
                title="Endpoints"
                subtitle="Registre data.json — CRUD, structure & joins"
            >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Label className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            Endpoint root
                        </Label>
                        <Input
                            value={globalRoot}
                            onChange={(e) => handleRootChange(e.target.value)}
                            placeholder="https://api.example.com"
                            className="w-72 font-mono text-sm"
                        />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                        {rootSaved
                            ? 'Saved'
                            : globalRoot
                              ? 'Saving…'
                              : 'Loading…'}
                        {
                            ' — default root for new endpoints; each endpoint can '
                        }
                        override it.
                    </span>
                </div>
                <Tabs defaultValue="endpoints">
                    <TabsList>
                        <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                        <TabsTrigger value="schema">
                            Schema &amp; joins
                        </TabsTrigger>
                        <TabsTrigger value="health">Refresh health</TabsTrigger>
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
                                <EndpointsToolbar
                                    value={toolbar}
                                    onChange={handleToolbarChange}
                                    onRefresh={handleRefresh}
                                    onNew={handleNew}
                                    loading={loading}
                                    refreshing={refreshing}
                                    sources={sources}
                                />
                            }
                        >
                            <EndpointsTable
                                items={items}
                                loading={loading}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDuplicate={handleDuplicate}
                                onDelete={handleDelete}
                                onRefreshOne={handleRefreshOne}
                                refreshingId={refreshingId}
                                page={page}
                                perPage={perPage}
                                total={total}
                                onPageChange={goToPage}
                                defaultRoot={globalRoot}
                            />
                        </Panel>
                    </TabsContent>

                    <TabsContent value="schema">
                        <Suspense fallback={<PanelLoading />}>
                            <SchemaPanel
                                onOpenEntry={(entryId) =>
                                    void openEntry(entryId)
                                }
                            />
                        </Suspense>
                    </TabsContent>

                    <TabsContent value="health">
                        <Suspense fallback={<PanelLoading />}>
                            <RefreshHealthPanel
                                onRefreshed={handleRefresh}
                                onOpenEntry={(entryId) =>
                                    void openEntry(entryId)
                                }
                            />
                        </Suspense>
                    </TabsContent>
                </Tabs>

                <EndpointFormDialog
                    open={formOpen}
                    onOpenChange={handleFormOpenChange}
                    entry={editingEntry}
                    defaultRoot={globalRoot}
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
            </AppShell>
        </>
    );
}
