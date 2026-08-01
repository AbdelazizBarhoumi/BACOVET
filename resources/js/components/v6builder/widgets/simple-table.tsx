import type { WidgetConfig } from "../types";
import { boxStyle, wrap, hasWidgetBinding, useWidgetData, useCrossFilter, statusColor, noSeriesData, noDataBound } from "./shared";

export function SimpleTableWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { series, hasSeries } = useWidgetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  if (!hasWidgetBinding(c)) return wrap(c, boxStyle(c), noDataBound());
  if (!hasSeries) return wrap(c, boxStyle(c), noSeriesData());
  return wrap(c, boxStyle(c),
    <div className="text-xs overflow-auto h-full">
      <table className="w-full">
        <thead className="bg-secondary/60 text-[10px] uppercase text-muted-foreground">
          <tr><th className="px-2 py-1 text-left">Nom</th><th className="px-2 py-1 text-right">Valeur</th></tr>
        </thead>
        <tbody>
          {series.map((r, i) => {
            const sc = c.target ? statusColor(r.v, c.target) : undefined;
            const dimmed = isDimmed(r.x);
            return (
              <tr
                key={i}
                onClick={() => click(r.x)}
                className={`border-t border-border ${c.dataAxis ? "cursor-pointer hover:bg-accent" : ""}`}
                style={dimmed ? { opacity: 0.25 } : undefined}
              >
                <td className="px-2 py-1">{r.x}</td>
                <td className="px-2 py-1 text-right font-bold" style={sc ? { color: sc } : undefined}>{r.v.toFixed(c.decimals ?? 1).replace(".", ",")}{c.unit ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
