// Data model, dataset tables and aggregation engine for the report canvas.

export type FieldType = 'number' | 'text' | 'date' | 'boolean';

export type Field = {
    table: string;
    name: string;
    type: FieldType;
    /** true for DAX measures */
    measure?: boolean;
    expression?: string;
};

export type Row = Record<string, string | number | boolean | null>;

export type Agg = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';

export type WellField = {
    table: string;
    name: string;
    agg: Agg;
    /** Optional friendly presentation name; never used for row lookup. */
    label?: string;
};

export type FieldReference = {
    table?: string | undefined;
    name: string;
};

const AGGREGATIONS: Agg[] = ['sum', 'avg', 'count', 'distinct', 'min', 'max'];

/** Converts drag metadata and legacy persisted values into a physical field reference. */
export function parseFieldReference(input: unknown, fallbackTable?: string): FieldReference | null {
    if (typeof input === 'string') {
        const value = input.trim();
        if (!value) return null;
        try {
            const parsed: unknown = JSON.parse(value);
            if (parsed && typeof parsed === 'object')
                return parseFieldReference(parsed, fallbackTable);
        } catch {
            // A normal column name is not JSON and is valid as-is. Values
            // that look like serialized metadata but are malformed are not.
            if (value.startsWith('{') || value.startsWith('[')) return null;
        }
        return { name: value, table: fallbackTable || undefined };
    }

    if (!input || typeof input !== 'object') return null;
    const value = input as Record<string, unknown>;
    const name = parseFieldReference(value.name, fallbackTable);
    if (!name) return null;
    const table = typeof value.table === 'string' && value.table.trim()
        ? value.table.trim()
        : name.table || fallbackTable;
    return { name: name.name, table: table || undefined };
}

export function normalizeWellField(input: unknown, fallbackTable?: string): WellField | null {
    if (!input || typeof input !== 'object') {
        const reference = parseFieldReference(input, fallbackTable);
        return reference ? { table: reference.table ?? '', name: reference.name, agg: 'sum' } : null;
    }

    const value = input as Record<string, unknown>;
    const reference = parseFieldReference(value.name, typeof value.table === 'string' ? value.table : fallbackTable);
    if (!reference) return null;
    const agg = AGGREGATIONS.includes(value.agg as Agg) ? (value.agg as Agg) : 'sum';
    const label = typeof value.label === 'string' && value.label.trim() ? value.label.trim() : undefined;
    return { table: reference.table ?? '', name: reference.name, agg, ...(label ? { label } : {}) };
}

export function fieldLabel(wf: Pick<WellField, 'name' | 'label'>): string {
    return wf.label?.trim() || wf.name;
}

export type VisualType =
    | 'column'
    | 'stackedColumn'
    | 'stacked100Column'
    | 'bar'
    | 'stackedBar'
    | 'stacked100Bar'
    | 'line'
    | 'area'
    | 'stackedArea'
    | 'combo'
    | 'ribbon'
    | 'waterfall'
    | 'pie'
    | 'donut'
    | 'treemap'
    | 'funnel'
    | 'scatter'
    | 'bubble'
    | 'card'
    | 'kpi'
    | 'gauge'
    | 'table'
    | 'matrix'
    | 'slicer'
    | 'buttonSlicer'
    | 'listSlicer'
    | 'inputSlicer'
    | 'dateSlicer'
    | 'map'
    | 'filledMap'
    | 'shapeMap'
    | 'decompositionTree'
    | 'keyInfluencers'
    | 'smartNarrative'
    | 'qna'
    | 'rVisual'
    | 'pythonVisual'
    | 'text'
    | 'image'
    | 'button';

export type AnalyticsLine = {
    kind: 'constant' | 'average' | 'trend' | 'forecast';
    value?: number;
    enabled: boolean;
};

export type Visual = {
    id: string;
    type: VisualType;
    /** Selection-pane display name */
    name: string;
    title: string;
    /** free-form pixel layout */
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    hidden: boolean;
    axis: WellField[];
    legend: WellField[];
    values: WellField[];
    tooltips: WellField[];
    smallMultiples: WellField[];
    drillFields: WellField[];
    text?: string | undefined;
    imageUrl?: string | undefined;
    showTitle: boolean;
    showLegend: boolean;
    showLabels: boolean;
    /** format pane */
    background: string;
    border: boolean;
    shadow: boolean;
    altText: string;
    colorIndex: number;
    /** analytics pane */
    analytics: AnalyticsLine[];
    /** conditional formatting for table/matrix + column charts */
    conditionalFormat: boolean;
    subtotals: boolean;
    /** drill level index into drillFields (hierarchy) */
    drillLevel: number;
    /** per-page tooltip */
    tooltipPageId?: string | undefined;
    /** drillthrough target page */
    drillthroughPageId?: string | undefined;
};

