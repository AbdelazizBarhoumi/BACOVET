import type { MeasureRecord } from '@/services/measureApi';
import type { ReportFilter } from '../filters';
import { isCustomFilter, type CustomFilterColumn } from '../filters';
import {
    conditionalFormatFromFx,
    normalizeConditionalFormat,
    normalizeWellField,
    registerMeasure,
    unregisterMeasure,
    type CrossFilter,
    type Field,
    type Interaction,
    type Page,
    type TableDef,
    type WellField,
} from '../model';
import type { ReportTheme } from '../themes';
import type { PaneName, SlicerDateRange } from './consts';
import { defaultVisuals, mkPage } from './helpers';

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

export type { SlicerDateMode, SlicerDateRange } from './consts';

export function slicerKey(
    table: string | undefined,
    column: string,
    value: string,
) {
    return JSON.stringify([table ?? '', column, value]);
}

export function parseSlicerKey(
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

export function filterMatches(
    f: ReportFilter,
    column: string,
    table: string | undefined,
): boolean {
    if (isCustomFilter(f)) {
        return table === undefined && (f.label ?? f.column) === column;
    }
    return f.column === column && f.table === table;
}

function cloneCustomColumns(
    columns: CustomFilterColumn[] | undefined,
): CustomFilterColumn[] | undefined {
    if (!columns) return undefined;
    return columns.map((column) => ({
        table: column.table,
        column: column.column,
        values: Array.isArray(column.values) ? [...column.values] : [],
    }));
}

export function cloneReportFilter(f: ReportFilter): ReportFilter {
    return {
        ...f,
        values: [...f.values],
        ...(isCustomFilter(f)
            ? { columns: cloneCustomColumns(f.columns) }
            : {}),
    };
}

export type State = {
    pages: Page[];
    activePageId: string;
    /** primary selection id (last of selectedIds) */
    selectedId: string | null;
    /** ordered multi-selection; last entry is the primary selection */
    selectedIds: string[];
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
    fullscreen: boolean;
    ribbonTab: string;
    openPanes: Record<PaneName, boolean>;
    drillthrough: { pageId: string; column: string; value: string } | null;
    /** user-defined DAX measures created in the formula bar */
    measures: Field[];
};

export function normalizeState(state: State): State {
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
        fullscreen: state.fullscreen ?? false,
        theme: state.theme ?? 'default',
        customThemes: Array.isArray(state.customThemes)
            ? state.customThemes
            : [],
        filters: (state.filters ?? []).map((f) => {
            if (isCustomFilter(f)) {
                const label = (f.label || f.column || 'Custom filter').trim();
                const seen = new Set<string>();
                const columns = (f.columns ?? [])
                    .filter((c) => c.table && c.column)
                    .filter((c) => {
                        const key = `${c.table}\u0000${c.column}`;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    })
                    .map((c) => ({
                        table: c.table,
                        column: c.column,
                        values: Array.isArray(c.values) ? c.values : [],
                    }));
                return {
                    ...f,
                    kind: 'custom' as const,
                    column: f.column || label,
                    label,
                    table: undefined,
                    type:
                        f.type === 'dropdown' || f.type === 'search'
                            ? f.type
                            : 'list',
                    columns,
                    values: [],
                };
            }
            return {
                ...f,
                type: f.type ?? 'list',
            };
        }),
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

export const defaultState = (tables: TableDef[] = []): State => ({
    pages: [
        mkPage('p1', 'Vue d’ensemble', defaultVisuals(tables)),
        mkPage('p2', 'Détail'),
    ],
    activePageId: 'p1',
    selectedId: null,
    selectedIds: [],
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
    fullscreen: false,
    ribbonTab: 'Insertion',
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

export const HISTORY_LIMIT = 100;

/** Continuous gestures on the same visual (drag/resize) coalesce within this window. */
export const GESTURE_WINDOW_MS = 1200;

export function historySubset(state: State): HistoryEntry {
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

export function historyChanged(a: State, b: State): boolean {
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
export function singleChangedVisual(a: State, b: State): string | null {
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
export function syncMeasureRegistry(prev: Field[], next: Field[]) {
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

/** Converts a server-side measure record into a `Field` usable by the canvas. */
export function toMeasureField(record: MeasureRecord): Field {
    return {
        table: 'Measures',
        name: record.name,
        type: 'number',
        measure: true,
        expression: record.expression,
        id: record.id,
        category: record.category,
        description: record.description,
        config: record.config ?? null,
    };
}