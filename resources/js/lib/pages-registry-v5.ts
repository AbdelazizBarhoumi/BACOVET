import { useCallback, useEffect, useState } from 'react';
import { handleV5Error } from '@/lib/v5-session';

export type BuilderPageV5 = {
    id: number;
    slug: string;
    name: string;
    group_id: number | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
};

const API_BASE = '/api/v5/builder-pages';

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

export function slugify(name: string) {
    return (
        name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40) || `page-${Math.random().toString(36).slice(2, 9)}`
    );
}

async function fetchPages(): Promise<BuilderPageV5[]> {
    try {
        const res = await fetch(API_BASE, {
            credentials: 'include',
            headers: apiHeaders(),
        });
        if (!res.ok) {
            handleV5Error(res.status);

            return [];
        }
        return await res.json();
    } catch {
        return [];
    }
}

async function apiCreatePage(
    name: string,
    groupId?: number | null,
): Promise<BuilderPageV5 | null> {
    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            credentials: 'include',
            headers: apiHeaders(),
            body: JSON.stringify({ name, group_id: groupId ?? null }),
        });
        if (!res.ok) {
            handleV5Error(res.status);

            return null;
        }
        const data = await res.json();
        return data.page;
    } catch {
        return null;
    }
}

async function apiUpdatePage(
    id: number,
    data: { name?: string; slug?: string; group_id?: number | null },
): Promise<BuilderPageV5 | null> {
    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: apiHeaders(),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            handleV5Error(res.status);

            return null;
        }
        const json = await res.json();
        return json.page;
    } catch {
        return null;
    }
}

async function apiDuplicatePage(id: number): Promise<BuilderPageV5 | null> {
    try {
        const res = await fetch(`${API_BASE}/${id}/duplicate`, {
            method: 'POST',
            credentials: 'include',
            headers: apiHeaders(),
        });
        if (!res.ok) {
            handleV5Error(res.status);

            return null;
        }
        const data = await res.json();
        return data.page;
    } catch {
        return null;
    }
}

async function apiDeletePage(id: number): Promise<boolean> {
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

export async function getPageBySlug(
    slug: string,
): Promise<BuilderPageV5 | null> {
    try {
        const res = await fetch(`${API_BASE}/${slug}`, {
            credentials: 'include',
            headers: apiHeaders(),
        });
        if (!res.ok) {
            handleV5Error(res.status);

            return null;
        }
        return await res.json();
    } catch {
        return null;
    }
}

export function usePagesRegistryV5() {
    const [pages, setPages] = useState<BuilderPageV5[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const list = await fetchPages();
        setPages(list);
        setLoading(false);
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchPages().then((list) => {
            if (!cancelled) {
                setPages(list);
                setLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const createPage = useCallback(
        async (
            name: string,
            groupId?: number | null,
        ): Promise<BuilderPageV5 | null> => {
            const p = await apiCreatePage(name, groupId);
            if (p) await refresh();
            return p;
        },
        [refresh],
    );

    const renamePage = useCallback(
        async (id: number, newName: string): Promise<BuilderPageV5 | null> => {
            const p = await apiUpdatePage(id, { name: newName });
            if (p) await refresh();
            return p;
        },
        [refresh],
    );

    const changeSlug = useCallback(
        async (id: number, newSlug: string): Promise<BuilderPageV5 | null> => {
            const p = await apiUpdatePage(id, { slug: newSlug });
            if (p) await refresh();
            return p;
        },
        [refresh],
    );

    const duplicatePage = useCallback(
        async (id: number): Promise<BuilderPageV5 | null> => {
            const p = await apiDuplicatePage(id);
            if (p) await refresh();
            return p;
        },
        [refresh],
    );

    const deletePage = useCallback(
        async (id: number): Promise<boolean> => {
            const ok = await apiDeletePage(id);
            if (ok) await refresh();
            return ok;
        },
        [refresh],
    );

    const updatePage = useCallback(
        async (
            id: number,
            data: { name?: string; slug?: string; group_id?: number | null },
        ): Promise<BuilderPageV5 | null> => {
            const p = await apiUpdatePage(id, data);
            if (p) await refresh();
            return p;
        },
        [refresh],
    );

    return {
        pages,
        loading,
        createPage,
        renamePage,
        changeSlug,
        duplicatePage,
        deletePage,
        updatePage,
    };
}
