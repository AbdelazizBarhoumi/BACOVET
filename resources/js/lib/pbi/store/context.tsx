import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { logWidgetActivity } from '@/lib/activity';
import type { JoinRecord } from '@/services/joinApi';
import {
    createMeasure as apiCreateMeasure,
    deleteMeasure as apiDeleteMeasure,
    fetchMeasures,
    updateMeasure as apiUpdateMeasure,
} from '@/services/measureApi';
import {
    applyFilter,
    applyTableRows,
    customFilterColumnsContainingValue,
    customFilterPooledValues,
    customFilterSelectedValues,
    isCustomFilter,
    normValue,
    propagateNetwork,
    relativeDateRange,
    type FilterType,
    type RelativePreset,
} from '../filters';
import { EMPTY_GRAPH, type RelationGraph } from '../graph';
import type { JoinRegistry } from '../joins';
import {
    axisPositionDefault,
    defaultAxes,
    fieldType,
    hasColumn,
    normalizeConditionalFormat,
    normalizeWellField,
    registerMeasure,
    setTables,
    unregisterMeasure,
    type Agg,
    type AnalyticsLine,
    type AxisDef,
    type ConditionalFormat,
    type CrossFilter,
    type Field,
    type Interaction,
    type Page,
    type PageFormat,
    type Row,
    type TableDef,
    type ValueAggregationMode,
    type Visual,
    type VisualType,
    type WellField,
} from '../model';
import { effectivePatchFor } from '../multiFormat';
import { DEFAULT_SHAPE_FILL, SHAPES, type ShapeKind } from '../shapes';
import type { ReportTheme } from '../themes';
import {
    CARTESIAN_TYPES,
    isSlicerType,
    type PaneName,
    type SlicerDateRange,
    type WellName,
} from './consts';
import { mkPage, mkVisual, takeZTop, uid, wf } from './helpers';
import {
    GESTURE_WINDOW_MS,
    HISTORY_LIMIT,
    cloneReportFilter,
    defaultState,
    filterMatches,
    historyChanged,
    historySubset,
    normalizeState,
    parseSlicerKey,
    singleChangedVisual,
    slicerKey,
    syncMeasureRegistry,
    toMeasureField,
    type State,
    type TooltipHover,
} from './state';

type HistoryEntry = Pick<
    State,
    | 'pages'
    | 'filters'
    | 'slicerSelections'
    | 'slicerDateRanges'
    | 'slicerSync'
    | 'interactions'
    | 'defaultInteraction'
    | 'bookmarks'
    | 'theme'
    | 'customThemes'
    | 'showGridlines'
    | 'snapToGrid'
    | 'measures'
>;

type Ctx = State & {
    page: Page;
    selected: Visual | null;
    rows: Row[];
    tables: TableDef[];
    /** Filtered table set the measure engine evaluates against. Exposed so
     *  visuals (e.g. list-measure cards) re-scope from React state on every
     *  render instead of relying on the module-global TABLES registry. */
    filteredTables: TableDef[];
    tableRows: Record<string, Row[]>;
    joins: JoinRegistry;
    graph: RelationGraph;
    /** Persisted shared cross-table joins (measure wizard / join builder). */
    sharedJoins: JoinRecord[];
    smartNetwork: boolean;
    setSmartNetworkFilter: (v: boolean) => void;
    highlightValue: CrossFilter;
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    select: (id: string | null, options?: { toggle?: boolean }) => void;
    setSelectedIds: (ids: string[]) => void;
    addVisual: (type: VisualType) => string;
    addShape: (kind: ShapeKind) => void;
    updateVisual: (id: string, patch: Partial<Visual>) => void;
    /** Single-visual update bypassing multi-selection bulk-apply (gestures,
     * image upload, rename, type switch, z-order). */
    updateVisualSingle: (id: string, patch: Partial<Visual>) => void;
    /** Adds a new independent value axis to a cartesian visual. Returns its id. */
    addValueAxis: (id: string) => string | undefined;
    /** Removes a value axis, re-binding its value fields to the primary axis. */
    removeValueAxis: (id: string, axisId: string) => void;
    /** Moves a value axis up/down in the Y-axis order (affects color order). */
    moveValueAxis: (id: string, axisId: string, dir: -1 | 1) => void;
    removeVisual: (id: string) => void;
    removeVisuals: (ids: string[]) => void;
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
    toggleField: (
        visualId: string,
        well: WellName,
        name: unknown,
        table?: string,
    ) => void;
    removeWellField: (visualId: string, well: WellName, index: number) => void;
    moveWellField: (
        visualId: string,
        fromWell: WellName,
        fromIndex: number,
        toWell: WellName,
    ) => void;
    setWellAgg: (
        visualId: string,
        well: WellName,
        index: number,
        agg: Agg,
    ) => void;
    setWellValueAgg: (
        visualId: string,
        well: WellName,
        index: number,
        mode: ValueAggregationMode,
    ) => void;
    /** Applies a partial patch to a well field (e.g. `index`, `window`). */
    patchWellField: (
        visualId: string,
        well: WellName,
        index: number,
        patch: Partial<WellField>,
    ) => void;
    toggleAnalytics: (visualId: string, kind: AnalyticsLine['kind']) => void;
    setAnalyticsValue: (
        visualId: string,
        kind: AnalyticsLine['kind'],
        value: number | undefined,
    ) => void;
    setAnalyticsValue2: (
        visualId: string,
        kind: AnalyticsLine['kind'],
        value: number | undefined,
    ) => void;
    setAnalyticsCategory: (
        visualId: string,
        kind: AnalyticsLine['kind'],
        category: string | undefined,
    ) => void;
    /** Restricts an analytics line to the given value axis ids (undefined = all). */
    setAnalyticsAxes: (
        visualId: string,
        kind: AnalyticsLine['kind'],
        axes: string[] | undefined,
    ) => void;
    /** Sets the stroke/fill color of an analytics line (undefined = default). */
    setAnalyticsColor: (
        visualId: string,
        kind: AnalyticsLine['kind'],
        color: string | undefined,
    ) => void;
    /** Sets the per-axis color override of an analytics line (undefined = fall
     * back to the line color / default). */
    setAnalyticsAxisColor: (
        visualId: string,
        kind: AnalyticsLine['kind'],
        axisId: string,
        color: string | undefined,
    ) => void;
    /** Sets a per-axis value override of an analytics line (undefined = fall
     * back to the line's own `value`). */
    setAnalyticsAxisValue: (
        visualId: string,
        kind: AnalyticsLine['kind'],
        axisId: string,
        value: number | undefined,
    ) => void;
    drill: (visualId: string, dir: -1 | 1) => void;
    addPage: () => void;
    removePage: (id: string) => void;
    renamePage: (id: string, name: string) => void;
    duplicatePage: (id: string) => void;
    togglePageHidden: (id: string) => void;
    setPageFormat: (id: string, patch: Partial<PageFormat>) => void;
    setActivePage: (id: string) => void;
    toggleSlicer: (visualId: string, column: string, value: string) => void;
    setSlicerSelection: (
        visualId: string,
        column: string,
        value: string | null,
    ) => void;
    setSlicerDateRange: (visualId: string, range: SlicerDateRange) => void;
    clearSlicer: (visualId: string) => void;
    setSlicerSync: (visualId: string, pageId: string) => void;
    applyCrossFilter: (
        sourceId: string,
        column: string,
        value: string,
        table?: string,
    ) => void;
    clearCrossFilter: () => void;
    setTooltipHover: (hover: TooltipHover | null) => void;
    setInteraction: (
        sourceId: string,
        targetId: string,
        mode: Interaction,
    ) => void;
    setDefaultInteraction: (mode: Interaction) => void;
    clearInteractions: () => void;
    interactionFor: (sourceId: string, targetId: string) => Interaction;
    addFilter: (
        column: string,
        table?: string,
        scope?: 'page' | 'report',
    ) => void;
    addCustomFilter: (
        label: string,
        columns: { table: string; column: string }[],
        scope?: 'page' | 'report',
    ) => void;
    toggleFilterValue: (column: string, value: string, table?: string) => void;
    setFilterValues: (
        column: string,
        table: string | undefined,
        values: string[],
    ) => void;
    setFilterScope: (
        column: string,
        table: string | undefined,
        scope: 'page' | 'report',
    ) => void;
    removeFilter: (column: string, table?: string) => void;
    setFilterType: (
        column: string,
        table: string | undefined,
        type: FilterType,
    ) => void;
    setFilterQuery: (
        column: string,
        table: string | undefined,
        query: string,
    ) => void;
    setFilterRange: (
        column: string,
        table: string | undefined,
        from: string | undefined,
        to: string | undefined,
    ) => void;
    setFilterRelative: (
        column: string,
        table: string | undefined,
        relative: RelativePreset,
    ) => void;
    setFilterTopN: (
        column: string,
        table: string | undefined,
        topN: number,
        topNBy: { table?: string; name: string; agg: Agg },
    ) => void;
    setCustomFilterColumns: (
        label: string,
        columns: { table: string; column: string }[],
    ) => void;
    setCustomFilterColumnValues: (
        label: string,
        table: string,
        column: string,
        values: string[],
    ) => void;
    toggleCustomFilterColumnValue: (
        label: string,
        table: string,
        column: string,
        value: string,
    ) => void;
    setCustomFilterLabel: (oldLabel: string, label: string) => void;
    toggleCustomFilterPooledValue: (label: string, value: string) => void;
    setCustomFilterPooledValue: (label: string, value: string | null) => void;
    addParameter: (entry: {
        root: string;
        name: string;
        values: string[];
        value?: string | null;
    }) => void;
    setParameterValue: (id: string, value: string | null) => void;
    removeParameter: (id: string) => void;
    toggleEditInteractions: () => void;
    addBookmark: (name: string) => void;
    applyBookmark: (id: string) => void;
    removeBookmark: (id: string) => void;
    addMeasure: (
        name: string,
        expression: string,
        category?: string | null,
        description?: string | null,
        config?: string | null,
    ) => Promise<void>;
    updateMeasure: (
        id: string | number,
        name: string,
        expression: string,
        category?: string | null,
        description?: string | null,
        config?: string | null,
    ) => Promise<void>;
    removeMeasure: (id: string | number) => Promise<void>;
    removeMeasureLocal: (name: string) => void;
    setTheme: (t: string) => void;
    saveTheme: (name: string, palette: string[], fontFamily?: string) => void;
    updateTheme: (id: string, patch: Partial<ReportTheme>) => void;
    removeTheme: (id: string) => void;
    setConditionalFormat: (
        visualId: string,
        cfg: Partial<ConditionalFormat>,
    ) => void;
    resetConditionalFormat: (visualId: string) => void;
    setRibbonTab: (t: string) => void;
    togglePane: (p: PaneName) => void;
    setZoom: (z: number) => void;
    setFullscreen: (v: boolean) => void;
    openDrillthrough: (column: string, value: string) => void;
    clearDrillthrough: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
};

