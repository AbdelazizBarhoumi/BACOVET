import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    PAGE_PRESETS,
    fieldType,
    findTableForField,
    hasColumn,
    isMeasure,
    normalizeWellField,
    setTables,
    type Agg,
    type AnalyticsLine,
    type CrossFilter,
    type Interaction,
    type Page,
    type PageFormat,
    type Row,
    type TableDef,
    type Visual,
    type VisualType,
    type WellField,
} from './model';

export type WellName =
    | 'axis'
    | 'legend'
    | 'values'
    | 'tooltips'
    | 'smallMultiples'
    | 'drillFields';

export function defaultDropWell(type: VisualType): WellName {
    return ['slicer', 'buttonSlicer', 'listSlicer', 'inputSlicer', 'dateSlicer'].includes(type)
        ? 'axis'
        : 'values';
}

export type ReportFilter = {
    column: string;
    values: string[];
    /** page = current page only, report = all pages */
    scope: 'page' | 'report';
    pageId?: string | undefined;
    /** dataset table the column belongs to */
    table?: string | undefined;
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

export type TooltipHover = {
    sourceId: string;
    column: string;
    value: string;
};

export type PaneName =
    | 'filters'
    | 'visualizations'
    | 'data'
    | 'selection'
    | 'bookmarks'
    | 'syncSlicers'
    | 'analytics';

export type State = {
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
    /** live hovered point for tooltip pages */
    tooltipHover: TooltipHover | null;
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
    preset: '16:9',
    width: PAGE_PRESETS[0]!.width,
    height: PAGE_PRESETS[0]!.height,
    background: 'var(--card)',
    wallpaper: 'var(--muted)',
    tooltip: false,
    hidden: false,
});

let seq = 0;
export function uid(prefix = 'v') {
    seq += 1;
    return `${prefix}${Date.now().toString(36)}${seq}`;
}

export function wf(name: unknown, table?: string, agg: Agg = 'sum', label?: string): WellField {
    const reference = normalizeWellField({ name, table, agg, label }, table);
    if (!reference) throw new Error('Invalid PBI field reference');
    const resolvedName = reference.name;
    const resolved = isMeasure(resolvedName)
        ? 'Measures'
        : (reference.table ?? findTableForField(resolvedName));
    return {
        table: resolved,
        name: resolvedName,
        agg: fieldType(resolvedName, resolved) === 'number' ? agg : 'count',
        ...(reference.label ? { label: reference.label } : {}),
    };
}

function normalizeState(state: State): State {
    const wells = ['axis', 'legend', 'values', 'tooltips', 'smallMultiples', 'drillFields'] as const;
    return {
        ...state,
        // Cross-filters and tooltip hover state are transient interactions;
        // persisting them can reopen a report with every slicer filtered out.
        crossFilter: null,
        tooltipHover: null,
        pages: state.pages.map((page) => ({
            ...page,
            visuals: page.visuals.map((visual) => {
                const next = { ...visual };
                for (const well of wells) {
                    next[well] = (visual[well] ?? [])
                        .map((field) => normalizeWellField(field))
                        .filter((field): field is WellField => field !== null)
                        .map((field) => normalizeWellField(field) as WellField);
                }
                return next;
            }),
        })),
    };
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
        title: init.title ?? '',
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
        background: 'var(--card)',
        border: true,
        shadow: false,
        altText: '',
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
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (c) => c.toUpperCase())
        .trim();
}

