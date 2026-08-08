import type { SchemaEntry } from '@/services/endpointManagerApi';

export function EntryKeysTable({
    entries,
    onOpenEntry,
}: {
    entries: SchemaEntry[];
    onOpenEntry: (entryId: string) => void;
}) {
    return (
        <div className="max-h-[28rem] overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                    <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        <th className="px-3 py-2 text-left">Endpoint</th>
                        <th className="px-3 py-2 text-left">Source</th>
                        <th className="px-3 py-2 text-left">Clé primaire</th>
                        <th className="px-3 py-2 text-left">Clés candidates</th>
                        <th className="px-3 py-2 text-right">Lignes</th>
                    </tr>
                </thead>
                <tbody className="font-mono">
                    {entries.map((entry) => (
                        <tr
                            key={entry.id}
                            onClick={() => onOpenEntry(entry.id)}
                            className="cursor-pointer border-b border-border/50 hover:bg-muted/40"
                        >
                            <td
                                className="max-w-[280px] truncate px-3 py-1.5 text-xs font-semibold break-all"
                                title={entry.name}
                            >
                                {entry.name}
                            </td>
                            <td className="px-3 text-[10px] tracking-wider uppercase">
                                {entry.source}
                            </td>
                            <td className="px-3 text-xs">
                                {entry.primary_key ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <span aria-hidden>🔑</span>
                                        {entry.primary_key.column}
                                        <span className="text-[10px] text-muted-foreground">
                                            {Math.round(
                                                entry.primary_key.confidence *
                                                    100,
                                            )}
                                            %
                                        </span>
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground/50">
                                        —
                                    </span>
                                )}
                            </td>
                            <td className="max-w-[220px] px-3 text-[10px] text-muted-foreground">
                                {entry.candidate_keys.length > 1
                                    ? entry.candidate_keys.slice(1).join(', ')
                                    : '—'}
                            </td>
                            <td className="px-3 text-right text-xs">
                                {entry.row_count}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
