import { useCallback, useEffect, useRef, useState } from 'react';
import {
    createEndpoint,
    deleteEndpoint,
    duplicateEndpoint,
    fetchEndpoints,
    reorderEndpoints,
    updateEndpoint,
    type EndpointEntry,
    type EndpointFilters,
    type EndpointPayload,
    type EndpointSummary,
    type EndpointsStats,
} from '@/services/endpointManagerApi';

const EMPTY_STATS: EndpointsStats = {
    total: 0,
    by_method: {},
    by_source: {},
    by_status: {},
};

export function useEndpoints(initialFilters: EndpointFilters = {}) {
    const [items, setItems] = useState<EndpointSummary[]>([]);
    const [stats, setStats] = useState<EndpointsStats>(EMPTY_STATS);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(50);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<EndpointFilters>(initialFilters);

    const filtersRef = useRef(filters);
    const mountedRef = useRef(true);
    const seqRef = useRef(0);

    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const refresh = useCallback(
        async (nextFilters?: EndpointFilters, opts?: { quiet?: boolean }) => {
            const merged = nextFilters ?? filtersRef.current;
            const seq = ++seqRef.current;
            if (opts?.quiet) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            try {
                const result = await fetchEndpoints(merged);
                if (!mountedRef.current || seq !== seqRef.current) {
                    return;
                }
                setItems(result.items);
                setStats(result.stats ?? EMPTY_STATS);
                setTotal(result.total);
                setPage(result.page);
                setPerPage(result.per_page);
                setError(null);
            } catch (err) {
                if (!mountedRef.current || seq !== seqRef.current) {
                    return;
                }
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Échec du chargement des endpoints',
                );
            } finally {
                if (mountedRef.current && seq === seqRef.current) {
                    setLoading(false);
                    setRefreshing(false);
                }
            }
        },
        [],
    );

    useEffect(() => {
        refresh();
    }, [refresh]);

    const applyFilters = useCallback(
        (patch: Partial<EndpointFilters>) => {
            setFilters((prev) => {
                const next = { ...prev, ...patch, page: 1 };
                filtersRef.current = next;
                refresh(next, { quiet: true });
                return next;
            });
        },
        [refresh],
    );

    const goToPage = useCallback(
        (nextPage: number) => {
            setFilters((prev) => {
                const next = { ...prev, page: nextPage };
                filtersRef.current = next;
                refresh(next, { quiet: true });
                return next;
            });
        },
        [refresh],
    );

    const create = useCallback(
        async (
            payload: EndpointPayload,
            signal?: AbortSignal,
        ): Promise<EndpointEntry | null> => {
            try {
                const entry = await createEndpoint(payload, signal);
                await refresh(undefined, { quiet: true });
                return entry;
            } catch (err) {
                if (signal?.aborted) return null;
                setError(
                    err instanceof Error ? err.message : 'Échec de la création',
                );
                return null;
            }
        },
        [refresh],
    );

    const update = useCallback(
        async (
            id: string,
            payload: Partial<EndpointPayload>,
            signal?: AbortSignal,
        ): Promise<EndpointEntry | null> => {
            try {
                const entry = await updateEndpoint(id, payload, signal);
                await refresh(undefined, { quiet: true });
                return entry;
            } catch (err) {
                if (signal?.aborted) return null;
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Échec de la mise à jour',
                );
                return null;
            }
        },
        [refresh],
    );

    const remove = useCallback(
        async (id: string): Promise<boolean> => {
            try {
                await deleteEndpoint(id);
                await refresh(undefined, { quiet: true });
                return true;
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Échec de la suppression',
                );
                return false;
            }
        },
        [refresh],
    );

    const duplicate = useCallback(
        async (id: string): Promise<EndpointEntry | null> => {
            try {
                const entry = await duplicateEndpoint(id);
                await refresh(undefined, { quiet: true });
                return entry;
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'Échec de la duplication',
                );
                return null;
            }
        },
        [refresh],
    );

    const reorder = useCallback(async (ids: string[]): Promise<boolean> => {
        try {
            const items = await reorderEndpoints(ids);
            setItems(items);
            return true;
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Échec du réordonnancement',
            );
            return false;
        }
    }, []);

    return {
        items,
        stats,
        total,
        page,
        perPage,
        loading,
        refreshing,
        error,
        filters,
        setError,
        refresh,
        applyFilters,
        goToPage,
        create,
        update,
        remove,
        duplicate,
        reorder,
    };
}
