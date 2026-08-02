export type WidgetType =
  | "kpi"
  | "gauge"
  | "sparkline"
  | "line"
  | "bar"
  | "pareto"
  | "donut"
  | "pie"
  | "radar"
  | "area"
  | "combo"
  | "card"
  | "funnel"
  | "treemap"
  | "waterfall"
  | "scatter"
  | "bubble"
  | "stacked-bar"
  | "stacked-area"
  | "column"
  | "stackedColumn"
  | "stacked100Column"
  | "stacked100Bar"
  | "ribbon"
  | "matrix"
  | "map"
  | "filledMap"
  | "shapeMap"
  | "slicer"
  | "buttonSlicer"
  | "listSlicer"
  | "inputSlicer"
  | "dateSlicer"
  | "image"
  | "button"
  | "decompositionTree"
  | "keyInfluencers"
  | "smartNarrative"
  | "qna"
  | "rVisual"
  | "pythonVisual"
  | "table"
  | "table-grid"
  | "text"
  | "divider";

export type TableCell = {
  r: number;
  c: number;
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean; // covered by a merge
  content?: string;
  unit?: string;
  decimals?: number;
  bg?: string;
  fg?: string;
  align?: "left" | "center" | "right";
  fontWeight?: number;
  fontSize?: number;
  isHeader?: boolean;
};

export type TableGrid = {
  rows: number;
  cols: number;
  colWidths?: number[]; // fractional, sums arbitrary
  rowHeights?: number[];
  cells: TableCell[];
  headerRow?: boolean;
  headerCol?: boolean;
  borderColor?: string;
  zebra?: boolean;
};

export type Agg = "sum" | "avg" | "count" | "distinct" | "min" | "max";

export type WidgetConfig = {
  // data
  datasetSlug?: string;
  dataAxis?: string;
  dataValue?: string;
  dataValues?: string[];
  /** Per-value source dataset, keyed by field name; falls back to datasetSlug. */
  dataValueSources?: Record<string, string>;
  dataGroup?: string;
  dataAggregation?: Agg;
  /** Per-field aggregation override, keyed by field name; falls back to dataAggregation. */
  dataAggregations?: Record<string, Agg>;
  /** Dimension that splits each value into one series per category value (Power-BI-style legend). */
  dataLegend?: string;
  /** Extra fields appended to the chart tooltip (any column or measure). */
  dataTooltips?: string[];
  /** Scatter/bubble explicit value fields (X / Y / size). */
  scatterX?: string;
  scatterY?: string;
  scatterSize?: string;
  /** Top-N category cap for large data; remaining rows merge into an "Autres" bucket. */
  maxCategories?: number;
  analyticsConstant?: number;
  analyticsAverage?: boolean;
  tableGrid?: TableGrid;
  // elements
  imageUrl?: string;
  altText?: string;
  linkUrl?: string;
  buttonText?: string;
  slicerValues?: string[];
  slicerMin?: string;
  slicerMax?: string;
  // display
  label?: string;
  subtitle?: string;
  unit?: string;
  decimals?: number;
  target?: number;
  text?: string;
  // style
  bg?: string;
  bgGradient?: string; // full CSS gradient string, overrides bg when set
  fg?: string;
  accent?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  padding?: number;
  opacity?: number; // 0..1
  shadow?: "none" | "sm" | "md" | "lg" | "xl";
  fontFamily?: string;
  fontWeight?: number;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
  // spacing
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  // border style
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  // transform
  rotate?: number;
  scale?: number;
  // scaler
  showScaler?: boolean;
  scalerAggregation?: "Latest" | "First" | "Sum" | "Average" | "Min" | "Max" | "Count";
  // gauge-specific
  gaugeStartAngle?: number;
  gaugeEndAngle?: number;
  gaugeMin?: number;
  gaugeMax?: number;
  // toggles
  showTarget?: boolean;
  showLabel?: boolean;
  showSparkline?: boolean;
  showBorder?: boolean;
  // label styling
  labelFontSize?: number;
  labelColor?: string;
  labelAlign?: "left" | "center" | "right";
  labelTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  // label position
  labelPosition?: "top" | "bottom" | "inside" | "overlay";
};

export type Widget = {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  locked?: boolean;
  config: WidgetConfig;
};

