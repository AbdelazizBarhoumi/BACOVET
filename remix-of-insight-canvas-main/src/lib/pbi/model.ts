// Data model, sample dataset and aggregation engine for the report canvas.

export type FieldType = "number" | "text" | "date";

export type Field = {
  table: string;
  name: string;
  type: FieldType;
  /** true for DAX measures */
  measure?: boolean;
  expression?: string;
};

export type Row = Record<string, string | number>;

export type Agg = "sum" | "avg" | "count" | "min" | "max" | "distinct";

export type WellField = {
  table: string;
  name: string;
  agg: Agg;
};

export type VisualType =
  | "column"
  | "stackedColumn"
  | "stacked100Column"
  | "bar"
  | "stackedBar"
  | "stacked100Bar"
  | "line"
  | "area"
  | "stackedArea"
  | "combo"
  | "ribbon"
  | "waterfall"
  | "pie"
  | "donut"
  | "treemap"
  | "funnel"
  | "scatter"
  | "bubble"
  | "card"
  | "kpi"
  | "gauge"
  | "table"
  | "matrix"
  | "slicer"
  | "buttonSlicer"
  | "listSlicer"
  | "inputSlicer"
  | "dateSlicer"
  | "map"
  | "filledMap"
  | "shapeMap"
  | "decompositionTree"
  | "keyInfluencers"
  | "smartNarrative"
  | "qna"
  | "rVisual"
  | "pythonVisual"
  | "text"
  | "image"
  | "button";

export type AnalyticsLine = {
  kind: "constant" | "average" | "trend" | "forecast";
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
  { name: "16:9", width: 1280, height: 720 },
  { name: "4:3", width: 960, height: 720 },
  { name: "Letter", width: 1100, height: 850 },
  { name: "Tooltip", width: 320, height: 240 },
  { name: "Custom", width: 1280, height: 720 },
];

export type Page = {
  id: string;
  name: string;
  visuals: Visual[];
  format: PageFormat;
  /** independent phone canvas: visualId -> layout */
  mobile: Record<string, { x: number; y: number; w: number; h: number; on: boolean }>;
  tabOrder: string[];
};

export type CrossFilter = { column: string; value: string; sourceId: string } | null;

/** per-visual-pair interaction behaviour */
export type Interaction = "filter" | "highlight" | "none";


/* ------------------------------------------------------------------ */
/* Sample data — deterministic pseudo-random "Adventure Works" style   */
/* ------------------------------------------------------------------ */

