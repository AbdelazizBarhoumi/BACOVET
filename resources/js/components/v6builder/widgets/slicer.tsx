import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  RELATIVE_PRESETS,
  relativeDateRange,
  slicerDistinctValues,
  topNAggregates,
  validateDateRange,
  type RelativePreset,
  type SlicerMode,
} from "../filters";
import { useBuilder } from "../store";
import type { WidgetConfig } from "../types";
import { boxStyle, noDataBound, wrap } from "./shared";

export type SlicerType = "slicer" | "buttonSlicer" | "listSlicer" | "inputSlicer" | "dateSlicer";

const DEFAULT_MODE: Record<SlicerType, SlicerMode> = {
  slicer: "list",
  buttonSlicer: "buttons",
  listSlicer: "list",
  inputSlicer: "search",
  dateSlicer: "date",
};

export const SLICER_MODES: { value: SlicerMode; label: string }[] = [
  { value: "list", label: "Liste" },
  { value: "dropdown", label: "Menu déroulant" },
  { value: "search", label: "Recherche" },
  { value: "buttons", label: "Boutons" },
  { value: "date", label: "Plage de dates" },
  { value: "relative", label: "Date relative" },
  { value: "topN", label: "Top N" },
];

export function SlicerWidget({ type, c, id }: { type: SlicerType; c: WidgetConfig; id?: string }) {
  const { rowsBySlug, slicerSelections, setSlicerSelections, slicerDateRanges, setSlicerDateRanges, slicerTopN, setSlicerTopN } = useBuilder();
  const [q, setQ] = useState("");
  const rows = useMemo(() => rowsBySlug[c.datasetSlug ?? ""] ?? [], [rowsBySlug, c.datasetSlug]);
  const selected = new Set(slicerSelections[id ?? ""] ?? []);
  const range = slicerDateRanges[id ?? ""] ?? { from: c.slicerMin ?? "", to: c.slicerMax ?? "" };
  const topn = slicerTopN[id ?? ""];

  const mode: SlicerMode = c.slicerMode ?? DEFAULT_MODE[type];
  const field = c.dataAxis;

  const { values, total, truncated } = useMemo(
    () => slicerDistinctValues(rows, field ?? "", q),
    [rows, field, q],
  );

  const topNN = topn?.n ?? c.maxCategories ?? 10;
  const topNPreview = useMemo(
    () => topNAggregates(rows, field ?? "", c.dataValue, Math.max(1, topNN)),
    [rows, field, c.dataValue, topNN],
  );

  if (!c.datasetSlug || !field) return wrap(c, boxStyle(c), noDataBound());
  if (!rows.length) return wrap(c, boxStyle(c), <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>);

  const setSelection = (next: Set<string>) => {
    if (!id) return;
    setSlicerSelections((prev) => ({ ...prev, [id]: [...next] }));
  };

  const toggle = (v: string) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v); else next.add(v);
    setSelection(next);
  };

  const clear = () => setSelection(new Set());

  const setRange = (r: { from?: string; to?: string; preset?: string }) => {
    if (!id) return;
    setSlicerDateRanges((prev) => ({ ...prev, [id]: r }));
  };

  const setPreset = (preset: RelativePreset) => {
    if (!id) return;
    setSlicerDateRanges((prev) => ({ ...prev, [id]: { ...relativeDateRange(preset), preset } }));
  };

  const setTopN = (patch: Partial<NonNullable<typeof topn>>) => {
    if (!id) return;
    setSlicerTopN((prev) => ({
      ...prev,
      [id]: { axis: field, value: c.dataValue ?? "", n: topn?.n ?? c.maxCategories ?? 10, enabled: topn?.enabled ?? false, ...patch },
    }));
  };

  const topNEnabled = topn?.enabled ?? false;

  const CountBadge = selected.size > 0 ? (
    <span className="rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] text-[9px] font-semibold px-1.5 py-0.5 leading-none">
      {selected.size}
    </span>
  ) : null;

  const TruncatedNote = truncated ? (
    <div className="px-2 py-1 text-[10px] text-muted-foreground">… {total.toLocaleString()} valeurs ({SLICER_MODES.find((m) => m.value === mode)?.label.toLowerCase() ?? ""} limitée)</div>
  ) : null;

  let body: React.ReactNode;
  switch (mode) {
    case "buttons":
      body = (
        <div className="flex h-full flex-wrap content-start gap-1.5 overflow-auto p-1.5">
          {values.map((v) => (
            <button
              key={v}
              onClick={() => toggle(v)}
              className="rounded-full border px-2.5 py-1 text-[10px] font-medium transition-all duration-150 hover:shadow-sm active:scale-95"
              style={selected.has(v)
                ? { borderColor: "var(--brand)", background: "var(--brand)", color: "var(--brand-foreground)" }
                : { borderColor: "var(--border)" }}
            >
              {v}
            </button>
          ))}
          {TruncatedNote}
        </div>
      );
      break;
    case "dropdown":
      body = <DropdownBody q={q} setQ={setQ} values={values} total={total} truncated={truncated} selected={selected} toggle={toggle} field={field} CountBadge={CountBadge} />;
      break;
    case "date":
      body = (
        <div className="flex h-full flex-col justify-center gap-2 p-2 text-[11px]">
          <button onClick={() => setRange({ from: "", to: "" })} className="self-end text-[10px] text-muted-foreground transition-colors hover:text-foreground">Effacer</button>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Du</span>
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1 transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--brand)]" />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Au</span>
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="rounded-md border border-border bg-background px-2 py-1 transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--brand)]" />
          </label>
          {!validateDateRange(range.from, range.to) && (
            <div className="rounded border border-destructive/30 bg-destructive/10 px-2 py-1 text-[10px] text-destructive">
              La date de début doit précéder la date de fin.
            </div>
          )}
        </div>
      );
      break;
    case "relative":
      body = (
        <div className="flex h-full flex-col gap-1 overflow-auto p-1.5">
          {RELATIVE_PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className="flex w-full items-center justify-between rounded-md border border-border bg-background px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-accent"
              style={range.preset === key ? { borderColor: "var(--brand)", background: "color-mix(in oklch, var(--brand) 12%, transparent)" } : {}}
            >
              <span>{label}</span>
              {range.preset === key && <span className="text-[9px] text-muted-foreground">{range.from ? `${range.from} → ${range.to ?? "…"}` : "Toutes"}</span>}
            </button>
          ))}
          <button onClick={() => setRange({ from: "", to: "" })} className="self-end rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:text-foreground">Effacer</button>
        </div>
      );
      break;
    case "topN":
      body = (
        <div className="flex h-full flex-col gap-2 overflow-auto p-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5">
              <input type="checkbox" checked={topNEnabled} onChange={(e) => setTopN({ enabled: e.target.checked })} className="size-3 accent-[var(--brand)]" />
              <span>Activer</span>
            </label>
            <label className="ml-auto flex items-center gap-1.5">
              <span className="text-muted-foreground">N</span>
              <input type="number" min={1} max={500} value={topNN} onChange={(e) => setTopN({ n: Math.max(1, Number(e.target.value) || 1) })} className="w-16 rounded-md border border-border bg-background px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[var(--brand)]" />
            </label>
          </div>
          {!c.dataValue && (
            <div className="rounded border border-amber-300/50 bg-amber-50 px-2 py-1.5 text-[10px] text-amber-700">
              Liez une valeur (colonne numérique) dans l'onglet Données pour classer par total.
            </div>
          )}
          <div className="flex-1 space-y-0.5 overflow-auto">
            {topNPreview.map((e, i) => (
              <div key={e.name} className="flex items-center gap-2 rounded px-1.5 py-0.5 hover:bg-accent">
                <span className="w-4 shrink-0 font-mono text-[9px] text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{e.name}</span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{e.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      );
      break;
    case "search":
      body = (
        <div className="flex h-full flex-col gap-2 p-1.5">
          <div className="flex items-center gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Filtrer ${field}…`}
              className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
            {CountBadge}
          </div>
          <div className="flex-1 overflow-auto">
            {values.map((v) => (
              <button
                key={v}
                onClick={() => toggle(v)}
                className="block w-full truncate rounded-md px-2 py-1 text-left text-[11px] transition-colors hover:bg-accent"
                style={selected.has(v) ? { background: "color-mix(in oklch, var(--brand) 15%, transparent)", fontWeight: 600 } : {}}
              >
                {v}
              </button>
            ))}
            {TruncatedNote}
          </div>
        </div>
      );
      break;
    case "list":
    default:
      body = (
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-1 px-1 pt-1">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Rechercher ${field}…`}
              className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
            {CountBadge}
            <button onClick={clear} className="ml-auto shrink-0 text-[10px] text-muted-foreground transition-colors hover:text-foreground">Effacer</button>
          </div>
          <div className="mt-1 flex-1 overflow-auto pr-1">
            {values.map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[11px] transition-colors hover:bg-accent">
                <input type="checkbox" checked={selected.has(v)} onChange={() => toggle(v)} className="size-3 accent-[var(--brand)]" />
                <span className="truncate">{v}</span>
              </label>
            ))}
            {TruncatedNote}
          </div>
        </div>
      );
  }

  return wrap(c, boxStyle(c), body);
}

