import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import pptxgen from "pptxgenjs";
import * as XLSX from "xlsx";
import { formatNumber } from "../format";
import type { TableGrid, Widget, WidgetConfig } from "../types";
import { computeWidgetDataset, type DatasetState } from "../widgets/use-dataset";
import { getReportNode, widgetNodes } from "./report-node";

export type Cell = { v: string | number; z?: string };
export type WidgetSheet = { name: string; columns: string[]; rows: Cell[][] };
export type ExportStats = { widgetCount: number; dataWidgetCount: number; rowCount: number; rawRowCount: number };
export type ExportMeta = { title: string };
export type ExportFilters = {
  slicerSelections: Record<string, string[]>;
  slicerDateRanges: Record<string, { from?: string; to?: string; preset?: string }>;
  slicerTopN: Record<string, { axis: string; value: string; n: number; enabled: boolean }>;
};

const WIDGET_LABELS: Record<string, string> = {
  kpi: "KPI",
  gauge: "Jauge",
  sparkline: "Évolution",
  line: "Courbe",
  bar: "Barres",
  pareto: "Pareto",
  donut: "Donut",
  pie: "Camembert",
  area: "Aires",
  combo: "Combiné",
  card: "Carte",
  funnel: "Entonnoir",
  treemap: "Treemap",
  waterfall: "Cascade",
  scatter: "Nuage de points",
  bubble: "Bulle",
  column: "Colonnes",
  "stacked-bar": "Barres empilées",
  "stacked-area": "Aires empilées",
  matrix: "Matrice",
  map: "Carte",
  filledMap: "Carte remplie",
  shapeMap: "Carte",
  table: "Tableau",
  "table-grid": "Grille",
  text: "Texte",
  divider: "Séparateur",
  slicer: "Filtre",
  listSlicer: "Filtre liste",
  inputSlicer: "Filtre saisie",
  dateSlicer: "Filtre date",
  buttonSlicer: "Filtre boutons",
  image: "Image",
  button: "Bouton",
  radar: "Radar",
};

export function widgetLabel(w: Widget): string {
  return w.config.label?.trim() || WIDGET_LABELS[w.type] || w.type;
}

/** Excel sheet names: no `\ / ? * [ ] :`, max 31 chars. */
export function sheetName(raw: string): string {
  const cleaned = raw.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 31) || "Feuille";
}

