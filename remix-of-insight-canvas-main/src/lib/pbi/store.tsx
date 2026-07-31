import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  PAGE_PRESETS,
  SALES,
  fieldType,
  isMeasure,
  type Agg,
  type AnalyticsLine,
  type CrossFilter,
  type Interaction,
  type Page,
  type PageFormat,
  type Row,
  type Visual,
  type VisualType,
  type WellField,
} from "./model";

export type WellName =
  | "axis"
  | "legend"
  | "values"
  | "tooltips"
  | "smallMultiples"
  | "drillFields";

export type ReportFilter = {
  column: string;
  values: string[];
  /** page = current page only, report = all pages */
  scope: "page" | "report";
  pageId?: string | undefined;
};

export type Bookmark = {
  id: string;
  name: string;
  pageId: string;
  filters: ReportFilter[];
  slicerSelections: Record<string, string[]>;
  hidden: Record<string, boolean>;
  crossFilter: CrossFilter;
};

export type PaneName = "filters" | "visualizations" | "data" | "selection" | "bookmarks" | "syncSlicers" | "analytics";

type State = {
  pages: Page[];
  activePageId: string;
  selectedId: string | null;
  filters: ReportFilter[];
  slicerSelections: Record<string, string[]>;
  /** slicer id -> synced page ids */
  slicerSync: Record<string, string[]>;
  crossFilter: CrossFilter;
  /** sourceId -> targetId -> behaviour */
  interactions: Record<string, Record<string, Interaction>>;
  editInteractions: boolean;
  bookmarks: Bookmark[];
  theme: string;
  showGridlines: boolean;
  snapToGrid: boolean;
  zoom: number;
  mobileView: boolean;
  ribbonTab: string;
  openPanes: Record<PaneName, boolean>;
  drillthrough: { pageId: string; column: string; value: string } | null;
};

export const defaultPageFormat = (): PageFormat => ({
  preset: "16:9",
  width: PAGE_PRESETS[0]!.width,
  height: PAGE_PRESETS[0]!.height,
  background: "var(--card)",
  wallpaper: "var(--muted)",
  tooltip: false,
  hidden: false,
});

