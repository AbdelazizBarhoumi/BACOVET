import { useMemo, useState } from "react";
import { useBuilder } from "../store";
import type { WidgetConfig } from "../types";
import { boxStyle, noDataBound, wrap } from "./shared";

export type SlicerType = "slicer" | "buttonSlicer" | "listSlicer" | "inputSlicer" | "dateSlicer";

export function SlicerWidget({ type, c, id }: { type: SlicerType; c: WidgetConfig; id?: string }) {
  const { rowsBySlug, slicerSelections, setSlicerSelections, slicerDateRanges, setSlicerDateRanges } = useBuilder();
  const [q, setQ] = useState("");
  const rows = useMemo(() => rowsBySlug[c.datasetSlug ?? ""] ?? [], [rowsBySlug, c.datasetSlug]);
  const selected = new Set(slicerSelections[id ?? ""] ?? []);
  const range = slicerDateRanges[id ?? ""] ?? { from: c.slicerMin ?? "", to: c.slicerMax ?? "" };

  const field = c.dataAxis;
  const values = useMemo(() => {
    if (!rows.length || !field) return [];
    return [...new Set(rows.map((row) => String(row[field] ?? "(vide)")))].filter((v) =>
      v.toLowerCase().includes(q.toLowerCase()),
    );
  }, [rows, field, q]);

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

  const setRange = (r: { from?: string; to?: string }) => {
    if (!id) return;
    setSlicerDateRanges((prev) => ({ ...prev, [id]: r }));
  };

  let body: React.ReactNode;
  switch (type) {
    case "buttonSlicer":
      body = (
        <div className="flex h-full flex-wrap content-start gap-1 overflow-auto p-1">
          {values.map((v) => (
            <button
              key={v}
              onClick={() => toggle(v)}
              className="rounded border px-2 py-1 text-[10px] transition-colors"
              style={selected.has(v)
                ? { borderColor: "var(--brand)", background: "var(--brand)", color: "var(--brand-foreground)" }
                : { borderColor: "var(--border)" }}
            >
              {v}
            </button>
          ))}
        </div>
      );
      break;
    case "inputSlicer":
      body = (
        <div className="flex h-full flex-col gap-2 p-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Type to filter ${field}…`}
            className="rounded border border-border bg-background px-2 py-1 text-[11px]"
          />
          <div className="flex-1 overflow-auto">
            {values.map((v) => (
              <button
                key={v}
                onClick={() => toggle(v)}
                className="block w-full truncate rounded px-2 py-0.5 text-left text-[11px]"
                style={selected.has(v) ? { background: "color-mix(in oklch, var(--brand) 15%, transparent)" } : {}}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      );
      break;
    case "dateSlicer":
      body = (
        <div className="flex h-full flex-col justify-center gap-2 p-2 text-[11px]">
          <button onClick={() => setRange({ from: "", to: "" })} className="self-end text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">From</span>
            <input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="rounded border border-border bg-background px-2 py-1" />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">To</span>
            <input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="rounded border border-border bg-background px-2 py-1" />
          </label>
        </div>
      );
      break;
    case "listSlicer":
    default:
      body = (
        <div className="flex h-full flex-col">
          <button onClick={clear} className="self-end text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
          <div className="mt-1 flex-1 overflow-auto pr-1">
            {values.map((v) => (
              <label key={v} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-[11px] hover:bg-accent">
                <input type="checkbox" checked={selected.has(v)} onChange={() => toggle(v)} className="size-3 accent-[var(--brand)]" />
                <span className="truncate">{v}</span>
              </label>
            ))}
          </div>
        </div>
      );
  }

  return wrap(c, boxStyle(c), body);
}
