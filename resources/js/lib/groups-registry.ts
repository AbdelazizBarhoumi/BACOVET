import { useEffect, useSyncExternalStore } from 'react';
import { handleApiError } from '@/lib/session';
import type { BuilderPage } from './pages-registry';

export type BuilderPageGroup = {
    id: number;
    name: string;
    slug: string;
    sort_order: number;
    pages: BuilderPage[];
    created_at: string;
    updated_at: string;
    can_manage?: boolean;
};

export type SidebarStructure = {
    groups: BuilderPageGroup[];
    ungrouped: BuilderPage[];
};

const API_BASE = '/api/builder-page-groups';

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

async function fetchSidebar(): Promise<SidebarStructure> {
    try {
        const res = await fetch(API_BASE, {
            credentials: 'include',
            headers: apiHeaders(),
        });
        if (!res.ok) {
            handleApiError(res.status);

            return { groups: [], ungrouped: [] };
        }
        return await res.json();
    } catch {
        return { groups: [], ungrouped: [] };
    }
}

async function apiCreateGroup(name: string): Promise<BuilderPageGroup | null> {
    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            credentials: 'include',
            headers: apiHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!res.ok) {
            handleApiError(res.status);

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
        if (!res.ok) handleApiError(res.status);

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
        if (!res.ok) handleApiError(res.status);

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
        if (!res.ok) handleApiError(res.status);

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
        if (!res.ok) handleApiError(res.status);

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
        if (!res.ok) handleApiError(res.status);

        return res.ok;
    } catch {
        return false;
    }
}

type SidebarListener = () => void;

type SidebarStoreValue = {
    data: SidebarStructure;
    loading: boolean;
};

const sidebarListeners = new Set<SidebarListener>();
let sidebarStore: SidebarStoreValue = {
    data: { groups: [], ungrouped: [] },
    loading: true,
};
let sidebarFetchStarted = false;

function setSidebarStore(next: SidebarStoreValue) {
    sidebarStore = next;
    sidebarListeners.forEach((listener) => listener());
}

function subscribeToSidebar(listener: SidebarListener): () => void {
    sidebarListeners.add(listener);
    return () => {
        sidebarListeners.delete(listener);
    };
}

function getSidebarSnapshot(): SidebarStoreValue {
    return sidebarStore;
}

async function refresh(): Promise<void> {
    const result = await fetchSidebar();
    setSidebarStore({ data: result, loading: false });
}

function startSidebarFetch(): void {
    if (sidebarFetchStarted) return;
    sidebarFetchStarted = true;
    void refresh();
}

const createGroup = async (
    name: string,
): Promise<BuilderPageGroup | null> => {
    const g = await apiCreateGroup(name);
    if (g) await refresh();
    return g;
};

const renameGroup = async (id: number, name: string): Promise<boolean> => {
    const ok = await apiRenameGroup(id, name);
    if (ok) await refresh();
    return ok;
};

const deleteGroup = async (id: number): Promise<boolean> => {
    const ok = await apiDeleteGroup(id);
    if (ok) await refresh();
    return ok;
};

const assignPage = async (
    pageId: number,
    groupId: number | null,
): Promise<boolean> => {
    const ok = await apiAssignPage(pageId, groupId);
    if (ok) await refresh();
    return ok;
};

const reorderPages = async (
    items: { id: number; sort_order: number }[],
): Promise<boolean> => {
    const ok = await apiReorderPages(items);
    if (ok) await refresh();
    return ok;
};

const reorderGroups = async (
    items: { id: number; sort_order: number }[],
): Promise<boolean> => {
    const ok = await apiReorderGroups(items);
    if (ok) await refresh();
    return ok;
};

export function useSidebarStructure() {
    useEffect(() => {
        startSidebarFetch();
    }, []);

    const { data, loading } = useSyncExternalStore(
        subscribeToSidebar,
        getSidebarSnapshot,
        getSidebarSnapshot,
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