const defaultVisuals = (tables: TableDef[]): Visual[] => {
    const primary = tables[0];
    if (!primary) return [];
    const numCols = primary.fields.filter((f) => f.type === 'number');
    const textCols = primary.fields.filter((f) => f.type === 'text');
    const dateCols = primary.fields.filter((f) => f.type === 'date');
    const by = (textCols[0] ?? dateCols[0] ?? numCols[1])?.name;
    const val = numCols[0]?.name;

    const out: Visual[] = [];
    if (val) {
        out.push(
            mkVisual('card', 16, 16, 250, 120, {
                values: [wf(val, primary.name)],
                title: val,
                name: `Card — ${val}`,
                z: 1,
            }),
        );
    }
    out.push(
        mkVisual('card', 278, 16, 250, 120, {
            values: [wf('Row Count')],
            title: 'Row Count',
            name: 'Card — Row Count',
            z: 2,
        }),
    );
    if (by && val) {
        out.push(
            mkVisual('column', 16, 148, 512, 260, {
                axis: [wf(by, primary.name)],
                values: [wf(val, primary.name)],
                title: `${val} by ${by}`,
                name: `Column — ${val} by ${by}`,
                z: 3,
            }),
        );
        out.push(
            mkVisual('buttonSlicer', 540, 16, 460, 120, {
                axis: [wf(by, primary.name)],
                title: by,
                name: `Slicer — ${by}`,
                z: 4,
            }),
        );
        out.push(
            mkVisual('table', 540, 148, 722, 556, {
                axis: [wf(by, primary.name)],
                values: [wf(val, primary.name)],
                title: `${by} detail`,
                name: `Table — ${by} detail`,
                conditionalFormat: true,
                z: 5,
            }),
        );
    }
    return out;
};

const mkPage = (id: string, name: string, visuals: Visual[] = []): Page => ({
    id,
    name,
    visuals,
    format: defaultPageFormat(),
    mobile: {},
    tabOrder: visuals.map((v) => v.id),
});

const defaultState = (tables: TableDef[] = []): State => ({
    pages: [
        mkPage('p1', 'Overview', defaultVisuals(tables)),
        mkPage('p2', 'Detail'),
    ],
    activePageId: 'p1',
    selectedId: null,
    filters: [],
    slicerSelections: {},
    slicerSync: {},
    crossFilter: null,
    interactions: {},
    tooltipHover: null,
    editInteractions: false,
    bookmarks: [],
    theme: 'default',
    showGridlines: true,
    snapToGrid: true,
    zoom: 100,
    mobileView: false,
    ribbonTab: 'Home',
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
});

