// Export data layer: pure, unit-testable builders that turn a visual's
// "current view" into CSV/Excel datasets. Rows mirror exactly what the canvas
// renders — report filters, slicers, drillthrough, joins, and the live
// cross-filter are all applied — so exports match the screen.
//
// Cell values are produced through the same formatting helpers the visuals
// use (`formatWellValue`), which keeps number formatting intact in the file.

import type { WorkBook } from 'xlsx';
import type { RelationGraph } from './graph';
import { crossFilterRows, enrichRows, type JoinRegistry } from './joins';
import {
    buildChartData,
    distinctValues,
    fieldLabel,
    fieldType,
    formatWellValue,
    measureLabel,
    singleValue,
    singleValueLabel,
    visualTable,
    type CrossFilter,
    type Interaction,
    type Row,
    type TableDef,
    type Visual,
    type VisualType,
} from './model';

export type ExportDeps = {
    tables: TableDef[];
    joins: JoinRegistry;
    graph?: RelationGraph;
    smartNetwork?: boolean;
    crossFilter: CrossFilter;
    interactionFor: (sourceId: string, targetId: string) => Interaction;
    /** measure name -> expression, used to enrich measure-referenced columns. */
    measureExpressions?: Record<string, string>;
};

export type ExportDataset = {
    /** human-friendly sheet/section title (page — visual) */
    title: string;
    columns: string[];
    rows: string[][];
};

/** Visuals that produce a tabular dataset via `buildChartData`. */
const TABULAR: VisualType[] = [
    'table',
    'matrix',
    'column',
    'stackedColumn',
    'stacked100Column',
    'bar',
    'stackedBar',
    'stacked100Bar',
    'line',
    'area',
    'combo',
    'ribbon',
    'waterfall',
    'pie',
    'donut',
    'treemap',
    'funnel',
    'scatter',
    'bubble',
    'map',
    'filledMap',
    'shapeMap',
];

/** Single-value visuals export one aggregate row per measure. */
const SINGLE_VALUE: VisualType[] = ['card', 'gauge'];

const SLICERS: VisualType[] = [
    'slicer',
    'dropdownSlicer',
    'buttonSlicer',
    'inputSlicer',
    'dateSlicer',
];

/**
 * Replicates the canvas's per-visual row derivation (Canvas.tsx ->
 * VisualView.tsx useInteractiveRows): joins enrichment + cross-filter.
 */
export function currentViewRows(
    visual: Visual,
    rows: Row[],
    deps: ExportDeps,
): Row[] {
    const enriched = enrichRows(
        visual,
        rows,
        deps.tables,
        deps.joins,
        deps.measureExpressions,
    );
    const mode = deps.interactionFor(
        deps.crossFilter?.sourceId ?? '',
        visual.id,
    );
    return crossFilterRows(
        enriched,
        deps.crossFilter,
        visual.id,
        visualTable(visual),
        visual.axis.some((f) => f.name === deps.crossFilter?.column),
        mode,
        deps.joins,
        deps.tables,
        deps.graph,
        deps.smartNetwork,
    ).rows;
}

/** Formats a numeric cell using the visual's number format (best match). */
function formatCell(
    raw: unknown,
    visual: Visual,
    series: string,
    _data: Record<string, string | number>[],
): string {
    if (typeof raw !== 'number') return raw == null ? '' : String(raw);
    const measure =
        visual.values.find((v) => measureLabel(v) === series) ??
        visual.values[0];
    return formatWellValue(raw, measure, visual.numberFormat);
}

/**
 * Builds the export dataset for one visual from its current-view rows.
 * Returns null when the visual has no meaningful data (text, image, buttons).
 */
