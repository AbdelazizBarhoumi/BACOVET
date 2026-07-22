import { useCallback, useEffect, useState } from "react";

export type BuilderPage = {
  id: number;
  slug: string;
  name: string;
  created_at: string;
  updated_at: string;
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

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `page-${Math.random().toString(36).slice(2, 9)}`;
}

async function fetchPages(): Promise<BuilderPage[]> {
  try {
    const res = await fetch("/api/builder-pages", {
      credentials: "include",
      headers: apiHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function apiCreatePage(name: string): Promise<BuilderPage | null> {
  try {
    const res = await fetch("/api/builder-pages", {
      method: "POST",
      credentials: "include",
      headers: apiHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.page;
  } catch {
    return null;
  }
}

async function apiUpdatePage(
  id: number,
  data: { name?: string; slug?: string }
): Promise<BuilderPage | null> {
  try {
    const res = await fetch(`/api/builder-pages/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: apiHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.page;
  } catch {
    return null;
  }
}

async function apiDuplicatePage(
  id: number
): Promise<BuilderPage | null> {
  try {
    const res = await fetch(`/api/builder-pages/${id}/duplicate`, {
      method: "POST",
      credentials: "include",
      headers: apiHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.page;
  } catch {
    return null;
  }
}

async function apiDeletePage(id: number): Promise<boolean> {
  try {
    const res = await fetch(`/api/builder-pages/${id}`, {
      method: "DELETE",
      credentials: "include",
      headers: apiHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getPageBySlug(slug: string): Promise<BuilderPage | null> {
  try {
    const res = await fetch(`/api/builder-pages/${slug}`, {
      credentials: "include",
      headers: apiHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function usePagesRegistry() {
  const [pages, setPages] = useState<BuilderPage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await fetchPages();
    setPages(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createPage = useCallback(
    async (name: string): Promise<BuilderPage | null> => {
      const p = await apiCreatePage(name || "Nouvelle page");
      if (p) await refresh();
      return p;
    },
    [refresh]
  );

  const renamePage = useCallback(
    async (id: number, newName: string): Promise<BuilderPage | null> => {
      const p = await apiUpdatePage(id, { name: newName });
      if (p) await refresh();
      return p;
    },
    [refresh]
  );

  const changeSlug = useCallback(
    async (id: number, newSlug: string): Promise<BuilderPage | null> => {
      const p = await apiUpdatePage(id, { slug: newSlug });
      if (p) await refresh();
      return p;
    },
    [refresh]
  );

  const duplicatePage = useCallback(
    async (id: number): Promise<BuilderPage | null> => {
      const p = await apiDuplicatePage(id);
      if (p) await refresh();
      return p;
    },
    [refresh]
  );

  const deletePage = useCallback(
    async (id: number): Promise<boolean> => {
      const ok = await apiDeletePage(id);
      if (ok) await refresh();
      return ok;
    },
    [refresh]
  );

  return {
    pages,
    loading,
    createPage,
    renamePage,
    changeSlug,
    duplicatePage,
    deletePage,
  };
}
