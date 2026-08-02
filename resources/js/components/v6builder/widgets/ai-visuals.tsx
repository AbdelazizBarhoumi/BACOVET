import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WidgetConfig } from "../types";
import { boxStyle, noDataBound, noSeriesData, wrap, MeasureErrorBanner } from "./shared";
import { useDatasetData } from "./use-dataset";

export type AiVisualType = "decompositionTree" | "keyInfluencers" | "smartNarrative" | "qna" | "rVisual" | "pythonVisual";

export function AiVisualWidget({ type, c, id }: { type: AiVisualType; c: WidgetConfig; id?: string }) {
  const { rows, data, hasData, measureError } = useDatasetData(c, id);
  const dim = c.dataAxis;
  const value = c.dataValue;
  const groupKey = c.dataGroup;

  if (!c.datasetSlug || !value) return wrap(c, boxStyle(c), noDataBound());
  if (measureError) return wrap(c, boxStyle(c), <MeasureErrorBanner message={measureError} />);
  if (!hasData || !rows.length) return wrap(c, boxStyle(c), noSeriesData());

  switch (type) {
    case "smartNarrative":
      return wrap(c, boxStyle(c), <SmartNarrative rows={rows} dim={dim} value={value} />);
    case "keyInfluencers":
      return wrap(c, boxStyle(c), <KeyInfluencers rows={rows} dim={dim} value={value} groupKey={groupKey} />);
    case "decompositionTree":
      return wrap(c, boxStyle(c), <DecompositionTree rows={rows} dim={dim} value={value} />);
    case "qna":
      return wrap(c, boxStyle(c), <Qna data={data} />);
    case "rVisual":
    case "pythonVisual":
      return wrap(c, boxStyle(c), <ScriptVisual type={type} data={data} />);
    default:
      return wrap(c, boxStyle(c), noSeriesData());
  }
}

function sumRows(rows: Record<string, unknown>[], value: string): number {
  const vals = rows.map((r) => Number(r[value])).filter((n) => Number.isFinite(n));
  return vals.length ? vals.reduce((a, b) => a + b, 0) : 0;
}

function SmartNarrative({ rows, dim, value }: { rows: Record<string, unknown>[]; dim?: string; value: string }) {
  const total = sumRows(rows, value);
  let top: { name: string; v: number } | null = null;
  let bottom: { name: string; v: number } | null = null;
  if (dim) {
    const groups = new Map<string, number>();
    for (const r of rows) {
      const key = String(r[dim] ?? "(vide)");
      groups.set(key, (groups.get(key) ?? 0) + (Number(r[value]) || 0));
    }
    const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length) {
      top = { name: sorted[0][0], v: sorted[0][1] };
      bottom = { name: sorted[sorted.length - 1][0], v: sorted[sorted.length - 1][1] };
    }
  }
  return (
    <div className="h-full overflow-auto p-2 text-[11px] leading-relaxed text-foreground">
      <p><strong>{value}</strong> totalled <strong>{total.toLocaleString()}</strong> across {rows.length.toLocaleString()} rows.</p>
      {top && bottom && (
        <p className="mt-2">
          <strong>{top.name}</strong> had the highest value at {top.v.toLocaleString()} ({((top.v / (total || 1)) * 100).toFixed(1)}% of total), while <strong>{bottom.name}</strong> was lowest at {bottom.v.toLocaleString()}.
        </p>
      )}
      <p className="mt-2 text-muted-foreground">Summary updates automatically as filters change.</p>
    </div>
  );
}

function KeyInfluencers({ rows, dim, value, groupKey }: { rows: Record<string, unknown>[]; dim?: string; value: string; groupKey?: string }) {
  const scored = useMemo(() => {
    const groups = new Map<string, Record<string, unknown>[]>();
    const key = groupKey ?? dim;
    if (!key) return [];
    for (const r of rows) {
      const k = String(r[key] ?? "(vide)");
      groups.set(k, [...(groups.get(k) ?? []), r]);
    }
    return [...groups.entries()]
      .map(([k, rs]) => ({ k, v: sumRows(rs, value) }))
      .sort((a, b) => b.v - a.v);
  }, [rows, dim, groupKey, value]);
  const total = scored.reduce((t, s) => t + s.v, 0) || 1;

  return (
    <div className="h-full overflow-auto p-1 text-[11px]">
      <p className="mb-2 text-muted-foreground">What influences <strong>{value}</strong>?</p>
      {scored.slice(0, 8).map((s) => (
        <div key={s.k} className="mb-1">
          <div className="flex justify-between">
            <span className="truncate">{s.k}</span>
            <span className="text-muted-foreground tabular-nums">{((s.v / total) * 100).toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded bg-muted">
            <div className="h-full rounded bg-brand" style={{ width: `${(s.v / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DecompositionTree({ rows, dim, value }: { rows: Record<string, unknown>[]; dim?: string; value: string }) {
  const [path, setPath] = useState<string[]>([]);
  let scoped = rows;
  if (dim) {
    for (const p of path) scoped = scoped.filter((r) => String(r[dim]) === p);
  }
  const groups = useMemo(() => {
    if (!dim) return [];
    const map = new Map<string, number>();
    for (const r of scoped) {
      const k = String(r[dim] ?? "(vide)");
      map.set(k, (map.get(k) ?? 0) + (Number(r[value]) || 0));
    }
    return [...map.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  }, [scoped, dim, value]);
  const max = Math.max(...groups.map((g) => g.v), 1);

  return (
    <div className="flex h-full gap-3 overflow-auto p-1 text-[11px]">
      <div className="min-w-24">
        <div className="font-semibold">{value}</div>
        <div className="text-lg tabular-nums">{sumRows(scoped, value).toLocaleString()}</div>
        {path.map((p, i) => (
          <button key={i} onClick={() => setPath(path.slice(0, i))} className="mt-1 block truncate rounded bg-muted px-1 hover:bg-accent">{dim}: {p} ×</button>
        ))}
      </div>
      {dim && (
        <div className="min-w-40 flex-1">
          <div className="mb-1 font-semibold text-muted-foreground">{dim}</div>
          {groups.slice(0, 12).map((it) => (
            <button key={it.k} onClick={() => setPath([...path, it.k])} className="mb-0.5 block w-full rounded px-1 text-left hover:bg-accent">
              <span className="flex justify-between">
                <span className="truncate">{it.k}</span>
                <span className="tabular-nums">{it.v.toLocaleString()}</span>
              </span>
              <span className="block h-1 rounded bg-brand" style={{ width: `${(it.v / max) * 100}%` }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Qna({ data }: { data: { name: string; value: number }[] }) {
  const [q, setQ] = useState("");
  const chartData = useMemo(() => {
    const filtered = q.trim() ? data.filter((d) => d.name.toLowerCase().includes(q.toLowerCase())) : data;
    return filtered.slice(0, 20);
  }, [data, q]);
  return (
    <div className="flex h-full flex-col gap-1">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ask a question about your data"
        className="rounded border border-border bg-background px-2 py-1 text-[11px]"
      />
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ScriptVisual({ type, data }: { type: "rVisual" | "pythonVisual"; data: { name: string; value: number }[] }) {
  const isR = type === "rVisual";
  return (
    <div className="flex h-full flex-col gap-1">
      <pre className="max-h-16 overflow-auto rounded bg-muted p-1 font-mono text-[9px] text-muted-foreground">
        {isR
          ? 'library(ggplot2)\nggplot(dataset, aes(category, value)) + geom_line()'
          : "import matplotlib.pyplot as plt\nplt.plot(dataset['category'], dataset['value'])"}
      </pre>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="value" stroke="var(--chart-3)" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