export type PageFormat = {
    /** canvas size preset name */
    preset: string;
    width: number;
    height: number;
    background: string;
    wallpaper: string;
    /** page is a tooltip page */
    tooltip: boolean;
    hidden: boolean;
};

export const PAGE_PRESETS: { name: string; width: number; height: number }[] = [
    { name: '16:9', width: 1280, height: 720 },
    { name: '4:3', width: 960, height: 720 },
    { name: 'Letter', width: 1100, height: 850 },
    { name: 'Tooltip', width: 320, height: 240 },
    { name: 'Custom', width: 1280, height: 720 },
];

export type Page = {
    id: string;
    name: string;
    visuals: Visual[];
    format: PageFormat;
    /** independent phone canvas: visualId -> layout */
    mobile: Record<
        string,
        { x: number; y: number; w: number; h: number; on: boolean }
    >;
    tabOrder: string[];
};

export type CrossFilter = {
    column: string;
    value: string;
    sourceId: string;
} | null;

/** per-visual-pair interaction behaviour */
export type Interaction = 'filter' | 'highlight' | 'none';

/** A dataset table: a named set of fields backed by captured endpoint rows. */
export type TableDef = { name: string; fields: Field[]; rows: Row[] };

/* ------------------------------------------------------------------ */
/* Dataset tables — populated at runtime from the fetched endpoints.   */
/* ------------------------------------------------------------------ */

export let TABLES: TableDef[] = [];

export function setTables(tables: TableDef[]): void {
    TABLES = tables;
}

export const MEASURES: Field[] = [
    {
        table: 'Measures',
        name: 'Row Count',
        type: 'number',
        measure: true,
        expression: 'Row Count = COUNTROWS ( <table> )',
    },
];

export const MEASURE_IMPL: Record<string, (rows: Row[]) => number> = {
    'Row Count': (rows) => rows.length,
};

function sum(rows: Row[], col: string) {
    let t = 0;
    for (const r of rows) t += Number(r[col]) || 0;
    return t;
}

/* ------------------------------------------------------------------ */
/* Aggregation engine                                                  */
/* ------------------------------------------------------------------ */

export function isMeasure(name: string) {
    return name in MEASURE_IMPL;
}

/** First table that exposes a column with the given name. */
export function findTableForField(name: string): string {
    for (const t of TABLES) {
        if (t.fields.some((f) => f.name === name)) return t.name;
    }
    return '';
}

export function fieldType(name: string, table?: string): FieldType {
    if (isMeasure(name)) return 'number';
    if (table) {
        for (const t of TABLES) {
            if (t.name !== table) continue;
            const f = t.fields.find((x) => x.name === name);
            if (f) return f.type;
        }
    }
    for (const t of TABLES) {
        const f = t.fields.find((x) => x.name === name);
        if (f) return f.type;
    }
    return 'text';
}

export function hasColumn(table: TableDef, name: string): boolean {
    return table.fields.some((f) => f.name === name);
}

export function aggregate(rows: Row[], wf: WellField): number {
    if (isMeasure(wf.name)) return MEASURE_IMPL[wf.name]!(rows);
    const col = wf.name;
    switch (wf.agg) {
        case 'count':
            return rows.length;
        case 'distinct':
            return new Set(rows.map((r) => r[col])).size;
        case 'avg':
            return rows.length ? sum(rows, col) / rows.length : 0;
        case 'min':
            return rows.length
                ? Math.min(...rows.map((r) => Number(r[col]) || 0))
                : 0;
        case 'max':
            return rows.length
                ? Math.max(...rows.map((r) => Number(r[col]) || 0))
                : 0;
        default:
            return sum(rows, col);
    }
}

export function measureLabel(wf: WellField) {
    if (isMeasure(wf.name)) return wf.name;
    if (wf.label?.trim()) return wf.label.trim();
    if (fieldType(wf.name, wf.table) === 'number') {
        const p =
            wf.agg === 'sum'
                ? 'Sum of'
                : wf.agg === 'avg'
                  ? 'Average of'
                  : wf.agg === 'count'
                    ? 'Count of'
                    : wf.agg === 'distinct'
                      ? 'Distinct count of'
                      : wf.agg === 'min'
                        ? 'Min of'
                        : 'Max of';
        return `${p} ${fieldLabel(wf)}`;
    }
    return `Count of ${fieldLabel(wf)}`;
}

