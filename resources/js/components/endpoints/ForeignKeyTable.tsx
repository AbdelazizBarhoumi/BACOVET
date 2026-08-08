import { cn } from '@/lib/utils';
import type { ForeignKey } from '@/services/endpointManagerApi';

function confidenceBadge(confidence: number) {
    const tone =
        confidence >= 0.9
            ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40'
            : confidence >= 0.75
              ? 'bg-amber-500/15 text-amber-500 border-amber-500/40'
              : 'bg-muted text-muted-foreground border-border';
    return (
        <span
            className={cn(
                'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px]',
                tone,
            )}
        >
            {Math.round(confidence * 100)}%
        </span>
    );
}

export function ForeignKeyTable({
    foreignKeys,
    onOpenEntry,
}: {
    foreignKeys: ForeignKey[];
    onOpenEntry: (entryId: string) => void;
}) {
    if (foreignKeys.length === 0) {
        return (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Aucune clé étrangère candidate trouvée — élargissez les données
                d'exemple.
            </div>
        );
    }

    return (
        <div className="max-h-[28rem] overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                    <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                        <th className="px-3 py-2 text-left">Endpoint source</th>
                        <th className="px-3 py-2 text-left">Colonne</th>
                        <th className="px-3 py-2 text-left">Références</th>
                        <th className="px-3 py-2 text-left">Correspondance</th>
                        <th className="px-3 py-2 text-right">Couverture</th>
                        <th className="px-3 py-2 text-right">Confiance</th>
                    </tr>
                </thead>
                <tbody className="font-mono">
                    {foreignKeys.map((fk) =>
                        fk.references.map((reference) =>
                            reference.refs.map((ref) => (
                                <tr
                                    key={`${fk.entry_id}-${reference.column}-${ref.entry_id}-${ref.column}`}
                                    className="border-b border-border/50 hover:bg-muted/40"
                                >
                                    <td
                                        className="max-w-[260px] truncate px-3 py-1.5 text-xs font-semibold"
                                        title={fk.entry_name}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpenEntry(fk.entry_id)
                                            }
                                            className="cursor-pointer hover:underline"
                                        >
                                            {fk.entry_name}
                                        </button>
                                    </td>
                                    <td className="px-3 text-xs font-bold">
                                        {reference.column}
                                    </td>
                                    <td
                                        className="max-w-[260px] truncate px-3 text-xs"
                                        title={ref.entry_name}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpenEntry(ref.entry_id)
                                            }
                                            className="cursor-pointer hover:underline"
                                        >
                                            {ref.entry_name}.{ref.column}
                                        </button>
                                    </td>
                                    <td className="px-3 text-[10px] tracking-wider text-muted-foreground uppercase">
                                        {ref.match}
                                    </td>
                                    <td className="px-3 text-right text-xs">
                                        {Math.round(ref.coverage * 100)}%
                                    </td>
                                    <td className="px-3 text-right">
                                        {confidenceBadge(ref.confidence)}
                                    </td>
                                </tr>
                            )),
                        ),
                    )}
                </tbody>
            </table>
        </div>
    );
}
