import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, statusColor, noSeriesData, noKpiSelected, type KpiDataMap } from "./shared";

export function SimpleTableWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);
  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());
  return wrap(c, boxStyle(c),
    <div className="text-xs overflow-auto h-full">
      <table className="w-full">
        <thead className="bg-secondary/60 text-[10px] uppercase text-muted-foreground">
          <tr><th className="px-2 py-1 text-left">Nom</th><th className="px-2 py-1 text-right">Valeur</th></tr>
        </thead>
        <tbody>
          {series.map((r, i) => {
            const sc = c.target ? statusColor(r.v, c.target) : undefined;
            return (
              <tr key={i} className="border-t border-border">
                <td className="px-2 py-1">{r.x}</td>
                <td className="px-2 py-1 text-right font-bold" style={sc ? { color: sc } : undefined}>{r.v}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
