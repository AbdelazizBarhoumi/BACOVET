import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, useCrossFilter, targetColor, noSeriesData, noDataBound } from "./shared";

export function SimpleTableWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { multiSeries, hasSeries } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());

  const rows = multiSeries.length
    ? multiSeries[0].data.map((row, i) => ({
        x: row.x,
        values: Object.fromEntries(multiSeries.map((ms) => [ms.name, ms.data[i]?.v ?? 0])),
      }))
    : [];

  const multiple = multiSeries.length > 1;

  return wrap(c, boxStyle(c),
    <div className="text-xs overflow-auto h-full rounded-md border border-border/60">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-secondary/85 backdrop-blur text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2.5 py-1.5 text-left font-semibold">Nom</th>
            {multiSeries.map((ms) => (
              <th key={ms.name} className="px-2.5 py-1.5 text-right font-semibold">
                <span className="flex items-center justify-end gap-1.5">
                  {multiple && <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ms.color }} />}
                  {ms.label}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const dimmed = isDimmed(r.x);
            return (
              <tr
                key={r.x}
                onClick={() => click(r.x)}
                className={`border-t border-border/60 transition-colors ${i % 2 === 1 ? "bg-black/[0.02]" : ""} ${c.dataAxis ? "cursor-pointer hover:bg-accent" : ""}`}
                style={dimmed ? { opacity: 0.25 } : undefined}
              >
                <td className="px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono text-muted-foreground w-3 text-right shrink-0">{i + 1}</span>
                    <span className="truncate">{r.x}</span>
                  </span>
                </td>
                {multiSeries.map((ms) => {
                  const val = (r.values as Record<string, number>)[ms.name] ?? 0;
                  const color = targetColor(val, c.target, Math.max(...ms.data.map((d) => Math.abs(d.v)), 1));
                  return (
                    <td key={ms.name} className="px-2.5 py-1.5">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold tabular-nums whitespace-nowrap" style={{ color }}>
                          {val.toFixed(c.decimals ?? 1).replace(".", ",")}{c.unit ?? ""}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
