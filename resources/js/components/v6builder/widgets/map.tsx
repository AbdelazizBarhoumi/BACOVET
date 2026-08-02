import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, noDataBound, noSeriesData, targetColor, useCrossFilter, wrap } from "./shared";
import { useDatasetData } from "./use-dataset";

export function MapWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { rows, hasData } = useDatasetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  const locKey = c.dataAxis;
  const valueKey = c.dataValue;

  const points = useMemo(() => {
    if (!rows.length || !locKey || !valueKey) return [];
    const map = new Map<string, { count: number; sum: number }>();
    for (const row of rows) {
      const key = String(row[locKey] ?? "(vide)");
      const entry = map.get(key) ?? { count: 0, sum: 0 };
      entry.count += 1;
      entry.sum += Number(row[valueKey] ?? 0);
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([name, e]) => ({ name, value: e.count ? e.sum / e.count : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [rows, locKey, valueKey]);

  if (!c.datasetSlug || !locKey) return wrap(c, boxStyle(c), noDataBound());
  if (!hasData || !points.length) return wrap(c, boxStyle(c), noSeriesData());
  const max = Math.max(...points.map((p) => p.value), 1);
  const decimals = c.decimals ?? 0;

  return wrap(c, boxStyle(c),
    <div className="h-full w-full overflow-auto">
      <div className="grid min-h-full grid-cols-3 content-start gap-1.5 p-1.5">
        {points.map((p, i) => {
          const color = targetColor(p.value, c.target, max);
          const intensity = p.value / max;
          return (
            <div
              key={i}
              onClick={() => click(p.name)}
              className="flex flex-col items-center justify-center rounded-md p-1.5 text-[10px] cursor-pointer transition-transform duration-150 hover:scale-[1.03]"
              style={{
                backgroundColor: `color-mix(in oklch, ${color} ${intensity * 75 + 12}%, transparent)`,
                color: intensity > 0.55 ? "#fff" : "var(--foreground)",
                opacity: isDimmed(p.name) ? 0.25 : 1,
                boxShadow: intensity > 0.55 ? `0 2px 6px ${color}44` : undefined,
              }}
              title={`${p.name}: ${p.value.toFixed(decimals)}`}
            >
              <span className="w-full truncate text-center">{p.name}</span>
              <span className="font-semibold tabular-nums">{p.value.toFixed(decimals)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}