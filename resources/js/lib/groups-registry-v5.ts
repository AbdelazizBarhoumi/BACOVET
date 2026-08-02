import { useCallback, useEffect, useState } from 'react';
import { handleV5Error } from '@/lib/v5-session';
import type { BuilderPageV5 } from './pages-registry-v5';

export type BuilderPageGroupV5 = {
    id: number;
    name: string;
    slug: string;
    sort_order: number;
    pages: BuilderPageV5[];
    created_at: string;
    updated_at: string;
};

export type SidebarStructureV5 = {
    groups: BuilderPageGroupV5[];
    ungrouped: BuilderPageV5[];
};

const API_BASE = '/api/v5/builder-page-groups';

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function apiHeaders(): HeadersInit {
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': getCsrfToken(),
    };
}

async function fetchSidebar(): Promise<SidebarStructureV5> {
    try {
        const res = await fetch(API_BASE, {
            credentials: 'include',
            headers: apiHeaders(),
        });
        if (!res.ok) {
            handleV5Error(res.status);

            return { groups: [], ungrouped: [] };
        }
        return await res.json();
    } catch {
        return { groups: [], ungrouped: [] };
    }
}

async function apiCreateGroup(
    name: string,
): Promise<BuilderPageGroupV5 | null> {
    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            credentials: 'include',
            headers: apiHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            handleV5Error(res.status);

            return null;
        }
        const data = await res.json();
        return data.group;
    } catch {
        return null;
    }
}

async function apiRenameGroup(id: number, name: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: apiHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!res.ok) handleV5Error(res.status);

        return res.ok;
    } catch {
        return false;
    }
}

async function apiDeleteGroup(id: number): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: apiHeaders(),
        });
        if (!res.ok) handleV5Error(res.status);

        return res.ok;
    } catch {
        return false;
    }
}

async function apiAssignPage(
    pageId: number,
    groupId: number | null,
): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/assign-page`, {
            method: 'PUT',
            credentials: 'include',
            headers: apiHeaders(),
            body: JSON.stringify({ page_id: pageId, group_id: groupId }),
        });
        if (!res.ok) handleV5Error(res.status);

        return res.ok;
    } catch {
        return false;
    }
}

async function apiReorderPages(
    items: { id: number; sort_order: number }[],
): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/reorder-pages`, {
            method: 'PUT',
            credentials: 'include',
            headers: apiHeaders(),
            body: JSON.stringify({ pages: items }),
        });
        if (!res.ok) handleV5Error(res.status);

        return res.ok;
    } catch {
        return false;
    }
}

async function apiReorderGroups(
    items: { id: number; sort_order: number }[],
): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/reorder-groups`, {
            method: 'PUT',
            credentials: 'include',
            headers: apiHeaders(),
            body: JSON.stringify({ groups: items }),
        });
        if (!res.ok) handleV5Error(res.status);

        return res.ok;
    } catch {
        return false;
    }
}

export function useSidebarStructureV5() {
    const [data, setData] = useState<SidebarStructureV5>({
        groups: [],
        ungrouped: [],
    });
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const result = await fetchSidebar();
        setData(result);
        setLoading(false);
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchSidebar().then((result) => {
            if (!cancelled) {
                setData(result);
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const createGroup = useCallback(
        async (name: string): Promise<BuilderPageGroupV5 | null> => {
            const g = await apiCreateGroup(name);
            if (g) await refresh();
            return g;
        },
        [refresh],
    );

    const renameGroup = useCallback(
        async (id: number, name: string): Promise<boolean> => {
            const ok = await apiRenameGroup(id, name);
            if (ok) await refresh();
            return ok;
        },
        [refresh],
    );

    const deleteGroup = useCallback(
        async (id: number): Promise<boolean> => {
            const ok = await apiDeleteGroup(id);
            if (ok) await refresh();
            return ok;
        },
        [refresh],
    );

    const assignPage = useCallback(
        async (pageId: number, groupId: number | null): Promise<boolean> => {
            const ok = await apiAssignPage(pageId, groupId);
            if (ok) await refresh();
            return ok;
        },
        [refresh],
    );

    const reorderPages = useCallback(
        async (
            items: { id: number; sort_order: number }[],
        ): Promise<boolean> => {
            const ok = await apiReorderPages(items);
            if (ok) await refresh();
            return ok;
        },
        [refresh],
    );

    const reorderGroups = useCallback(
        async (
            items: { id: number; sort_order: number }[],
        ): Promise<boolean> => {
            const ok = await apiReorderGroups(items);
            if (ok) await refresh();
            return ok;
        },
        [refresh],
    );

    return {
        ...data,
        loading,
        createGroup,
        renameGroup,
        deleteGroup,
        assignPage,
        reorderPages,
        reorderGroups,
        refresh,
    };
}
