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
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState<EndpointFilters>(initialFilters);

    const filtersRef = useRef(filters);
    const mountedRef = useRef(true);

    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const refresh = useCallback(async (nextFilters?: EndpointFilters) => {
        const merged = nextFilters ?? filtersRef.current;
        setLoading(true);
        try {
            const result = await fetchEndpoints(merged);
            if (!mountedRef.current) {
                return;
            }
            setItems(result.items);
            setStats(result.stats ?? EMPTY_STATS);
            setTotal(result.total);
            setPage(result.page);
            setPerPage(result.per_page);
            setError(null);
        } catch (err) {
            if (!mountedRef.current) {
                return;
            }
            setError(err instanceof Error ? err.message : 'Failed to load endpoints');
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const applyFilters = useCallback(
        (patch: Partial<EndpointFilters>) => {
            setFilters((prev) => {
                const next = { ...prev, ...patch, page: 1 };
                filtersRef.current = next;
                refresh(next);
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
                refresh(next);
                return next;
            });
        },
        [refresh],
    );

    const create = useCallback(
        async (payload: EndpointPayload): Promise<EndpointEntry | null> => {
            try {
                const entry = await createEndpoint(payload);
                await refresh();
                return entry;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Create failed');
                return null;
            }
        },
        [refresh],
    );

    const update = useCallback(
        async (
            id: string,
            payload: Partial<EndpointPayload>,
        ): Promise<EndpointEntry | null> => {
            try {
                const entry = await updateEndpoint(id, payload);
                await refresh();
                return entry;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Update failed');
                return null;
            }
        },
        [refresh],
    );

    const remove = useCallback(
        async (id: string): Promise<boolean> => {
            try {
                await deleteEndpoint(id);
                await refresh();
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Delete failed');
                return false;
            }
        },
        [refresh],
    );

    const duplicate = useCallback(
        async (id: string): Promise<EndpointEntry | null> => {
            try {
                const entry = await duplicateEndpoint(id);
                await refresh();
                return entry;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Duplicate failed');
                return null;
            }
        },
        [refresh],
    );

    const reorder = useCallback(
        async (ids: string[]): Promise<boolean> => {
            try {
                const items = await reorderEndpoints(ids);
                setItems(items);
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Reorder failed');
                return false;
            }
        },
        [],
    );

    return {
        items,
        stats,
        total,
        page,
        perPage,
        loading,
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