const CATEGORIES = ["Bikes", "Accessories", "Clothing", "Components"] as const;
const SUBCATEGORIES: Record<string, string[]> = {
  Bikes: ["Mountain Bikes", "Road Bikes", "Touring Bikes"],
  Accessories: ["Helmets", "Tires", "Bottles", "Locks"],
  Clothing: ["Jerseys", "Gloves", "Shorts", "Caps"],
  Components: ["Wheels", "Brakes", "Handlebars", "Saddles"],
};
const REGIONS = [
  { country: "United States", region: "Northwest", group: "North America" },
  { country: "United States", region: "Southwest", group: "North America" },
  { country: "United States", region: "Northeast", group: "North America" },
  { country: "United States", region: "Southeast", group: "North America" },
  { country: "United States", region: "Central", group: "North America" },
  { country: "Canada", region: "Canada", group: "North America" },
  { country: "France", region: "France", group: "Europe" },
  { country: "Germany", region: "Germany", group: "Europe" },
  { country: "United Kingdom", region: "United Kingdom", group: "Europe" },
  { country: "Australia", region: "Australia", group: "Pacific" },
];
const CHANNELS = ["Online", "Reseller", "Retail"];

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function buildSales(): Row[] {
  const rnd = mulberry32(20240711);
  const rows: Row[] = [];
  let id = 1;
  for (let year = 2022; year <= 2024; year++) {
    for (let m = 0; m < 12; m++) {
      for (const geo of REGIONS) {
        for (const cat of CATEGORIES) {
          const subs = SUBCATEGORIES[cat] ?? [];
          const sub = subs[Math.floor(rnd() * subs.length)] ?? cat;
          const channel = CHANNELS[Math.floor(rnd() * CHANNELS.length)] ?? "Online";
          const seasonal = 1 + 0.35 * Math.sin(((m + 3) / 12) * Math.PI * 2);
          const growth = 1 + (year - 2022) * 0.18;
          const base =
            cat === "Bikes" ? 42000 : cat === "Components" ? 16000 : cat === "Clothing" ? 9000 : 6000;
          const sales = Math.round(base * seasonal * growth * (0.55 + rnd() * 0.9));
          const quantity = Math.max(1, Math.round(sales / (60 + rnd() * 220)));
          const cost = Math.round(sales * (0.55 + rnd() * 0.2));
          rows.push({
            SalesOrder: `SO-${10000 + id++}`,
            Year: year,
            Month: MONTHS[m] ?? "",
            MonthKey: m + 1,
            Quarter: `Q${Math.floor(m / 3) + 1}`,
            Date: `${year}-${String(m + 1).padStart(2, "0")}-15`,
            Country: geo.country,
            Region: geo.region,
            Group: geo.group,
            Category: cat,
            Subcategory: sub,
            Channel: channel,
            Sales: sales,
            Cost: cost,
            Profit: sales - cost,
            Quantity: quantity,
          });
        }
      }
    }
  }
  return rows;
}

export const SALES: Row[] = buildSales();

export type TableDef = { name: string; fields: Field[]; rows: Row[] };

export const TABLES: TableDef[] = [
  {
    name: "Sales",
    rows: SALES,
    fields: [
      { table: "Sales", name: "SalesOrder", type: "text" },
      { table: "Sales", name: "Channel", type: "text" },
      { table: "Sales", name: "Sales", type: "number" },
      { table: "Sales", name: "Cost", type: "number" },
      { table: "Sales", name: "Profit", type: "number" },
      { table: "Sales", name: "Quantity", type: "number" },
    ],
  },
  {
    name: "Date",
    rows: SALES,
    fields: [
      { table: "Date", name: "Date", type: "date" },
      { table: "Date", name: "Year", type: "text" },
      { table: "Date", name: "Quarter", type: "text" },
      { table: "Date", name: "Month", type: "text" },
      { table: "Date", name: "MonthKey", type: "number" },
    ],
  },
  {
    name: "Product",
    rows: SALES,
    fields: [
      { table: "Product", name: "Category", type: "text" },
      { table: "Product", name: "Subcategory", type: "text" },
    ],
  },
  {
    name: "Region",
    rows: SALES,
    fields: [
      { table: "Region", name: "Group", type: "text" },
      { table: "Region", name: "Country", type: "text" },
      { table: "Region", name: "Region", type: "text" },
    ],
  },
];

export const MEASURES: Field[] = [
  {
    table: "Measures",
    name: "Total Sales",
    type: "number",
    measure: true,
    expression: "Total Sales = SUM ( Sales[Sales] )",
  },
  {
    table: "Measures",
    name: "Total Profit",
    type: "number",
    measure: true,
    expression: "Total Profit = SUM ( Sales[Profit] )",
  },
  {
    table: "Measures",
    name: "Profit Margin",
    type: "number",
    measure: true,
    expression: "Profit Margin = DIVIDE ( [Total Profit], [Total Sales] )",
  },
  {
    table: "Measures",
    name: "Order Count",
    type: "number",
    measure: true,
    expression: "Order Count = COUNTROWS ( Sales )",
  },
];

export const MEASURE_IMPL: Record<string, (rows: Row[]) => number> = {
  "Total Sales": (rows) => sum(rows, "Sales"),
  "Total Profit": (rows) => sum(rows, "Profit"),
  "Profit Margin": (rows) => (sum(rows, "Sales") ? sum(rows, "Profit") / sum(rows, "Sales") : 0),
  "Order Count": (rows) => rows.length,
};

