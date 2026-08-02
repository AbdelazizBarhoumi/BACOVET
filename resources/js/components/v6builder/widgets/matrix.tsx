import { useMemo } from "react";
import { formatNumber } from "../format";
import type { WidgetConfig } from "../types";
import { boxStyle, colorAt, noDataBound, noSeriesData, useCrossFilter, wrap, MeasureErrorBanner } from "./shared";
import { useDatasetData } from "./use-dataset";

export function MatrixWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { rows, hasData, measureError } = useDatasetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  const rowKey = c.dataAxis;
  const colKey = c.dataGroup;
  const valueKey = c.dataValue;

  const table = useMemo(() => {
    if (!rows.length || !valueKey) return null;
    if (!rowKey) {
      const sum = rows.reduce((acc, row) => acc + (Number(row[valueKey]) || 0), 0);
      return { rows: [["Total"]], cols: ["Total"], values: [[sum]] };
    }
    const rowVals = [...new Set(rows.map((row) => String(row[rowKey] ?? "(vide)")))];
    const cols = colKey ? [...new Set(rows.map((row) => String(row[colKey] ?? "(vide)")))] : ["Total"];
    const values = rowVals.map((rv) => cols.map((cv) => {
      const group = colKey
        ? rows.filter((row) => String(row[rowKey]) === rv && String(row[colKey]) === cv)
        : rows.filter((row) => String(row[rowKey]) === rv);
      return aggregate(group, valueKey);
    }));

    // Sort rows by their total value, richest first.
    const order = rowVals
      .map((v, i) => ({ v, total: values[i].reduce((a, b) => a + b, 0), i }))
      .sort((a, b) => b.total - a.total);

    return {
      rows: order.map((o) => [rowVals[o.i]]),
      cols,
      values: order.map((o) => values[o.i]),
    };
  }, [rows, rowKey, colKey, valueKey]);

  if (!c.datasetSlug || !valueKey) return wrap(c, boxStyle(c), noDataBound());
  if (measureError) return wrap(c, boxStyle(c), <MeasureErrorBanner message={measureError} />);
  if (!hasData || !table) return wrap(c, boxStyle(c), noSeriesData());
  const decimals = c.decimals ?? 1;
  const accent = c.accent ?? "#3b82f6";
  const flat = c.conditionalFormat === "none";
  const condScale = c.condScale;
  const colMax = table.cols.map((_, ci) => Math.max(...table.values.map((row) => Math.abs(row[ci])), 1));

  return wrap(c, boxStyle(c),
    <div className="h-full w-full overflow-auto rounded-md border border-border/60">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-20 border border-border/60 px-2.5 py-1.5 text-left bg-background/95 backdrop-blur text-muted-foreground font-semibold">{rowKey ?? ""}</th>
            {table.cols.map((col) => (
              <th key={col} className="sticky top-0 z-10 border border-border/60 px-2.5 py-1.5 text-right bg-background/95 backdrop-blur text-muted-foreground font-semibold">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr
              key={String(row[0])}
              className={`transition-colors ${r % 2 === 1 ? "bg-black/[0.02]" : ""} ${rowKey ? "cursor-pointer hover:bg-accent" : ""}`}
              onClick={() => rowKey && click(String(row[0]))}
              style={rowKey && isDimmed(String(row[0])) ? { opacity: 0.25 } : undefined}
            >
              <td className="sticky left-0 z-10 border border-border/60 px-2.5 py-1.5 font-semibold bg-background/95 backdrop-blur">
                <span className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-muted-foreground w-3 text-right shrink-0">{r + 1}</span>
                  {row[0]}
                </span>
              </td>
              {table.values[r].map((value, c2) => {
                const intensity = colMax[c2] ? Math.min(1, Math.abs(value) / colMax[c2]) : 0;
                return (
                  <td
                    key={c2}
                    className="border border-border/60 px-2.5 py-1.5 text-right tabular-nums font-medium"
                    style={{ backgroundColor: flat ? `color-mix(in oklch, ${accent} 18%, transparent)` : colorAt(intensity, condScale) }}
                  >
                    {formatNumber(value, { decimals, prefix: c.prefix, compact: c.compact })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function aggregate(rowsList: Record<string, unknown>[], key: string): number {
  const agg = rowsList.map((row) => Number(row[key])).filter((n) => Number.isFinite(n));
  return agg.length ? agg.reduce((a, b) => a + b, 0) : 0;
}