export function fileNameBase(title: string): string {
  const base = title
    .trim()
    .replace(/[^\w\u00C0-\u017F-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return base || "rapport";
}

function dateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function cellString(v: unknown): Cell {
  return { v: v === null || v === undefined ? "" : String(v) };
}

function decimalsZ(decimals: number): string {
  return decimals > 0 ? `#,##0.${"0".repeat(Math.min(decimals, 6))}` : "#,##0";
}

function hasDisplayFormat(cfg: WidgetConfig): boolean {
  return !!(cfg.prefix || cfg.unit || cfg.compact);
}

function numericCell(value: number, cfg: WidgetConfig): Cell {
  const decimals = cfg.decimals ?? 0;
  if (hasDisplayFormat(cfg)) {
    return { v: formatNumber(value, { decimals, prefix: cfg.prefix, unit: cfg.unit, compact: cfg.compact }) };
  }
  return { v: value, z: decimalsZ(decimals) };
}

function csvValue(cell: Cell): string {
  if (typeof cell.v === "number") return String(cell.v).replace(".", ",");
  return cell.v;
}

function csvLine(values: unknown[]): string {
  return values
    .map((v) => {
      const s = String(v);
      return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(";");
}

function gridSheet(tg: TableGrid, label: string): WidgetSheet {
  const rows: Cell[][] = [];
  let maxCols = 0;
  for (let r = 0; r < tg.rows; r++) {
    const line: Cell[] = [];
    for (let c = 0; c < tg.cols; c++) {
      const cell = tg.cells.find((x) => x.r === r && x.c === c);
      if (cell?.hidden) {
        line.push(cellString(""));
        continue;
      }
      const content = cell?.content ?? "";
      const trimmed = content.replace(/\s/g, "");
      const numeric = trimmed !== "" && !Number.isNaN(Number(trimmed));
      if (numeric) {
        const value = Number(trimmed);
        line.push(
          cell?.unit || cell?.decimals != null
            ? { v: formatNumber(value, { decimals: cell.decimals ?? 0, unit: cell.unit }) }
            : { v: value, z: "#,##0" },
        );
      } else {
        line.push(cellString(content));
      }
    }
    maxCols = Math.max(maxCols, line.length);
    rows.push(line);
  }
  const columns = Array.from({ length: maxCols }, (_, i) => `Colonne ${i + 1}`);
  return { name: label, columns, rows };
}

/**
 * Aggregated table for one widget, matching exactly what the widget renders
 * (same slicer filters, measures, joins and theme palette as `computeWidgetDataset`).
 */
export function buildWidgetSheet(state: DatasetState, widget: Widget): WidgetSheet | null {
  const cfg = widget.config;
  if (cfg.tableGrid) return gridSheet(cfg.tableGrid, widgetLabel(widget));

  const ds = computeWidgetDataset(state, cfg, widget.id);
  if (!ds.hasData || (!ds.multi.length && !ds.legendSeries.length && !ds.scatterPoints.length)) return null;

  const label = widgetLabel(widget);
  const axisLabel = cfg.dataAxis || "Valeur";

  if (ds.legendSeries.length) {
    const cats: string[] = [];
    for (const s of ds.legendSeries) {
      for (const p of s.data) {
        if (!cats.includes(p.x)) cats.push(p.x);
      }
    }
    const rows: Cell[][] = cats.map((x) => [
      cellString(x),
      ...ds.legendSeries.map((s) => {
        const p = s.data.find((d) => d.x === x);
        return p ? numericCell(p.v, cfg) : cellString("");
      }),
    ]);
    return { name: label, columns: [axisLabel, ...ds.legendSeries.map((s) => s.label)], rows };
  }

  if (ds.scatterPoints.length) {
    const xf = ds.valueFields.find((v) => v.name === cfg.scatterX);
    const yf = ds.valueFields.find((v) => v.name === cfg.scatterY);
    const sf = cfg.scatterSize ? ds.valueFields.find((v) => v.name === cfg.scatterSize) : undefined;
    const rows: Cell[][] = ds.scatterPoints.map((p) => [
      numericCell(p.x, cfg),
      numericCell(p.y, cfg),
      ...(sf ? [numericCell(p.size, cfg)] : []),
    ]);
    return { name: label, columns: [xf?.label || "X", yf?.label || "Y", ...(sf ? [sf.label || "Taille"] : [])], rows };
  }

  const tipKeys = Object.keys(ds.multi[0]?.tips ?? {});
  const rows: Cell[][] = ds.multi.map((m) => [
    cellString(m.name),
    ...ds.valueFields.map((v) => numericCell(m.values[v.key] ?? 0, cfg)),
    ...tipKeys.map((k) => {
      const t = m.tips[k];
      return typeof t === "number" ? { v: formatNumber(t, {}) } : cellString(t);
    }),
  ]);
  return { name: label, columns: [axisLabel, ...ds.valueFields.map((v) => v.label), ...tipKeys], rows };
}

/** Human-readable list of the active slicer/date/top-N filters, one row per widget. */
export function buildFilterRows(widgets: Widget[], filters: ExportFilters): string[][] {
  const out: string[][] = [];
  for (const w of widgets) {
    const label = widgetLabel(w);
    const col = w.config.dataAxis ?? "";
    const dataset = w.config.datasetSlug ?? "";
    if (w.config.slicerMode === "topN") {
      const t = filters.slicerTopN[w.id];
      if (t?.enabled) out.push([`${label} (Top ${t.n})`, dataset, t.axis || col, String(t.n)]);
    } else if (w.type === "dateSlicer") {
      const r = filters.slicerDateRanges[w.id];
      if (r && (r.from || r.to)) {
        out.push([label, dataset, col, r.preset ? `Présélection ${r.preset}` : `${r.from ?? "…"} → ${r.to ?? "…"}`]);
      }
    } else {
      const sel = filters.slicerSelections[w.id];
      if (sel?.length) out.push([label, dataset, col, sel.join(", ")]);
    }
  }
  return out;
}

/** Raw filtered rows for every dataset referenced by a widget (one "Dataset" column). */
export function buildRawSheet(state: DatasetState, widgets: Widget[]): { columns: string[]; rows: Cell[][] } | null {
  const slugs: string[] = [];
  for (const w of widgets) {
    const slug = w.config.datasetSlug;
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  }
  const columns: string[] = [];
  for (const slug of slugs) {
    const ds = state.datasets.find((d) => d.slug === slug);
    for (const c of ds?.columns ?? []) {
      if (!columns.includes(c.name)) columns.push(c.name);
    }
  }
  const rows: Cell[][] = [];
  for (const slug of slugs) {
    for (const row of state.filteredRowsBySlug[slug] ?? []) {
      rows.push([
        cellString(slug),
        ...columns.map((c) => {
          const v = row[c];
          return typeof v === "number" ? { v } : cellString(v);
        }),
      ]);
    }
  }
  if (!rows.length) return null;
  return { columns: ["Dataset", ...columns], rows };
}

function buildFilterSheet(widgets: Widget[], filters: ExportFilters, meta: ExportMeta): XLSX.WorkSheet {
  const filterRows = buildFilterRows(widgets, filters);
  const aoa: (string | number)[][] = [
    ["Rapport", meta.title],
    ["Exporté le", `${dateStr()} ${new Date().toTimeString().slice(0, 8)}`],
    ["Widgets", widgets.length],
    ["Filtres actifs", filterRows.length],
    [],
  ];
  if (filterRows.length) {
    aoa.push(["Filtre", "Dataset", "Colonne", "Valeur"]);
    for (const f of filterRows) aoa.push(f);
  } else {
    aoa.push(["Aucun filtre actif"]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 40 }];
  return ws;
}

function columnWidth(columns: string[], rows: Cell[][], colIndex: number): number {
  let max = columns[colIndex]?.length ?? 0;
  for (const row of rows) {
    const cell = row[colIndex];
    if (!cell) continue;
    const len = typeof cell.v === "number" ? String(cell.v).length : cell.v.length;
    if (len > max) max = len;
  }
  return Math.min(40, Math.max(8, max + 2));
}

function makeWorksheet(columns: string[], rows: Cell[][]): XLSX.WorkSheet {
  const aoa: (string | number)[][] = [[...columns]];
  const zMap: Record<string, string> = {};
  rows.forEach((row, r) => {
    const line: (string | number)[] = [];
    row.forEach((cell, c) => {
      line.push(cell.v);
      if (cell.z) zMap[XLSX.utils.encode_cell({ r: r + 1, c })] = cell.z;
    });
    aoa.push(line);
  });
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  for (const addr in zMap) {
    const cell = ws[addr] as XLSX.CellObject | undefined;
    if (cell && typeof cell === "object" && "v" in cell) cell.z = zMap[addr];
  }
  ws["!cols"] = columns.map((_, i) => ({ wch: columnWidth(columns, rows, i) }));
  return ws;
}

/** Full multi-sheet workbook: Filtres, one sheet per data widget, Données brutes. */
export function buildWorkbook(
  state: DatasetState,
  widgets: Widget[],
  filters: ExportFilters,
  meta: ExportMeta,
): { workbook: XLSX.WorkBook; stats: ExportStats } {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildFilterSheet(widgets, filters, meta), "Filtres");

  const seen = new Set<string>();
  let dataWidgetCount = 0;
  let rowCount = 0;
  for (const w of widgets) {
    const sheet = buildWidgetSheet(state, w);
    if (!sheet) continue;
    dataWidgetCount++;
    rowCount += sheet.rows.length;
    let name = sheetName(sheet.name);
    let i = 2;
    while (seen.has(name)) name = sheetName(`${sheet.name} (${i++})`);
    seen.add(name);
    XLSX.utils.book_append_sheet(wb, makeWorksheet(sheet.columns, sheet.rows), name);
  }

  const raw = buildRawSheet(state, widgets);
  let rawRowCount = 0;
  if (raw) {
    rawRowCount = raw.rows.length;
    XLSX.utils.book_append_sheet(wb, makeWorksheet(raw.columns, raw.rows), "Données brutes");
  }

  if (!dataWidgetCount && !raw) {
    const empty = XLSX.utils.aoa_to_sheet([["(aucune donnée)"]]);
    empty["!cols"] = [{ wch: 24 }];
    XLSX.utils.book_append_sheet(wb, empty, "(aucune donnée)");
  }

  return { workbook: wb, stats: { widgetCount: widgets.length, dataWidgetCount, rowCount, rawRowCount } };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function exportExcel(state: DatasetState, widgets: Widget[], filters: ExportFilters, meta: ExportMeta): ExportStats {
  const { workbook, stats } = buildWorkbook(state, widgets, filters, meta);
  XLSX.writeFile(workbook, `${fileNameBase(meta.title)}_${dateStr()}.xlsx`);
  return stats;
}

/** Combined CSV (one section per data widget), `;`-delimited for French Excel. */
export function buildCsv(state: DatasetState, widgets: Widget[], filters: ExportFilters, meta: ExportMeta): string {
  const sheets = widgets.map((w) => buildWidgetSheet(state, w)).filter((s): s is WidgetSheet => !!s);
  const lines: string[] = [];
  lines.push(csvLine(["Rapport", meta.title]));
  lines.push(csvLine(["Exporté le", new Date().toLocaleString("fr-FR")]));
  lines.push(csvLine(["Widgets avec données", sheets.length]));
  for (const f of buildFilterRows(widgets, filters)) lines.push(csvLine(["Filtre", ...f]));
  for (const s of sheets) {
    lines.push("");
    lines.push(csvLine([s.name]));
    lines.push(csvLine(s.columns));
    for (const row of s.rows) lines.push(csvLine(row.map(csvValue)));
  }
  if (!sheets.length) lines.push(csvLine(["(aucune donnée)"]));
  return lines.join("\n");
}

export function exportCsv(state: DatasetState, widgets: Widget[], filters: ExportFilters, meta: ExportMeta): ExportStats {
  const csv = buildCsv(state, widgets, filters, meta);
  downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `${fileNameBase(meta.title)}_${dateStr()}.csv`);
  const sheets = widgets.map((w) => buildWidgetSheet(state, w)).filter((s): s is WidgetSheet => !!s);
  return {
    widgetCount: widgets.length,
    dataWidgetCount: sheets.length,
    rowCount: sheets.reduce((n, s) => n + s.rows.length, 0),
    rawRowCount: 0,
  };
}

async function captureNode(node: HTMLElement, pixelRatio: number): Promise<string> {
  if (!node.offsetWidth || !node.offsetHeight) throw new Error("Rien à exporter");
  return toPng(node, {
    width: node.offsetWidth,
    height: node.offsetHeight,
    pixelRatio,
    style: { transform: "none" },
    cacheBust: true,
  });
}

export async function exportImageFile(state: DatasetState, widgets: Widget[], meta: ExportMeta): Promise<ExportStats> {
  const node = getReportNode();
  if (!node) throw new Error("Rien à exporter");
  const dataUrl = await captureNode(node, 2);
  downloadDataUrl(dataUrl, `${fileNameBase(meta.title)}.png`);
  return { widgetCount: widgets.length, dataWidgetCount: widgets.filter((w) => buildWidgetSheet(state, w)).length, rowCount: 0, rawRowCount: 0 };
}

export async function exportPdfFile(state: DatasetState, widgets: Widget[], meta: ExportMeta): Promise<ExportStats> {
  const node = getReportNode();
  if (!node) throw new Error("Rien à exporter");
  const pixelRatio = 2;
  const dataUrl = await captureNode(node, pixelRatio);
  const imgW = node.offsetWidth * pixelRatio;
  const imgH = node.offsetHeight * pixelRatio;

  const pageW = 1240;
  const pageH = 1754;
  const drawH = (imgH * pageW) / imgW;
  if (drawH <= 0) throw new Error("Rien à exporter");

  const pdf = new jsPDF({ orientation: "p", unit: "px", format: [pageW, pageH] });
  let offset = 0;
  let first = true;
  while (offset < drawH) {
    if (!first) pdf.addPage([pageW, pageH], "p");
    first = false;
    pdf.addImage(dataUrl, "PNG", 0, -offset, pageW, drawH, undefined, "FAST");
    offset += pageH;
  }
  pdf.save(`${fileNameBase(meta.title)}.pdf`);
  return { widgetCount: widgets.length, dataWidgetCount: widgets.filter((w) => buildWidgetSheet(state, w)).length, rowCount: 0, rawRowCount: 0 };
}

export async function exportPptxFile(state: DatasetState, widgets: Widget[], meta: ExportMeta): Promise<ExportStats> {
  const node = getReportNode();
  if (!node) throw new Error("Rien à exporter");
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";

  const cover = pptx.addSlide();
  cover.addText(meta.title, { x: 0.5, y: 2.5, w: 12.3, h: 1, fontSize: 36, bold: true, align: "center" });
  cover.addText(new Date().toLocaleDateString("fr-FR"), { x: 0.5, y: 3.6, w: 12.3, h: 0.6, fontSize: 16, align: "center", color: "666666" });

  const els = widgetNodes(node);
  let dataWidgetCount = 0;
  if (!els.length) {
    const slide = pptx.addSlide();
    slide.addText("(aucune donnée)", { x: 1, y: 3, w: 11, h: 1, fontSize: 20, align: "center" });
  }

  for (const el of els) {
    const id = el.getAttribute("data-widget-id");
    const widget = widgets.find((w) => w.id === id);
    const sheet = widget ? buildWidgetSheet(state, widget) : null;
    if (sheet) dataWidgetCount++;

    const slide = pptx.addSlide();
    slide.addText(widget ? widgetLabel(widget) : (id ?? "Widget"), { x: 0.3, y: 0.12, w: 12.7, h: 0.5, fontSize: 18, bold: true });

    let dataUrl: string | null = null;
    try {
      dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 2 });
    } catch {
      dataUrl = null;
    }
    if (dataUrl) {
      slide.addImage({ data: dataUrl, x: 0.3, y: 0.65, w: 12.7, h: 4.6, sizing: { type: "contain", w: 12.7, h: 4.6 } });
    }

    if (sheet && sheet.rows.length > 0) {
      const tableRows = [
        sheet.columns.map((c) => ({ text: c, options: { bold: true, color: "FFFFFF", fill: { color: "4F46E5" } } })),
        ...sheet.rows.slice(0, 500).map((r) => r.map((c) => ({ text: csvValue(c) }))),
      ];
      const colW = sheet.columns.map(() => 12.7 / Math.max(1, sheet.columns.length));
      slide.addTable(tableRows as Parameters<typeof slide.addTable>[0], { x: 0.3, y: 5.4, w: 12.7, colW, fontSize: 9, border: { type: "solid", color: "CCCCCC" } });
    }
  }

  await pptx.writeFile({ fileName: `${fileNameBase(meta.title)}.pptx` });
  return { widgetCount: widgets.length, dataWidgetCount, rowCount: 0, rawRowCount: 0 };
}
