import type { ColumnDef, ColumnType } from '@/lib/endpoint-structure';
import { cn } from '@/lib/utils';

const TYPE_STYLES: Record<ColumnType, string> = {
    string: 'bg-blue-500/15 text-blue-500 border-blue-500/40',
    integer: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40',
    number: 'bg-teal-500/15 text-teal-500 border-teal-500/40',
    boolean: 'bg-purple-500/15 text-purple-500 border-purple-500/40',
    date: 'bg-amber-500/15 text-amber-500 border-amber-500/40',
    null: 'bg-muted text-muted-foreground border-border',
    mixed: 'bg-pink-500/15 text-pink-500 border-pink-500/40',
};

function TypeBadge({ type }: { type: ColumnType }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase',
                TYPE_STYLES[type],
            )}
        >
            {type}
        </span>
    );
}

function sampleText(sample: unknown): string {
    if (sample === null || sample === undefined) {
        return '—';
    }
    if (typeof sample === 'object') {
        try {
            return JSON.stringify(sample);
        } catch {
            return String(sample);
        }
    }
    return String(sample);
}

export function StructureViewer({
    columns,
    rowCount,
    hasData,
}: {
    columns: ColumnDef[];
    rowCount: number;
    hasData: boolean;
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                <span>
                    {rowCount} rows · {columns.length} columns
                </span>
                {hasData ? (
                    <span className="text-success">with data</span>
                ) : (
                    <span className="text-warning">no sample rows</span>
                )}
            </div>
            {columns.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    No columns could be inferred — the response has no
                    <code className="mx-1 font-mono">columns</code>
                    metadata and no data rows.
                </div>
            ) : (
                <div className="max-h-72 overflow-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                            <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                <th className="py-2 px-3 text-left">Column</th>
                                <th className="py-2 px-3 text-left">Type</th>
                                <th className="py-2 px-3 text-left">Sample</th>
                                <th className="py-2 px-3 text-right">Nullable</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono">
                            {columns.map((col) => (
                                <tr
                                    key={col.name}
                                    className="border-b border-border/50 hover:bg-muted/30"
                                >
                                    <td className="py-1.5 px-3 text-xs font-semibold break-all">
                                        {col.name}
                                    </td>
                                    <td className="px-3">
                                        <TypeBadge type={col.type} />
                                    </td>
                                    <td className="max-w-[260px] truncate px-3 text-xs text-muted-foreground" title={sampleText(col.sample)}>
                                        {sampleText(col.sample)}
                                    </td>
                                    <td className="px-3 text-right text-xs">
                                        {col.nullable ? (
                                            <span className="text-warning">yes</span>
                                        ) : (
                                            <span className="text-muted-foreground/50">no</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
