import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SchemaPanel } from '@/components/endpoints/SchemaPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Panel } from '@/components/widgets';
import { useEndpoints } from '@/hooks/use-endpoints';
import { inferEntryKeys } from '@/lib/relationship-utils';
import {
    fetchEndpoint,
    type EndpointEntry,
    type EndpointFilters,
    type EndpointPayload,
    type EndpointSummary,
} from '@/services/endpointManagerApi';

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
            toolbar.status === 'all' ? undefined : (toolbar.status as 'ok' | 'warn' | 'error'),
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
    const [editingEntry, setEditingEntry] = useState<EndpointEntry | null>(null);
    const [saving, setSaving] = useState(false);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setDetailLoading(true);
        try {
            const full = await fetchEndpoint(entryId);
            setDetailEntry(full);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load entry');
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const handleView = useCallback(
        (summary: EndpointSummary) => {
            void openEntry(summary.id);
        },
        [openEntry],
    );

    const handleEdit = useCallback(async (summary: EndpointSummary) => {
        try {
            const full = await fetchEndpoint(summary.id);
            setEditingEntry(full);
            setFormOpen(true);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load entry');
        }
    }, []);

    const handleSubmit = useCallback(
        async (payload: EndpointPayload) => {
            setSaving(true);
            if (editingEntry) {
                const result = await update(editingEntry.id, payload);
                if (result) {
                    toast.success('Endpoint updated');
                    setFormOpen(false);
                } else {
                    toast.error(error || 'Update failed');
                }
            } else {
                const result = await create(payload);
                if (result) {
                    toast.success('Endpoint created');
                    setFormOpen(false);
                } else {
                    toast.error(error || 'Create failed');
                }
            }
            setSaving(false);
        },
        [editingEntry, create, update, error],
    );

    const handleDelete = useCallback(
        async (summary: EndpointSummary) => {
            if (!window.confirm(`Delete "${summary.name}"? This cannot be undone.`)) {
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

    const sources = Object.keys(stats?.by_source ?? {});

    const detailKeys = useMemo(
        () => (detailEntry ? inferEntryKeys(detailEntry) : null),
        [detailEntry],
    );

    return (
        <>
            <Head title="Endpoints — BACOVET" />
            <AppShell page="/endpoints" title="Endpoints" subtitle="Registre data.json — CRUD, structure & joins">
                <Tabs defaultValue="endpoints">
                    <TabsList>
                        <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
                        <TabsTrigger value="schema">Schema &amp; joins</TabsTrigger>
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
                                page={page}
                                perPage={perPage}
                                total={total}
                                onPageChange={goToPage}
                            />
                        </Panel>
                    </TabsContent>

                    <TabsContent value="schema">
                        <SchemaPanel onOpenEntry={(entryId) => void openEntry(entryId)} />
                    </TabsContent>
                </Tabs>

                <EndpointFormDialog
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    entry={editingEntry}
                    busy={saving}
                    onSubmit={handleSubmit}
                />

                <EndpointDetailDialog
                    open={!!detailEntry}
                    onOpenChange={(open) => !open && setDetailEntry(null)}
                    entry={detailEntry}
                    loading={detailLoading}
                    keys={detailKeys ?? undefined}
                />
            </AppShell>
        </>
    );
}