const PbiContext = createContext<Ctx | null>(null);
export function PbiProvider({
    children,
    initialState,
    onChange,
    tables: tablesProp = [],
    joins: joinsProp = {},
    graph: graphProp = EMPTY_GRAPH,
    sharedJoins: sharedJoinsProp = [],
}: {
    children: ReactNode;
    initialState?: State;
    onChange?: (state: State) => void;
    tables?: TableDef[];
    joins?: JoinRegistry;
    graph?: RelationGraph;
    sharedJoins?: JoinRecord[];
}) {
    const tables = tablesProp;
    const joins = joinsProp;
    const graph = graphProp;
    const sharedJoins = sharedJoinsProp;

    // Runtime preference (default OFF): network propagation is a safe no-op
    // when nothing is reduced, so it never wipes visuals. Kept out of the
    // undo history and out of the persisted layout (see HISTORY_KEYS).
    const [smartNetwork, setSmartNetwork] = useState(false);

    // Keep model helpers correct during the initial state construction too.
    setTables(tables);

    // The authoritative table set for the measure engine is the filtered one;
    // the authoritative sync happens right after `measureTables` is derived
    // below, so the full `tables` set here is only a pre-state-construction
    // fallback. On a dataset refresh the parent re-renders with new `tables`
    // and the memo-derived sync below re-applies the active filters.

    const [rawState, setRawState] = useState<State>(() =>
        initialState?.pages?.length
            ? {
                  ...normalizeState(JSON.parse(JSON.stringify(initialState))),
                  selectedIds:
                      initialState.selectedIds ??
                      (initialState.selectedId
                          ? [initialState.selectedId]
                          : []),
              }
            : defaultState(tables),
    );

    // Latest committed state, kept synchronised so setState can compute the
    // next value at the call site. onChange is deliberately invoked OUTSIDE
    // the setRawState updater: React may execute updaters during the render
    // phase, and notifying a parent there causes an update of another
    // component during rendering (which loops).
    const rawStateRef = useRef<State>(rawState);
    useEffect(() => {
        rawStateRef.current = rawState;
    }, [rawState]);

    // Undo/redo stacks store the history-relevant subset of the state. All
    // mutations funnel through the wrapped setState below, so history is
    // recorded centrally rather than inside each action.
    const pastRef = useRef<HistoryEntry[]>([]);
    const futureRef = useRef<HistoryEntry[]>([]);
    const historyLockRef = useRef(false);
    const lastGestureRef = useRef<{ id: string; at: number } | null>(null);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);

    const applySnapshot = useCallback(
        (snapshot: HistoryEntry) => {
            historyLockRef.current = true;
            lastGestureRef.current = null;
            const current = rawStateRef.current;
            // History snapshots never carry `measures`, so `?? current.measures`
            // keeps the registry untouched on undo/redo instead of treating a
            // missing list as "every measure was removed".
            syncMeasureRegistry(
                current.measures ?? [],
                snapshot.measures ?? current.measures ?? [],
            );
            const next = { ...current, ...snapshot };
            rawStateRef.current = next;
            setRawState(next);
            onChange?.(next);
            historyLockRef.current = false;
        },
        [onChange],
    );

    const undo = useCallback(() => {
        const past = pastRef.current;
        if (!past.length) return;
        const snapshot = past[past.length - 1]!;
        pastRef.current = past.slice(0, -1);
        futureRef.current = [
            ...futureRef.current,
            historySubset(rawStateRef.current),
        ];
        setCanUndo(pastRef.current.length > 0);
        setCanRedo(true);
        applySnapshot(snapshot);
    }, [applySnapshot]);

    const redo = useCallback(() => {
        const future = futureRef.current;
        if (!future.length) return;
        const snapshot = future[future.length - 1]!;
        futureRef.current = future.slice(0, -1);
        pastRef.current = [
            ...pastRef.current,
            historySubset(rawStateRef.current),
        ].slice(-HISTORY_LIMIT);
        setCanRedo(futureRef.current.length > 0);
        setCanUndo(true);
        applySnapshot(snapshot);
    }, [applySnapshot]);

    // Emit the initial normalized state once so consumers can seed their
    // persistence baseline; the first real change is then compared against
    // this instead of being mistaken for the baseline itself.
    useEffect(() => {
        onChange?.(rawStateRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-wire persisted DAX measures into the aggregation engine after a
    // page reload (MEASURE_IMPL lives in module scope, not the layout).
    useEffect(() => {
        for (const m of rawState.measures ?? []) {
            if (m.expression) registerMeasure(m.name, m.expression);
        }
    }, [rawState.measures]);

    // Page-local measures saved before the shared library existed.
    const legacyMeasures = useRef<Field[]>(initialState?.measures ?? []);

    // Load the shared measure library from the server on mount and migrate
    // any legacy page-local measures into it once (skipping names that are
    // already in the library). Uses setRawState directly so this internal
    // sync does not mark the layout dirty.
    useEffect(() => {
        let stop = false;
        const load = async () => {
            try {
                const library = await fetchMeasures();
                if (stop) return;
                const existing = new Set(library.map((m) => m.name));
                const migrated: Field[] = [];
                for (const legacy of legacyMeasures.current) {
                    if (!legacy.expression || existing.has(legacy.name))
                        continue;
                    try {
                        const record = await apiCreateMeasure({
                            name: legacy.name.trim(),
                            expression: legacy.expression.trim(),
                            category: legacy.category ?? null,
                            description: legacy.description ?? null,
                        });
                        existing.add(record.name);
                        migrated.push(toMeasureField(record));
                    } catch {
                        // name already taken (another page imported it) or a
                        // transient failure: skip this one and continue.
                    }
                }
                if (stop) return;
                // Register into the aggregation engine BEFORE committing the
                // state. MEASURE_IMPL/LIST_MEASURE_IMPL live in module scope
                // and registerMeasure does not by itself cause a re-render, so
                // registering after setRawState would leave visuals computed for
                // a stale registry (isMeasure false => 0/empty) until some
                // unrelated re-render (edit mode, poll) happens.
                for (const m of [...library, ...migrated]) {
                    if (m.expression) registerMeasure(m.name, m.expression);
                }
                setRawState((s) => ({
                    ...s,
                    measures: [...library.map(toMeasureField), ...migrated],
                }));
            } catch {
                // Library unreachable: keep whatever page-local measures were
                // in the initial state so the report still renders.
            }
        };
        void load();
        return () => {
            stop = true;
        };
    }, []);

    const setState = useCallback<React.Dispatch<React.SetStateAction<State>>>(
        (updater) => {
            const prev = rawStateRef.current;
            const next =
                typeof updater === 'function' ? updater(prev) : updater;
            // No-op updates (e.g. mount-time tooltip cleanup that returns the
            // same state) must not notify the parent persistence logic.
            if (next === prev) return;
            if (!historyLockRef.current && historyChanged(prev, next)) {
                const now = Date.now();
                const vid = singleChangedVisual(prev, next);
                const last = lastGestureRef.current;
                // A continuous gesture on the same visual (drag/resize) is a
                // single undo step: the top snapshot already captures the
                // pre-gesture state, so keep updating its timestamp instead of
                // pushing a new entry for every mousemove.
                if (
                    vid !== null &&
                    last?.id === vid &&
                    now - last.at < GESTURE_WINDOW_MS
                ) {
                    lastGestureRef.current = { id: vid, at: now };
                } else {
                    pastRef.current = [
                        ...pastRef.current,
                        historySubset(prev),
                    ].slice(-HISTORY_LIMIT);
                    futureRef.current = [];
                    lastGestureRef.current =
                        vid !== null ? { id: vid, at: now } : null;
                    setCanUndo(true);
                    setCanRedo(false);
                }
            }
            rawStateRef.current = next;
            setRawState(next);
            onChange?.(next);
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

    /** Apply a validated/coerced patch to a single visual (geometry clamps,
     * colorIndex/maxCategories bounds, and the type-switch well migration). */
    const applyVisualPatch = (v: Visual, patch: Partial<Visual>): Visual => {
        const next = { ...patch };
        for (const key of ['x', 'y', 'w', 'h'] as const) {
            const value = next[key];
            if (value !== undefined && !Number.isFinite(value))
                delete next[key];
        }
        if (next.x !== undefined) next.x = Math.max(0, next.x);
        if (next.y !== undefined) next.y = Math.max(0, next.y);
        if (next.w !== undefined) next.w = Math.max(80, next.w);
        if (next.h !== undefined) next.h = Math.max(60, next.h);
        if (next.colorIndex !== undefined)
            next.colorIndex = Math.max(
                0,
                Math.min(7, Math.round(next.colorIndex)),
            );
        if (next.maxCategories !== undefined)
            next.maxCategories = Math.max(
                2,
                Math.min(5000, Math.round(next.maxCategories)),
            );
        const result = { ...v, ...next };
        if (next.type && next.type !== v.type) {
            if (
                isSlicerType(next.type) &&
                !result.axis.length &&
                result.values.length
            ) {
                result.axis = [result.values[0]!];
                result.values = result.values.slice(1);
            } else if (!isSlicerType(next.type) && !result.values.length) {
                const numericAxis = result.axis.find(
                    (field) => fieldType(field.name, field.table) === 'number',
                );
                if (numericAxis) result.values = [numericAxis];
            }
        }
        return result;
    };

    /** Single-visual update (drag/resize commits, image upload, rename, type
     * switch, z-order). The formatting panes instead use the multi-aware
     * `updateVisual` so a multi-selection edits every selected visual. */
    const updateVisualSingle = useCallback(
        (id: string, patch: Partial<Visual>) =>
            mapVisuals((vs) =>
                vs.map((v) => (v.id === id ? applyVisualPatch(v, patch) : v)),
            ),
        [mapVisuals],
    );

    const updateVisual = useCallback(
        (id: string, patch: Partial<Visual>) => {
            const selectedIds = state.selectedIds ?? [];
            const multi = selectedIds.length > 1 && selectedIds.includes(id);
            if (!multi) {
                updateVisualSingle(id, patch);
                return;
            }
            const anchor = page.visuals.find((v) => v.id === id);
            if (!anchor) {
                updateVisualSingle(id, patch);
                return;
            }
            const anchorType = anchor.type;
            const targets = new Set(selectedIds);
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (!targets.has(v.id)) return v;
                    const next = effectivePatchFor(patch, anchorType, v.type);
                    if (!next) return v;
                    return applyVisualPatch(v, next);
                }),
            );
        },
        [state.selectedIds, page.visuals, mapVisuals, updateVisualSingle],
    );

    const addValueAxis = useCallback(
        (visualId: string): string | undefined => {
            let created: string | undefined;
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (
                        v.id !== visualId ||
                        !CARTESIAN_TYPES.includes(v.type)
                    ) {
                        return v;
                    }
                    const axes = v.axes ?? defaultAxes();
                    const id = uid('y');
                    const next: AxisDef = {
                        id,
                        position: axisPositionDefault(
                            v.type === 'bar' || v.type === 'stackedBar',
                        ),
                        order: axes.length,
                        auto: true,
                        title: '',
                        showTitle: true,
                        showLine: true,
                        showLabels: true,
                        showGridlines: false,
                        color: '',
                        numberFormat: 'auto',
                        displayUnits: 'auto',
                    };
                    created = id;
                    return { ...v, axes: [...axes, next] };
                }),
            );
            return created;
        },
        [mapVisuals],
    );

    const removeValueAxis = useCallback(
        (visualId: string, axisId: string) => {
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const axes = v.axes ?? [];
                    const primary = axes[0];
                    if (axes.length <= 1 || !primary) return v;
                    return {
                        ...v,
                        axes: axes.filter((a) => a.id !== axisId),
                        values: v.values.map((field) =>
                            field.axisId === axisId
                                ? { ...field, axisId: primary.id }
                                : field,
                        ),
                    };
                }),
            );
        },
        [mapVisuals],
    );

    const moveValueAxis = useCallback(
        (visualId: string, axisId: string, dir: -1 | 1) => {
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const axes = v.axes ?? [];
                    const i = axes.findIndex((a) => a.id === axisId);
                    const j = i + dir;
                    if (i < 0 || j < 0 || j >= axes.length) return v;
                    const reordered = [...axes];
                    const [axis] = reordered.splice(i, 1);
                    reordered.splice(j, 0, axis!);
                    return {
                        ...v,
                        axes: reordered.map((a, index) => ({
                            ...a,
                            order: index,
                        })),
                    };
                }),
            );
        },
        [mapVisuals],
    );

    const maxVisualZ = () => {
        const s = rawStateRef.current;
        const p = s.pages.find((pg) => pg.id === s.activePageId) ?? s.pages[0];
        return p ? Math.max(0, ...p.visuals.map((v) => v.z)) : 0;
    };

    // New visuals cascade down/right so they don't stack exactly on top of the
    // previous one (they still land on top via takeZTop).
    const visualCount = useCallback(() => {
        const s = rawStateRef.current;
        const p = s.pages.find((pg) => pg.id === s.activePageId) ?? s.pages[0];
        return p ? p.visuals.length : 0;
    }, []);
    const cascadePos = useCallback(() => {
        const offset = (visualCount() % 8) * 24;
        return { x: 40 + offset, y: 40 + offset };
    }, [visualCount]);

    const addVisual = useCallback(
        (type: VisualType): string => {
            const big =
                type === 'card' ||
                type === 'text' ||
                type === 'button' ||
                type === 'clock';
            const floor = maxVisualZ();
            const { x, y } = cascadePos();
            const v = mkVisual(
                type,
                x,
                y,
                type === 'gauge' ? 280 : big ? 260 : 420,
                type === 'gauge' ? 180 : big ? 130 : 260,
                {
                    title: type === 'text' ? 'Zone de texte' : '',
                    text:
                        type === 'text'
                            ? 'Texte'
                            : type === 'button'
                              ? 'Bouton'
                              : undefined,
                    z: takeZTop(floor),
                },
            );
            mapVisuals((vs) => [...vs, v]);
            setState((s) => ({ ...s, selectedId: v.id, selectedIds: [v.id] }));
            logWidgetActivity('widget.add', {
                id: v.id,
                type: type as string,
            });
            return v.id;
        },
        [mapVisuals, setState, cascadePos],
    );

    const addShape = useCallback(
        (kind: ShapeKind) => {
            const def = SHAPES[kind];
            const { x, y } = cascadePos();
            const v = mkVisual('shape', x, y, def.defaultW, def.defaultH, {
                shape: kind,
                title: '',
                showTitle: false,
                background: DEFAULT_SHAPE_FILL,
                shadow: false,
                z: takeZTop(maxVisualZ()),
            });
            mapVisuals((vs) => [...vs, v]);
            setState((s) => ({ ...s, selectedId: v.id, selectedIds: [v.id] }));
            logWidgetActivity('widget.add', {
                id: v.id,
                type: `shape:${kind}`,
            });
        },
        [mapVisuals, setState, cascadePos],
    );

    const dropField = useCallback(
        (visualId: string, well: WellName, name: unknown, table?: string) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const field = normalizeWellField({ name, table }, table);
                    if (!field) return v;
                    const normalized = wf(
                        field.name,
                        field.table,
                        field.agg,
                        field.label,
                    );
                    if (
                        v[well].some(
                            (f) =>
                                f.name === normalized.name &&
                                f.table === normalized.table,
                        )
                    )
                        return v;
                    const next = [...v[well], normalized];
                    const single =
                        well === 'axis' ||
                        well === 'legend' ||
                        well === 'minimum' ||
                        well === 'maximum' ||
                        well === 'target';
                    return { ...v, [well]: single ? next.slice(-1) : next };
                }),
            ),
        [mapVisuals],
    );

    const toggleField = useCallback(
        (visualId: string, well: WellName, name: unknown, table?: string) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const field = normalizeWellField({ name, table }, table);
                    if (!field) return v;
                    const matches = (candidate: WellField) =>
                        candidate.name === field.name &&
                        candidate.table === field.table;
                    const present = (
                        [
                            'axis',
                            'legend',
                            'values',
                            'tooltips',
                            'smallMultiples',
                            'drillFields',
                            'minimum',
                            'maximum',
                            'target',
                        ] as WellName[]
                    ).some((wellName) => v[wellName].some(matches));
                    if (present) {
                        return {
                            ...v,
                            axis: v.axis.filter((x) => !matches(x)),
                            legend: v.legend.filter((x) => !matches(x)),
                            values: v.values.filter((x) => !matches(x)),
                            tooltips: v.tooltips.filter((x) => !matches(x)),
                            smallMultiples: v.smallMultiples.filter(
                                (x) => !matches(x),
                            ),
                            drillFields: v.drillFields.filter(
                                (x) => !matches(x),
                            ),
                            minimum: (v.minimum ?? []).filter(
                                (x) => !matches(x),
                            ),
                            maximum: (v.maximum ?? []).filter(
                                (x) => !matches(x),
                            ),
                            target: (v.target ?? []).filter((x) => !matches(x)),
                        };
                    }
                    const normalized = wf(
                        field.name,
                        field.table,
                        field.agg,
                        field.label,
                    );
                    if (v[well].some(matches)) return v;
                    const next = [...v[well], normalized];
                    const single =
                        well === 'axis' ||
                        well === 'legend' ||
                        well === 'minimum' ||
                        well === 'maximum' ||
                        well === 'target';
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
                out = applyFilter(out, f, {
                    table: t,
                    activePageId: state.activePageId,
                });
            }
            for (const [visualId, range] of Object.entries(
                state.slicerDateRanges,
            )) {
                const mode = range.mode ?? 'between';
                if (mode === 'relative') {
                    if (!range.relative) continue;
                } else if (!range.from && !range.to) continue;
                const onPage = page.visuals.some((v) => v.id === visualId);
                const synced = (state.slicerSync[visualId] ?? []).includes(
                    state.activePageId,
                );
                if (!onPage && !synced) continue;
                const slicer = state.pages
                    .flatMap((p) => p.visuals)
                    .find((v) => v.id === visualId);
                const field = slicer?.axis[0];
                if (
                    !field ||
                    (field.table && field.table !== t.name) ||
                    !hasColumn(t, field.name)
                )
                    continue;
                if (mode === 'relative') {
                    const rr = relativeDateRange(
                        range.relative ?? 'last30days',
                    );
                    out = out.filter((r) => {
                        const day = String(r[field.name] ?? '').slice(0, 10);
                        return !!day && day >= rr.from && day <= rr.to;
                    });
                } else if (mode === 'before') {
                    out = out.filter((r) => {
                        const day = String(r[field.name] ?? '').slice(0, 10);
                        return !!day && (!range.to || day <= range.to);
                    });
                } else if (mode === 'after') {
                    out = out.filter((r) => {
                        const day = String(r[field.name] ?? '').slice(0, 10);
                        return !!day && (!range.from || day >= range.from);
                    });
                } else {
                    out = out.filter((r) => {
                        const day = String(r[field.name] ?? '').slice(0, 10);
                        return (
                            !!day &&
                            (!range.from || day >= range.from) &&
                            (!range.to || day <= range.to)
                        );
                    });
                }
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
                    const parsed = parseSlicerKey(s);
                    if (!parsed || (parsed.table && parsed.table !== t.name))
                        continue;
                    byCol.set(parsed.column, [
                        ...(byCol.get(parsed.column) ?? []),
                        parsed.value,
                    ]);
                }
                for (const [c, vals] of byCol) {
                    if (!hasColumn(t, c)) continue;
                    const allowed = new Set(vals.map(normValue));
                    out = out.filter((r) => allowed.has(normValue(r[c])));
                }
            }
            if (
                state.drillthrough &&
                state.drillthrough.pageId === state.activePageId
            ) {
                const d = state.drillthrough;
                if (hasColumn(t, d.column))
                    out = out.filter(
                        (r) => normValue(r[d.column]) === normValue(d.value),
                    );
            }
            map[t.name] = out;
        }
        return propagateNetwork(tables, map, graph, smartNetwork);
    }, [
        tables,
        graph,
        smartNetwork,
        state.pages,
        state.filters,
        state.slicerSelections,
        state.slicerDateRanges,
        state.slicerSync,
        state.activePageId,
        state.drillthrough,
        page.visuals,
    ]);

    const rows = tableRows[tables[0]?.name ?? ''] ?? [];

    // Measures evaluate against the module-level TABLES registry, so feed the
    // filtered row sets back in. Derived in the render body so child visuals
    // (which render after this provider's body) always see filtered tables.
    const measureTables = useMemo(
        () => applyTableRows(tables, tableRows),
        [tables, tableRows],
    );
    setTables(measureTables);

    const interactionFor = useCallback(
        (sourceId: string, targetId: string): Interaction =>
            state.interactions[sourceId]?.[targetId] ??
            state.defaultInteraction,
        [state.interactions, state.defaultInteraction],
    );

    const removeVisuals = useCallback(
        (ids: string[]) =>
            setState((s) => {
                const removed = new Set(ids);
                const removedVisuals = (
                    s.pages.find((p) => p.id === s.activePageId)?.visuals ?? []
                ).filter((v) => removed.has(v.id));
                for (const r of removedVisuals) {
                    logWidgetActivity('widget.delete', {
                        id: r.id,
                        type: r.type ?? '',
                    });
                }
                const selectedIds = (s.selectedIds ?? []).filter(
                    (x) => !removed.has(x),
                );
                return {
                    ...s,
                    crossFilter:
                        s.crossFilter && removed.has(s.crossFilter.sourceId)
                            ? null
                            : s.crossFilter,
                    selectedId: selectedIds.length
                        ? selectedIds[selectedIds.length - 1]
                        : null,
                    selectedIds,
                    pages: s.pages.map((p) =>
                        p.id === s.activePageId
                            ? {
                                  ...p,
                                  visuals: p.visuals.filter(
                                      (v) => !removed.has(v.id),
                                  ),
                              }
                            : p,
                    ),
                };
            }),
        [setState],
    );

    const value: Ctx = {
        ...state,
        measures: state.measures ?? [],
        page,
        selected,
        rows,
        tables,
        filteredTables: measureTables,
        tableRows,
        joins,
        graph,
        sharedJoins,
        smartNetwork,
        setSmartNetworkFilter: (v) => setSmartNetwork(v),
        highlightValue: state.crossFilter,
        state,
        setState,
        undo,
        redo,
        canUndo,
        canRedo,
        select: (id, options) =>
            setState((s) => {
                if (id === null)
                    return { ...s, selectedId: null, selectedIds: [] };
                const prev = s.selectedIds ?? [];
                let next: string[];
                if (options?.toggle) {
                    next = prev.includes(id)
                        ? prev.filter((x) => x !== id)
                        : [...prev, id];
                } else if (prev.includes(id)) {
                    next = [...prev.filter((x) => x !== id), id];
                } else {
                    next = [id];
                }
                return {
                    ...s,
                    selectedIds: next,
                    selectedId: next.length ? next[next.length - 1] : null,
                };
            }),
        setSelectedIds: (ids) =>
            setState((s) => ({
                ...s,
                selectedIds: ids,
                selectedId: ids.length ? ids[ids.length - 1] : null,
            })),
        addVisual,
        addShape,
        updateVisual,
        updateVisualSingle,
        addValueAxis,
        removeValueAxis,
        moveValueAxis,
        removeVisuals,
        removeVisual: (id) => removeVisuals([id]),
        duplicateVisual: (id) =>
            mapVisuals((vs) => {
                const v = vs.find((x) => x.id === id);
                if (!v) return vs;
                const z = takeZTop(maxVisualZ());
                const copyId = uid();
                logWidgetActivity('widget.duplicate', {
                    id: copyId,
                    type: v.type ?? '',
                });
                return [
                    ...vs,
                    {
                        ...v,
                        id: copyId,
                        x: v.x + 24,
                        y: v.y + 24,
                        z: z,
                        name: `${v.name} (copie)`,
                    },
                ];
            }),
        bringForward: (id) =>
            updateVisualSingle(id, { z: takeZTop(maxVisualZ()) }),
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
        toggleField,
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
        moveWellField: (visualId, fromWell, fromIndex, toWell) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const field = v[fromWell][fromIndex];
                    if (!field) return v;
                    const source = v[fromWell].filter(
                        (_, i) => i !== fromIndex,
                    );
                    const single = toWell === 'axis' || toWell === 'legend';
                    const already = v[toWell].some(
                        (f) => f.name === field.name && f.table === field.table,
                    );
                    const target = single
                        ? [field]
                        : already
                          ? v[toWell]
                          : [...v[toWell], field];
                    return { ...v, [fromWell]: source, [toWell]: target };
                }),
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
        setWellValueAgg: (visualId, well, index, mode) =>
            mapVisuals((vs) =>
                vs.map((v) =>
                    v.id === visualId
                        ? {
                              ...v,
                              [well]: v[well].map((f, i) =>
                                  i === index
                                      ? { ...f, valueAggregation: mode }
                                      : f,
                              ),
                          }
                        : v,
                ),
            ),
        patchWellField: (visualId, well, index, patch) =>
            mapVisuals((vs) =>
                vs.map((v) =>
                    v.id === visualId
                        ? {
                              ...v,
                              [well]: v[well].map((f, i) =>
                                  i === index ? { ...f, ...patch } : f,
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
        setAnalyticsValue: (visualId, kind, value) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const exists = v.analytics.find((a) => a.kind === kind);
                    return {
                        ...v,
                        analytics: exists
                            ? v.analytics.map((a) =>
                                  a.kind === kind ? { ...a, value } : a,
                              )
                            : [...v.analytics, { kind, enabled: true, value }],
                    };
                }),
            ),
        setAnalyticsValue2: (visualId, kind, value) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const exists = v.analytics.find((a) => a.kind === kind);
                    return {
                        ...v,
                        analytics: exists
                            ? v.analytics.map((a) =>
                                  a.kind === kind ? { ...a, value2: value } : a,
                              )
                            : [
                                  ...v.analytics,
                                  { kind, enabled: true, value2: value },
                              ],
                    };
                }),
            ),
        setAnalyticsCategory: (visualId, kind, category) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const exists = v.analytics.find((a) => a.kind === kind);
                    return {
                        ...v,
                        analytics: exists
                            ? v.analytics.map((a) =>
                                  a.kind === kind ? { ...a, category } : a,
                              )
                            : [
                                  ...v.analytics,
                                  { kind, enabled: true, category },
                              ],
                    };
                }),
            ),
        setAnalyticsAxes: (visualId, kind, axes) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const exists = v.analytics.find((a) => a.kind === kind);
                    return {
                        ...v,
                        analytics: exists
                            ? v.analytics.map((a) =>
                                  a.kind === kind ? { ...a, axes } : a,
                              )
                            : [...v.analytics, { kind, enabled: true, axes }],
                    };
                }),
            ),
        setAnalyticsColor: (visualId, kind, color) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const exists = v.analytics.find((a) => a.kind === kind);
                    return {
                        ...v,
                        analytics: exists
                            ? v.analytics.map((a) =>
                                  a.kind === kind ? { ...a, color } : a,
                              )
                            : [...v.analytics, { kind, enabled: true, color }],
                    };
                }),
            ),
        setAnalyticsAxisColor: (visualId, kind, axisId, color) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const exists = v.analytics.find((a) => a.kind === kind);
                    return {
                        ...v,
                        analytics: exists
                            ? v.analytics.map((a) => {
                                  if (a.kind !== kind) return a;
                                  const axisColors = {
                                      ...(a.axisColors ?? {}),
                                  };
                                  if (color === undefined)
                                      delete axisColors[axisId];
                                  else axisColors[axisId] = color;
                                  return { ...a, axisColors };
                              })
                            : [
                                  ...v.analytics,
                                  {
                                      kind,
                                      enabled: true,
                                      ...(color === undefined
                                          ? {}
                                          : {
                                                axisColors: { [axisId]: color },
                                            }),
                                  },
                              ],
                    };
                }),
            ),
        setAnalyticsAxisValue: (visualId, kind, axisId, value) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== visualId) return v;
                    const exists = v.analytics.find((a) => a.kind === kind);
                    return {
                        ...v,
                        analytics: exists
                            ? v.analytics.map((a) => {
                                  if (a.kind !== kind) return a;
                                  const axisValues = {
                                      ...(a.axisValues ?? {}),
                                  };
                                  if (value === undefined)
                                      delete axisValues[axisId];
                                  else axisValues[axisId] = value;
                                  return { ...a, axisValues };
                              })
                            : [
                                  ...v.analytics,
                                  {
                                      kind,
                                      enabled: true,
                                      ...(value === undefined
                                          ? {}
                                          : {
                                                axisValues: { [axisId]: value },
                                            }),
                                  },
                              ],
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
                    selectedIds: [],
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
                    selectedIds: [],
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
                    name: `${src.name} (copie)`,
                    visuals: src.visuals.map((v) => ({ ...v, id: uid() })),
                };
                return {
                    ...s,
                    pages: [...s.pages, copy],
                    activePageId: nid,
                    selectedId: null,
                    selectedIds: [],
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
                        ? {
                              ...p,
                              format: {
                                  ...p.format,
                                  ...patch,
                                  ...(patch.width !== undefined &&
                                  Number.isFinite(patch.width)
                                      ? { width: Math.max(320, patch.width) }
                                      : {}),
                                  ...(patch.height !== undefined &&
                                  Number.isFinite(patch.height)
                                      ? { height: Math.max(240, patch.height) }
                                      : {}),
                              },
                          }
                        : p,
                ),
            })),
        setActivePage: (id) =>
            setState((s) => ({
                ...s,
                activePageId: id,
                selectedId: null,
                selectedIds: [],
            })),
        toggleSlicer: (visualId, column, value) =>
            setState((s) => {
                const visual = s.pages
                    .flatMap((p) => p.visuals)
                    .find((v) => v.id === visualId);
                const key = slicerKey(visual?.axis[0]?.table, column, value);
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
        setSlicerSelection: (visualId, column, value) =>
            setState((s) => {
                const visual = s.pages
                    .flatMap((p) => p.visuals)
                    .find((v) => v.id === visualId);
                const next =
                    value === null
                        ? []
                        : [slicerKey(visual?.axis[0]?.table, column, value)];
                return {
                    ...s,
                    slicerSelections: {
                        ...s.slicerSelections,
                        [visualId]: next,
                    },
                };
            }),
        setSlicerDateRange: (visualId, range) =>
            setState((s) => ({
                ...s,
                slicerDateRanges: {
                    ...s.slicerDateRanges,
                    [visualId]: range,
                },
            })),
        clearSlicer: (visualId) =>
            setState((s) => ({
                ...s,
                slicerSelections: { ...s.slicerSelections, [visualId]: [] },
                slicerDateRanges: {
                    ...s.slicerDateRanges,
                    [visualId]: {},
                },
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
        applyCrossFilter: (sourceId, column, value, table) =>
            setState((s) => {
                const same =
                    s.crossFilter?.sourceId === sourceId &&
                    s.crossFilter?.column === column &&
                    s.crossFilter?.value === value &&
                    s.crossFilter?.table === table;
                return {
                    ...s,
                    crossFilter: same
                        ? null
                        : { sourceId, column, value, table },
                };
            }),
        clearCrossFilter: () => setState((s) => ({ ...s, crossFilter: null })),
        setTooltipHover: (hover) =>
            setState((s) => {
                const cur = s.tooltipHover;
                const same =
                    (cur == null && hover == null) ||
                    (cur != null &&
                        hover != null &&
                        cur.sourceId === hover.sourceId &&
                        cur.column === hover.column &&
                        cur.value === hover.value);
                return same ? s : { ...s, tooltipHover: hover };
            }),
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
        setDefaultInteraction: (mode) =>
            setState((s) => ({ ...s, defaultInteraction: mode })),
        clearInteractions: () => setState((s) => ({ ...s, interactions: {} })),
        interactionFor,
        addFilter: (column, table, scope = 'report') =>
            setState((s) =>
                s.filters.some(
                    (f) =>
                        !isCustomFilter(f) &&
                        f.column === column &&
                        f.table === table,
                )
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
                                  type: 'list',
                                  pageId:
                                      scope === 'page'
                                          ? s.activePageId
                                          : undefined,
                              },
                          ],
                      },
            ),
        addCustomFilter: (label, columns, scope = 'report') =>
            setState((s) => {
                const cleanLabel =
                    label.trim() ||
                    `Filtre personnalisé ${s.filters.length + 1}`;
                const cleanColumns = columns.filter(
                    (c, i, arr) =>
                        c.table &&
                        c.column &&
                        arr.findIndex(
                            (x) => x.table === c.table && x.column === c.column,
                        ) === i,
                );
                if (cleanColumns.length < 2) return s;
                if (
                    s.filters.some(
                        (f) =>
                            isCustomFilter(f) &&
                            (f.label ?? f.column) === cleanLabel,
                    )
                )
                    return s;
                return {
                    ...s,
                    filters: [
                        ...s.filters,
                        {
                            kind: 'custom',
                            column: cleanLabel,
                            label: cleanLabel,
                            values: [],
                            scope,
                            type: 'list',
                            columns: cleanColumns.map((column) => ({
                                ...column,
                                values: [],
                            })),
                            pageId:
                                scope === 'page' ? s.activePageId : undefined,
                        },
                    ],
                };
            }),
        toggleFilterValue: (column, value, table) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    !isCustomFilter(f) && filterMatches(f, column, table)
                        ? {
                              ...f,
                              values: f.values.includes(value)
                                  ? f.values.filter((v) => v !== value)
                                  : [...f.values, value],
                          }
                        : f,
                ),
            })),
        setFilterValues: (column, table, values) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    !isCustomFilter(f) && filterMatches(f, column, table)
                        ? { ...f, values: [...values] }
                        : f,
                ),
            })),
        setFilterScope: (column, table, scope) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    filterMatches(f, column, table)
                        ? {
                              ...f,
                              scope,
                              pageId:
                                  scope === 'page' ? s.activePageId : undefined,
                          }
                        : f,
                ),
            })),
        removeFilter: (column, table) =>
            setState((s) => ({
                ...s,
                filters: s.filters.filter(
                    (f) => !filterMatches(f, column, table),
                ),
            })),
        addParameter: (entry) =>
            setState((s) => {
                const pageId = s.activePageId;
                const already = s.parameters.some(
                    (p) =>
                        p.pageId === pageId &&
                        p.root === entry.root &&
                        p.name === entry.name,
                );
                if (already) return s;
                return {
                    ...s,
                    parameters: [
                        ...s.parameters,
                        {
                            id: uid('param'),
                            pageId,
                            root: entry.root,
                            name: entry.name,
                            value: entry.value ?? null,
                            values: [...entry.values],
                        },
                    ],
                };
            }),
        setParameterValue: (id, value) =>
            setState((s) => ({
                ...s,
                parameters: s.parameters.map((p) =>
                    p.id === id ? { ...p, value } : p,
                ),
            })),
        removeParameter: (id) =>
            setState((s) => ({
                ...s,
                parameters: s.parameters.filter((p) => p.id !== id),
            })),
        setFilterType: (column, table, type) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    filterMatches(f, column, table) ? { ...f, type } : f,
                ),
            })),
        setFilterQuery: (column, table, query) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    filterMatches(f, column, table)
                        ? { ...f, type: 'search', query }
                        : f,
                ),
            })),
        setFilterRange: (column, table, from, to) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    filterMatches(f, column, table)
                        ? { ...f, type: 'dateRange', from, to }
                        : f,
                ),
            })),
        setFilterRelative: (column, table, relative) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    filterMatches(f, column, table)
                        ? { ...f, type: 'relativeDate', relative }
                        : f,
                ),
            })),
        setFilterTopN: (column, table, topN, topNBy) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    filterMatches(f, column, table)
                        ? { ...f, type: 'topN', topN, topNBy }
                        : f,
                ),
            })),
        setCustomFilterColumns: (label, columns) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    isCustomFilter(f) && (f.label ?? f.column) === label
                        ? {
                              ...f,
                              columns: (() => {
                                  const previous = new Map(
                                      (f.columns ?? []).map((c) => [
                                          `${c.table}\u0000${c.column}`,
                                          Array.isArray(c.values)
                                              ? c.values
                                              : [],
                                      ]),
                                  );
                                  return columns
                                      .filter(
                                          (c, i, arr) =>
                                              c.table &&
                                              c.column &&
                                              arr.findIndex(
                                                  (x) =>
                                                      x.table === c.table &&
                                                      x.column === c.column,
                                              ) === i,
                                      )
                                      .map((c) => {
                                          const key = `${c.table}\u0000${c.column}`;
                                          return {
                                              ...c,
                                              values: [
                                                  ...(previous.get(key) ?? []),
                                              ],
                                          };
                                      });
                              })(),
                              values: [],
                          }
                        : f,
                ),
            })),
        setCustomFilterColumnValues: (label, table, column, values) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    isCustomFilter(f) && (f.label ?? f.column) === label
                        ? {
                              ...f,
                              columns: (f.columns ?? []).map((c) =>
                                  c.table === table && c.column === column
                                      ? { ...c, values: [...values] }
                                      : c,
                              ),
                          }
                        : f,
                ),
            })),
        toggleCustomFilterColumnValue: (label, table, column, value) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    isCustomFilter(f) && (f.label ?? f.column) === label
                        ? {
                              ...f,
                              columns: (f.columns ?? []).map((c) => {
                                  if (
                                      c.table !== table ||
                                      c.column !== column
                                  ) {
                                      return c;
                                  }
                                  const selected = Array.isArray(c.values)
                                      ? c.values
                                      : [];
                                  return {
                                      ...c,
                                      values: selected.includes(value)
                                          ? selected.filter((v) => v !== value)
                                          : [...selected, value],
                                  };
                              }),
                          }
                        : f,
                ),
            })),
        setCustomFilterLabel: (oldLabel, label) =>
            setState((s) => {
                const nextLabel = label.trim();
                if (!nextLabel) return s;
                return {
                    ...s,
                    filters: s.filters.map((f) =>
                        isCustomFilter(f) && (f.label ?? f.column) === oldLabel
                            ? { ...f, label: nextLabel, column: nextLabel }
                            : f,
                    ),
                };
            }),
        toggleCustomFilterPooledValue: (label, value) =>
            setState((s) => {
                const target = s.filters.find(
                    (f) => isCustomFilter(f) && (f.label ?? f.column) === label,
                );
                if (!target || !isCustomFilter(target)) return s;
                // Only columns that can actually hold `value` receive it. When
                // none currently expose it but the value is part of the pooled
                // domain, fall back to every mapped column — never silently drop
                // the click, which would keep `filters` identity unchanged and
                // skip the row recompute (making the filter appear dead).
                const inPool = customFilterPooledValues(target, tables).some(
                    (v) => normValue(v) === normValue(value),
                );
                let affected = customFilterColumnsContainingValue(
                    target,
                    tables,
                    value,
                );
                if (!affected.length) {
                    if (!inPool) return s;
                    affected = (target.columns ?? []).filter(
                        (c) => c.table && c.column,
                    );
                }
                // Toggle: remove when the value is already selected anywhere in
                // the pooled selection; otherwise add. Deciding by the pooled
                // selection (instead of "every affected column holds the value")
                // makes re-clicking a selected value reliably deselect it, even
                // for partial-column selections or ghost values whose data has
                // since disappeared.
                const remove = customFilterSelectedValues(target).some(
                    (v) => normValue(v) === normValue(value),
                );
                return {
                    ...s,
                    filters: s.filters.map((f) =>
                        f === target
                            ? {
                                  ...f,
                                  columns: (f.columns ?? []).map((col) => {
                                      if (
                                          !affected.some(
                                              (c) =>
                                                  c.table === col.table &&
                                                  c.column === col.column,
                                          )
                                      )
                                          return col;
                                      const selected = Array.isArray(col.values)
                                          ? col.values
                                          : [];
                                      return {
                                          ...col,
                                          values: remove
                                              ? selected.filter(
                                                    (v) =>
                                                        normValue(v) !==
                                                        normValue(value),
                                                )
                                              : [...selected, value],
                                      };
                                  }),
                              }
                            : f,
                    ),
                };
            }),
        setCustomFilterPooledValue: (label, value) =>
            setState((s) => {
                const target = s.filters.find(
                    (f) => isCustomFilter(f) && (f.label ?? f.column) === label,
                );
                if (!target || !isCustomFilter(target)) return s;
                const affected = value
                    ? customFilterColumnsContainingValue(target, tables, value)
                    : (target.columns ?? []).filter((c) => c.table && c.column);
                const flag = new Set(
                    affected.map((c) => `${c.table}\u0000${c.column}`),
                );
                return {
                    ...s,
                    filters: s.filters.map((f) =>
                        f === target
                            ? {
                                  ...f,
                                  columns: (f.columns ?? []).map((col) => {
                                      const selected = flag.has(
                                          `${col.table}\u0000${col.column}`,
                                      );
                                      if (!value) return { ...col, values: [] };
                                      return {
                                          ...col,
                                          values: selected ? [value] : [],
                                      };
                                  }),
                              }
                            : f,
                    ),
                };
            }),
        toggleEditInteractions: () =>
            setState((s) => ({
                ...s,
                editInteractions: !s.editInteractions,
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
                            name: name || `Signet ${s.bookmarks.length + 1}`,
                            pageId: s.activePageId,
                            filters: s.filters.map(cloneReportFilter),
                            slicerSelections: JSON.parse(
                                JSON.stringify(s.slicerSelections),
                            ),
                            slicerDateRanges: JSON.parse(
                                JSON.stringify(s.slicerDateRanges),
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
                    filters: b.filters.map(cloneReportFilter),
                    slicerSelections: JSON.parse(
                        JSON.stringify(b.slicerSelections),
                    ),
                    slicerDateRanges: JSON.parse(
                        JSON.stringify(b.slicerDateRanges ?? {}),
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
        addMeasure: async (
            name,
            expression,
            category = null,
            description = null,
            config = null,
        ) => {
            const record = await apiCreateMeasure({
                name: name.trim(),
                expression: expression.trim(),
                category: category ?? null,
                description: description ?? null,
                config: config ?? null,
            });
            registerMeasure(record.name, record.expression);
            setState((s) =>
                (s.measures ?? []).some((m) => m.name === record.name)
                    ? s
                    : {
                          ...s,
                          measures: [
                              ...(s.measures ?? []),
                              toMeasureField(record),
                          ],
                      },
            );
        },
        updateMeasure: async (
            id,
            name,
            expression,
            category = null,
            description = null,
            config = null,
        ) => {
            const record = await apiUpdateMeasure(id, {
                name: name.trim(),
                expression: expression.trim(),
                category: category ?? null,
                description: description ?? null,
                config: config ?? null,
            });
            registerMeasure(record.name, record.expression);
            setState((s) => ({
                ...s,
                measures: (s.measures ?? []).map((m) =>
                    String(m.id) === String(record.id)
                        ? toMeasureField(record)
                        : m,
                ),
            }));
        },
        removeMeasure: async (id) => {
            const target = (state.measures ?? []).find(
                (m) => String(m.id) === String(id),
            );
            await apiDeleteMeasure(id);
            if (target) unregisterMeasure(target.name);
            setState((s) => ({
                ...s,
                measures: (s.measures ?? []).filter(
                    (m) => String(m.id) !== String(id),
                ),
            }));
        },
        removeMeasureLocal: (name) => {
            const target = (state.measures ?? []).find((m) => m.name === name);
            if (target) unregisterMeasure(target.name);
            setState((s) => ({
                ...s,
                measures: (s.measures ?? []).filter((m) => m.name !== name),
            }));
        },
        setTheme: (theme) => setState((s) => ({ ...s, theme })),
        saveTheme: (name, palette, fontFamily) =>
            setState((s) => ({
                ...s,
                customThemes: [
                    ...s.customThemes,
                    {
                        id: uid('theme'),
                        name:
                            name.trim() || `Thème ${s.customThemes.length + 1}`,
                        palette,
                        ...(fontFamily ? { fontFamily } : {}),
                    },
                ],
            })),
        updateTheme: (id, patch) =>
            setState((s) => ({
                ...s,
                customThemes: s.customThemes.map((t) =>
                    t.id === id ? { ...t, ...patch } : t,
                ),
            })),
        removeTheme: (id) =>
            setState((s) => ({
                ...s,
                customThemes: s.customThemes.filter((t) => t.id !== id),
                theme: s.theme === id ? 'default' : s.theme,
            })),
        setConditionalFormat: (visualId, cfg) =>
            mapVisuals((vs) =>
                vs.map((v) =>
                    v.id === visualId
                        ? {
                              ...v,
                              conditionalFormat: {
                                  ...normalizeConditionalFormat(
                                      v.conditionalFormat,
                                  ),
                                  ...cfg,
                              },
                          }
                        : v,
                ),
            ),
        resetConditionalFormat: (visualId) =>
            mapVisuals((vs) =>
                vs.map((v) =>
                    v.id === visualId ? { ...v, conditionalFormat: false } : v,
                ),
            ),
        setRibbonTab: (ribbonTab) => setState((s) => ({ ...s, ribbonTab })),
        togglePane: (p) =>
            setState((s) => ({
                ...s,
                openPanes: { ...s.openPanes, [p]: !s.openPanes[p] },
            })),
        setZoom: (zoom) => setState((s) => ({ ...s, zoom })),
        setFullscreen: (fullscreen) => setState((s) => ({ ...s, fullscreen })),
        openDrillthrough: (column, value) =>
            setState((s) => {
                const target = s.pages.find((p) => p.id !== s.activePageId);
                if (!target) return s;
                return {
                    ...s,
                    activePageId: target.id,
                    selectedId: null,
                    selectedIds: [],
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
