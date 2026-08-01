import { useMemo } from "react";
import type { WidgetConfig } from "../types";
import { boxStyle, noDataBound, noSeriesData, useCrossFilter, wrap } from "./shared";
import { useDatasetData } from "./use-dataset";

export function MatrixWidget({ c, id }: { c: WidgetConfig; id?: string }) {
  const { rows, hasData } = useDatasetData(c, id);
  const { isDimmed, click } = useCrossFilter(c, id);
  const rowKey = c.dataAxis;
  const colKey = c.dataGroup;
  const valueKey = c.dataValue;

  const table = useMemo(() => {
    if (!rows.length || !valueKey) return null;
    if (!rowKey) {
      const sum = rows.reduce((acc, row) => acc + (Number(row[valueKey]) || 0), 0);
      return { rows: [["Total"]], cols: ["Total"], values: [["Total", sum]] };
    }
    const rowVals = [...new Set(rows.map((row) => String(row[rowKey] ?? "(vide)")))];
    if (!colKey) {
      return {
        rows: rowVals.map((v) => [v]),
        cols: ["Total"],
        values: rowVals.map((v) => {
          const group = rows.filter((row) => String(row[rowKey]) === v);
          return ["Total", aggregate(group, valueKey)];
        }),
      };
    }
    const colVals = [...new Set(rows.map((row) => String(row[colKey] ?? "(vide)")))];
    return {
      rows: rowVals.map((v) => [v]),
      cols: colVals,
      values: rowVals.map((rv) => colVals.map((cv) => {
        const group = rows.filter((row) => String(row[rowKey]) === rv && String(row[colKey]) === cv);
        return aggregate(group, valueKey);
      })),
    };
  }, [rows, rowKey, colKey, valueKey]);

  if (!c.datasetSlug || !valueKey) return wrap(c, boxStyle(c), noDataBound());
  if (!hasData || !table) return wrap(c, boxStyle(c), noSeriesData());
  const decimals = c.decimals ?? 1;

  return wrap(c, boxStyle(c),
    <div className="h-full w-full overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="border border-border px-2 py-1 text-left bg-secondary/40 text-muted-foreground">{rowKey ?? ""}</th>
            {table.cols.map((col) => (
              <th key={col} className="border border-border px-2 py-1 text-right bg-secondary/40 text-muted-foreground">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className={rowKey ? "cursor-pointer" : ""} onClick={() => rowKey && click(String(row[0]))} style={rowKey && isDimmed(String(row[0])) ? { opacity: 0.25 } : undefined}>
              <td className="border border-border px-2 py-1 font-medium">{row[0]}</td>
              {table.values[r].map((value, c2) => (
                <td key={c2} className="border border-border px-2 py-1 text-right tabular-nums">{Number(value).toFixed(decimals)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function aggregate(rows: Record<string, unknown>[], key: string): number {
  const agg = rows.map((row) => Number(row[key])).filter((n) => Number.isFinite(n));
  return agg.length ? agg.reduce((a, b) => a + b, 0) : 0;
}