export const V6_WIDGET_TYPES: readonly WidgetType[] = [
  "card",
  "funnel",
  "treemap",
  "waterfall",
  "scatter",
  "bubble",
  "stacked-bar",
  "stacked-area",
  "column",
  "stackedColumn",
  "stacked100Column",
  "stacked100Bar",
  "ribbon",
  "matrix",
  "map",
  "filledMap",
  "shapeMap",
  "slicer",
  "buttonSlicer",
  "listSlicer",
  "inputSlicer",
  "dateSlicer",
  "image",
  "button",
  "decompositionTree",
  "keyInfluencers",
  "smartNarrative",
  "qna",
  "rVisual",
  "pythonVisual",
  "table",
  "table-grid",
  "text",
  "divider",
];

export type MeasureDefinition = {
  /** Backend id — set when the measure lives in the shared library. */
  id?: number;
  name: string;
  expression: string;
  description?: string;
  category?: string;
};

export type PageLayout = {
  pageId: string;
  version: number;
  widgets: Widget[];
};

export function sanitizeWidgets(widgets: Widget[], allowedTypes: readonly WidgetType[]): Widget[] {
  const allowed = new Set<WidgetType>(allowedTypes as WidgetType[]);
  return widgets.filter((widget) => allowed.has(widget.type));
}

export const uid = () => Math.random().toString(36).slice(2, 9);

// ---- push margin helpers ----

export const ROW_HEIGHT = 30;
export const GRID_COLS = 24;

function rangesOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2;
}

function widgetsOverlap(a: Widget, b: Widget): boolean {
  return rangesOverlap(a.x, a.x + a.w, b.x, b.x + b.w) && rangesOverlap(a.y, a.y + a.h, b.y, b.y + b.h);
}

/**
 * Shift `originId` (only if `moveOrigin`) and every widget sitting at/beyond
 * its trailing edge along `axis` by `delta` grid units. When pushing forward
 * (delta > 0), anything that ends up overlapping a moved widget gets pulled
 * into the push too, so the whole chain moves together.
 */
export function pushWidgets(
  widgets: Widget[],
  originId: string,
  axis: "x" | "y",
  delta: number,
  moveOrigin: boolean,
): Widget[] {
  if (delta === 0) return widgets;
  const origin = widgets.find((w) => w.id === originId);
  if (!origin) return widgets;

  const moving = new Set<string>();
  if (moveOrigin) moving.add(origin.id);

  const edge = axis === "x" ? origin.x + origin.w : origin.y + origin.h;
  for (const w of widgets) {
    if (w.id === origin.id) continue;
    const start = axis === "x" ? w.x : w.y;
    if (start >= edge) moving.add(w.id);
  }

  const next = widgets.map((w) => {
    if (!moving.has(w.id)) return w;
    return axis === "x" ? { ...w, x: Math.max(0, w.x + delta) } : { ...w, y: Math.max(0, w.y + delta) };
  });

  if (delta > 0) {
    let changed = true, guard = 0;
    while (changed && guard < 50) {
      changed = false; guard++;
      for (let i = 0; i < next.length; i++) {
        const w = next[i];
        if (moving.has(w.id)) continue;
        for (const id of moving) {
          const m = next.find((x) => x.id === id)!;
          if (widgetsOverlap(m, w)) {
            moving.add(w.id);
            next[i] = axis === "x" ? { ...w, x: w.x + delta } : { ...w, y: w.y + delta };
            changed = true;
            break;
          }
        }
      }
    }
  }

  return next;
}

// ---- table-grid helpers ----

export function makeEmptyTable(rows = 3, cols = 4): TableGrid {
  const cells: TableCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ r, c, content: r === 0 ? `Col ${c + 1}` : "", isHeader: r === 0 });
    }
  }
  return { rows, cols, cells, headerRow: true, zebra: true };
}

export function cellAt(t: TableGrid, r: number, c: number): TableCell | undefined {
  return t.cells.find((x) => x.r === r && x.c === c);
}

export function withCell(t: TableGrid, r: number, c: number, patch: Partial<TableCell>): TableGrid {
  const idx = t.cells.findIndex((x) => x.r === r && x.c === c);
  if (idx < 0) return { ...t, cells: [...t.cells, { r, c, ...patch }] };
  const next = [...t.cells];
  next[idx] = { ...next[idx], ...patch };
  return { ...t, cells: next };
}

export function addRow(t: TableGrid, after = t.rows - 1): TableGrid {
  const insertAt = after + 1;
  const cells = t.cells.map((cell) => (cell.r >= insertAt ? { ...cell, r: cell.r + 1 } : cell));
  for (let c = 0; c < t.cols; c++) cells.push({ r: insertAt, c, content: "" });
  return { ...t, rows: t.rows + 1, cells };
}

export function addCol(t: TableGrid, after = t.cols - 1): TableGrid {
  const insertAt = after + 1;
  const cells = t.cells.map((cell) => (cell.c >= insertAt ? { ...cell, c: cell.c + 1 } : cell));
  for (let r = 0; r < t.rows; r++) cells.push({ r, c: insertAt, content: "" });
  return { ...t, cols: t.cols + 1, cells };
}

