import { Head, Link, usePage } from '@inertiajs/react';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { logActivity, setPageContext } from '@/lib/activity';
import {
    buildTables,
    fetchEndpointDatasets,
    type TableDef,
} from '@/lib/pbi/datasets';
import {
    buildRelationGraph,
    EMPTY_GRAPH,
    type RelationGraph,
} from '@/lib/pbi/graph';
import { graphWithManualJoins } from '@/lib/pbi/graph';
import { buildJoinRegistry, type JoinRegistry } from '@/lib/pbi/joins';
import {
    activeSelection,
    datasetsUrlWithSelection,
    selectionSignature,
} from '@/lib/pbi/parameters';
import type { State } from '@/lib/pbi/store';
import { PbiProvider } from '@/lib/pbi/store';
import { fetchBuilderSchema } from '@/services/endpointManagerApi';
import { fetchJoins, type JoinRecord } from '@/services/joinApi';
import {
    datasetsSignature,
    parseInitialState,
    type PageProps,
} from './parts/helpers';
import { Shell } from './parts/shell';

export default function PageView() {
    const { props } = usePage();
    const {
        pageId,
        slug,
        pageName,
        layout,
        layoutDraft,
        layoutDraftUpdatedAt,
        canEdit,
        canManage,
        isPublic,
        published,
    } = props as unknown as PageProps;

    const initialState = useMemo(() => parseInitialState(layout), [layout]);
    const [dirty, setDirty] = useState(false);

    // Trace who opened this page (and where from) so superadmins can audit
    // viewership. Fire-and-forget: never blocks the render. Anonymous public
    // viewers of published pages are not traced (no session).
    useEffect(() => {
        if (isPublic) return;
        setPageContext({
            page_id: pageId,
            page_slug: slug,
            page_name: pageName,
        });
        logActivity('page.view', {
            page_id: pageId,
            page_slug: slug,
            page_name: pageName,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Bumped on every persistence-relevant edit, so the autosave can debounce
    // against the last real interaction rather than a fixed interval.
    const [editTick, setEditTick] = useState(0);

    // Only mark the report dirty for persistence-relevant changes. Transient
    // UI state (hover, selection, cross-filter highlight, drillthrough) must
    // not trigger checkpoints or dirty the layout.
    const lastPersistedStateRef = useRef<State | undefined>(undefined);
    const selectionRef = useRef<Record<string, string[]>>({});
    const lastSelectionSignatureRef = useRef<string | null>(null);
    const [paramsTick, setParamsTick] = useState(0);
    const onStoreChange = useCallback((next: State) => {
        const prev = lastPersistedStateRef.current;
        lastPersistedStateRef.current = next;
        const selection = activeSelection(next.parameters, next.activePageId);
        const signature = selectionSignature(selection);
        if (lastSelectionSignatureRef.current === null) {
            lastSelectionSignatureRef.current = signature;
            selectionRef.current = selection;
            // The first dataset load runs before the store emits its initial
            // state, so it fetched with an empty selection (default data). If
            // the layout already selects parameter values, refetch right away
            // so the report honours them instead of waiting for a toggle.
            if (signature !== '') {
                setParamsTick((t) => t + 1);
            }
        } else if (signature !== lastSelectionSignatureRef.current) {
            lastSelectionSignatureRef.current = signature;
            selectionRef.current = selection;
            setParamsTick((t) => t + 1);
        }
        // The first notification is the store's initial normalized state
        // (mount-time no-op syncs), not a user edit: register it as the
        // persistence baseline without marking the report dirty.
        if (!prev) {
            return;
        }
        const persistent = (s: State) => ({
            pages: s.pages,
            activePageId: s.activePageId,
            filters: s.filters,
            parameters: s.parameters,
            slicerSelections: s.slicerSelections,
            slicerDateRanges: s.slicerDateRanges,
            slicerSync: s.slicerSync,
            interactions: s.interactions,
            defaultInteraction: s.defaultInteraction,
            bookmarks: s.bookmarks,
            theme: s.theme,
            customThemes: s.customThemes,
            showGridlines: s.showGridlines,
            snapToGrid: s.snapToGrid,
            zoom: s.zoom,
            mobileView: s.mobileView,
            ribbonTab: s.ribbonTab,
            openPanes: s.openPanes,
            editInteractions: s.editInteractions,
        });
        if (
            JSON.stringify(persistent(next)) !==
            JSON.stringify(persistent(prev))
        ) {
            setDirty(true);
            setEditTick((t) => t + 1);
        }
    }, []);

    const [tables, setTables] = useState<TableDef[]>([]);
    const [joins, setJoins] = useState<JoinRegistry>({});
    const [graph, setGraph] = useState<RelationGraph>(EMPTY_GRAPH);
    const [sharedJoins, setSharedJoins] = useState<JoinRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [retryKey, setRetryKey] = useState(0);
    const lastDatasetsSignatureRef = useRef<string | null>(null);

    useEffect(() => {
        let stop = false;
        const load = async () => {
            try {
                // The datasets, the cross-table schema and the persisted join
                // library are independent, so fetch them in parallel — the
                // "Chargement des données…" screen waits for the slowest single
                // request instead of the sum of all three. Schema + joins are
                // best-effort and degrade gracefully on failure.
                const [datasets, schema, persisted] = await Promise.all([
                    fetchEndpointDatasets(
                        undefined,
                        datasetsUrlWithSelection(selectionRef.current),
                    ),
                    fetchBuilderSchema().catch(() => null),
                    fetchJoins().catch(() => null),
                ]);
                if (stop) return;
                setFailed(false);
                const signature = datasetsSignature(datasets);
                if (signature === lastDatasetsSignatureRef.current) return;
                lastDatasetsSignatureRef.current = signature;
                const built = buildTables(datasets);
                setTables(built);
                if (schema) {
                    const registry = buildJoinRegistry(schema, built);
                    setJoins(registry);
                    setGraph(buildRelationGraph(built, registry, schema));
                }
                if (persisted) {
                    setSharedJoins(persisted);
                    // Merge persisted joins into the effective graph so
                    // cross-filtering and the measure wizard can cross
                    // tables even when inference missed the relationship.
                    setGraph((prev) =>
                        graphWithManualJoins(
                            prev,
                            persisted.map((j) => ({
                                tableA: j.table_a,
                                columnA: j.column_a,
                                tableB: j.table_b,
                                columnB: j.column_b,
                            })),
                            built,
                        ),
                    );
                }
            } catch {
                if (!stop) setFailed(true);
            } finally {
                if (!stop) setLoading(false);
            }
        };
        load();
        const onFocus = () => load();
        window.addEventListener('focus', onFocus);
        const timer = setInterval(load, 50_000);
        return () => {
            stop = true;
            window.removeEventListener('focus', onFocus);
            clearInterval(timer);
        };
    }, [retryKey, paramsTick]);

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
                    <Link href="/">
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
                onChange={isPublic ? undefined : onStoreChange}
                tables={tables}
                joins={joins}
                graph={graph}
                sharedJoins={sharedJoins}
            >
                <Shell
                    pageId={pageId}
                    slug={slug}
                    pageName={pageName}
                    dirty={dirty}
                    setDirty={setDirty}
                    editTick={editTick}
                    layoutDraft={layoutDraft}
                    layoutDraftUpdatedAt={layoutDraftUpdatedAt}
                    canEdit={canEdit}
                    canManage={canManage}
                    isPublic={isPublic}
                    published={published}
                />
            </PbiProvider>
            <Toaster />
        </div>
    );
}
