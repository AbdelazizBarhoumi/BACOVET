import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, wrap, PIE_COLORS, hasWidgetBinding, useWidgetData, useCrossFilter, rechartClickLabel, noSeriesData, noDataBound, ScalerHeader } from "./shared";

export function PieChartWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { multiSeries, hasSeries } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());

  const multiple = multiSeries.length > 1;

  return wrap(c, boxStyle(c),
    <div className="flex flex-col h-full">
      <ScalerHeader series={multiSeries[0]?.data ?? []} c={c} />
      <div className={`flex-1 min-h-0 ${multiple ? "grid gap-1" : ""}`} style={multiple ? { gridTemplateColumns: `repeat(${multiSeries.length}, 1fr)` } : undefined}>
        {multiSeries.map((ms, si) => (
          <ResponsiveContainer key={ms.name} width="100%" height="100%">
            <PieChart>
              <Pie
                data={ms.data.map((s) => ({ name: s.x, value: s.v }))}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={multiple ? "18%" : "2%"}
                outerRadius={multiple ? "72%" : "78%"}
                paddingAngle={1.5}
                cornerRadius={4}
                stroke="var(--card, #fff)"
                strokeWidth={2}
                label={multiple ? false : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={multiple ? false : { stroke: "#cbd5e1", strokeWidth: 1 }}
                fontSize={10}
                onClick={(entry: unknown) => { const n = rechartClickLabel(entry); if (n != null) click(n); }}
              >
                {ms.data.map((s, i) => (
                  <Cell
                    key={i}
                    fill={PIE_COLORS[(si + i) % PIE_COLORS.length]}
                    fillOpacity={isDimmed(s.x) ? 0.2 : 1}
                    className="transition-opacity duration-150 cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e5e7eb" }} />
            </PieChart>
          </ResponsiveContainer>
        ))}
      </div>
      {multiple && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 pb-1">
          {multiSeries.map((ms) => (
            <span key={ms.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ms.color }} />
              {ms.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
