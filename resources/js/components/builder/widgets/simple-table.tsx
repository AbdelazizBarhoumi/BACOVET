import type { WidgetConfig } from "../types";
import { boxStyle, wrap, resolveKpiSeries, targetColor, sortDesc, noSeriesData, noKpiSelected, type KpiDataMap } from "./shared";

export function SimpleTableWidget({ c, kpiData }: { c: WidgetConfig; kpiData?: KpiDataMap }) {
  const { series, hasData } = resolveKpiSeries(c, kpiData);
  if (!c.kpiCode) return wrap(c, boxStyle(c), noKpiSelected());
  if (!hasData) return wrap(c, boxStyle(c), noSeriesData());

  const sorted = sortDesc(series);
  const maxAbs = Math.max(...sorted.map((s) => Math.abs(s.v)), 1);

  return wrap(c, boxStyle(c),
    <div className="text-xs overflow-auto h-full rounded-md border border-border/60">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-secondary/85 backdrop-blur text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2.5 py-1.5 text-left font-semibold">Nom</th>
            <th className="px-2.5 py-1.5 text-right font-semibold">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => {
            const color = targetColor(r.v, c.target, maxAbs);
            const barWidth = maxAbs ? (Math.abs(r.v) / maxAbs) * 100 : 0;
            return (
              <tr key={r.x} className={`border-t border-border/60 transition-colors ${i % 2 === 1 ? "bg-black/[0.02]" : ""}`}>
                <td className="px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-muted-foreground w-3 text-right shrink-0">{i + 1}</span>
                    <span className="truncate">{r.x}</span>
                  </span>
                </td>
                <td className="px-2.5 py-1.5">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-10 rounded-full bg-black/5 overflow-hidden shrink-0">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${barWidth}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="font-bold tabular-nums whitespace-nowrap" style={{ color }}>
                      {r.v.toFixed(c.decimals ?? 1).replace(".", ",")}{c.unit ?? ""}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