export function visualExportData(
    visual: Visual,
    rows: Row[],
    deps: ExportDeps,
): ExportDataset | null {
    const view = currentViewRows(visual, rows, deps);

    if (SINGLE_VALUE.includes(visual.type)) {
        if (!visual.values.length) return null;
        return {
            title: visual.name || 'Carte',
            columns: ['Mesure', 'Valeur'],
            rows: visual.values.map((v) => {
                const type = fieldType(v.name, v.table);
                const raw = singleValue(view, v);
                return [
                    singleValueLabel(v, type),
                    typeof raw === 'number'
                        ? formatWellValue(raw, v, visual.numberFormat)
                        : String(raw ?? ''),
                ];
            }),
        };
    }

    if (SLICERS.includes(visual.type)) {
        const axis = visual.axis[0];
        if (!axis) return null;
        return {
            title: visual.name || 'Segmenteur',
            columns: [fieldLabel(axis)],
            rows: distinctValues(axis.name, view).map((v) => [String(v)]),
        };
    }

    if (!TABULAR.includes(visual.type)) return null;

    const { data, series } = buildChartData(
        view,
        visual.axis,
        visual.type === 'matrix' ? visual.legend : [],
        visual.values,
    );
    if (!series.length) return null;

    const columns = ['Catégorie', ...series];
    const body = data.map((d) => [
        String(d['category'] ?? ''),
        ...series.map((s) => formatCell(d[s], visual, s, data)),
    ]);
    return { title: visual.name || 'Visuel', columns, rows: body };
}

/** Gathers datasets for every visible visual on a page. */
export function collectPageDatasets(
    page: { name: string; visuals: Visual[] },
    tableRows: Record<string, Row[]>,
    deps: ExportDeps,
): ExportDataset[] {
    const out: ExportDataset[] = [];
    for (const v of page.visuals) {
        if (v.hidden) continue;
        const base = tableRows[visualTable(v)] ?? [];
        const ds = visualExportData(v, base, deps);
        if (ds) out.push({ ...ds, title: `${page.name} — ${ds.title}` });
    }
    return out;
}

/** Gathers datasets for every visible visual across all report pages. */
export function collectReportDatasets(
    pages: { name: string; visuals: Visual[] }[],
    tableRows: Record<string, Row[]>,
    deps: ExportDeps,
): ExportDataset[] {
    return pages.flatMap((page) => collectPageDatasets(page, tableRows, deps));
}

/* ------------------------------- CSV ------------------------------- */

/** RFC-4180-ish CSV with a UTF-8 BOM so Excel opens accents correctly. */
export function datasetToCsv(ds: ExportDataset): string {
    const escape = (v: string) => {
        const s = String(v ?? '');
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
        ds.columns.map(escape).join(','),
        ...ds.rows.map((r) => r.map(escape).join(',')),
    ];
    return `\uFEFF${lines.join('\r\n')}\r\n`;
}

/** Joins several datasets into one CSV with blank-line separators. */
export function datasetsToCsv(datasets: ExportDataset[]): string {
    return datasets.map(datasetToCsv).join('\r\n');
}

/* ------------------------------ Excel ------------------------------ */

function sanitizeSheetName(name: string): string {
    const clean = name
        .replace(/[[\]:*?/\\]/g, ' ')
        .slice(0, 31)
        .trim();
    return clean || 'Data';
}

/** Builds a multi-sheet xlsx workbook (one sheet per dataset). */
export async function datasetsToWorkbook(
    datasets: ExportDataset[],
): Promise<WorkBook> {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    if (!datasets.length) {
        const ws = XLSX.utils.aoa_to_sheet([['(aucune donnée)']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Export');
        return wb;
    }
    const used = new Set<string>();
    for (const ds of datasets) {
        let name = sanitizeSheetName(ds.title);
        if (used.has(name)) {
            let i = 2;
            while (used.has(`${name} ${i}`)) i += 1;
            name = `${name} ${i}`;
        }
        used.add(name);
        const aoa = [ds.columns, ...ds.rows];
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = ds.columns.map((c) => ({
            wch: Math.max(10, Math.min(42, c.length + 2)),
        }));
        XLSX.utils.book_append_sheet(wb, ws, name);
    }
    return wb;
}
