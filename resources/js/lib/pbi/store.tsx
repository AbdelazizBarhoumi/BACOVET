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
import {
    createMeasure as apiCreateMeasure,
    deleteMeasure as apiDeleteMeasure,
    fetchMeasures,
    updateMeasure as apiUpdateMeasure,
    type MeasureRecord,
} from '@/services/measureApi';
import {
    applyFilter,
    relativeDateRange,
    type FilterType,
    type RelativePreset,
    type ReportFilter,
} from './filters';
import type { JoinRegistry } from './joins';
import { defaultGaugeStyle } from './model';
import {
    PAGE_PRESETS,
    conditionalFormatFromFx,
    fieldType,
    findTableForField,
    hasColumn,
    isMeasure,
    measureColumnRefs,
    normalizeConditionalFormat,
    normalizeWellField,
    registerMeasure,
    setTables,
    unregisterMeasure,
    visualTable,
    type Agg,
    type AnalyticsLine,
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
} from './model';
import { DEFAULT_SHAPE_FILL, SHAPES, type ShapeKind } from './shapes';
import { type ReportTheme } from './themes';

export type WellName =
    | 'axis'
    | 'legend'
    | 'values'
    | 'tooltips'
    | 'smallMultiples'
    | 'drillFields'
    | 'minimum'
    | 'maximum'
    | 'target';

export function defaultDropWell(type: VisualType): WellName {
    return [
        'slicer',
        'buttonSlicer',
        'dropdownSlicer',
        'inputSlicer',
        'dateSlicer',
    ].includes(type)
        ? 'axis'
        : 'values';
}

function isSlicerType(type: VisualType): boolean {
    return [
        'slicer',
        'buttonSlicer',
        'dropdownSlicer',
        'inputSlicer',
        'dateSlicer',
    ].includes(type);
}

/** Converts a server-side measure record into a `Field` usable by the canvas. */
function toMeasureField(record: MeasureRecord): Field {
    return {
        table: 'Measures',
        name: record.name,
        type: 'number',
        measure: true,
        expression: record.expression,
        id: record.id,
        category: record.category,
        description: record.description,
    };
}

export type { ReportFilter } from './filters';

export type Bookmark = {
    id: string;
    name: string;
    pageId: string;
    filters: ReportFilter[];
    slicerSelections: Record<string, string[]>;
    slicerDateRanges: Record<string, SlicerDateRange>;
    hidden: Record<string, boolean>;
    crossFilter: CrossFilter;
};

export type TooltipHover = {
    sourceId: string;
    column: string;
    value: string;
};

export type SlicerDateMode = 'between' | 'before' | 'after' | 'relative';

export type SlicerDateRange = {
    mode?: SlicerDateMode;
    from?: string;
    to?: string;
    relative?: RelativePreset;
};

export function slicerKey(
    table: string | undefined,
    column: string,
    value: string,
) {
    return JSON.stringify([table ?? '', column, value]);
}

function parseSlicerKey(
    key: string,
): { table: string; column: string; value: string } | null {
    try {
        const parsed: unknown = JSON.parse(key);
        if (Array.isArray(parsed) && parsed.length === 3)
            return {
                table: String(parsed[0]),
                column: String(parsed[1]),
                value: String(parsed[2]),
            };
    } catch {
        const separator = key.indexOf('::');
        if (separator >= 0)
            return {
                table: '',
                column: key.slice(0, separator),
                value: key.slice(separator + 2),
            };
    }
    return null;
}

export type PaneName =
    | 'filters'
    | 'visualizations'
    | 'data'
    | 'selection'
    | 'bookmarks'
    | 'syncSlicers'
    | 'analytics'
    | 'themes';

