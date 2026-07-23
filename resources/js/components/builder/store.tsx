import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { PageLayout, Widget, WidgetConfig, WidgetType } from "./types";
import { makeEmptyTable, uid } from "./types";

type Mode = "view" | "edit";

type Ctx = {
  mode: Mode;
  setMode: (m: Mode) => void;
  pageId: string;
  pageDbId: number;
  widgets: Widget[];
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
  setLayoutBulk: (items: { i: string; x: number; y: number; w: number; h: number }[]) => void;
  save: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  exportJson: () => string;
  importJson: (raw: string) => void;
  isDirty: boolean;
  tableSel: Record<string, string[]>;
  setTableSel: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
};

const DEFAULT_CONFIG_FOR: Record<WidgetType, WidgetConfig> = {
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
  table: { ...STYLE_DEFAULTS, label: "Table" },
  "table-grid": { ...STYLE_DEFAULTS, label: "Tableau libre", tableGrid: makeEmptyTable(3, 4), padding: 4 },
  text: { ...STYLE_DEFAULTS, label: "Titre", text: "Texte libre", fontSize: 16, fontWeight: 700, align: "left", fg: "var(--foreground)", radius: 4 },
  image: { ...STYLE_DEFAULTS, label: "Image", imageUrl: "" },
  divider: { ...STYLE_DEFAULTS, label: "Divider", bg: "var(--border)" },
};

const DEFAULT_SIZE: Record<WidgetType, { w: number; h: number }> = {
  kpi: { w: 3, h: 3 }, gauge: { w: 3, h: 4 }, sparkline: { w: 3, h: 2 },
  line: { w: 6, h: 4 }, bar: { w: 6, h: 4 }, pareto: { w: 6, h: 5 },
  donut: { w: 3, h: 4 }, pie: { w: 4, h: 4 }, radar: { w: 5, h: 5 }, area: { w: 6, h: 4 }, combo: { w: 8, h: 5 },
  table: { w: 6, h: 5 }, "table-grid": { w: 12, h: 6 },
  text: { w: 6, h: 1 }, image: { w: 3, h: 3 }, divider: { w: 12, h: 1 },
};

export function BuilderProvider({
  pageId, pageDbId, defaultLayout, children,
}: { pageId: string; pageDbId: number; defaultLayout: Widget[]; children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("view");
  const [widgets, setWidgets] = useState<Widget[]>(defaultLayout);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedHash, setSavedHash] = useState<string>(JSON.stringify(defaultLayout));
  const [tableSel, setTableSel] = useState<Record<string, string[]>>({});
  const pastRef = useRef<Widget[][]>([]);
  const futureRef = useRef<Widget[][]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
  }, [widgets, trackWidgets]);

  const updateWidget = useCallback<Ctx["updateWidget"]>((id, patch) => {
    trackWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, [trackWidgets]);

  const updateConfig = useCallback<Ctx["updateConfig"]>((id, patch) => {
    trackWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, config: { ...w.config, ...patch } } : w)));
  }, [trackWidgets]);

  const removeWidget = useCallback<Ctx["removeWidget"]>((id) => {
    trackWidgets((prev) => prev.filter((w) => w.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  }, [trackWidgets]);

  const duplicateWidget = useCallback<Ctx["duplicateWidget"]>((id) => {
    trackWidgets((prev) => {
      const src = prev.find((w) => w.id === id);
      if (!src) return prev;
      const copy: Widget = { ...src, id: uid(), x: src.x, y: src.y + src.h, config: JSON.parse(JSON.stringify(src.config)) };
      return [...prev, copy];
    });
  }, [trackWidgets]);

  const toggleLock = useCallback<Ctx["toggleLock"]>((id) => {
    trackWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, locked: !w.locked } : w)));
  }, [trackWidgets]);

  const moveZ = useCallback<Ctx["moveZ"]>((id, dir) => {
    trackWidgets((prev) => {
      const idx = prev.findIndex((w) => w.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const [w] = next.splice(idx, 1);
      if (dir === "front") next.push(w); else next.unshift(w);
      return next;
    });
  }, [trackWidgets]);

  const setLayoutBulk = useCallback<Ctx["setLayoutBulk"]>((items) => {
    trackWidgets((prev) => prev.map((w) => {
      const it = items.find((i) => i.i === w.id);
      return it ? { ...w, x: it.x, y: it.y, w: it.w, h: it.h } : w;
    }));
  }, [trackWidgets]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!pageDbId) return false;
    const payload = { layout: { version: 1, widgets } };
    try {
      const res = await fetch(`/api/builder-pages/${pageDbId}`, {
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
  }, [pageDbId, widgets]);

  const reset = useCallback(async (): Promise<boolean> => {
    if (!pageDbId) {
      setWidgets(defaultLayout);
      setSavedHash(JSON.stringify(defaultLayout));
      setSelectedId(null);
      pastRef.current = [];
      futureRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      return true;
    }
    try {
      const res = await fetch(`/api/builder-pages/${pageDbId}`, {
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
    setSavedHash(JSON.stringify(defaultLayout));
    setSelectedId(null);
    pastRef.current = [];
    futureRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
    return true;
  }, [pageDbId, defaultLayout]);

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const prev = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, widgets];
    setWidgets(prev);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, [widgets]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, widgets];
    setWidgets(next);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, [widgets]);

  // canUndo and canRedo are managed via useState above

  const exportJson = useCallback(() => JSON.stringify({ pageId, version: 1, widgets }, null, 2), [pageId, widgets]);

  const importJson = useCallback((raw: string) => {
    try {
      const parsed = JSON.parse(raw) as PageLayout;
      if (parsed?.widgets) setWidgets(parsed.widgets);
    } catch { /* invalid JSON, ignore */ }
  }, []);

  const selected = useMemo(() => widgets.find((w) => w.id === selectedId) ?? null, [widgets, selectedId]);
  const isDirty = useMemo(() => JSON.stringify(widgets) !== savedHash, [widgets, savedHash]);

  const value: Ctx = {
    mode, setMode, pageId, pageDbId, widgets, selectedId,
    select: setSelectedId, selected,
    addWidget, updateWidget, updateConfig, removeWidget, duplicateWidget,
    toggleLock, moveZ,
    setLayoutBulk, save, reset, exportJson, importJson,
    isDirty, tableSel, setTableSel,
    undo, redo, canUndo, canRedo,
  };
  return <BuilderCtx.Provider value={value}>{children}</BuilderCtx.Provider>;
}