function DropdownBody({ q, setQ, values, total, truncated, selected, toggle, field, CountBadge }: {
  q: string;
  setQ: (v: string) => void;
  values: string[];
  total: number;
  truncated: boolean;
  selected: Set<string>;
  toggle: (v: string) => void;
  field: string;
  CountBadge: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="flex h-full flex-col p-1.5" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-left text-[11px] transition-colors hover:bg-accent"
      >
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{field}</span>
        {CountBadge}
        <ChevronDown className={`size-3 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1 flex min-h-0 flex-1 flex-col rounded-md border border-border bg-card shadow-lg">
          <div className="border-b border-border p-1.5">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Rechercher…`}
              className="w-full rounded border border-border bg-background px-1.5 py-1 text-[11px] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-1">
            {values.map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-[11px] transition-colors hover:bg-accent">
                <input type="checkbox" checked={selected.has(v)} onChange={() => toggle(v)} className="size-3 accent-[var(--brand)]" />
                <span className="truncate">{v}</span>
              </label>
            ))}
            {truncated && values.length === 0 && <div className="px-1.5 py-1 text-[10px] text-muted-foreground">… {total.toLocaleString()} valeurs</div>}
            {values.length === 0 && (
              <div className="px-1.5 py-1 text-[10px] text-muted-foreground">Aucune valeur</div>
            )}
          </div>
          <div className="border-t border-border px-1.5 py-1 text-[10px] text-muted-foreground">
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""} · {total.toLocaleString()} valeur{total > 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
