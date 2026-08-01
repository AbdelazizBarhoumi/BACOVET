import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, PIE_COLORS, hasWidgetBinding, useWidgetData, useCrossFilter, rechartClickLabel, noSeriesData, noDataBound, ScalerHeader } from "./shared";

export function PieChartWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { series, hasSeries } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());
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
              outerRadius="80%"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              fontSize={10}
              onClick={(entry: unknown) => { const n = rechartClickLabel(entry); if (n != null) click(n); }}
            >
              {series.map((s, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} fillOpacity={isDimmed(s.x) ? 0.2 : 1} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