export type State = {
    pages: Page[];
    activePageId: string;
    selectedId: string | null;
    filters: ReportFilter[];
    slicerSelections: Record<string, string[]>;
    slicerDateRanges: Record<string, SlicerDateRange>;
    /** slicer id -> synced page ids */
    slicerSync: Record<string, string[]>;
    crossFilter: CrossFilter;
    /** sourceId -> targetId -> behaviour */
    interactions: Record<string, Record<string, Interaction>>;
    /** behaviour applied to any source/target pair without an explicit rule */
    defaultInteraction: Interaction;
    /** live hovered point for tooltip pages */
    tooltipHover: TooltipHover | null;
    editInteractions: boolean;
    bookmarks: Bookmark[];
    theme: string;
    /** user-saved themes persisted alongside the layout */
    customThemes: ReportTheme[];
    showGridlines: boolean;
    snapToGrid: boolean;
    zoom: number;
    mobileView: boolean;
    ribbonTab: string;
    openPanes: Record<PaneName, boolean>;
    drillthrough: { pageId: string; column: string; value: string } | null;
    /** user-defined DAX measures created in the formula bar */
    measures: Field[];
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

export function wf(
    name: unknown,
    table?: string,
    agg: Agg = 'sum',
    label?: string,
): WellField {
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

const WELL_KEYS = [
    'axis',
    'legend',
    'values',
    'tooltips',
    'smallMultiples',
    'drillFields',
    'minimum',
    'maximum',
    'target',
] as const;

/** Field keys of a visual that can carry measure fields. */
function visualMeasureFields(visual: Visual): WellField[] {
    return WELL_KEYS.flatMap((key) => {
        const value = (visual as Record<string, unknown>)[key];
        return Array.isArray(value) ? (value as WellField[]) : [];
    });
}

/**
 * The dataset a visual should read its rows from. For visuals whose wells
 * reference only measures, falls back to the first table referenced by the
 * bound measure expressions instead of the first endpoint dataset.
 */
export function visualDataTable(
    visual: Visual,
    measures: { name: string; expression?: string }[],
): string {
    const primary = visualTable(visual);
    if (primary && primary !== 'Measures') return primary;

    const bound = new Set(
        visualMeasureFields(visual)
            .filter((f) => f.table === 'Measures' || isMeasure(f.name))
            .map((f) => f.name),
    );
    for (const m of measures) {
        if (!bound.has(m.name) || !m.expression) continue;
        for (const ref of measureColumnRefs(m.expression)) {
            const table = ref.table || findTableForField(ref.column);
            if (table && table !== 'Measures') return table;
        }
    }
    return primary;
}

function normalizeState(state: State): State {
    const wells = [
        'axis',
        'legend',
        'values',
        'tooltips',
        'smallMultiples',
        'drillFields',
        'minimum',
        'maximum',
        'target',
    ] as const;
    const visuals = state.pages.flatMap((page) => page.visuals);
    const slicerSelections = Object.fromEntries(
        Object.entries(state.slicerSelections ?? {}).map(
            ([visualId, selections]) => {
                const table = visuals.find((visual) => visual.id === visualId)
                    ?.axis[0]?.table;
                return [
                    visualId,
                    selections.map((selection) => {
                        const parsed = parseSlicerKey(selection);
                        return parsed
                            ? slicerKey(
                                  parsed.table || table,
                                  parsed.column,
                                  parsed.value,
                              )
                            : selection;
                    }),
                ];
            },
        ),
    );
    return {
        ...state,
        // Cross-filters and tooltip hover state are transient interactions;
        // persisting them can reopen a report with every slicer filtered out.
        crossFilter: null,
        tooltipHover: null,
        defaultInteraction:
            state.defaultInteraction === 'filter' ||
            state.defaultInteraction === 'none'
                ? state.defaultInteraction
                : 'highlight',
        slicerDateRanges: state.slicerDateRanges ?? {},
        measures: state.measures ?? [],
        theme: state.theme ?? 'default',
        customThemes: Array.isArray(state.customThemes)
            ? state.customThemes
            : [],
        filters: (state.filters ?? []).map((f) => ({
            ...f,
            type: f.type ?? 'list',
        })),
        slicerSelections,
        pages: state.pages.map((page) => ({
            ...page,
            visuals: page.visuals.map((visual) => {
                const next = { ...visual };
                if ((next as { type: string }).type === 'listSlicer')
                    next.type = 'slicer';
                if ((next as { type: string }).type === 'kpi')
                    next.type = 'card';
                if (
                    next.maxCategories === undefined ||
                    next.maxCategories === null
                )
                    next.maxCategories = 200;
                if (next.fontSize === undefined || next.fontSize === null)
                    next.fontSize = 10;
                next.title = next.title ?? '';
                next.altText = next.altText ?? '';
                if (
                    next.colorIndex === undefined ||
                    next.colorIndex === null ||
                    !Number.isFinite(next.colorIndex)
                )
                    next.colorIndex = 0;
                const normalizedCf = normalizeConditionalFormat(
                    visual.conditionalFormat,
                );
                if (normalizedCf.style === 'none') {
                    const migrated = conditionalFormatFromFx(next.callout?.fx);
                    next.conditionalFormat = migrated ?? normalizedCf;
                } else {
                    next.conditionalFormat = normalizedCf;
                }
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
        minimum: [],
        maximum: [],
        target: [],
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
        maxCategories: 200,
        rotation: 0,
        ...(CARTESIAN_TYPES.includes(type) ? cartesianStyleDefaults() : {}),
        ...(type === 'gauge' ? gaugeStyleDefaults() : {}),
        ...init,
    };
}

const CARTESIAN_TYPES: VisualType[] = [
    'column',
    'stackedColumn',
    'stacked100Column',
    'bar',
    'stackedBar',
    'stacked100Bar',
];

/** Default cartesian style blocks for new bar/column visuals. */
function cartesianStyleDefaults(): Partial<Visual> {
    return {
        xAxis: {
            show: true,
            title: '',
            displayUnits: 'auto',
        },
        yAxis: {
            show: true,
            title: '',
            displayUnits: 'auto',
        },
        gridlines: {
            horizontal: true,
            vertical: false,
            color: 'var(--border)',
            style: 'solid',
        },
        bars: {
            applyTo: 'all',
            categoryColors: {},
            transparency: 0,
        },
        dataLabels: {
            show: false,
            applyTo: 'all',
            position: 'auto',
            displayUnits: 'auto',
            decimals: 1,
        },
        legendStyle: {
            show: true,
            position: 'top',
            font: { fontSize: 10 },
        },
        plotArea: {
            border: false,
            borderWidth: 1,
        },
    };
}

/** Default gauge style block for new gauge visuals. */
function gaugeStyleDefaults(): Partial<Visual> {
    return {
        gauge: defaultGaugeStyle(),
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
    slicerDateRanges: {},
    slicerSync: {},
    crossFilter: null,
    interactions: {},
    defaultInteraction: 'highlight',
    tooltipHover: null,
    editInteractions: false,
    bookmarks: [],
    theme: 'default',
    customThemes: [],
    showGridlines: true,
    snapToGrid: true,
    zoom: 100,
    mobileView: false,
    ribbonTab: 'Insert',
    openPanes: {
        filters: true,
        visualizations: true,
        data: true,
        selection: false,
        bookmarks: false,
        syncSlicers: false,
        analytics: false,
        themes: false,
    },
    drillthrough: null,
    measures: [],
});

/**
 * Fields whose changes are tracked by undo/redo. Transient view state
 * (selection, zoom, panes, ribbon, cross-filter, drillthrough, hover) and
 * navigation (activePageId) are deliberately excluded so Ctrl+Z only steps
 * through content edits. Measures are shared with the server-side library but
 * are included on purpose so measure edits are also undoable locally.
 */
const HISTORY_KEYS = [
    'pages',
    'filters',
    'slicerSelections',
    'slicerDateRanges',
    'slicerSync',
    'interactions',
    'defaultInteraction',
    'bookmarks',
    'theme',
    'customThemes',
    'showGridlines',
    'snapToGrid',
    'measures',
] as const;

type HistoryEntry = Pick<State, (typeof HISTORY_KEYS)[number]>;

const HISTORY_LIMIT = 100;

/** Continuous gestures on the same visual (drag/resize) coalesce within this window. */
const GESTURE_WINDOW_MS = 1200;

function historySubset(state: State): HistoryEntry {
    return {
        pages: state.pages,
        filters: state.filters,
        slicerSelections: state.slicerSelections,
        slicerDateRanges: state.slicerDateRanges,
        slicerSync: state.slicerSync,
        interactions: state.interactions,
        defaultInteraction: state.defaultInteraction,
        bookmarks: state.bookmarks,
        theme: state.theme,
        customThemes: state.customThemes,
        showGridlines: state.showGridlines,
        snapToGrid: state.snapToGrid,
        measures: state.measures,
    };
}

function historyChanged(a: State, b: State): boolean {
    for (const key of HISTORY_KEYS) {
        if (a[key] !== b[key]) return true;
    }
    return false;
}

/**
 * Returns the id of the single visual that changed between two states, or
 * null when the change is structural (visual added/removed, page change, …)
 * or touches several visuals. Used to coalesce drag/resize gestures.
 */
function singleChangedVisual(a: State, b: State): string | null {
    if (a.pages === b.pages) return null;
    if (a.pages.length !== b.pages.length) return null;
    let result: string | null = null;
    for (let i = 0; i < a.pages.length; i++) {
        const pa = a.pages[i]!;
        const pb = b.pages[i]!;
        if (pa === pb) continue;
        if (pa.visuals === pb.visuals) continue;
        if (pa.visuals.length !== pb.visuals.length) return null;
        for (let j = 0; j < pa.visuals.length; j++) {
            const va = pa.visuals[j]!;
            const vb = pb.visuals[j]!;
            if (va === vb) continue;
            if (result !== null && result !== va.id) return null;
            result = va.id;
        }
    }
    return result;
}

/**
 * Keep the aggregation engine's measure registry in line with the state that
 * undo/redo restored: register new/changed expressions, drop removed ones.
 */
function syncMeasureRegistry(prev: Field[], next: Field[]) {
    const prevByName = new Map(prev.map((m) => [m.name, m.expression]));
    const nextByName = new Map(next.map((m) => [m.name, m.expression]));
    for (const [name, expression] of nextByName) {
        if (prevByName.get(name) !== expression)
            registerMeasure(name, expression ?? '');
    }
    for (const [name] of prevByName) {
        if (!nextByName.has(name)) unregisterMeasure(name);
    }
}

type Ctx = State & {
    page: Page;
    selected: Visual | null;
    rows: Row[];
    tables: TableDef[];
    tableRows: Record<string, Row[]>;
    joins: JoinRegistry;
    highlightValue: CrossFilter;
    state: State;
    setState: React.Dispatch<React.SetStateAction<State>>;
    select: (id: string | null) => void;
    addVisual: (type: VisualType) => string;
    addShape: (kind: ShapeKind) => void;
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
    toggleEditInteractions: () => void;
    addBookmark: (name: string) => void;
    applyBookmark: (id: string) => void;
    removeBookmark: (id: string) => void;
    addMeasure: (
        name: string,
        expression: string,
        category?: string | null,
        description?: string | null,
    ) => Promise<void>;
    updateMeasure: (
        id: string | number,
        name: string,
        expression: string,
        category?: string | null,
        description?: string | null,
    ) => Promise<void>;
    removeMeasure: (id: string | number) => Promise<void>;
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
}: {
    children: ReactNode;
    initialState?: State;
    onChange?: (state: State) => void;
    tables?: TableDef[];
    joins?: JoinRegistry;
}) {
    const tables = tablesProp;
    const joins = joinsProp;

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
            syncMeasureRegistry(
                current.measures ?? [],
                snapshot.measures ?? [],
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

    const updateVisual = useCallback(
        (id: string, patch: Partial<Visual>) =>
            mapVisuals((vs) =>
                vs.map((v) => {
                    if (v.id !== id) return v;
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
                        } else if (
                            !isSlicerType(next.type) &&
                            !result.values.length
                        ) {
                            const numericAxis = result.axis.find(
                                (field) =>
                                    fieldType(field.name, field.table) ===
                                    'number',
                            );
                            if (numericAxis) result.values = [numericAxis];
                        }
                    }
                    return result;
                }),
            ),
        [mapVisuals],
    );

    const addVisual = useCallback(
        (type: VisualType): string => {
            const big = type === 'card' || type === 'text' || type === 'button';
            const v = mkVisual(
                type,
                40,
                40,
                type === 'gauge' ? 280 : big ? 260 : 420,
                type === 'gauge' ? 180 : big ? 130 : 260,
                {
                    title: type === 'text' ? 'Text box' : '',
                    text:
                        type === 'text'
                            ? 'Double-click to edit text'
                            : type === 'button'
                              ? 'Button'
                              : undefined,
                },
            );
            mapVisuals((vs) => [...vs, v]);
            setState((s) => ({ ...s, selectedId: v.id }));
            return v.id;
        },
        [mapVisuals, setState],
    );

    const addShape = useCallback(
        (kind: ShapeKind) => {
            const def = SHAPES[kind];
            const v = mkVisual('shape', 40, 40, def.defaultW, def.defaultH, {
                shape: kind,
                title: '',
                showTitle: false,
                background: DEFAULT_SHAPE_FILL,
                shadow: false,
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

    const interactionFor = useCallback(
        (sourceId: string, targetId: string): Interaction =>
            state.interactions[sourceId]?.[targetId] ??
            state.defaultInteraction,
        [state.interactions, state.defaultInteraction],
    );

    const value: Ctx = {
        ...state,
        measures: state.measures ?? [],
        page,
        selected,
        rows,
        tables,
        tableRows,
        joins,
        highlightValue: state.crossFilter,
        state,
        setState,
        undo,
        redo,
        canUndo,
        canRedo,
        select: (id) => setState((s) => ({ ...s, selectedId: id })),
        addVisual,
        addShape,
        updateVisual,
        removeVisual: (id) =>
            setState((s) => ({
                ...s,
                crossFilter:
                    s.crossFilter?.sourceId === id ? null : s.crossFilter,
                pages: s.pages.map((p) =>
                    p.id === s.activePageId
                        ? {
                              ...p,
                              visuals: p.visuals.filter((v) => v.id !== id),
                          }
                        : p,
                ),
            })),
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
            setState((s) => ({ ...s, activePageId: id, selectedId: null })),
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
                                  type: 'list',
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
        setFilterValues: (column, table, values) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    f.column === column && f.table === table
                        ? { ...f, values: [...values] }
                        : f,
                ),
            })),
        setFilterScope: (column, table, scope) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    f.column === column && f.table === table
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
                    (f) => !(f.column === column && f.table === table),
                ),
            })),
        setFilterType: (column, table, type) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    f.column === column && f.table === table
                        ? { ...f, type }
                        : f,
                ),
            })),
        setFilterQuery: (column, table, query) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    f.column === column && f.table === table
                        ? { ...f, type: 'search', query }
                        : f,
                ),
            })),
        setFilterRange: (column, table, from, to) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    f.column === column && f.table === table
                        ? { ...f, type: 'dateRange', from, to }
                        : f,
                ),
            })),
        setFilterRelative: (column, table, relative) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    f.column === column && f.table === table
                        ? { ...f, type: 'relativeDate', relative }
                        : f,
                ),
            })),
        setFilterTopN: (column, table, topN, topNBy) =>
            setState((s) => ({
                ...s,
                filters: s.filters.map((f) =>
                    f.column === column && f.table === table
                        ? { ...f, type: 'topN', topN, topNBy }
                        : f,
                ),
            })),
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
                            name: name || `Bookmark ${s.bookmarks.length + 1}`,
                            pageId: s.activePageId,
                            filters: s.filters.map((f) => ({
                                ...f,
                                values: [...f.values],
                            })),
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
                    filters: b.filters.map((f) => ({
                        ...f,
                        values: [...f.values],
                    })),
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
        ) => {
            const record = await apiCreateMeasure({
                name: name.trim(),
                expression: expression.trim(),
                category: category ?? null,
                description: description ?? null,
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
        ) => {
            const record = await apiUpdateMeasure(id, {
                name: name.trim(),
                expression: expression.trim(),
                category: category ?? null,
                description: description ?? null,
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
        setTheme: (theme) => setState((s) => ({ ...s, theme })),
        saveTheme: (name, palette, fontFamily) =>
            setState((s) => ({
                ...s,
                customThemes: [
                    ...s.customThemes,
                    {
                        id: uid('theme'),
                        name:
                            name.trim() || `Theme ${s.customThemes.length + 1}`,
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
