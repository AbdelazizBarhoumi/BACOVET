import { useMemo } from 'react';
import { CfIcon } from '@/components/pbi/CfIcon';
import { cfAggToAgg, conditionalColor, conditionalIcon } from '@/lib/pbi/conditionalFormat';
import { iconById } from '@/lib/pbi/icons';
import {
    buildChartData,
    fieldLabel,
    normalizeConditionalFormat,
    wellForReference,
    type ConditionalFormat,
    type Row,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { EmptyVisual, visualFmt } from './shared';

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
    /** Row group values that match an active cross-highlight (null = none). */
    const matchSet = useMemo(() => {
        if (!match || !groupCol) return null;
        const s = new Set<string>();
        for (const r of rows) if (match(r)) s.add(String(r[groupCol]));
        return s;
    }, [match, rows, groupCol]);
    const dimmed = (d: Record<string, string | number>) =>
        matchSet ? !matchSet.has(String(d['category'])) : false;
    const cf = normalizeConditionalFormat(visual.conditionalFormat);
    const extra =
        cf.style === 'none' || cf.style === 'fieldValue'
            ? undefined
            : cf.basedOn
              ? (wellForReference(
                    { name: cf.basedOn, table: cf.basedOnTable },
                    cfAggToAgg(cf.agg),
                ) ?? undefined)
              : visual.values[0];
    const extraColor =
        cf.style === 'fieldValue' && cf.fieldValue ? cf.fieldValue : undefined;
    const { data, series } = buildChartData(
        rows,
        visual.axis,
        visual.type === 'matrix' ? visual.legend : [],
        visual.values,
        [],
        undefined,
        extra,
        extraColor,
        graph,
    );
    if (!groupCol && !visual.values.length)
        return <EmptyVisual label="Table" />;
    const maxByCol = Object.fromEntries(
        series.map((s) => [
            s,
            Math.max(...data.map((d) => Number(d[s]) || 0), 1),
        ]),
    );
    const cfValues = data.map((d) => Number(d['_cf']) || 0);

    /** Background tint for a table cell when conditional formatting is on. */
    const cellColor = (d: Record<string, string | number>) =>
        conditionalColor(cf, d['_cf'] ?? null, cfValues, d['_cfx']);

    const totals = series.map((s) =>
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
                                {legendCol && visual.type === 'matrix'
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
                                    {d['category']}
                                </td>
                            )}
                            {series.map((s) => {
                                const val = Number(d[s]) || 0;
                                const pct =
                                    (val / (maxByCol[s] as number)) * 100;
                                const background = cellColor(d);
                                return (
                                    <td
                                        key={s}
                                        className="relative border-b border-border px-2 py-1 text-right tabular-nums"
                                        style={
                                            background
                                                ? {
                                                      backgroundColor:
                                                          background,
                                                  }
                                                : undefined
                                        }
                                    >
                                        {cf.showDataBars && (
                                            <span
                                                className="absolute inset-y-[2px] left-0 rounded-sm"
                                                style={{
                                                    width: `${pct}%`,
                                                    backgroundColor:
                                                        cf.max.color,
                                                    opacity: 0.15,
                                                }}
                                            />
                                        )}
                                        <span className="relative flex items-center justify-end gap-1">
                                            {cf.style === 'icons' && (
                                                <CfCellIcon
                                                    cf={cf}
                                                    value={d['_cf'] ?? null}
                                                    values={cfValues}
                                                />
                                            )}
                                            {visualFmt(
                                                val,
                                                visual,
                                                visual.values[0],
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
                            {totals.map((t, i) => (
                                <td
                                    key={i}
                                    className="px-2 py-1 text-right tabular-nums"
                                >
                                    {visualFmt(t, visual, visual.values[0])}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}