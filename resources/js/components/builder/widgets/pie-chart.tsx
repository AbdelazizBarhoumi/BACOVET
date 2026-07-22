import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, PIE_COLORS, resolveKpiSeries, noSeriesData, noKpiSelected, type KpiDataMap } from "./shared";

export function PieChartWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);
  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());
  return wrap(c, boxStyle(c),
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={series.map((s) => ({ name: s.x, value: s.v }))}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius="80%"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
          fontSize={10}
        >
          {series.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