let seq = 0;
export function uid(prefix = "v") {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq}`;
}

export function wf(name: string, agg: Agg = "sum"): WellField {
  const table = isMeasure(name) ? "Measures" : "Sales";
  return { table, name, agg: fieldType(name) === "number" ? agg : "count" };
}

let zTop = 100;

export function mkVisual(
  type: VisualType,
  x: number,
  y: number,
  w: number,
  h: number,
  init: Partial<Visual> = {},
): Visual {
  zTop += 1;
  return {
    id: uid(),
    type,
    name: init.name ?? init.title ?? visualTypeLabel(type),
    title: init.title ?? "",
    x,
    y,
    w,
    h,
    z: zTop,
    hidden: false,
    axis: [],
    legend: [],
    values: [],
    tooltips: [],
    smallMultiples: [],
    drillFields: [],
    showTitle: true,
    showLegend: true,
    showLabels: false,
    background: "var(--card)",
    border: true,
    shadow: false,
    altText: "",
    colorIndex: 0,
    analytics: [],
    conditionalFormat: false,
    subtotals: true,
    drillLevel: 0,
    ...init,
  };
}

export function visualTypeLabel(type: VisualType) {
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

const defaultVisuals = (): Visual[] => [
  mkVisual("card", 16, 16, 250, 120, { values: [wf("Total Sales")], title: "Total Sales", name: "Card — Total Sales" , z: 1 }),
  mkVisual("card", 278, 16, 250, 120, { values: [wf("Total Profit")], title: "Total Profit", name: "Card — Total Profit" , z: 2 }),
  mkVisual("kpi", 540, 16, 250, 120, { values: [wf("Profit Margin")], title: "Profit Margin", name: "KPI — Margin" , z: 3 }),
  mkVisual("buttonSlicer", 802, 16, 460, 120, { axis: [wf("Region")], title: "Region", name: "Slicer — Region" , z: 4 }),
  mkVisual("column", 16, 148, 512, 260, {
    axis: [wf("Month")],
    values: [wf("Total Sales")],
    title: "Sales by Month",
    name: "Column — Sales by Month",
    drillFields: [wf("Year"), wf("Quarter"), wf("Month")],
    z: 5,
  }),
  mkVisual("donut", 540, 148, 250, 260, {
    axis: [wf("Category")],
    values: [wf("Total Sales")],
    title: "Sales by Category",
    name: "Donut — Category",
    z: 6,
  }),
  mkVisual("treemap", 802, 148, 460, 260, {
    axis: [wf("Subcategory")],
    values: [wf("Total Sales")],
    title: "Sales by Subcategory",
    name: "Treemap — Subcategory",
    z: 7,
  }),
  mkVisual("bar", 16, 420, 512, 284, {
    axis: [wf("Country")],
    values: [wf("Total Sales")],
    title: "Sales by Country",
    name: "Bar — Country",
    z: 8,
  }),
  mkVisual("table", 540, 420, 722, 284, {
    axis: [wf("Subcategory")],
    values: [wf("Total Sales"), wf("Total Profit"), wf("Order Count")],
    title: "Product detail",
    name: "Table — Product detail",
    conditionalFormat: true,
    z: 9,
  }),
];

const mkPage = (id: string, name: string, visuals: Visual[] = []): Page => ({
  id,
  name,
  visuals,
  format: defaultPageFormat(),
  mobile: {},
  tabOrder: visuals.map((v) => v.id),
});

type Ctx = State & {
  page: Page;
  selected: Visual | null;
  rows: Row[];
  highlightValue: CrossFilter;
  setState: React.Dispatch<React.SetStateAction<State>>;
  select: (id: string | null) => void;
  addVisual: (type: VisualType) => void;
  updateVisual: (id: string, patch: Partial<Visual>) => void;
  removeVisual: (id: string) => void;
  duplicateVisual: (id: string) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  toggleVisualHidden: (id: string) => void;
  reorderVisual: (id: string, dir: -1 | 1) => void;
  dropField: (visualId: string, well: WellName, name: string) => void;
  removeWellField: (visualId: string, well: WellName, index: number) => void;
  setWellAgg: (visualId: string, well: WellName, index: number, agg: Agg) => void;
  toggleAnalytics: (visualId: string, kind: AnalyticsLine["kind"]) => void;
  drill: (visualId: string, dir: -1 | 1) => void;
  addPage: () => void;
  removePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  duplicatePage: (id: string) => void;
  togglePageHidden: (id: string) => void;
  setPageFormat: (id: string, patch: Partial<PageFormat>) => void;
  setActivePage: (id: string) => void;
  toggleSlicer: (visualId: string, column: string, value: string) => void;
  clearSlicer: (visualId: string) => void;
  setSlicerSync: (visualId: string, pageId: string) => void;
  applyCrossFilter: (sourceId: string, column: string, value: string) => void;
  clearCrossFilter: () => void;
  setInteraction: (sourceId: string, targetId: string, mode: Interaction) => void;
  interactionFor: (sourceId: string, targetId: string) => Interaction;
  addFilter: (column: string, scope?: "page" | "report") => void;
  toggleFilterValue: (column: string, value: string) => void;
  removeFilter: (column: string) => void;
  addBookmark: (name: string) => void;
  applyBookmark: (id: string) => void;
  removeBookmark: (id: string) => void;
  setTheme: (t: string) => void;
  setRibbonTab: (t: string) => void;
  togglePane: (p: PaneName) => void;
  setZoom: (z: number) => void;
  openDrillthrough: (column: string, value: string) => void;
  clearDrillthrough: () => void;
};

const PbiContext = createContext<Ctx | null>(null);

export function PbiProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => ({
    pages: [mkPage("p1", "Overview", defaultVisuals()), mkPage("p2", "Detail")],
    activePageId: "p1",
    selectedId: null,
    filters: [],
    slicerSelections: {},
    slicerSync: {},
    crossFilter: null,
    interactions: {},
    editInteractions: false,
    bookmarks: [],
    theme: "default",
    showGridlines: true,
    snapToGrid: true,
    zoom: 100,
    mobileView: false,
    ribbonTab: "Home",
    openPanes: {
      filters: true,
      visualizations: true,
      data: true,
      selection: false,
      bookmarks: false,
      syncSlicers: false,
      analytics: false,
    },
    drillthrough: null,
  }));

  const page = state.pages.find((p) => p.id === state.activePageId) ?? state.pages[0]!;
  const selected = page.visuals.find((v) => v.id === state.selectedId) ?? null;

  const mapVisuals = useCallback(
    (fn: (v: Visual[]) => Visual[]) =>
      setState((s) => ({
        ...s,
        pages: s.pages.map((p) => (p.id === s.activePageId ? { ...p, visuals: fn(p.visuals) } : p)),
      })),
    [],
  );

  const updateVisual = useCallback(
    (id: string, patch: Partial<Visual>) =>
      mapVisuals((vs) => vs.map((v) => (v.id === id ? { ...v, ...patch } : v))),
    [mapVisuals],
  );

  const addVisual = useCallback(
    (type: VisualType) => {
      const big = type === "card" || type === "kpi" || type === "text" || type === "button";
      const v = mkVisual(type, 40, 40, big ? 260 : 420, big ? 130 : 260, {
        title: type === "text" ? "Text box" : "",
        text:
          type === "text"
            ? "Double-click to edit text"
            : type === "button"
              ? "Button"
              : undefined,
      });
      mapVisuals((vs) => [...vs, v]);
      setState((s) => ({ ...s, selectedId: v.id }));
    },
    [mapVisuals],
  );

  const dropField = useCallback(
    (visualId: string, well: WellName, name: string) =>
      mapVisuals((vs) =>
        vs.map((v) => {
          if (v.id !== visualId) return v;
          if (v[well].some((f) => f.name === name)) return v;
          const next = [...v[well], wf(name)];
          const single = well === "axis" || well === "legend";
          return { ...v, [well]: single ? next.slice(-1) : next };
        }),
      ),
    [mapVisuals],
  );

  const rows = useMemo(() => {
    let out = SALES;
    for (const f of state.filters) {
      if (f.scope === "page" && f.pageId && f.pageId !== state.activePageId) continue;
      if (f.values.length) out = out.filter((r) => f.values.includes(String(r[f.column])));
    }
    for (const [visualId, sel] of Object.entries(state.slicerSelections)) {
      if (!sel.length) continue;
      const onPage = page.visuals.some((v) => v.id === visualId);
      const synced = (state.slicerSync[visualId] ?? []).includes(state.activePageId);
      if (!onPage && !synced) continue;
      const byCol = new Map<string, string[]>();
      for (const s of sel) {
        const [c, v] = s.split("::");
        if (!c || v === undefined) continue;
        byCol.set(c, [...(byCol.get(c) ?? []), v]);
      }
      for (const [c, vals] of byCol) out = out.filter((r) => vals.includes(String(r[c])));
    }
    if (state.drillthrough && state.drillthrough.pageId === state.activePageId) {
      const d = state.drillthrough;
      out = out.filter((r) => String(r[d.column]) === d.value);
    }
    return out;
  }, [
    state.filters,
    state.slicerSelections,
    state.slicerSync,
    state.activePageId,
    state.drillthrough,
    page.visuals,
  ]);

  const interactionFor = useCallback(
    (sourceId: string, targetId: string): Interaction =>
      state.interactions[sourceId]?.[targetId] ?? "filter",
    [state.interactions],
  );

  const value: Ctx = {
    ...state,
    page,
    selected,
    rows,
    highlightValue: state.crossFilter,
    setState,
    select: (id) => setState((s) => ({ ...s, selectedId: id })),
    addVisual,
    updateVisual,
    removeVisual: (id) => mapVisuals((vs) => vs.filter((v) => v.id !== id)),
    duplicateVisual: (id) =>
      mapVisuals((vs) => {
        const v = vs.find((x) => x.id === id);
        if (!v) return vs;
        zTop += 1;
        return [...vs, { ...v, id: uid(), x: v.x + 24, y: v.y + 24, z: zTop, name: `${v.name} (copy)` }];
      }),
    bringForward: (id) => {
      zTop += 1;
      updateVisual(id, { z: zTop });
    },
    sendBackward: (id) =>
      mapVisuals((vs) => {
        const min = Math.min(...vs.map((v) => v.z));
        return vs.map((v) => (v.id === id ? { ...v, z: min - 1 } : v));
      }),
    toggleVisualHidden: (id) =>
      mapVisuals((vs) => vs.map((v) => (v.id === id ? { ...v, hidden: !v.hidden } : v))),
    reorderVisual: (id, dir) =>
      mapVisuals((vs) => {
        const sorted = [...vs].sort((a, b) => b.z - a.z);
        const i = sorted.findIndex((v) => v.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= sorted.length) return vs;
        const a = sorted[i]!;
        const b = sorted[j]!;
        return vs.map((v) => (v.id === a.id ? { ...v, z: b.z } : v.id === b.id ? { ...v, z: a.z } : v));
      }),
    dropField,
    removeWellField: (visualId, well, index) =>
      mapVisuals((vs) =>
        vs.map((v) =>
          v.id === visualId ? { ...v, [well]: v[well].filter((_, i) => i !== index) } : v,
        ),
      ),
    setWellAgg: (visualId, well, index, agg) =>
      mapVisuals((vs) =>
        vs.map((v) =>
          v.id === visualId
            ? { ...v, [well]: v[well].map((f, i) => (i === index ? { ...f, agg } : f)) }
            : v,
        ),
      ),
    toggleAnalytics: (visualId, kind) =>
      mapVisuals((vs) =>
        vs.map((v) => {
          if (v.id !== visualId) return v;
          const exists = v.analytics.find((a) => a.kind === kind);
          return {
            ...v,
            analytics: exists
              ? v.analytics.filter((a) => a.kind !== kind)
              : [...v.analytics, { kind, enabled: true }],
          };
        }),
      ),
    drill: (visualId, dir) =>
      mapVisuals((vs) =>
        vs.map((v) => {
          if (v.id !== visualId || !v.drillFields.length) return v;
          const next = Math.max(0, Math.min(v.drillFields.length - 1, v.drillLevel + dir));
          const f = v.drillFields[next]!;
          return { ...v, drillLevel: next, axis: [f] };
        }),
      ),
    addPage: () =>
      setState((s) => {
        const id = uid("p");
        return {
          ...s,
          pages: [...s.pages, mkPage(id, `Page ${s.pages.length + 1}`)],
          activePageId: id,
          selectedId: null,
        };
      }),
    removePage: (id) =>
      setState((s) => {
        if (s.pages.length === 1) return s;
        const pages = s.pages.filter((p) => p.id !== id);
        return { ...s, pages, activePageId: pages[0]!.id, selectedId: null };
      }),
    renamePage: (id, name) =>
      setState((s) => ({ ...s, pages: s.pages.map((p) => (p.id === id ? { ...p, name } : p)) })),
    duplicatePage: (id) =>
      setState((s) => {
        const src = s.pages.find((p) => p.id === id);
        if (!src) return s;
        const nid = uid("p");
        const copy: Page = {
          ...src,
          id: nid,
          name: `${src.name} (copy)`,
          visuals: src.visuals.map((v) => ({ ...v, id: uid() })),
        };
        return { ...s, pages: [...s.pages, copy], activePageId: nid, selectedId: null };
      }),
    togglePageHidden: (id) =>
      setState((s) => ({
        ...s,
        pages: s.pages.map((p) =>
          p.id === id ? { ...p, format: { ...p.format, hidden: !p.format.hidden } } : p,
        ),
      })),
    setPageFormat: (id, patch) =>
      setState((s) => ({
        ...s,
        pages: s.pages.map((p) => (p.id === id ? { ...p, format: { ...p.format, ...patch } } : p)),
      })),
    setActivePage: (id) => setState((s) => ({ ...s, activePageId: id, selectedId: null })),
    toggleSlicer: (visualId, column, value) =>
      setState((s) => {
        const key = `${column}::${value}`;
        const cur = s.slicerSelections[visualId] ?? [];
        const next = cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key];
        return { ...s, slicerSelections: { ...s.slicerSelections, [visualId]: next } };
      }),
    clearSlicer: (visualId) =>
      setState((s) => ({ ...s, slicerSelections: { ...s.slicerSelections, [visualId]: [] } })),
    setSlicerSync: (visualId, pageId) =>
      setState((s) => {
        const cur = s.slicerSync[visualId] ?? [];
        const next = cur.includes(pageId) ? cur.filter((p) => p !== pageId) : [...cur, pageId];
        return { ...s, slicerSync: { ...s.slicerSync, [visualId]: next } };
      }),
    applyCrossFilter: (sourceId, column, value) =>
      setState((s) => {
        const same =
          s.crossFilter?.sourceId === sourceId &&
          s.crossFilter.column === column &&
          s.crossFilter.value === value;
        return { ...s, crossFilter: same ? null : { sourceId, column, value } };
      }),
    clearCrossFilter: () => setState((s) => ({ ...s, crossFilter: null })),
    setInteraction: (sourceId, targetId, mode) =>
      setState((s) => ({
        ...s,
        interactions: {
          ...s.interactions,
          [sourceId]: { ...(s.interactions[sourceId] ?? {}), [targetId]: mode },
        },
      })),
    interactionFor,
    addFilter: (column, scope = "report") =>
      setState((s) =>
        s.filters.some((f) => f.column === column)
          ? s
          : {
              ...s,
              filters: [
                ...s.filters,
                { column, values: [], scope, pageId: scope === "page" ? s.activePageId : undefined },
              ],
            },
      ),
    toggleFilterValue: (column, value) =>
      setState((s) => ({
        ...s,
        filters: s.filters.map((f) =>
          f.column === column
            ? {
                ...f,
                values: f.values.includes(value)
                  ? f.values.filter((v) => v !== value)
                  : [...f.values, value],
              }
            : f,
        ),
      })),
    removeFilter: (column) =>
      setState((s) => ({ ...s, filters: s.filters.filter((f) => f.column !== column) })),
    addBookmark: (name) =>
      setState((s) => {
        const p = s.pages.find((x) => x.id === s.activePageId)!;
        return {
          ...s,
          bookmarks: [
            ...s.bookmarks,
            {
              id: uid("b"),
              name: name || `Bookmark ${s.bookmarks.length + 1}`,
              pageId: s.activePageId,
              filters: s.filters.map((f) => ({ ...f, values: [...f.values] })),
              slicerSelections: JSON.parse(JSON.stringify(s.slicerSelections)),
              hidden: Object.fromEntries(p.visuals.map((v) => [v.id, v.hidden])),
              crossFilter: s.crossFilter,
            },
          ],
        };
      }),
    applyBookmark: (id) =>
      setState((s) => {
        const b = s.bookmarks.find((x) => x.id === id);
        if (!b) return s;
        return {
          ...s,
          activePageId: b.pageId,
          filters: b.filters.map((f) => ({ ...f, values: [...f.values] })),
          slicerSelections: JSON.parse(JSON.stringify(b.slicerSelections)),
          crossFilter: b.crossFilter,
          pages: s.pages.map((p) =>
            p.id === b.pageId
              ? { ...p, visuals: p.visuals.map((v) => ({ ...v, hidden: b.hidden[v.id] ?? v.hidden })) }
              : p,
          ),
        };
      }),
    removeBookmark: (id) =>
      setState((s) => ({ ...s, bookmarks: s.bookmarks.filter((b) => b.id !== id) })),
    setTheme: (theme) => setState((s) => ({ ...s, theme })),
    setRibbonTab: (ribbonTab) => setState((s) => ({ ...s, ribbonTab })),
    togglePane: (p) =>
      setState((s) => ({ ...s, openPanes: { ...s.openPanes, [p]: !s.openPanes[p] } })),
    setZoom: (zoom) => setState((s) => ({ ...s, zoom })),
    openDrillthrough: (column, value) =>
      setState((s) => {
        const target = s.pages.find((p) => p.id !== s.activePageId);
        if (!target) return s;
        return {
          ...s,
          activePageId: target.id,
          selectedId: null,
          drillthrough: { pageId: target.id, column, value },
        };
      }),
    clearDrillthrough: () => setState((s) => ({ ...s, drillthrough: null })),
  };

  return <PbiContext.Provider value={value}>{children}</PbiContext.Provider>;
}

export function usePbi() {
  const ctx = useContext(PbiContext);
  if (!ctx) throw new Error("usePbi must be used inside PbiProvider");
  return ctx;
}
