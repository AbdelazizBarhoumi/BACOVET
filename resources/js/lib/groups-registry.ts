import { useCallback, useEffect, useState } from "react";
import type { BuilderPage } from "./pages-registry";

export type BuilderPageGroup = {
  id: number;
  name: string;
  slug: string;
  sort_order: number;
  pages: BuilderPage[];
  created_at: string;
  updated_at: string;
};

export type SidebarStructure = {
  groups: BuilderPageGroup[];
  ungrouped: BuilderPage[];
};

function getCsrfToken(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "X-XSRF-TOKEN": getCsrfToken(),
  };
}

async function fetchSidebar(): Promise<SidebarStructure> {
  try {
    const res = await fetch("/api/builder-page-groups", {
      credentials: "include",
      headers: apiHeaders(),
    });
    if (!res.ok) return { groups: [], ungrouped: [] };
    return await res.json();
  } catch {
    return { groups: [], ungrouped: [] };
  }
}

async function apiCreateGroup(name: string): Promise<BuilderPageGroup | null> {
  try {
    const res = await fetch("/api/builder-page-groups", {
      method: "POST",
      credentials: "include",
      headers: apiHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.group;
  } catch {
    return null;
  }
}

async function apiRenameGroup(id: number, name: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/builder-page-groups/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: apiHeaders(),
      body: JSON.stringify({ name }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiDeleteGroup(id: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/builder-page-groups/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: apiHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiAssignPage(pageId: number, groupId: number | null): Promise<boolean> {
  try {
    const res = await fetch("/api/builder-page-groups/assign-page", {
      method: "PUT",
      credentials: "include",
      headers: apiHeaders(),
      body: JSON.stringify({ page_id: pageId, group_id: groupId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiReorderPages(items: { id: number; sort_order: number }[]): Promise<boolean> {
  try {
    const res = await fetch("/api/builder-page-groups/reorder-pages", {
      method: "PUT",
      credentials: "include",
      headers: apiHeaders(),
      body: JSON.stringify({ pages: items }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function apiReorderGroups(items: { id: number; sort_order: number }[]): Promise<boolean> {
  try {
    const res = await fetch("/api/builder-page-groups/reorder-groups", {
      method: "PUT",
      credentials: "include",
      headers: apiHeaders(),
      body: JSON.stringify({ groups: items }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function useSidebarStructure() {
  const [data, setData] = useState<SidebarStructure>({ groups: [], ungrouped: [] });
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
    return () => { cancelled = true; };
  }, []);

  const createGroup = useCallback(async (name: string): Promise<BuilderPageGroup | null> => {
    const g = await apiCreateGroup(name);
    if (g) await refresh();
    return g;
  }, [refresh]);

  const renameGroup = useCallback(async (id: number, name: string): Promise<boolean> => {
    const ok = await apiRenameGroup(id, name);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  const deleteGroup = useCallback(async (id: number): Promise<boolean> => {
    const ok = await apiDeleteGroup(id);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  const assignPage = useCallback(async (pageId: number, groupId: number | null): Promise<boolean> => {
    const ok = await apiAssignPage(pageId, groupId);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  const reorderPages = useCallback(async (items: { id: number; sort_order: number }[]): Promise<boolean> => {
    const ok = await apiReorderPages(items);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

  const reorderGroups = useCallback(async (items: { id: number; sort_order: number }[]): Promise<boolean> => {
    const ok = await apiReorderGroups(items);
    if (ok) await refresh();
    return ok;
  }, [refresh]);

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