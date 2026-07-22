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
  | "table"
  | "table-grid"
  | "text"
  | "image"
  | "divider";

export type TableCell = {
  r: number;
  c: number;
  rowSpan?: number;
  colSpan?: number;
  hidden?: boolean; // covered by a merge
  content?: string;
  kpiCode?: string;
  displayMode?: "name" | "value";
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

export type WidgetConfig = {
  // data
  kpiCode?: string;
  tableGrid?: TableGrid;
  // display
  label?: string;
  subtitle?: string;
  unit?: string;
  decimals?: number;
  target?: number;
  text?: string;
  imageUrl?: string;
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

export type PageLayout = {
  pageId: string;
  version: number;
  widgets: Widget[];
};

export const uid = () => Math.random().toString(36).slice(2, 9);

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