export function removeRow(t: TableGrid, r: number): TableGrid {
  if (t.rows <= 1) return t;
  const cells = t.cells
    .filter((cell) => cell.r !== r)
    .map((cell) => (cell.r > r ? { ...cell, r: cell.r - 1 } : cell));
  return { ...t, rows: t.rows - 1, cells };
}

export function removeCol(t: TableGrid, c: number): TableGrid {
  if (t.cols <= 1) return t;
  const cells = t.cells
    .filter((cell) => cell.c !== c)
    .map((cell) => (cell.c > c ? { ...cell, c: cell.c - 1 } : cell));
  return { ...t, cols: t.cols - 1, cells };
}

/** Merge a rectangular region [r1..r2] x [c1..c2] into the top-left cell. */
export function mergeRegion(t: TableGrid, r1: number, c1: number, r2: number, c2: number): TableGrid {
  const rowSpan = r2 - r1 + 1;
  const colSpan = c2 - c1 + 1;
  if (rowSpan <= 0 || colSpan <= 0) return t;
  let next = t;
  // First, unhide/reset any inner cells and mark them hidden (except anchor)
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (r === r1 && c === c1) continue;
      next = withCell(next, r, c, { hidden: true, rowSpan: undefined, colSpan: undefined });
    }
  }
  next = withCell(next, r1, c1, { rowSpan, colSpan, hidden: false });
  return next;
}

/** Unmerge the anchor at (r,c). */
export function unmergeAt(t: TableGrid, r: number, c: number): TableGrid {
  const anchor = cellAt(t, r, c);
  if (!anchor || (!anchor.rowSpan && !anchor.colSpan)) return t;
  const rs = anchor.rowSpan ?? 1;
  const cs = anchor.colSpan ?? 1;
  let next = withCell(t, r, c, { rowSpan: undefined, colSpan: undefined });
  for (let rr = r; rr < r + rs; rr++) {
    for (let cc = c; cc < c + cs; cc++) {
      if (rr === r && cc === c) continue;
      next = withCell(next, rr, cc, { hidden: false });
    }
  }
  return next;
}

/** Move row from index `from` to index `to` (0-based). */
export function moveRow(t: TableGrid, from: number, to: number): TableGrid {
  if (from === to || from < 0 || from >= t.rows || to < 0 || to >= t.rows) return t;
  const cells = t.cells.map((cell) => {
    if (cell.r === from) return { ...cell, r: to };
    if (from < to && cell.r > from && cell.r <= to) return { ...cell, r: cell.r - 1 };
    if (from > to && cell.r >= to && cell.r < from) return { ...cell, r: cell.r + 1 };
    return cell;
  });
  return { ...t, cells };
}

/** Move column from index `from` to index `to` (0-based). */
export function moveCol(t: TableGrid, from: number, to: number): TableGrid {
  if (from === to || from < 0 || from >= t.cols || to < 0 || to >= t.cols) return t;
  const cells = t.cells.map((cell) => {
    if (cell.c === from) return { ...cell, c: to };
    if (from < to && cell.c > from && cell.c <= to) return { ...cell, c: cell.c - 1 };
    if (from > to && cell.c >= to && cell.c < from) return { ...cell, c: cell.c + 1 };
    return cell;
  });
  return { ...t, cells };
}

/** Copy cells in a rectangular region; returns 2D array of cell data (without r/c coords). */
export function copyCells(t: TableGrid, r1: number, c1: number, r2: number, c2: number): Partial<TableCell>[][] {
  const result: Partial<TableCell>[][] = [];
  for (let r = r1; r <= r2; r++) {
    const row: Partial<TableCell>[] = [];
    for (let c = c1; c <= c2; c++) {
      const cell = cellAt(t, r, c);
      if (cell) {
        const { r: _r, c: _c, ...rest } = cell;
        row.push(rest);
      } else {
        row.push({});
      }
    }
    result.push(row);
  }
  return result;
}

/** Paste copied cells starting at (startR, startC). */
export function pasteCells(t: TableGrid, startR: number, startC: number, data: Partial<TableCell>[][]): TableGrid {
  let next = t;
  for (let dr = 0; dr < data.length; dr++) {
    for (let dc = 0; dc < data[dr].length; dc++) {
      const r = startR + dr;
      const c = startC + dc;
      if (r < t.rows && c < t.cols) {
        next = withCell(next, r, c, { ...data[dr][dc], r, c });
      }
    }
  }
  return next;
}
