import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildTables, fetchEndpointDatasets, type EndpointDataset, type TableDef } from "@/lib/v6/datasets";
import type { Row } from "@/lib/v6/model";
import { logActivity, logWidgetActivity } from "./activity";
import { topNValues, validateDateRange } from "./filters";
import type { MeasureDefinition, PageLayout, TableCell, Widget, WidgetConfig, WidgetType } from "./types";
import { makeEmptyTable, pushWidgets, ROW_HEIGHT, uid } from "./types";

type Mode = "view" | "edit";

type Ctx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  pageId: string;
  pageDbId: number;
  widgets: Widget[];
  measures: MeasureDefinition[];
  addMeasure: (measure: MeasureDefinition) => void;
  removeMeasure: (name: string) => void;
  sharedMeasures: MeasureDefinition[];
  measuresLoading: boolean;
  refreshSharedMeasures: () => void;
  saveSharedMeasure: (measure: MeasureDefinition) => Promise<boolean>;
  removeSharedMeasure: (name: string) => Promise<boolean>;
  allMeasures: MeasureDefinition[];
  selectedId: string | null;
  select: (id: string | null) => void;
  selected: Widget | null;
  addWidget: (type: WidgetType, partial?: Partial<Widget>) => void;
  updateWidget: (id: string, patch: Partial<Widget>) => void;
  updateConfig: (id: string, patch: Partial<WidgetConfig>) => void;
  removeWidget: (id: string) => void;
  duplicateWidget: (id: string) => void;
  toggleLock: (id: string) => void;
  moveZ: (id: string, dir: "front" | "back") => void;
  save: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  exportJson: () => string;
  importJson: (raw: string) => void;
  isDirty: boolean;
  tableSel: Record<string, string[]>;
  setTableSel: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  tableCursor: Record<string, [number, number] | null>;
  setTableCursor: React.Dispatch<React.SetStateAction<Record<string, [number, number] | null>>>;
  tableClipboard: Partial<TableCell>[][] | null;
  setTableClipboard: React.Dispatch<React.SetStateAction<Partial<TableCell>[][] | null>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  colWidthPx: number;
  setColWidthPx: (n: number) => void;
  pushMargin: (id: string, side: "top" | "bottom" | "left" | "right", newValuePx: number) => void;
  datasets: EndpointDataset[];
  tableDefs: TableDef[];
  datasetsLoading: boolean;
  refreshDatasets: () => void;
  rowsBySlug: Record<string, Row[]>;
  filteredRowsBySlug: Record<string, Row[]>;
  slicerSelections: Record<string, string[]>;
  setSlicerSelections: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  slicerDateRanges: Record<string, { from?: string; to?: string; preset?: string }>;
  setSlicerDateRanges: React.Dispatch<React.SetStateAction<Record<string, { from?: string; to?: string; preset?: string }>>>;
  slicerTopN: Record<string, { axis: string; value: string; n: number; enabled: boolean }>;
  setSlicerTopN: React.Dispatch<React.SetStateAction<Record<string, { axis: string; value: string; n: number; enabled: boolean }>>>;
  crossFilter: { sourceId: string; column: string; value: string; mode: "filter" | "highlight" } | null;
  applyCrossFilter: (sourceId: string, column: string, value: string, mode: "filter" | "highlight") => void;
  clearCrossFilter: () => void;
  clearAllFilters: () => void;
};

const BuilderCtx = createContext<Ctx | null>(null);
export const useBuilder = () => {
  const v = useContext(BuilderCtx);
  if (!v) throw new Error("useBuilder outside provider");
  return v;
};

