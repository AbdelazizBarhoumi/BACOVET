import { useCallback, useEffect, useState } from "react";
export type BuilderPage = {
  id: string;
  slug: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};
const REG_KEY = "bacovet.pages.registry";
const LAYOUT_KEY = (slug: string) => `bacovet.builder.${slug}`;
const uid = () => Math.random().toString(36).slice(2, 9);
export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `page-${uid()}`;
}
function readRegistry(): BuilderPage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REG_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writeRegistry(pages: BuilderPage[]) {
  localStorage.setItem(REG_KEY, JSON.stringify(pages));
  // notify same-tab listeners
  window.dispatchEvent(new Event("bacovet.pages.updated"));
}
export function usePagesRegistry() {
  const [pages, setPages] = useState<BuilderPage[]>([]);
  useEffect(() => {
    setPages(readRegistry());
    const refresh = () => setPages(readRegistry());
    window.addEventListener("storage", refresh);
    window.addEventListener("bacovet.pages.updated", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("bacovet.pages.updated", refresh);
    };
  }, []);
  const uniqueSlug = useCallback((base: string, existing: BuilderPage[]) => {
    let slug = slugify(base);
    let i = 2;
    const has = (s: string) => existing.some((p) => p.slug === s);
    while (has(slug)) slug = `${slugify(base)}-${i++}`;
    return slug;
  }, []);
  const createPage = useCallback((name: string): BuilderPage => {
    const list = readRegistry();
    const now = Date.now();
    const p: BuilderPage = {
      id: uid(),
      slug: uniqueSlug(name, list),
      name: name.trim() || "Nouvelle page",
      createdAt: now,
      updatedAt: now,
    };
    writeRegistry([...list, p]);
    return p;
  }, [uniqueSlug]);
  const renamePage = useCallback((id: string, newName: string) => {
    const list = readRegistry();
    writeRegistry(
      list.map((p) => (p.id === id ? { ...p, name: newName.trim() || p.name, updatedAt: Date.now() } : p))
    );
  }, []);
  const changeSlug = useCallback((id: string, newSlug: string) => {
    const list = readRegistry();
    const target = list.find((p) => p.id === id);
    if (!target) return;
    const clean = uniqueSlug(newSlug, list.filter((p) => p.id !== id));
    // move stored layout
    try {
      const raw = localStorage.getItem(LAYOUT_KEY(target.slug));
      if (raw) {
        localStorage.setItem(LAYOUT_KEY(clean), raw);
        localStorage.removeItem(LAYOUT_KEY(target.slug));
      }
    } catch {}
    writeRegistry(list.map((p) => (p.id === id ? { ...p, slug: clean, updatedAt: Date.now() } : p)));
  }, [uniqueSlug]);
  const duplicatePage = useCallback((id: string): BuilderPage | null => {
    const list = readRegistry();
    const src = list.find((p) => p.id === id);
    if (!src) return null;
    const now = Date.now();
    const copy: BuilderPage = {
      id: uid(),
      slug: uniqueSlug(`${src.slug}-copy`, list),
      name: `${src.name} (copie)`,
      createdAt: now,
      updatedAt: now,
    };
    try {
      const raw = localStorage.getItem(LAYOUT_KEY(src.slug));
      if (raw) localStorage.setItem(LAYOUT_KEY(copy.slug), raw);
    } catch {}
    writeRegistry([...list, copy]);
    return copy;
  }, [uniqueSlug]);
  const deletePage = useCallback((id: string) => {
    const list = readRegistry();
    const p = list.find((x) => x.id === id);
    if (p) {
      try { localStorage.removeItem(LAYOUT_KEY(p.slug)); } catch {}
    }
    writeRegistry(list.filter((x) => x.id !== id));
  }, []);
  return { pages, createPage, renamePage, changeSlug, duplicatePage, deletePage };
}
export function getPageBySlug(slug: string): BuilderPage | undefined {
  return readRegistry().find((p) => p.slug === slug);
}