function sum(rows: Row[], col: string) {
  let t = 0;
  for (const r of rows) t += Number(r[col]) || 0;
  return t;
}

/* ------------------------------------------------------------------ */
/* Aggregation engine                                                   */
/* ------------------------------------------------------------------ */

export function isMeasure(name: string) {
  return name in MEASURE_IMPL;
}

export function fieldType(name: string): FieldType {
  if (isMeasure(name)) return "number";
  for (const t of TABLES) {
    const f = t.fields.find((x) => x.name === name);
    if (f) return f.type;
  }
  return "text";
}

export function aggregate(rows: Row[], wf: WellField): number {
  if (isMeasure(wf.name)) return MEASURE_IMPL[wf.name]!(rows);
  const col = wf.name;
  switch (wf.agg) {
    case "count":
      return rows.length;
    case "distinct":
      return new Set(rows.map((r) => r[col])).size;
    case "avg":
      return rows.length ? sum(rows, col) / rows.length : 0;
    case "min":
      return rows.length ? Math.min(...rows.map((r) => Number(r[col]) || 0)) : 0;
    case "max":
      return rows.length ? Math.max(...rows.map((r) => Number(r[col]) || 0)) : 0;
    default:
      return sum(rows, col);
  }
}

export function measureLabel(wf: WellField) {
  if (isMeasure(wf.name)) return wf.name;
  if (fieldType(wf.name) === "number") {
    const p =
      wf.agg === "sum"
        ? "Sum of"
        : wf.agg === "avg"
          ? "Average of"
          : wf.agg === "count"
            ? "Count of"
            : wf.agg === "distinct"
              ? "Distinct count of"
              : wf.agg === "min"
                ? "Min of"
                : "Max of";
    return `${p} ${wf.name}`;
  }
  return `Count of ${wf.name}`;
}

const MONTH_ORDER = new Map(MONTHS.map((m, i) => [m, i]));

export function buildChartData(
  rows: Row[],
  axis: WellField[],
  legend: WellField[],
  values: WellField[],
) {
  const axisCol = axis[0]?.name;
  const legendCol = legend[0]?.name;

  if (!axisCol) {
    const single: Record<string, string | number> = { category: "Total" };
    values.forEach((v) => (single[measureLabel(v)] = aggregate(rows, v)));
    return { data: [single], series: values.map(measureLabel) };
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
        item[lk] = values[0] ? aggregate(lrows, values[0]) : lrows.length;
      }
    } else {
      values.forEach((v) => {
        seriesSet.add(measureLabel(v));
        item[measureLabel(v)] = aggregate(groupRows, v);
      });
    }
    return item;
  });

  if (axisCol === "Month") {
    data.sort(
      (a, b) =>
        (MONTH_ORDER.get(String(a["category"])) ?? 0) - (MONTH_ORDER.get(String(b["category"])) ?? 0),
    );
  } else if (fieldType(axisCol) === "number" || axisCol === "Year") {
    data.sort((a, b) => Number(a["category"]) - Number(b["category"]));
  } else if (values.length && !legendCol) {
    const key = measureLabel(values[0]!);
    data.sort((a, b) => Number(b[key]) - Number(a[key]));
  }

  return { data, series: [...seriesSet] };
}

export function distinctValues(col: string, rows: Row[] = SALES) {
  const s = new Set<string>();
  for (const r of rows) s.add(String(r[col]));
  const out = [...s];
  if (col === "Month") out.sort((a, b) => (MONTH_ORDER.get(a) ?? 0) - (MONTH_ORDER.get(b) ?? 0));
  else out.sort();
  return out;
}

export function formatNumber(n: number, compact = true) {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) < 1 && n !== 0) return `${(n * 100).toFixed(1)}%`;
  if (!compact) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