function getCsrfToken(): string {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const STYLE_DEFAULTS: Partial<WidgetConfig> = {
  radius: 8, padding: 8, opacity: 1,
  marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0,
  borderStyle: "solid", rotate: 0, scale: 1, lineHeight: 1.5, letterSpacing: 0,
  labelFontSize: 10, labelTransform: "uppercase", labelPosition: "top",
};

export const DEFAULT_CONFIG_FOR: Record<WidgetType, WidgetConfig> = {
  kpi: { ...STYLE_DEFAULTS, label: "KPI", unit: "%", decimals: 1, target: 90, accent: "#22c55e", showTarget: true, showLabel: true, shadow: "sm" },
  gauge: { ...STYLE_DEFAULTS, label: "Gauge", target: 85, accent: "#3b82f6", shadow: "sm" },
  sparkline: { ...STYLE_DEFAULTS, label: "Trend", accent: "#3b82f6" },
  line: { ...STYLE_DEFAULTS, label: "Line chart", accent: "#3b82f6", target: 30, showTarget: true },
  bar: { ...STYLE_DEFAULTS, label: "Bar chart", accent: "#ec4899" },
  pareto: { ...STYLE_DEFAULTS, label: "Pareto" },
  donut: { ...STYLE_DEFAULTS, label: "Donut", accent: "#22c55e" },
  pie: { ...STYLE_DEFAULTS, label: "Pie Chart" },
  radar: { ...STYLE_DEFAULTS, label: "Radar" },
  area: { ...STYLE_DEFAULTS, label: "Area Chart", accent: "#3b82f6", target: 30, showTarget: true },
  combo: { ...STYLE_DEFAULTS, label: "Combo Chart", accent: "#3b82f6", target: 25, showTarget: true },
  card: { ...STYLE_DEFAULTS, label: "Card", accent: "#3b82f6" },
  funnel: { ...STYLE_DEFAULTS, label: "Funnel", accent: "#3b82f6" },
  treemap: { ...STYLE_DEFAULTS, label: "Treemap", accent: "#3b82f6" },
  waterfall: { ...STYLE_DEFAULTS, label: "Waterfall", accent: "#3b82f6" },
  scatter: { ...STYLE_DEFAULTS, label: "Scatter", accent: "#3b82f6" },
  bubble: { ...STYLE_DEFAULTS, label: "Bubble", accent: "#3b82f6" },
  "stacked-bar": { ...STYLE_DEFAULTS, label: "Stacked bar", accent: "#3b82f6" },
  "stacked-area": { ...STYLE_DEFAULTS, label: "Stacked area", accent: "#3b82f6" },
  column: { ...STYLE_DEFAULTS, label: "Column", accent: "#3b82f6" },
  stackedColumn: { ...STYLE_DEFAULTS, label: "Stacked column", accent: "#3b82f6" },
  stacked100Column: { ...STYLE_DEFAULTS, label: "100% stacked column", accent: "#3b82f6" },
  stacked100Bar: { ...STYLE_DEFAULTS, label: "100% stacked bar", accent: "#3b82f6" },
  ribbon: { ...STYLE_DEFAULTS, label: "Ribbon", accent: "#3b82f6" },
  matrix: { ...STYLE_DEFAULTS, label: "Matrix" },
  map: { ...STYLE_DEFAULTS, label: "Map", accent: "#3b82f6" },
  filledMap: { ...STYLE_DEFAULTS, label: "Filled map", accent: "#3b82f6" },
  shapeMap: { ...STYLE_DEFAULTS, label: "Shape map", accent: "#3b82f6" },
  slicer: { ...STYLE_DEFAULTS, label: "Slicer", slicerMode: "list" },
  buttonSlicer: { ...STYLE_DEFAULTS, label: "Button slicer", slicerMode: "buttons" },
  listSlicer: { ...STYLE_DEFAULTS, label: "List slicer", slicerMode: "list" },
  inputSlicer: { ...STYLE_DEFAULTS, label: "Input slicer", slicerMode: "search" },
  dateSlicer: { ...STYLE_DEFAULTS, label: "Date slicer", slicerMode: "date" },
  image: { ...STYLE_DEFAULTS, label: "Image", imageUrl: "", radius: 0, padding: 0 },
  button: { ...STYLE_DEFAULTS, label: "Button", buttonText: "Cliquez", linkUrl: "" },
  decompositionTree: { ...STYLE_DEFAULTS, label: "Arbre de décomposition" },
  keyInfluencers: { ...STYLE_DEFAULTS, label: "Influenceurs clés" },
  smartNarrative: { ...STYLE_DEFAULTS, label: "Narratif intelligent" },
  qna: { ...STYLE_DEFAULTS, label: "Q&R" },
  rVisual: { ...STYLE_DEFAULTS, label: "Visuel R" },
  pythonVisual: { ...STYLE_DEFAULTS, label: "Visuel Python" },
  table: { ...STYLE_DEFAULTS, label: "Table" },
  "table-grid": { ...STYLE_DEFAULTS, label: "Tableau libre", tableGrid: makeEmptyTable(3, 4), padding: 4 },
  text: { ...STYLE_DEFAULTS, label: "Titre", text: "Texte libre", fontSize: 16, fontWeight: 700, align: "left", fg: "var(--foreground)", radius: 4 },
  divider: { ...STYLE_DEFAULTS, label: "Divider", bg: "var(--border)" },
};

export const DEFAULT_SIZE: Record<WidgetType, { w: number; h: number }> = {
  kpi: { w: 3, h: 3 }, gauge: { w: 3, h: 4 }, sparkline: { w: 3, h: 2 },
  line: { w: 6, h: 4 }, bar: { w: 6, h: 4 }, pareto: { w: 6, h: 5 },
  donut: { w: 3, h: 4 }, pie: { w: 4, h: 4 }, radar: { w: 5, h: 5 }, area: { w: 6, h: 4 }, combo: { w: 8, h: 5 },
  table: { w: 6, h: 5 }, "table-grid": { w: 12, h: 6 },
  card: { w: 4, h: 3 }, funnel: { w: 6, h: 4 }, treemap: { w: 6, h: 4 }, waterfall: { w: 6, h: 4 }, scatter: { w: 6, h: 4 }, bubble: { w: 6, h: 4 }, "stacked-bar": { w: 6, h: 4 }, "stacked-area": { w: 6, h: 4 },
  column: { w: 6, h: 4 }, stackedColumn: { w: 6, h: 4 }, stacked100Column: { w: 6, h: 4 }, stacked100Bar: { w: 6, h: 4 }, ribbon: { w: 6, h: 4 },
  matrix: { w: 8, h: 5 },
  map: { w: 6, h: 4 }, filledMap: { w: 6, h: 4 }, shapeMap: { w: 6, h: 4 },
  slicer: { w: 4, h: 4 }, buttonSlicer: { w: 4, h: 3 }, listSlicer: { w: 4, h: 4 }, inputSlicer: { w: 4, h: 4 }, dateSlicer: { w: 4, h: 3 },
  image: { w: 4, h: 3 }, button: { w: 3, h: 2 },
  decompositionTree: { w: 8, h: 5 }, keyInfluencers: { w: 6, h: 4 }, smartNarrative: { w: 6, h: 4 }, qna: { w: 6, h: 4 }, rVisual: { w: 6, h: 4 }, pythonVisual: { w: 6, h: 4 },
  text: { w: 6, h: 1 }, divider: { w: 12, h: 1 },
};

const SLICER_TYPES: readonly WidgetType[] = ["slicer", "buttonSlicer", "listSlicer", "inputSlicer", "dateSlicer"];

const MARGIN_KEY = {
  top: "marginTop", bottom: "marginBottom", left: "marginLeft", right: "marginRight",
} as const;

export function BuilderProvider({
  pageId, pageDbId, defaultLayout, defaultMeasures = [], children, apiBase = "/api/builder-pages",
  dataApiBase = "/api/v6/endpoint-datasets",
  measuresApiBase = "/api/v6/measures",
}: { pageId: string; pageDbId: number; defaultLayout: Widget[]; defaultMeasures?: MeasureDefinition[]; children: ReactNode; apiBase?: string; dataApiBase?: string; measuresApiBase?: string }) {
  const [mode, setMode] = useState<Mode>("view");
  const [widgets, setWidgets] = useState<Widget[]>(defaultLayout);
  const [measures, setMeasures] = useState<MeasureDefinition[]>(defaultMeasures);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedHash, setSavedHash] = useState<string>(JSON.stringify(defaultLayout));
  const [tableSel, setTableSel] = useState<Record<string, string[]>>({});
  const [tableCursor, setTableCursor] = useState<Record<string, [number, number] | null>>({});
  const [tableClipboard, setTableClipboard] = useState<Partial<TableCell>[][] | null>(null);
  const pastRef = useRef<Widget[][]>([]);
  const futureRef = useRef<Widget[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [colWidthPx, setColWidthPx] = useState(40);

  // ─── shared endpoint datasets ───
  const [datasets, setDatasets] = useState<EndpointDataset[]>([]);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const loadDatasets = useCallback(
    () => fetchEndpointDatasets(undefined, dataApiBase),
    [dataApiBase],
  );
  const refreshDatasets = useCallback(() => {
    setDatasetsLoading(true);
    loadDatasets()
      .then(setDatasets)
      .catch(() => { /* keep last known datasets */ })
      .finally(() => setDatasetsLoading(false));
  }, [loadDatasets]);

  useEffect(() => {
    let cancelled = false;
    loadDatasets()
      .then((next) => { if (!cancelled) setDatasets(next); })
      .catch(() => { /* keep last known datasets */ });
    const timer = setInterval(() => {
      loadDatasets().then(setDatasets).catch(() => { /* keep last known datasets */ });
    }, 50_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [loadDatasets]);

  const tableDefs = useMemo(() => buildTables(datasets), [datasets]);

  // ─── shared measure library (global, live on every page) ───
  const [sharedMeasures, setSharedMeasures] = useState<MeasureDefinition[]>([]);
  const [measuresLoading, setMeasuresLoading] = useState(false);
  const fetchSharedMeasures = useCallback(
    () =>
      fetch(measuresApiBase, {
        credentials: "include",
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
        .then((data) => (Array.isArray(data?.measures) ? data.measures : []) as MeasureDefinition[]),
    [measuresApiBase],
  );

  const refreshSharedMeasures = useCallback(() => {
    setMeasuresLoading(true);
    fetchSharedMeasures()
      .then(setSharedMeasures)
      .catch(() => { /* keep last known library */ })
      .finally(() => setMeasuresLoading(false));
  }, [fetchSharedMeasures]);

  useEffect(() => {
    let cancelled = false;
    fetchSharedMeasures()
      .then((next) => { if (!cancelled) setSharedMeasures(next); })
      .catch(() => { /* keep last known library */ });
    return () => { cancelled = true; };
  }, [fetchSharedMeasures]);

  const saveSharedMeasure = useCallback(async (measure: MeasureDefinition) => {
    const existing = sharedMeasures.find((m) => m.name === measure.name);
    try {
      const res = await fetch(existing?.id ? `${measuresApiBase}/${existing.id}` : measuresApiBase, {
        method: existing?.id ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({
          name: measure.name,
          expression: measure.expression,
          description: measure.description ?? "",
          category: measure.category ?? "",
        }),
      });
      if (!res.ok) return false;
      refreshSharedMeasures();
      return true;
    } catch {
      return false;
    }
  }, [sharedMeasures, measuresApiBase, refreshSharedMeasures]);

  const removeSharedMeasure = useCallback(async (name: string) => {
    const existing = sharedMeasures.find((m) => m.name === name);
    if (!existing?.id) return false;
    try {
      const res = await fetch(`${measuresApiBase}/${existing.id}`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest", "X-XSRF-TOKEN": getCsrfToken() },
      });
      if (!res.ok) return false;
      refreshSharedMeasures();
      return true;
    } catch {
      return false;
    }
  }, [sharedMeasures, measuresApiBase, refreshSharedMeasures]);

  /** Widget resolution order: local page measures override shared ones with the same name. */
  const allMeasures = useMemo(() => {
    const localNames = new Set(measures.map((m) => m.name));
    return [...sharedMeasures.filter((m) => !localNames.has(m.name)), ...measures];
  }, [sharedMeasures, measures]);

  const rowsBySlug = useMemo(() => {
    const out: Record<string, Row[]> = {};
    for (const d of datasets) out[d.slug] = (d.sample_data ?? []).filter((r): r is Row => !!r && typeof r === "object");
    return out;
  }, [datasets]);

  const columnsBySlug = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const d of datasets) out[d.slug] = (d.columns ?? []).map((c) => c.name);
    return out;
  }, [datasets]);

  // ─── global filters (slicers + date ranges) ───
  const [slicerSelections, setSlicerSelections] = useState<Record<string, string[]>>({});
  const [slicerDateRanges, setSlicerDateRanges] = useState<Record<string, { from?: string; to?: string; preset?: string }>>({});
  const [slicerTopN, setSlicerTopN] = useState<Record<string, { axis: string; value: string; n: number; enabled: boolean }>>({});

  const filteredRowsBySlug = useMemo(() => {
    const out: Record<string, Row[]> = {};
    for (const slug of Object.keys(rowsBySlug)) out[slug] = [...rowsBySlug[slug]];
    for (const w of widgets) {
      if (!SLICER_TYPES.includes(w.type)) continue;
      const cfg = w.config;
      if (!cfg.datasetSlug || !cfg.dataAxis) continue;
      const col = cfg.dataAxis;
      const targets = Object.keys(out).filter((slug) => columnsBySlug[slug]?.includes(col));
      if (!targets.length) continue;
      if (w.type === "dateSlicer") {
        const range = slicerDateRanges[w.id];
        const from = range?.from;
        const to = range?.to;
        if (!from && !to) continue;
        // Invalid range (from > to) must never blank the page — skip it.
        if (!validateDateRange(from, to)) continue;
        for (const slug of targets) {
          out[slug] = out[slug].filter((row) => {
            const val = String(row[col] ?? "").slice(0, 10);
            if (from && val < from) return false;
            if (to && val > to) return false;
            return true;
          });
        }
      } else if (cfg.slicerMode === "topN") {
        const topn = slicerTopN[w.id];
        const vcol = cfg.dataValue;
        const n = Math.max(1, topn?.n ?? cfg.maxCategories ?? 10);
        if (!topn?.enabled) continue;
        for (const slug of targets) {
          if (vcol && !columnsBySlug[slug]?.includes(vcol)) continue;
          const keep = topNValues(out[slug], col, vcol, n);
          if (keep.size) out[slug] = out[slug].filter((row) => keep.has(String(row[col] ?? "(vide)")));
        }
      } else {
        const sel = slicerSelections[w.id];
        if (!sel?.length) continue;
        const selSet = new Set(sel);
        for (const slug of targets) {
          out[slug] = out[slug].filter((row) => selSet.has(String(row[col] ?? "")));
        }
      }
    }
    return out;
  }, [rowsBySlug, columnsBySlug, widgets, slicerSelections, slicerDateRanges, slicerTopN]);

  // ─── cross-filter (click a chart → others filter) ───
  const [crossFilter, setCrossFilter] = useState<{ sourceId: string; column: string; value: string; mode: "filter" | "highlight" } | null>(null);
  const applyCrossFilter = useCallback((sourceId: string, column: string, value: string, mode: "filter" | "highlight") => {
    setCrossFilter((cur) =>
      cur && cur.sourceId === sourceId && cur.column === column && cur.value === value
        ? null
        : { sourceId, column, value, mode },
    );
  }, []);
  const clearCrossFilter = useCallback(() => setCrossFilter(null), []);
  const clearAllFilters = useCallback(() => {
    setSlicerSelections({});
    setSlicerDateRanges({});
    setSlicerTopN({});
    setCrossFilter(null);
  }, []);

  // Wrapper that tracks history before every widget mutation
  const trackWidgets = useCallback((updater: (prev: Widget[]) => Widget[]) => {
    setWidgets((prev) => {
      pastRef.current = [...pastRef.current.slice(-99), prev]; // keep last 100
      futureRef.current = [];
      setCanUndo(pastRef.current.length > 0);
      setCanRedo(futureRef.current.length > 0);
      return updater(prev);
    });
  }, []);

  const pushMargin = useCallback<Ctx["pushMargin"]>((id, side, newValuePx) => {
    trackWidgets((prev) => {
      const w = prev.find((x) => x.id === id);
      if (!w) return prev;
      const key = MARGIN_KEY[side];
      const oldValuePx = (w.config[key] as number | undefined) ?? 0;
      const deltaPx = newValuePx - oldValuePx;
      if (deltaPx === 0) return prev;
      const axis: "x" | "y" = side === "left" || side === "right" ? "x" : "y";
      const unitPx = axis === "x" ? Math.max(1, colWidthPx) : ROW_HEIGHT;
      const deltaUnits = deltaPx / unitPx;
      const moveOrigin = side === "top" || side === "left";
      const shifted = pushWidgets(prev, id, axis, deltaUnits, moveOrigin);
      logWidgetActivity("widget.config", w, { detail: { keys: [key] } }, { key: `${pageDbId}:${id}:config` });
      return shifted.map((x) => (x.id === id ? { ...x, config: { ...x.config, [key]: newValuePx } } : x));
    });
  }, [trackWidgets, colWidthPx, pageDbId]);

  const addWidget = useCallback<Ctx["addWidget"]>((type, partial) => {
    const size = DEFAULT_SIZE[type];
    // Calculate next available position: below the lowest existing widget
    const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
    const w: Widget = {
      id: uid(),
      type,
      x: partial?.x ?? 0,
      y: partial?.y ?? maxY,
      w: size.w, h: size.h,
      config: { ...DEFAULT_CONFIG_FOR[type], ...(partial?.config ?? {}) },
      ...partial,
    };
    trackWidgets((prev) => [...prev, w]);
    setSelectedId(w.id);
    logWidgetActivity("widget.add", w);
  }, [widgets, trackWidgets]);

  const updateWidget = useCallback<Ctx["updateWidget"]>((id, patch) => {
    trackWidgets((prev) => {
      const cur = prev.find((w) => w.id === id);
      const next = prev.map((w) => (w.id === id ? { ...w, ...patch } : w));
      if (!cur) return next;
      if (patch.type && patch.type !== cur.type) {
        logWidgetActivity("widget.type_change", next.find((w) => w.id === id)!, { detail: { from: cur.type, to: patch.type } });
      } else if (patch.locked !== undefined && patch.locked !== cur.locked) {
        logWidgetActivity(patch.locked ? "widget.lock" : "widget.unlock", cur);
      } else if (patch.x !== undefined && patch.x !== cur.x) {
        logWidgetActivity("widget.move", cur, { detail: { x: patch.x, y: patch.y, fromX: cur.x, fromY: cur.y } });
      } else if (patch.w !== undefined && patch.w !== cur.w) {
        logWidgetActivity("widget.resize", cur, { detail: { w: patch.w, h: patch.h, fromW: cur.w, fromH: cur.h } });
      }
      return next;
    });
  }, [trackWidgets]);

  const updateConfig = useCallback<Ctx["updateConfig"]>((id, patch) => {
    trackWidgets((prev) => {
      const cur = prev.find((w) => w.id === id);
      const next = prev.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...patch } } : w));
      if (!cur) return next;
      const changedKeys = Object.keys(patch).filter((k) => (cur.config as Record<string, unknown>)[k] !== (patch as Record<string, unknown>)[k]);
      if (changedKeys.length > 0) {
        logWidgetActivity("widget.config", next.find((w) => w.id === id)!, {
          detail: { keys: changedKeys },
        }, { key: `${pageDbId}:${id}:config` });
      }
      return next;
    });
  }, [trackWidgets, pageDbId]);

  const removeWidget = useCallback<Ctx["removeWidget"]>((id) => {
    const target = widgets.find((w) => w.id === id);
    trackWidgets((prev) => prev.filter((w) => w.id !== id));
    setSelectedId((s) => (s === id ? null : s));
    if (target) logWidgetActivity("widget.delete", target);
  }, [widgets, trackWidgets]);

  const duplicateWidget = useCallback<Ctx["duplicateWidget"]>((id) => {
    trackWidgets((prev) => {
      const src = prev.find((w) => w.id === id);
      if (!src) return prev;
      const copy: Widget = { ...src, id: uid(), x: src.x, y: src.y + src.h, config: JSON.parse(JSON.stringify(src.config)) };
      logWidgetActivity("widget.duplicate", copy);
      return [...prev, copy];
    });
  }, [trackWidgets]);

  const toggleLock = useCallback<Ctx["toggleLock"]>((id) => {
    trackWidgets((prev) => {
      const cur = prev.find((w) => w.id === id);
      if (!cur) return prev;
      const next = prev.map((w) => (w.id === id ? { ...w, locked: !w.locked } : w));
      logWidgetActivity(next.find((w) => w.id === id)!.locked ? "widget.lock" : "widget.unlock", next.find((w) => w.id === id)!);
      return next;
    });
  }, [trackWidgets]);

  const moveZ = useCallback<Ctx["moveZ"]>((id, dir) => {
    trackWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const [w] = next.splice(idx, 1);
      if (dir === "front") next.push(w); else next.unshift(w);
      logWidgetActivity(dir === "front" ? "widget.z_front" : "widget.z_back", w);
      return next;
    });
  }, [trackWidgets]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!pageDbId) return false;
    const payload = { layout: { version: 2, widgets, measures } };
    try {
      const res = await fetch(`${apiBase}/${pageDbId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return false;
      setSavedHash(JSON.stringify(widgets));
      return true;
    } catch {
      return false;
    }
  }, [pageDbId, widgets, measures, apiBase]);

  const reset = useCallback(async (): Promise<boolean> => {
    if (!pageDbId) {
      setWidgets(defaultLayout);
      setMeasures(defaultMeasures);
      setSavedHash(JSON.stringify(defaultLayout));
      setSelectedId(null);
      pastRef.current = [];
      futureRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      return true;
    }
    try {
      const res = await fetch(`${apiBase}/${pageDbId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "X-XSRF-TOKEN": getCsrfToken(),
        },
        body: JSON.stringify({ layout: null }),
      });
      if (!res.ok) return false;
    } catch {
      return false;
    }
    setWidgets(defaultLayout);
    setMeasures(defaultMeasures);
    setSavedHash(JSON.stringify(defaultLayout));
    setSelectedId(null);
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    logActivity("layout.reset", { detail: { widgetCount: defaultLayout.length } });
    return true;
  }, [pageDbId, defaultLayout, defaultMeasures, apiBase]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, widgets];
    setWidgets(prev);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
    logActivity("undo");
  }, [widgets]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, widgets];
    setWidgets(next);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
    logActivity("redo");
  }, [widgets]);

  // canUndo and canRedo are managed via useState above

  const exportJson = useCallback(() => JSON.stringify({ pageId, version: 2, widgets, measures }, null, 2), [pageId, widgets, measures]);

  const importJson = useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw) as PageLayout;
      if (parsed?.widgets) setWidgets(parsed.widgets);
      if (Array.isArray((parsed as PageLayout & { measures?: MeasureDefinition[] })?.measures)) setMeasures((parsed as PageLayout & { measures: MeasureDefinition[] }).measures);
    } catch { /* invalid JSON, ignore */ }
  }, []);

  const selected = useMemo(() => widgets.find((w) => w.id === selectedId) ?? null, [widgets, selectedId]);
  const isDirty = useMemo(() => JSON.stringify(widgets) !== savedHash, [widgets, savedHash]);

  const addMeasure = useCallback((measure: MeasureDefinition) => {
    setMeasures((current) => current.some((item) => item.name === measure.name) ? current.map((item) => item.name === measure.name ? measure : item) : [...current, measure]);
    logActivity("measure.save", { detail: { name: measure.name } });
  }, []);
  const removeMeasure = useCallback((name: string) => {
    setMeasures((current) => current.filter((item) => item.name !== name));
    logActivity("measure.delete", { detail: { name } });
  }, []);

  const value: Ctx = {
    mode, setMode, pageId, pageDbId, widgets, selectedId,
    measures, addMeasure, removeMeasure,
    sharedMeasures, measuresLoading, refreshSharedMeasures, saveSharedMeasure, removeSharedMeasure, allMeasures,
    select: setSelectedId, selected,
    addWidget, updateWidget, updateConfig, removeWidget, duplicateWidget,
    toggleLock, moveZ,
    save, reset, exportJson, importJson,
    isDirty, tableSel, setTableSel, tableCursor, setTableCursor, tableClipboard, setTableClipboard,
    undo, redo, canUndo, canRedo,
    colWidthPx, setColWidthPx,
    pushMargin,
    datasets, tableDefs, datasetsLoading, refreshDatasets,
    rowsBySlug, filteredRowsBySlug,
    slicerSelections, setSlicerSelections,
    slicerDateRanges, setSlicerDateRanges,
    slicerTopN, setSlicerTopN,
    crossFilter, applyCrossFilter, clearCrossFilter, clearAllFilters,
  };
  return <BuilderCtx.Provider value={value}>{children}</BuilderCtx.Provider>;
}
