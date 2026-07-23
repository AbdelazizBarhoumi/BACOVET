import type { Widget } from "./types";
import { AreaChartWidget } from "./widgets/area-chart";
import { BarChartWidget } from "./widgets/bar-chart";
import { ComboChartWidget } from "./widgets/combo-chart";
import { DividerWidget } from "./widgets/divider";
import { DonutWidget } from "./widgets/donut";
import { GaugeWidget } from "./widgets/gauge";
import { ImageWidget } from "./widgets/image";
import { KpiWidget } from "./widgets/kpi";
import { LineChartWidget } from "./widgets/line-chart";
import { ParetoWidget } from "./widgets/pareto";
import { PieChartWidget } from "./widgets/pie-chart";
import { RadarChartWidget } from "./widgets/radar-chart";
import type { KpiDataMap } from "./widgets/shared";
import { SimpleTableWidget } from "./widgets/simple-table";
import { SparklineWidget } from "./widgets/sparkline";
import { TableGridWidget } from "./widgets/table-grid";
import { TextWidget } from "./widgets/text";

export function WidgetRenderer({ w, editing, onCellSelect, selectedCells, kpiData }: {
  w: Widget;
  editing?: boolean;
  onCellSelect?: (r: number, c: number, add: boolean) => void;
  selectedCells?: string[];
  kpiData?: KpiDataMap;
}) {
  const c = w.config;

  switch (w.type) {
    case "kpi":
      return <KpiWidget c={c} kpiData={kpiData} />;
    case "gauge":
      return <GaugeWidget c={c} kpiData={kpiData} />;
    case "sparkline":
      return <SparklineWidget c={c} kpiData={kpiData} />;
    case "line":
      return <LineChartWidget c={c} kpiData={kpiData} />;
    case "bar":
      return <BarChartWidget c={c} kpiData={kpiData} />;
    case "pareto":
      return <ParetoWidget c={c} kpiData={kpiData} />;
    case "donut":
      return <DonutWidget c={c} kpiData={kpiData} />;
    case "pie":
      return <PieChartWidget c={c} kpiData={kpiData} />;
    case "radar":
      return <RadarChartWidget c={c} kpiData={kpiData} />;
    case "area":
      return <AreaChartWidget c={c} kpiData={kpiData} />;
    case "combo":
      return <ComboChartWidget c={c} kpiData={kpiData} />;
    case "table":
      return <SimpleTableWidget c={c} kpiData={kpiData} />;
    case "table-grid":
      return <TableGridWidget c={c} editing={!!editing} onCellSelect={onCellSelect} selectedCells={selectedCells} kpiData={kpiData} />;
    case "text":
      return <TextWidget c={c} />;
    case "image":
      return <ImageWidget c={c} />;
    case "divider":
      return <DividerWidget c={c} />;
    default:
      return <div>Unknown widget</div>;
  }
}
