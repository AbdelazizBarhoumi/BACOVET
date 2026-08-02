import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, PIE_COLORS, resolveKpiSeries, noSeriesData, noKpiSelected, ScalerHeader, type KpiDataMap } from "./shared";

export function PieChartWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);
  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());
  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={series} c={c} />
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={series.map((s) => ({ name: s.x, value: s.v }))}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="2%"
              outerRadius="78%"
              paddingAngle={1.5}
              cornerRadius={4}
              stroke="var(--card, #fff)"
              strokeWidth={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
              fontSize={10}
            >
              {series.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} className="transition-opacity duration-150" />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e5e7eb" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
