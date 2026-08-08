import { useMemo } from 'react';
import { CfIcon } from '@/components/pbi/CfIcon';
import { conditionalColor, conditionalIcon } from '@/lib/pbi/conditionalFormat';
import { iconById } from '@/lib/pbi/icons';
import {
    buildTableCells,
    fieldLabel,
    isListMeasure,
    listTreatment,
    measureLabel,
    normalizeConditionalFormat,
    type ConditionalFormat,
    type Row,
    type Visual,
    type WellField,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { EmptyVisual, visualFmt } from './shared';

/**
 * Renders the chips/pills for a per-row distinct-value list, honoring the
 * well's `listAgg` treatment (whole list, count/first/latest/nth/numeric).
 * An empty list renders `—` (never `0`).
 */
function ListCell({
    codes,
    well,
}: {
    codes: string[];
    well: WellField;
}) {
    if (!codes.length) return <span className="text-muted-foreground">—</span>;
    if (well.listAgg)
        return (
            <span className="font-mono tabular-nums">
                {listTreatment(codes, well.listAgg, well.index ?? 1) ?? '—'}
            </span>
        );
    return (
        <div className="flex flex-wrap justify-end gap-1">
            {codes.map((c) => (
                <span
                    key={c}
                    className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                >
                    {c}
                </span>
            ))}
        </div>
    );
}

/** One cell value: a per-row list (chips) or a numeric aggregate visual. */
function CellValue({
    value,
    visual,
    well,
}: {
    value: string[] | number | string | null;
    visual: Visual;
    well: WellField;
}) {
    if (Array.isArray(value)) return <ListCell codes={value} well={well} />;
    if (isListMeasure(well.name))
        return <span className="text-muted-foreground">—</span>;
    const n = Number(value ?? '');
    return visualFmt(Number.isFinite(n) ? n : 0, visual, well);
}

/**
 * Resolves + renders the icon for a data point when the format is an icon style.
 * Returns null when nothing matches so the cell keeps a plain value.
 */
function CfCellIcon({
    cf,
    value,
    values,
}: {
    cf: ConditionalFormat;
    value: unknown;
    values: number[];
}) {
    const n =
        typeof value === 'number' && isFinite(value)
            ? value
            : typeof value === 'string' &&
                value.trim() !== '' &&
                isFinite(Number(value))
              ? Number(value)
              : null;
    const id = conditionalIcon(cf, n, values);
    if (!id) return null;
    const icon = iconById(cf.iconSet, id);
    if (!icon) return null;
    return <CfIcon icon={icon} size={14} />;
}

export function TableVisual({
    visual,
    rows,
    match,
}: {
    visual: Visual;
    rows: Row[];
    match: ((r: Row) => boolean) | null;
}) {
    const { graph } = usePbi();
    const groupCol = visual.axis[0]?.name;
    const legendCol = visual.legend[0]?.name;
    const matrix = visual.type === 'matrix';
    /** Row group values that match an active cross-highlight (null = none). */
    const matchSet = useMemo(() => {
        if (!match || !groupCol) return null;
        const s = new Set<string>();
        for (const r of rows) if (match(r)) s.add(String(r[groupCol]));
        return s;
    }, [match, rows, groupCol]);
    const dimmed = (d: Record<string, unknown>) =>
        matchSet ? !matchSet.has(String(d['category'])) : false;
    const cf = normalizeConditionalFormat(visual.conditionalFormat);

    const { data, series } = buildTableCells(
        rows,
        visual.axis,
        matrix ? visual.legend : [],
        visual.values,
        graph,
    );
    if (!groupCol && !visual.values.length)
        return <EmptyVisual label="Table" />;

    const isListSeries = (s: string) =>
        visual.values.some((v) => measureLabel(v) === s && isListMeasure(v.name));
    const wellForSeries = (s: string): WellField | null =>
        matrix
            ? (visual.values[0] ?? null)
            : (visual.values.find((v) => measureLabel(v) === s) ?? null);

    const numericSeries = series.filter((s) => !isListSeries(s));
    const cfValues = data.map((d) => Number(d['_cf']) || 0);
    const cellColor = (d: Record<string, unknown>) =>
        conditionalColor(cf, (d['_cf'] as number | null) ?? null, cfValues, d['_cfx']);

    const maxByCol = Object.fromEntries(
        numericSeries.map((s) => [
            s,
            Math.max(...data.map((d) => Number(d[s]) || 0), 1),
        ]),
    );
    const totals = numericSeries.map((s) =>
        data.reduce((t, d) => t + (Number(d[s]) || 0), 0),
    );

    return (
        <div className="h-full overflow-auto">
            <table className="w-full border-collapse text-[11px]">
                <thead className="sticky top-0 bg-muted">
                    <tr>
                        {groupCol && (
                            <th className="border-b border-border px-2 py-1 text-left font-semibold">
                                {fieldLabel(visual.axis[0]!)}
                                {legendCol && matrix
                                    ? ` / ${fieldLabel(visual.legend[0]!)}`
                                    : ''}
                            </th>
                        )}
                        {series.map((s) => (
                            <th
                                key={s}
                                className="border-b border-border px-2 py-1 text-right font-semibold"
                            >
                                {s}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((d, i) => (
                        <tr
                            key={i}
                            className="hover:bg-accent"
                            style={{ opacity: dimmed(d) ? 0.25 : 1 }}
                        >
                            {groupCol && (
                                <td className="border-b border-border px-2 py-1">
                                    {String(d['category'] ?? '')}
                                </td>
                            )}
                            {series.map((s) => {
                                const well = wellForSeries(s);
                                const value = d[s];
                                const isList = Array.isArray(value);
                                const background = isList
                                    ? undefined
                                    : cellColor(d);
                                return (
                                    <td
                                        key={s}
                                        className={
                                            'relative border-b border-border px-2 py-1 ' +
                                            (isList
                                                ? 'text-right'
                                                : 'text-right tabular-nums')
                                        }
                                        style={
                                            background
                                                ? {
                                                      backgroundColor:
                                                          background,
                                                  }
                                                : undefined
                                        }
                                    >
                                        {!isList &&
                                            cf.showDataBars &&
                                            cf.max && (
                                                <span
                                                    className="absolute inset-y-[2px] left-0 rounded-sm"
                                                    style={{
                                                        width: `${((Number(value) || 0) / (maxByCol[s] as number)) * 100}%`,
                                                        backgroundColor:
                                                            cf.max.color,
                                                        opacity: 0.15,
                                                    }}
                                                />
                                            )}
                                        <span className="relative flex items-center justify-end gap-1">
                                            {!isList &&
                                                cf.style === 'icons' && (
                                                    <CfCellIcon
                                                        cf={cf}
                                                        value={d['_cf'] ?? null}
                                                        values={cfValues}
                                                    />
                                                )}
                                            {well ? (
                                                <CellValue
                                                    value={
                                                        (value as string[] | number | string | null) ??
                                                        null
                                                    }
                                                    visual={visual}
                                                    well={well}
                                                />
                                            ) : (
                                                ''
                                            )}
                                        </span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    {visual.subtotals && (
                        <tr className="bg-muted font-semibold">
                            {groupCol && <td className="px-2 py-1">Total</td>}
                            {series.map((s, i) => (
                                <td
                                    key={s}
                                    className="px-2 py-1 text-right tabular-nums"
                                >
                                    {isListSeries(s)
                                        ? '—'
                                        : visualFmt(
                                              totals[i],
                                              visual,
                                              wellForSeries(s) ??
                                                  visual.values[0],
                                          )}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}