type Ctx = State & {
    page: Page;
    selected: Visual | null;
    rows: Row[];
    tables: TableDef[];
    tableRows: Record<string, Row[]>;
    highlightValue: CrossFilter;
    state: State;
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
    dropField: (
        visualId: string,
        well: WellName,
        name: unknown,
        table?: string,
    ) => void;
    removeWellField: (visualId: string, well: WellName, index: number) => void;
    setWellAgg: (
        visualId: string,
        well: WellName,
        index: number,
        agg: Agg,
    ) => void;
    toggleAnalytics: (visualId: string, kind: AnalyticsLine['kind']) => void;
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
    setTooltipHover: (hover: TooltipHover | null) => void;
    setInteraction: (
        sourceId: string,
        targetId: string,
        mode: Interaction,
    ) => void;
    interactionFor: (sourceId: string, targetId: string) => Interaction;
    addFilter: (
        column: string,
        table?: string,
        scope?: 'page' | 'report',
    ) => void;
    toggleFilterValue: (column: string, value: string, table?: string) => void;
    removeFilter: (column: string, table?: string) => void;
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

export function PbiProvider({
    children,
    initialState,
    onChange,
    tables: tablesProp = [],
}: {
    children: ReactNode;
    initialState?: State;
    onChange?: (state: State) => void;
    tables?: TableDef[];
}) {
    const tables = tablesProp;

    // Keep model helpers correct during the initial state construction too.
    setTables(tables);

    useEffect(() => {
        setTables(tables);
    }, [tables]);

    const [rawState, setRawState] = useState<State>(() =>
        initialState?.pages?.length
            ? normalizeState(JSON.parse(JSON.stringify(initialState)))
            : defaultState(tables),
    );

    const setState = useCallback<React.Dispatch<React.SetStateAction<State>>>(
        (updater) => {
            setRawState((prev) => {
                const next =
                    typeof updater === 'function' ? updater(prev) : updater;
                onChange?.(next);
                return next;
            });
        },
        [onChange],
    );

    const state = rawState;

    const page =
        state.pages.find((p) => p.id === state.activePageId) ?? state.pages[0]!;
    const selected =
        page.visuals.find((v) => v.id === state.selectedId) ?? null;

    const mapVisuals = useCallback(
        (fn: (v: Visual[]) => Visual[]) =>
            setState((s) => ({
                ...s,
                pages: s.pages.map((p) =>
                    p.id === s.activePageId
                        ? { ...p, visuals: fn(p.visuals) }
                        : p,
                ),
            })),
        [setState],
    );

    const updateVisual = useCallback(
        (id: string, patch: Partial<Visual>) =>
            mapVisuals((vs) =>
                vs.map((v) => (v.id === id ? { ...v, ...patch } : v)),
            ),
        [mapVisuals],
    );

    const addVisual = useCallback(
        (type: VisualType) => {
            const big =
                type === 'card' ||
                type === 'kpi' ||
                type === 'text' ||
                type === 'button';
            const v = mkVisual(type, 40, 40, big ? 260 : 420, big ? 130 : 260, {
                title: type === 'text' ? 'Text box' : '',
                text:
                    type === 'text'
                        ? 'Double-click to edit text'
                        : type === 'button'
                          ? 'Button'
                          : undefined,
            });
            mapVisuals((vs) => [...vs, v]);
            setState((s) => ({ ...s, selectedId: v.id }));
        },
        [mapVisuals, setState],
    );

    const dropField = useCallback(
        (visualId: string, well: WellName, name: unknown, table?: string) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const field = normalizeWellField({ name, table }, table);
                    if (!field) return v;
                    const normalized = wf(field.name, field.table, field.agg, field.label);
                    if (v[well].some((f) => f.name === normalized.name && f.table === normalized.table)) return v;
                    const next = [...v[well], normalized];
                    const single = well === 'axis' || well === 'legend';
                    return { ...v, [well]: single ? next.slice(-1) : next };
                }),
            ),
        [mapVisuals],
    );

    const tableRows = useMemo(() => {
        const map: Record<string, Row[]> = {};
        for (const t of tables) {
            let out = t.rows;
            for (const f of state.filters) {
                if (f.table && f.table !== t.name) continue;
                if (!hasColumn(t, f.column)) continue;
                if (
                    f.scope === 'page' &&
                    f.pageId &&
                    f.pageId !== state.activePageId
                )
                    continue;
                if (f.values.length)
                    out = out.filter((r) =>
                        f.values.includes(String(r[f.column])),
                    );
            }
            for (const [visualId, sel] of Object.entries(
                state.slicerSelections,
            )) {
                if (!sel.length) continue;
                const onPage = page.visuals.some((v) => v.id === visualId);
                const synced = (state.slicerSync[visualId] ?? []).includes(
                    state.activePageId,
                );
                if (!onPage && !synced) continue;
                const byCol = new Map<string, string[]>();
                for (const s of sel) {
                    const [c, v] = s.split('::');
                    if (!c || v === undefined) continue;
                    byCol.set(c, [...(byCol.get(c) ?? []), v]);
                }
                for (const [c, vals] of byCol) {
                    if (!hasColumn(t, c)) continue;
                    out = out.filter((r) => vals.includes(String(r[c])));
                }
            }
            if (
                state.drillthrough &&
                state.drillthrough.pageId === state.activePageId
            ) {
                const d = state.drillthrough;
                if (hasColumn(t, d.column))
                    out = out.filter((r) => String(r[d.column]) === d.value);
            }
            map[t.name] = out;
        }
        return map;
    }, [
        tables,
        state.filters,
        state.slicerSelections,
        state.slicerSync,
        state.activePageId,
        state.drillthrough,
        page.visuals,
    ]);

    const rows = tableRows[tables[0]?.name ?? ''] ?? [];

    const interactionFor = useCallback(
        (sourceId: string, targetId: string): Interaction =>
            state.interactions[sourceId]?.[targetId] ?? 'filter',
        [state.interactions],
    );

    const value: Ctx = {
        ...state,
        page,
        selected,
        rows,
        tables,
        tableRows,
        highlightValue: state.crossFilter,
        state,
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
                return [
                    ...vs,
                    {
                        ...v,
                        id: uid(),
                        x: v.x + 24,
                        y: v.y + 24,
                        z: zTop,
                        name: `${v.name} (copy)`,
                    },
                ];
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
            mapVisuals((vs) =>
                vs.map((v) => (v.id === id ? { ...v, hidden: !v.hidden } : v)),
            ),
        reorderVisual: (id, dir) =>
            mapVisuals((vs) => {
                const sorted = [...vs].sort((a, b) => b.z - a.z);
                const i = sorted.findIndex((v) => v.id === id);
                const j = i + dir;
                if (i < 0 || j < 0 || j >= sorted.length) return vs;
                const a = sorted[i]!;
                const b = sorted[j]!;
                return vs.map((v) =>
                    v.id === a.id
                        ? { ...v, z: b.z }
                        : v.id === b.id
                          ? { ...v, z: a.z }
                          : v,
                );
            }),
        dropField,
        removeWellField: (visualId, well, index) =>
            mapVisuals((vs) =>
                vs.map((v) =>
                    v.id === visualId
                        ? {
                              ...v,
                              [well]: v[well].filter((_, i) => i !== index),
                          }
                        : v,
                ),
            ),
        setWellAgg: (visualId, well, index, agg) =>
            mapVisuals((vs) =>
                vs.map((v) =>
                    v.id === visualId
                        ? {
                              ...v,
                              [well]: v[well].map((f, i) =>
                                  i === index ? { ...f, agg } : f,
                              ),
                          }
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
                    const next = Math.max(
                        0,
                        Math.min(v.drillFields.length - 1, v.drillLevel + dir),
                    );
                    const f = v.drillFields[next]!;
                    return { ...v, drillLevel: next, axis: [f] };
                }),
            ),
        addPage: () =>
            setState((s) => {
                const id = uid('p');
                return {
                    ...s,
                    pages: [
                        ...s.pages,
                        mkPage(id, `Page ${s.pages.length + 1}`),
                    ],
                    activePageId: id,
                    selectedId: null,
                };
            }),
        removePage: (id) =>
            setState((s) => {
                if (s.pages.length === 1) return s;
                const pages = s.pages.filter((p) => p.id !== id);
                return {
                    ...s,
                    pages,
                    activePageId: pages[0]!.id,
                    selectedId: null,
                };
            }),
        renamePage: (id, name) =>
            setState((s) => ({
                ...s,
                pages: s.pages.map((p) => (p.id === id ? { ...p, name } : p)),
            })),
        duplicatePage: (id) =>
            setState((s) => {
                const src = s.pages.find((p) => p.id === id);
                if (!src) return s;
                const nid = uid('p');
                const copy: Page = {
                    ...src,
                    id: nid,
                    name: `${src.name} (copy)`,
                    visuals: src.visuals.map((v) => ({ ...v, id: uid() })),
                };
                return {
                    ...s,
                    pages: [...s.pages, copy],
                    activePageId: nid,
                    selectedId: null,
                };
            }),
        togglePageHidden: (id) =>
            setState((s) => ({
                ...s,
                pages: s.pages.map((p) =>
                    p.id === id
                        ? {
                              ...p,
                              format: { ...p.format, hidden: !p.format.hidden },
                          }
                        : p,
                ),
            })),
        setPageFormat: (id, patch) =>
            setState((s) => ({
                ...s,
                pages: s.pages.map((p) =>
                    p.id === id
                        ? { ...p, format: { ...p.format, ...patch } }
                        : p,
                ),
            })),
        setActivePage: (id) =>
            setState((s) => ({ ...s, activePageId: id, selectedId: null })),
        toggleSlicer: (visualId, column, value) =>
            setState((s) => {
                const key = `${column}::${value}`;
                const cur = s.slicerSelections[visualId] ?? [];
                const next = cur.includes(key)
                    ? cur.filter((x) => x !== key)
                    : [...cur, key];
                return {
                    ...s,
                    slicerSelections: {
                        ...s.slicerSelections,
                        [visualId]: next,
                    },
                };
            }),
        clearSlicer: (visualId) =>
            setState((s) => ({
                ...s,
                slicerSelections: { ...s.slicerSelections, [visualId]: [] },
            })),
        setSlicerSync: (visualId, pageId) =>
            setState((s) => {
                const cur = s.slicerSync[visualId] ?? [];
                const next = cur.includes(pageId)
                    ? cur.filter((p) => p !== pageId)
                    : [...cur, pageId];
                return {
                    ...s,
                    slicerSync: { ...s.slicerSync, [visualId]: next },
                };
            }),
        applyCrossFilter: (sourceId, column, value) =>
            setState((s) => {
                const same =
                    s.crossFilter?.sourceId === sourceId &&
                    s.crossFilter.column === column &&
                    s.crossFilter.value === value;
                return {
                    ...s,
                    crossFilter: same ? null : { sourceId, column, value },
                };
            }),
        clearCrossFilter: () => setState((s) => ({ ...s, crossFilter: null })),
        setTooltipHover: (hover) =>
            setState((s) => ({ ...s, tooltipHover: hover })),
        setInteraction: (sourceId, targetId, mode) =>
            setState((s) => ({
                ...s,
                interactions: {
                    ...s.interactions,
                    [sourceId]: {
                        ...(s.interactions[sourceId] ?? {}),
                        [targetId]: mode,
                    },
                },
            })),
        interactionFor,
        addFilter: (column, table, scope = 'report') =>
            setState((s) =>
                s.filters.some((f) => f.column === column && f.table === table)
                    ? s
                    : {
                          ...s,
                          filters: [
                              ...s.filters,
                              {
                                  column,
                                  table,
                                  values: [],
                                  scope,
                                  pageId:
                                      scope === 'page'
                                          ? s.activePageId
                                          : undefined,
                              },
                          ],
                      },
            ),
        toggleFilterValue: (column, value, table) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    f.column === column && f.table === table
                        ? {
                              ...f,
                              values: f.values.includes(value)
                                  ? f.values.filter((v) => v !== value)
                                  : [...f.values, value],
                          }
                        : f,
                ),
            })),
        removeFilter: (column, table) =>
            setState((s) => ({
                ...s,
                filters: s.filters.filter(
                    (f) => !(f.column === column && f.table === table),
                ),
            })),
        addBookmark: (name) =>
            setState((s) => {
                const p = s.pages.find((x) => x.id === s.activePageId)!;
                return {
                    ...s,
                    bookmarks: [
                        ...s.bookmarks,
                        {
                            id: uid('b'),
                            name: name || `Bookmark ${s.bookmarks.length + 1}`,
                            pageId: s.activePageId,
                            filters: s.filters.map((f) => ({
                                ...f,
                                values: [...f.values],
                            })),
                            slicerSelections: JSON.parse(
                                JSON.stringify(s.slicerSelections),
                            ),
                            hidden: Object.fromEntries(
                                p.visuals.map((v) => [v.id, v.hidden]),
                            ),
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
                    filters: b.filters.map((f) => ({
                        ...f,
                        values: [...f.values],
                    })),
                    slicerSelections: JSON.parse(
                        JSON.stringify(b.slicerSelections),
                    ),
                    crossFilter: b.crossFilter,
                    pages: s.pages.map((p) =>
                        p.id === b.pageId
                            ? {
                                  ...p,
                                  visuals: p.visuals.map((v) => ({
                                      ...v,
                                      hidden: b.hidden[v.id] ?? v.hidden,
                                  })),
                              }
                            : p,
                    ),
                };
            }),
        removeBookmark: (id) =>
            setState((s) => ({
                ...s,
                bookmarks: s.bookmarks.filter((b) => b.id !== id),
            })),
        setTheme: (theme) => setState((s) => ({ ...s, theme })),
        setRibbonTab: (ribbonTab) => setState((s) => ({ ...s, ribbonTab })),
        togglePane: (p) =>
            setState((s) => ({
                ...s,
                openPanes: { ...s.openPanes, [p]: !s.openPanes[p] },
            })),
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
        clearDrillthrough: () =>
            setState((s) => ({ ...s, drillthrough: null })),
    };

    return <PbiContext.Provider value={value}>{children}</PbiContext.Provider>;
}

export function usePbi() {
    const ctx = useContext(PbiContext);
    if (!ctx) throw new Error('usePbi must be used inside PbiProvider');
    return ctx;
}
