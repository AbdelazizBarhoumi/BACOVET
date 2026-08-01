import {
  BarChart3, Gauge as GaugeIcon, LineChart as LineIcon, PieChart,
  Sigma, Table as TableIcon, Type, Minus, Activity, TrendingUp, Grid3x3,
  Radar, AreaChart as AreaIcon, BarChart, ScatterChart as ScatterIcon, Workflow, GitBranch, SquareStack,
  ChartColumn, ChartColumnBig, Ticket, Image as ImageIcon, MousePointerClick,
  Map as MapIcon, MapPin, Filter, Calendar, List, TextCursorInput,
  ChartSpline, GitFork, Sparkles, MessageCircleQuestion, Braces, FileCode2,
} from "lucide-react";
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
  { type: "card", label: "Card", icon: Sigma },
  { type: "funnel", label: "Funnel", icon: Workflow },
  { type: "treemap", label: "Treemap", icon: SquareStack },
  { type: "waterfall", label: "Waterfall", icon: GitBranch },
  { type: "scatter", label: "Scatter", icon: ScatterIcon },
  { type: "bubble", label: "Bubble", icon: ScatterIcon },
  { type: "stacked-bar", label: "Stacked bar", icon: BarChart3 },
  { type: "stacked-area", label: "Stacked area", icon: AreaIcon },
  { type: "column", label: "Clustered column", icon: ChartColumnBig },
  { type: "stackedColumn", label: "Stacked column", icon: ChartColumn },
  { type: "stacked100Column", label: "100% stacked column", icon: ChartColumn },
  { type: "stacked100Bar", label: "100% stacked bar", icon: ChartColumn },
  { type: "ribbon", label: "Ribbon", icon: Ticket },
  { type: "matrix", label: "Matrix", icon: Grid3x3 },
  { type: "map", label: "Map", icon: MapPin },
  { type: "filledMap", label: "Filled map", icon: MapIcon },
  { type: "shapeMap", label: "Shape map", icon: ChartSpline },
  { type: "slicer", label: "Slicer", icon: Filter },
  { type: "buttonSlicer", label: "Button slicer", icon: MousePointerClick },
  { type: "listSlicer", label: "List slicer", icon: List },
  { type: "inputSlicer", label: "Input slicer", icon: TextCursorInput },
  { type: "dateSlicer", label: "Date slicer", icon: Calendar },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "button", label: "Button", icon: MousePointerClick },
  { type: "decompositionTree", label: "Arbre de décomposition", icon: GitFork },
  { type: "keyInfluencers", label: "Influenceurs clés", icon: Sparkles },
  { type: "smartNarrative", label: "Narratif intelligent", icon: Sparkles },
  { type: "qna", label: "Q&R", icon: MessageCircleQuestion },
  { type: "rVisual", label: "Visuel R", icon: Braces },
  { type: "pythonVisual", label: "Visuel Python", icon: FileCode2 },
  { type: "table", label: "Table simple", icon: TableIcon },
  { type: "table-grid", label: "Tableau libre", icon: Grid3x3 },
  { type: "text", label: "Texte / Titre", icon: Type },
  { type: "divider", label: "Séparateur", icon: Minus },
];

function onDragStart(e: React.DragEvent, type: WidgetType, payload?: Record<string, unknown>) {
  e.dataTransfer.setData("application/json", JSON.stringify({ type, ...payload }));
  e.dataTransfer.effectAllowed = "copy";
}

export function Palette() {
  const { addWidget } = useBuilder();
  const widgets = WIDGETS;

  return (
    <div className="w-64 shrink-0 border-r border-border bg-card/40 h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="p-3 border-b border-border">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Widgets</div>
        <div className="grid grid-cols-2 gap-1.5">
          {widgets.map((w) => {
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
    </div>
  );
}
