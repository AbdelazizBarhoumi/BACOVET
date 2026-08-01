import type { Widget } from "./types";
import { AdvancedChartWidget } from "./widgets/advanced-chart";
import { AiVisualWidget } from "./widgets/ai-visuals";
import { AreaChartWidget } from "./widgets/area-chart";
import { BarChartWidget } from "./widgets/bar-chart";
import { ComboChartWidget } from "./widgets/combo-chart";
import { ComparisonChartWidget } from "./widgets/comparison-chart";
import { DividerWidget } from "./widgets/divider";
import { DonutWidget } from "./widgets/donut";
import { GaugeWidget } from "./widgets/gauge";
import { ButtonWidget, ImageWidget } from "./widgets/image-button";
import { KpiWidget } from "./widgets/kpi";
import { LineChartWidget } from "./widgets/line-chart";
import { MapWidget } from "./widgets/map";
import { MatrixWidget } from "./widgets/matrix";
import { ParetoWidget } from "./widgets/pareto";
import { PieChartWidget } from "./widgets/pie-chart";
import { RadarChartWidget } from "./widgets/radar-chart";
import { SimpleTableWidget } from "./widgets/simple-table";
import { SlicerWidget } from "./widgets/slicer";
import { SparklineWidget } from "./widgets/sparkline";
import { TableGridWidget } from "./widgets/table-grid";
import { TextWidget } from "./widgets/text";

export function WidgetRenderer({ w, editing, onCellSelect, selectedCells, cursor,
  onCopy, onPaste, onInsertRow, onInsertCol, onDeleteRow, onDeleteCol, onResize }: {
  w: Widget;
  editing?: boolean;
  onCellSelect?: (r: number, c: number, add: boolean) => void;
  selectedCells?: string[];
  cursor?: [number, number] | null;
  onCopy?: (r: number, c: number) => void;
  onPaste?: (r: number, c: number) => void;
  onInsertRow?: (r: number, position: "before" | "after") => void;
  onInsertCol?: (c: number, position: "before" | "after") => void;
  onDeleteRow?: (r: number) => void;
  onDeleteCol?: (c: number) => void;
  onResize?: (colWidths: number[], rowHeights: number[]) => void;
}) {
  const c = w.config;

  switch (w.type) {
    case "kpi":
      return <KpiWidget c={c} id={w.id} />;
    case "gauge":
      return <GaugeWidget c={c} id={w.id} />;
    case "sparkline":
      return <SparklineWidget c={c} id={w.id} />;
    case "line":
      return <LineChartWidget c={c} id={w.id} />;
    case "bar":
      return <BarChartWidget c={c} id={w.id} />;
    case "pareto":
      return <ParetoWidget c={c} id={w.id} />;
    case "donut":
      return <DonutWidget c={c} id={w.id} />;
    case "pie":
      return <PieChartWidget c={c} id={w.id} />;
    case "radar":
      return <RadarChartWidget c={c} id={w.id} />;
    case "area":
      return <AreaChartWidget c={c} id={w.id} />;
    case "combo":
      return <ComboChartWidget c={c} id={w.id} />;
    case "card":
    case "funnel":
    case "treemap":
    case "waterfall":
    case "scatter":
    case "bubble":
    case "stacked-bar":
    case "stacked-area":
      return <AdvancedChartWidget type={w.type} c={c} id={w.id} />;
    case "column":
    case "stackedColumn":
    case "stacked100Column":
    case "stacked100Bar":
    case "ribbon":
      return <ComparisonChartWidget type={w.type} c={c} id={w.id} />;
    case "matrix":
      return <MatrixWidget c={c} id={w.id} />;
    case "map":
    case "filledMap":
    case "shapeMap":
      return <MapWidget c={c} id={w.id} />;
    case "slicer":
    case "buttonSlicer":
    case "listSlicer":
    case "inputSlicer":
    case "dateSlicer":
      return <SlicerWidget type={w.type} c={c} id={w.id} />;
    case "image":
      return <ImageWidget c={c} />;
    case "button":
      return <ButtonWidget c={c} />;
    case "decompositionTree":
    case "keyInfluencers":
    case "smartNarrative":
    case "qna":
    case "rVisual":
    case "pythonVisual":
      return <AiVisualWidget type={w.type} c={c} id={w.id} />;
    case "table":
      return <SimpleTableWidget c={c} id={w.id} />;
    case "table-grid":
      return <TableGridWidget c={c} editing={!!editing} onCellSelect={onCellSelect}
        selectedCells={selectedCells} cursor={cursor}
        onCopy={onCopy} onPaste={onPaste} onInsertRow={onInsertRow} onInsertCol={onInsertCol}
        onDeleteRow={onDeleteRow} onDeleteCol={onDeleteCol} onResize={onResize} />;
    case "text":
      return <TextWidget c={c} />;
    case "divider":
      return <DividerWidget c={c} />;
    default:
      return <div>Unknown widget</div>;
  }
}
