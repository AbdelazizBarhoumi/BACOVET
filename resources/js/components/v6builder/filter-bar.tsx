import { Filter, X } from "lucide-react";
import { RELATIVE_PRESETS } from "./filters";
import { useBuilder } from "./store";

function truncate(values: string[], cap = 3): string {
  if (!values.length) return "";
  const shown = values.slice(0, cap);
  const rest = values.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} +${rest}` : shown.join(", ");
}

function presetLabel(key?: string): string | null {
  if (!key) return null;
  return RELATIVE_PRESETS.find((p) => p.key === key)?.label ?? null;
}

export function FilterBar() {
  const {
    widgets,
    slicerSelections,
    setSlicerSelections,
    slicerDateRanges,
    setSlicerDateRanges,
    slicerTopN,
    setSlicerTopN,
    crossFilter,
    clearCrossFilter,
    clearAllFilters,
  } = useBuilder();

  const activeSlicers = widgets
    .filter((w) => {
      const sel = slicerSelections[w.id];
      return sel && sel.length > 0;
    })
    .map((w) => ({ id: w.id, label: w.config.label ?? w.type, sel: slicerSelections[w.id] ?? [] }));

  const activeDates = widgets
    .filter((w) => {
      const r = slicerDateRanges[w.id];
      return r && (r.from || r.to);
    })
    .map((w) => {
      const r = slicerDateRanges[w.id]!;
      return { id: w.id, label: w.config.label ?? w.type, r };
    });

  const activeTopN = widgets
    .filter((w) => slicerTopN[w.id]?.enabled)
    .map((w) => {
      const t = slicerTopN[w.id]!;
      return { id: w.id, label: w.config.label ?? w.type, n: t.n, axis: t.axis };
    });

  const sourceWidget = crossFilter ? widgets.find((w) => w.id === crossFilter.sourceId) : null;

  const hasFilters =
    activeSlicers.length > 0 ||
    activeDates.length > 0 ||
    activeTopN.length > 0 ||
    !!crossFilter;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-card/40 px-3 py-1.5">
      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Filter className="size-3" /> Filtres actifs
      </span>

      {activeSlicers.map((s) => (
        <span key={s.id} className="flex items-center gap-1.5 rounded-full border border-border bg-background pl-2 pr-1 py-0.5 text-[11px]">
          <span className="max-w-40 truncate font-medium">{s.label}</span>
          <span className="max-w-56 truncate text-muted-foreground">{truncate(s.sel)}</span>
          <button
            onClick={() => setSlicerSelections((prev) => { const next = { ...prev }; delete next[s.id]; return next; })}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Retirer ce filtre"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      {activeDates.map((d) => {
        const preset = presetLabel(d.r.preset);
        const text = preset ? preset : `${d.r.from ?? "…"} → ${d.r.to ?? "…"}`;
        return (
          <span key={d.id} className="flex items-center gap-1.5 rounded-full border border-border bg-background pl-2 pr-1 py-0.5 text-[11px]">
            <span className="max-w-40 truncate font-medium">{d.label}</span>
            <span className="max-w-56 truncate text-muted-foreground">{text}</span>
            <button
              onClick={() => setSlicerDateRanges((prev) => { const next = { ...prev }; delete next[d.id]; return next; })}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Retirer ce filtre"
            >
              <X className="size-3" />
            </button>
          </span>
        );
      })}

      {activeTopN.map((t) => (
        <span key={t.id} className="flex items-center gap-1.5 rounded-full border border-border bg-background pl-2 pr-1 py-0.5 text-[11px]">
          <span className="max-w-40 truncate font-medium">{t.label}</span>
          <span className="text-muted-foreground">Top {t.n} · {t.axis}</span>
          <button
            onClick={() => setSlicerTopN((prev) => { const next = { ...prev }; delete next[t.id]; return next; })}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Retirer ce filtre"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      {crossFilter && (
        <span className="flex items-center gap-1.5 rounded-full border border-[var(--brand)] bg-[color-mix(in_oklch,var(--brand)_10%,transparent)] pl-2 pr-1 py-0.5 text-[11px]">
          <span className="max-w-40 truncate font-medium">{sourceWidget?.config.label ?? "Sélection"}</span>
          <span className="max-w-56 truncate text-muted-foreground">
            {crossFilter.column} = {crossFilter.value}
            {crossFilter.mode === "highlight" ? " · surbrillance" : ""}
          </span>
          <button
            onClick={clearCrossFilter}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Retirer ce filtre"
          >
            <X className="size-3" />
          </button>
        </span>
      )}

      <button
        onClick={clearAllFilters}
        className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        Tout effacer
      </button>
    </div>
  );
}
