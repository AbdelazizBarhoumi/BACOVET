import { useMemo } from 'react';
import { enrichRows } from '@/lib/pbi/joins';
import { distinctValues, type Row, type Visual } from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { ChartBody } from './chart';
import { EmptyVisual, useInteractiveRows } from './shared';

export function VisualView({
    visual,
    rows: allRows,
    static: staticRender = false,
}: {
    visual: Visual;
    rows: Row[];
    static?: boolean;
}) {
    const { tables, joins, measures } = usePbi();
    const measureExpressions = useMemo(
        () =>
            measures.reduce<Record<string, string>>((acc, m) => {
                if (m.expression) acc[m.name] = m.expression;
                return acc;
            }, {}),
        [measures],
    );
    const enrichedRows = useMemo(
        () => enrichRows(visual, allRows, tables, joins, measureExpressions),
        [visual, allRows, tables, joins, measureExpressions],
    );
    const { rows, match } = useInteractiveRows(visual, enrichedRows);
    const sm = visual.smallMultiples[0]?.name;

    if (!sm)
        return (
            <ChartBody
                visual={visual}
                rows={rows}
                match={match}
                static={staticRender}
            />
        );

    const cells = distinctValues(sm, rows);
    if (!cells.length)
        return <EmptyVisual label="Aucune donnée pour les petits multiples" />;

    return (
        <div className="scrollbar-none grid h-full w-full grid-cols-2 gap-1 overflow-auto p-1 lg:grid-cols-3">
            {cells.map((value) => (
                <div
                    key={value}
                    className="flex min-w-0 flex-col rounded border border-border"
                >
                    <div className="truncate border-b border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {value}
                    </div>
                    <div className="min-h-0 flex-1">
                        <ChartBody
                            visual={visual}
                            rows={rows.filter(
                                (r) => String(r[sm]) === String(value),
                            )}
                            match={match}
                            static={staticRender}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