export function buildChartData(
    rows: Row[],
    axis: WellField[],
    legend: WellField[],
    values: WellField[],
    tooltips: WellField[] = [],
) {
    const axisCol = axis[0]?.name;
    const legendCol = legend[0]?.name;

    const withTooltips = (item: Record<string, string | number>, groupRows: Row[]) => {
        for (const t of tooltips) {
            item[`tt:${t.name}`] = aggregate(groupRows, t);
        }
        return item;
    };

    if (!axisCol) {
        const single: Record<string, string | number> = { category: 'Total' };
        values.forEach((v) => (single[measureLabel(v)] = aggregate(rows, v)));
        return {
            data: [withTooltips(single, rows)],
            series: values.map(measureLabel),
        };
    }

    const groups = new Map<string, Row[]>();
    for (const r of rows) {
        const k = String(r[axisCol]);
        const arr = groups.get(k);
        if (arr) arr.push(r);
        else groups.set(k, [r]);
    }

    const seriesSet = new Set<string>();
    const data = [...groups.entries()].map(([key, groupRows]) => {
        const item: Record<string, string | number> = { category: key };
        if (legendCol) {
            const byLegend = new Map<string, Row[]>();
            for (const r of groupRows) {
                const lk = String(r[legendCol]);
                const arr = byLegend.get(lk);
                if (arr) arr.push(r);
                else byLegend.set(lk, [r]);
            }
            for (const [lk, lrows] of byLegend) {
                seriesSet.add(lk);
                item[lk] = values[0]
                    ? aggregate(lrows, values[0])
                    : lrows.length;
            }
        } else {
            values.forEach((v) => {
                seriesSet.add(measureLabel(v));
                item[measureLabel(v)] = aggregate(groupRows, v);
            });
        }
        return withTooltips(item, groupRows);
    });

    if (fieldType(axisCol, axis[0]?.table) === 'number') {
        data.sort((a, b) => Number(a['category']) - Number(b['category']));
    } else if (values.length && !legendCol) {
        const key = measureLabel(values[0]!);
        data.sort((a, b) => Number(b[key]) - Number(a[key]));
    }

    return { data, series: [...seriesSet] };
}

export function distinctValues(col: string, rows: Row[]) {
    const s = new Set<string>();
    for (const r of rows) s.add(String(r[col]));
    return [...s].sort();
}

/** Table backing a visual — resolved from its first populated well. */
export function visualTable(
    v: Pick<
        Visual,
        | 'axis'
        | 'legend'
        | 'values'
        | 'drillFields'
        | 'smallMultiples'
        | 'tooltips'
    >,
): string {
    const wells = [
        v.axis,
        v.legend,
        v.values,
        v.drillFields,
        v.smallMultiples,
        v.tooltips,
    ];
    for (const well of wells) {
        if (well[0]?.table) return well[0].table;
    }
    return '';
}

export function formatNumber(n: number, compact = true) {
    if (!isFinite(n)) return '—';
    if (Math.abs(n) < 1 && n !== 0) return `${(n * 100).toFixed(1)}%`;
    if (!compact)
        return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatValue(
    value: unknown,
    type: FieldType = 'text',
): string {
    if (value === null || value === undefined) return '—';
    if (type === 'number' && typeof value === 'number')
        return formatNumber(value);
    if (type === 'boolean')
        return value === true ? 'Yes' : value === false ? 'No' : String(value);
    if (type === 'date') {
        const parsed = value instanceof Date ? value : new Date(String(value));
        if (!Number.isNaN(parsed.getTime()))
            return parsed.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
            });
    }
    return String(value);
}

/* ------------------------------------------------------------------ */
/* Column type inference                                               */
/* ------------------------------------------------------------------ */

function isDateString(v: string): boolean {
    const trimmed = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(trimmed)) return false;
    return !Number.isNaN(Date.parse(trimmed.slice(0, 10)));
}

export function inferFieldType(values: unknown[]): FieldType {
    let numbers = 0;
    let dates = 0;
    let booleans = 0;
    let texts = 0;
    for (const v of values) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'boolean') booleans++;
        else if (typeof v === 'number') numbers++;
        else if (typeof v === 'string') {
            if (isDateString(v)) dates++;
            else texts++;
        } else texts++;
    }
    const total = numbers + dates + booleans + texts;
    if (!total) return 'text';
    if (numbers === total) return 'number';
    if (booleans === total) return 'boolean';
    if (dates === total) return 'date';
    if (numbers >= total * 0.8) return 'number';
    return 'text';
}
