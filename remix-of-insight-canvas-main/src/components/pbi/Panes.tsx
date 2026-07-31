import { useState } from "react";
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Filter,
  Plus,
  Search,
  Sigma,
  Table2,
  X,
} from "lucide-react";
import {
  MEASURES,
  PAGE_PRESETS,
  TABLES,
  distinctValues,
  fieldType,
  isMeasure,
  measureLabel,
  type Agg,
  type VisualType,
} from "@/lib/pbi/model";
import { usePbi, visualTypeLabel, type WellName } from "@/lib/pbi/store";
import { cn } from "@/lib/utils";

function PaneHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <h2 className="text-[12px] font-semibold text-foreground">{title}</h2>
      {right}
    </div>
  );
}

/* ---------------------------- Fields pane ---------------------------- */

export function FieldsPane() {
  const { addFilter, selected, dropField } = usePbi();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({
    Measures: true,
    Sales: true,
    Date: true,
    Product: true,
    Region: true,
  });

  const groups = [
    { name: "Measures", fields: MEASURES },
    ...TABLES.map((t) => ({ name: t.name, fields: t.fields })),
  ];

  return (
    <div className="flex h-full flex-col">
      <PaneHeader title="Data" />
      <div className="px-2 pb-2">
        <div className="flex items-center gap-1 rounded border border-border bg-background px-2">
          <Search className="size-3 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent py-1 text-[11px] outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-1 pb-2">
        {groups.map((g) => {
          const fields = g.fields.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));
          if (!fields.length) return null;
          return (
            <div key={g.name}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [g.name]: !o[g.name] }))}
                className="flex w-full items-center gap-1 rounded px-1 py-1 text-[12px] font-medium hover:bg-accent"
              >
                <ChevronRight className={cn("size-3 transition-transform", open[g.name] && "rotate-90")} />
                <Table2 className="size-3 text-brand-foreground" />
                <span className="truncate">{g.name}</span>
              </button>
              {open[g.name] &&
                fields.map((f) => (
                  <div
                    key={`${g.name}.${f.name}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", f.name);
                      // Ctrl+drag duplicates a field into another bucket
                      e.dataTransfer.effectAllowed = e.ctrlKey ? "copy" : "move";
                    }}
                    onDoubleClick={() => !f.measure && addFilter(f.name)}
                    title={f.expression ?? `${f.table}[${f.name}]`}
                    className="ml-5 flex cursor-grab items-center gap-2 rounded px-2 py-[3px] text-[11px] hover:bg-accent active:cursor-grabbing"
                  >
                    <input
                      type="checkbox"
                      checked={
                        !!selected &&
                        [...selected.axis, ...selected.values, ...selected.legend].some(
                          (x) => x.name === f.name,
                        )
                      }
                      onChange={() => {
                        if (!selected) return;
                        dropField(
                          selected.id,
                          f.measure || f.type === "number" ? "values" : "axis",
                          f.name,
                        );
                      }}
                      className="size-3 accent-[var(--brand)]"
                    />
                    {f.measure ? (
                      <Sigma className="size-3 text-brand-foreground" />
                    ) : (
                      <span className="text-[9px] text-muted-foreground">
                        {f.type === "number" ? "#" : f.type === "date" ? "▦" : "A"}
                      </span>
                    )}
                    <span className="truncate">{f.name}</span>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------ Visualizations pane ------------------------ */

const VISUAL_GROUPS: { group: string; items: { type: VisualType; label: string; glyph: string }[] }[] = [
  {
    group: "Comparison",
    items: [
      { type: "column", label: "Clustered column", glyph: "▮▮" },
      { type: "stackedColumn", label: "Stacked column", glyph: "▯▮" },
      { type: "stacked100Column", label: "100% stacked column", glyph: "%▮" },
      { type: "bar", label: "Clustered bar", glyph: "▬" },
      { type: "stackedBar", label: "Stacked bar", glyph: "▭▬" },
      { type: "stacked100Bar", label: "100% stacked bar", glyph: "%▬" },
      { type: "line", label: "Line", glyph: "∿" },
      { type: "area", label: "Area", glyph: "◺" },
      { type: "stackedArea", label: "Stacked area", glyph: "◿" },
      { type: "combo", label: "Line and stacked column", glyph: "▮∿" },
    ],
  },
  {
    group: "Part to whole & distribution",
    items: [
      { type: "pie", label: "Pie", glyph: "◕" },
      { type: "donut", label: "Donut", glyph: "◎" },
      { type: "treemap", label: "Treemap", glyph: "▧" },
      { type: "funnel", label: "Funnel", glyph: "▽" },
      { type: "ribbon", label: "Ribbon", glyph: "≋" },
      { type: "waterfall", label: "Waterfall", glyph: "⌷" },
      { type: "scatter", label: "Scatter", glyph: "∴" },
      { type: "bubble", label: "Bubble", glyph: "◌" },
    ],
  },
  {
    group: "Single value & tabular",
    items: [
      { type: "card", label: "Card (new) ⚡", glyph: "⚡" },
      { type: "kpi", label: "KPI", glyph: "◭" },
      { type: "gauge", label: "Gauge", glyph: "◠" },
      { type: "table", label: "Table", glyph: "▦" },
      { type: "matrix", label: "Matrix", glyph: "▤" },
    ],
  },
  {
    group: "Maps",
    items: [
      { type: "map", label: "Map", glyph: "◍" },
      { type: "filledMap", label: "Filled map", glyph: "◉" },
      { type: "shapeMap", label: "Shape map", glyph: "⬡" },
    ],
  },
  {
    group: "Slicers",
    items: [
      { type: "slicer", label: "Slicer (checkbox)", glyph: "☑" },
      { type: "buttonSlicer", label: "Button slicer", glyph: "▭▭" },
      { type: "listSlicer", label: "List slicer", glyph: "◉" },
      { type: "inputSlicer", label: "Input slicer", glyph: "⌨" },
      { type: "dateSlicer", label: "Date picker slicer", glyph: "🗓" },
    ],
  },
  {
    group: "AI, scripted & other",
    items: [
      { type: "decompositionTree", label: "Decomposition tree", glyph: "⑃" },
      { type: "keyInfluencers", label: "Key influencers", glyph: "★" },
      { type: "smartNarrative", label: "Smart narrative", glyph: "¶" },
      { type: "qna", label: "Q&A", glyph: "?" },
      { type: "rVisual", label: "R visual", glyph: "R" },
      { type: "pythonVisual", label: "Python visual", glyph: "Py" },
      { type: "text", label: "Text box", glyph: "T" },
      { type: "image", label: "Image", glyph: "🖼" },
      { type: "button", label: "Button", glyph: "⬒" },
    ],
  },
];

const AGGS: Agg[] = ["sum", "avg", "count", "distinct", "min", "max"];

export function VisualizationsPane() {
  const {
    selected,
    addVisual,
    updateVisual,
    dropField,
    removeWellField,
    setWellAgg,
    toggleAnalytics,
    page,
    pages,
    setPageFormat,
  } = usePbi();
  const [tab, setTab] = useState<"fields" | "format" | "analytics">("fields");

  const Well = ({ name, label }: { name: WellName; label: string }) => (
    <div className="mb-3">
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{label}</div>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (selected) dropField(selected.id, name, e.dataTransfer.getData("text/plain"));
        }}
        className="min-h-9 rounded border border-dashed border-border bg-background p-1"
      >
        {selected?.[name].length ? (
          selected[name].map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="mb-1 flex items-center gap-1 rounded bg-muted px-2 py-1 text-[11px]"
            >
              <span className="flex-1 truncate">
                {fieldType(f.name) === "number" && !isMeasure(f.name) ? measureLabel(f) : f.name}
              </span>
              {fieldType(f.name) === "number" && !isMeasure(f.name) && (
                <select
                  value={f.agg}
                  onChange={(e) => setWellAgg(selected.id, name, i, e.target.value as Agg)}
                  className="rounded border border-border bg-background text-[10px]"
                >
                  {AGGS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={() => removeWellField(selected.id, name, i)}>
                <X className="size-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))
        ) : (
          <div className="px-1 py-1 text-[11px] text-muted-foreground">Add data fields here</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <PaneHeader title="Visualizations" />
      <div className="max-h-56 overflow-auto border-b border-border px-2 pb-2">
        {VISUAL_GROUPS.map((g) => (
          <div key={g.group} className="mb-2">
            <div className="mb-1 text-[9px] uppercase tracking-wide text-muted-foreground">
              {g.group}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {g.items.map((v) => (
                <button
                  key={v.type}
                  title={v.label}
                  onClick={() => (selected ? updateVisual(selected.id, { type: v.type }) : addVisual(v.type))}
                  className={cn(
                    "flex h-7 items-center justify-center rounded border border-border text-[10px] hover:bg-accent",
                    selected?.type === v.type && "border-brand bg-brand/15",
                  )}
                >
                  {v.glyph}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button className="w-full rounded border border-dashed border-border py-1 text-[10px] text-muted-foreground hover:bg-accent">
          + Get more visuals (AppSource)
        </button>
      </div>

      {!selected ? (
        <div className="flex-1 overflow-auto p-3 text-[11px]">
          <div className="mb-2 font-semibold">Format page — {page.name}</div>
          <label className="mb-2 block">
            <span className="mb-1 block text-muted-foreground">Canvas size</span>
            <select
              value={page.format.preset}
              onChange={(e) => {
                const p = PAGE_PRESETS.find((x) => x.name === e.target.value)!;
                setPageFormat(page.id, { preset: p.name, width: p.width, height: p.height, tooltip: p.name === "Tooltip" });
              }}
              className="w-full rounded border border-border bg-background px-2 py-1"
            >
              {PAGE_PRESETS.map((p) => (
                <option key={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-muted-foreground">Width px</span>
              <input
                type="number"
                value={page.format.width}
                onChange={(e) => setPageFormat(page.id, { width: Number(e.target.value), preset: "Custom" })}
                className="w-full rounded border border-border bg-background px-2 py-1"
              />
            </label>
            <label>
              <span className="mb-1 block text-muted-foreground">Height px</span>
              <input
                type="number"
                value={page.format.height}
                onChange={(e) => setPageFormat(page.id, { height: Number(e.target.value), preset: "Custom" })}
                className="w-full rounded border border-border bg-background px-2 py-1"
              />
            </label>
          </div>
          <label className="mb-2 block">
            <span className="mb-1 block text-muted-foreground">Page background</span>
            <input
              type="color"
              onChange={(e) => setPageFormat(page.id, { background: e.target.value })}
              className="h-7 w-full rounded border border-border bg-background"
            />
          </label>
          <label className="mb-2 flex items-center justify-between">
            <span>Use as tooltip page</span>
            <input
              type="checkbox"
              checked={page.format.tooltip}
              onChange={(e) => setPageFormat(page.id, { tooltip: e.target.checked })}
              className="accent-[var(--brand)]"
            />
          </label>
          <label className="flex items-center justify-between">
            <span>Hide page</span>
            <input
              type="checkbox"
              checked={page.format.hidden}
              onChange={(e) => setPageFormat(page.id, { hidden: e.target.checked })}
              className="accent-[var(--brand)]"
            />
          </label>
          <p className="mt-3 text-muted-foreground">
            Select a visual on the canvas to edit its fields, format and analytics.
          </p>
        </div>
      ) : (
        <>
          <div className="flex border-b border-border text-[11px]">
            {(["fields", "format", "analytics"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-1.5 capitalize",
                  tab === t ? "border-b-2 border-brand font-semibold" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "fields" ? "Build visual" : t === "format" ? "Format" : "Analytics"}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto p-3">
            {tab === "fields" && (
              <>
                <Well name="axis" label={selected.type.toLowerCase().includes("slicer") ? "Field" : "X-axis / Rows"} />
                <Well name="legend" label="Legend / Columns" />
                <Well name="values" label="Values" />
                <Well name="smallMultiples" label="Small multiples" />
                <Well name="tooltips" label="Tooltips" />
                <Well name="drillFields" label="Extraction / drill fields" />
                <label className="block text-[11px]">
                  <span className="mb-1 block text-muted-foreground">Tooltip page</span>
                  <select
                    value={selected.tooltipPageId ?? ""}
                    onChange={(e) => updateVisual(selected.id, { tooltipPageId: e.target.value || undefined })}
                    className="w-full rounded border border-border bg-background px-2 py-1"
                  >
                    <option value="">Default</option>
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {tab === "format" && (
              <div className="space-y-3 text-[11px]">
                <label className="block">
                  <span className="mb-1 block text-muted-foreground">Title</span>
                  <input
                    value={selected.title}
                    onChange={(e) => updateVisual(selected.id, { title: e.target.value })}
                    className="w-full rounded border border-border bg-background px-2 py-1"
                  />
                </label>
                {(selected.type === "text" || selected.type === "button") && (
                  <label className="block">
                    <span className="mb-1 block text-muted-foreground">Text</span>
                    <textarea
                      value={selected.text ?? ""}
                      onChange={(e) => updateVisual(selected.id, { text: e.target.value })}
                      className="h-20 w-full rounded border border-border bg-background px-2 py-1"
                    />
                  </label>
                )}
                {selected.type === "image" && (
                  <label className="block">
                    <span className="mb-1 block text-muted-foreground">Image URL</span>
                    <input
                      value={selected.imageUrl ?? ""}
                      onChange={(e) => updateVisual(selected.id, { imageUrl: e.target.value })}
                      className="w-full rounded border border-border bg-background px-2 py-1"
                    />
                  </label>
                )}
                {(
                  [
                    ["showTitle", "Show title"],
                    ["showLegend", "Show legend"],
                    ["showLabels", "Data labels"],
                    ["border", "Border"],
                    ["shadow", "Shadow"],
                    ["conditionalFormat", "Conditional formatting (data bars)"],
                    ["subtotals", "Totals / subtotals"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(selected[key])}
                      onChange={(e) => updateVisual(selected.id, { [key]: e.target.checked })}
                      className="accent-[var(--brand)]"
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="mb-1 block text-muted-foreground">Data colors (palette offset)</span>
                  <input
                    type="range"
                    min={0}
                    max={7}
                    value={selected.colorIndex}
                    onChange={(e) => updateVisual(selected.id, { colorIndex: Number(e.target.value) })}
                    className="w-full accent-[var(--brand)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-muted-foreground">Alt text (accessibility)</span>
                  <input
                    value={selected.altText}
                    onChange={(e) => updateVisual(selected.id, { altText: e.target.value })}
                    className="w-full rounded border border-border bg-background px-2 py-1"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["x", "y", "w", "h"] as const).map((k) => (
                    <label key={k}>
                      <span className="mb-1 block text-muted-foreground">
                        {k === "w" ? "Width" : k === "h" ? "Height" : k.toUpperCase()} px
                      </span>
                      <input
                        type="number"
                        value={selected[k]}
                        onChange={(e) => updateVisual(selected.id, { [k]: Number(e.target.value) })}
                        className="w-full rounded border border-border bg-background px-2 py-1"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {tab === "analytics" && (
              <div className="space-y-2 text-[11px]">
                {(["constant", "average", "trend", "forecast"] as const).map((k) => (
                  <label key={k} className="flex items-center justify-between capitalize">
                    <span>{k} line</span>
                    <input
                      type="checkbox"
                      checked={selected.analytics.some((a) => a.kind === k)}
                      onChange={() => toggleAnalytics(selected.id, k)}
                      className="accent-[var(--brand)]"
                    />
                  </label>
                ))}
                <p className="pt-2 text-muted-foreground">
                  Lines apply to cartesian visuals (column, line, combo).
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------- Filters pane ---------------------------- */

export function FiltersPane() {
  const { filters, addFilter, toggleFilterValue, removeFilter, selected } = usePbi();
  const columns = TABLES.flatMap((t) => t.fields)
    .filter((f) => f.type !== "number")
    .map((f) => f.name);

  return (
    <div className="flex h-full flex-col">
      <PaneHeader title="Filters" right={<Filter className="size-3 text-muted-foreground" />} />
      <div className="px-3 pb-2">
        <select
          value=""
          onChange={(e) => e.target.value && addFilter(e.target.value)}
          className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
        >
          <option value="">Add a filter field…</option>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 space-y-2 overflow-auto px-3 pb-3">
        {selected && (
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Filters on this visual: {selected.name}
          </p>
        )}
        {!filters.length && (
          <p className="text-[11px] text-muted-foreground">
            Filters on all pages. Double-click a field in the Data pane to add it here.
          </p>
        )}
        {filters.map((f) => (
          <div key={f.column} className="rounded border border-border bg-background p-2">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium">
              <span>
                {f.column}{" "}
                <span className="text-muted-foreground">
                  is {f.values.length ? f.values.join(", ") : "(All)"}
                </span>
              </span>
              <button onClick={() => removeFilter(f.column)}>
                <X className="size-3 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
            <div className="max-h-36 overflow-auto">
              {distinctValues(f.column).map((v) => (
                <label key={v} className="flex items-center gap-2 py-[1px] text-[11px]">
                  <input
                    type="checkbox"
                    checked={f.values.includes(v)}
                    onChange={() => toggleFilterValue(f.column, v)}
                    className="size-3 accent-[var(--brand)]"
                  />
                  <span className="truncate">{v}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------- Selection pane --------------------------- */

export function SelectionPane() {
  const { page, selected, select, updateVisual, toggleVisualHidden, reorderVisual, togglePane } = usePbi();
  const ordered = [...page.visuals].sort((a, b) => b.z - a.z);
  return (
    <div className="flex h-full flex-col">
      <PaneHeader
        title="Selection"
        right={
          <button onClick={() => togglePane("selection")} aria-label="Close selection pane">
            <X className="size-3 text-muted-foreground" />
          </button>
        }
      />
      <p className="px-3 pb-1 text-[10px] text-muted-foreground">Layer order (front to back) · tab order</p>
      <div className="flex-1 overflow-auto px-2 pb-2">
        {ordered.map((v, i) => (
          <div
            key={v.id}
            className={cn(
              "mb-1 flex items-center gap-1 rounded px-1 py-1 text-[11px]",
              selected?.id === v.id ? "bg-brand/15" : "hover:bg-accent",
            )}
          >
            <span className="w-4 text-center text-[9px] text-muted-foreground">{i + 1}</span>
            <input
              value={v.name}
              onChange={(e) => updateVisual(v.id, { name: e.target.value })}
              onFocus={() => select(v.id)}
              className="min-w-0 flex-1 truncate bg-transparent outline-none"
            />
            <button onClick={() => reorderVisual(v.id, -1)} aria-label="Move up">
              <ChevronUp className="size-3 text-muted-foreground hover:text-foreground" />
            </button>
            <button onClick={() => reorderVisual(v.id, 1)} aria-label="Move down">
              <ChevronDown className="size-3 text-muted-foreground hover:text-foreground" />
            </button>
            <button onClick={() => toggleVisualHidden(v.id)} aria-label="Toggle visibility">
              {v.hidden ? (
                <EyeOff className="size-3 text-muted-foreground" />
              ) : (
                <Eye className="size-3 text-muted-foreground hover:text-foreground" />
              )}
            </button>
          </div>
        ))}
        {!ordered.length && <p className="px-1 text-[11px] text-muted-foreground">No objects on this page.</p>}
      </div>
    </div>
  );
}

/* --------------------------- Bookmarks pane --------------------------- */

export function BookmarksPane() {
  const { bookmarks, addBookmark, applyBookmark, removeBookmark, togglePane } = usePbi();
  return (
    <div className="flex h-full flex-col">
      <PaneHeader
        title="Bookmarks"
        right={
          <button onClick={() => togglePane("bookmarks")} aria-label="Close bookmarks pane">
            <X className="size-3 text-muted-foreground" />
          </button>
        }
      />
      <div className="px-3 pb-2">
        <button
          onClick={() => addBookmark(window.prompt("Bookmark name") ?? "")}
          className="flex w-full items-center justify-center gap-1 rounded border border-border py-1 text-[11px] hover:bg-accent"
        >
          <Plus className="size-3" /> Add bookmark
        </button>
      </div>
      <div className="flex-1 overflow-auto px-2 pb-2">
        {!bookmarks.length && (
          <p className="px-1 text-[11px] text-muted-foreground">
            Bookmarks capture filters, slicer selections, cross-filtering and visual visibility.
          </p>
        )}
        {bookmarks.map((b) => (
          <div key={b.id} className="mb-1 flex items-center gap-1 rounded px-1 py-1 text-[11px] hover:bg-accent">
            <Bookmark className="size-3 text-brand-foreground" />
            <button onClick={() => applyBookmark(b.id)} className="min-w-0 flex-1 truncate text-left">
              {b.name}
            </button>
            <button onClick={() => removeBookmark(b.id)} aria-label="Delete bookmark">
              <X className="size-3 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------- Sync slicers pane -------------------------- */

export function SyncSlicersPane() {
  const { page, pages, slicerSync, setSlicerSync, togglePane } = usePbi();
  const slicers = page.visuals.filter((v) => v.type.toLowerCase().includes("slicer"));
  return (
    <div className="flex h-full flex-col">
      <PaneHeader
        title="Sync slicers"
        right={
          <button onClick={() => togglePane("syncSlicers")} aria-label="Close sync slicers pane">
            <X className="size-3 text-muted-foreground" />
          </button>
        }
      />
      <div className="flex-1 overflow-auto px-3 pb-3 text-[11px]">
        {!slicers.length && <p className="text-muted-foreground">Add a slicer to this page to sync it.</p>}
        {slicers.map((s) => (
          <div key={s.id} className="mb-3">
            <div className="mb-1 font-medium">{s.name || visualTypeLabel(s.type)}</div>
            {pages.map((p) => (
              <label key={p.id} className="flex items-center justify-between py-[1px]">
                <span className="truncate">{p.name}</span>
                <input
                  type="checkbox"
                  checked={p.id === page.id || (slicerSync[s.id] ?? []).includes(p.id)}
                  disabled={p.id === page.id}
                  onChange={() => setSlicerSync(s.id, p.id)}
                  className="size-3 accent-[var(--brand)]"
                />
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
