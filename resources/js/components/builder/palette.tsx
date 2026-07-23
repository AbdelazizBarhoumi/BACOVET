import {
  BarChart3, Gauge as GaugeIcon, LineChart as LineIcon, PieChart,
  Sigma, Table as TableIcon, Type, Image as ImageIcon, Minus, Activity, TrendingUp, Grid3x3,
  Radar, AreaChart as AreaIcon, BarChart, Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { fetchKpiList, type KpiSeed } from "@/lib/kpi-rows";
import { useBuilder } from "./store";
import type { WidgetType } from "./types";

const WIDGETS: { type: WidgetType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "kpi", label: "KPI Card", icon: Sigma },
  { type: "gauge", label: "Half Gauge", icon: GaugeIcon },
  { type: "sparkline", label: "Sparkline", icon: TrendingUp },
  { type: "line", label: "Line Chart", icon: LineIcon },
  { type: "bar", label: "Bar Chart", icon: BarChart3 },
  { type: "pareto", label: "Pareto", icon: Activity },
  { type: "donut", label: "Donut", icon: PieChart },
  { type: "pie", label: "Pie Chart", icon: PieChart },
  { type: "radar", label: "Radar", icon: Radar },
  { type: "area", label: "Area Chart", icon: AreaIcon },
  { type: "combo", label: "Combo Chart", icon: BarChart },
  { type: "table", label: "Table simple", icon: TableIcon },
  { type: "table-grid", label: "Tableau libre", icon: Grid3x3 },
  { type: "text", label: "Texte / Titre", icon: Type },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "divider", label: "Séparateur", icon: Minus },
];

function onDragStart(e: React.DragEvent, type: WidgetType, payload?: Record<string, unknown>) {
  e.dataTransfer.setData("application/json", JSON.stringify({ type, ...payload }));
  e.dataTransfer.effectAllowed = "copy";
}

export function Palette() {
  const { addWidget } = useBuilder();
  const [q, setQ] = useState("");
  const [kpis, setKpis] = useState<KpiSeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKpiList().then((list) => {
      setKpis(Array.from(new Map(list.map((k) => [k.kpi, k])).values()));
      setLoading(false);
    });
  }, []);

  const filtered = kpis.filter(
    (k) => !q || k.kpi.toLowerCase().includes(q.toLowerCase()) || k.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="w-64 shrink-0 border-r border-border bg-card/40 h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="p-3 border-b border-border">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Widgets</div>
        <div className="grid grid-cols-2 gap-1.5">
          {WIDGETS.map((w) => {
            const Icon = w.icon;
            return (
              <button
                key={w.type}
                draggable
                onDragStart={(e) => onDragStart(e, w.type)}
                onClick={(e) => { e.stopPropagation(); addWidget(w.type); }}
                className="flex flex-col items-center justify-center gap-1 rounded border border-border bg-background hover:bg-secondary text-[10px] p-2 transition-colors cursor-grab active:cursor-grabbing"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="text-center leading-tight">{w.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">KPIs disponibles</div>
          <span className="text-[10px] text-muted-foreground">{loading ? "…" : filtered.length}</span>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher F-REQ-…"
          className="h-7 text-xs mb-2"
        />
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
            {filtered.map((k) => (
              <button
                key={k.kpi}
                draggable
                onDragStart={(e) => onDragStart(e, "kpi", {
                  config: {
                    kpiCode: k.kpi,
                    label: k.name,
                    unit: k.cible_is_percentage ? "%" : "",
                    decimals: 1,
                    target: k.cible_value ?? 90,
                    accent: "#22c55e",
                    showTarget: true,
                    showLabel: true,
                  },
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  addWidget("kpi", {
                    config: {
                      kpiCode: k.kpi,
                      label: k.name,
                      unit: k.cible_is_percentage ? "%" : "",
                      decimals: 1,
                      target: k.cible_value ?? 90,
                      accent: "#22c55e",
                      showTarget: true,
                      showLabel: true,
                    },
                  });
                }}
                className="w-full text-left rounded border border-border bg-background hover:bg-secondary px-2 py-1.5 transition-colors cursor-grab active:cursor-grabbing"
              >
                <div className="text-[10px] font-mono text-primary">{k.kpi}</div>
                <div className="text-[11px] leading-tight line-clamp-2">{k.name}</div>
                {k.module && (
                  <div className="text-[9px] text-muted-foreground mt-0.5">{k.module}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
