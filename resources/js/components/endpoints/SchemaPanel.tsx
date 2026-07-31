import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/widgets';
import {
    fetchSchema,
    type ForeignKey,
    type SchemaAnalysis,
    type SchemaEntry,
} from '@/services/endpointManagerApi';
import { ColumnBrowser } from './ColumnBrowser';
import { EntryKeysTable } from './EntryKeysTable';
import { ForeignKeyTable } from './ForeignKeyTable';
import { SharedColumnsExportButton } from './SharedColumnsExportButton';

export function SchemaPanel({
    onOpenEntry,
}: {
    onOpenEntry: (entryId: string) => void;
}) {
    const [data, setData] = useState<SchemaAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async (force = false) => {
        setLoading(true);
        setError(null);
        try {
            setData(await fetchSchema(undefined, force));
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to analyze schema',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const entries = useMemo(
        () =>
            (data?.entries ?? []).filter(
                (entry): entry is SchemaEntry => entry.primary_key !== null,
            ),
        [data],
    );

    const columns = useMemo(() => data?.columns ?? [], [data]);
    const foreignKeys = useMemo(
        () =>
            (data?.foreign_keys ?? []).filter(
                (fk): fk is ForeignKey => fk.references.length > 0,
            ),
        [data],
    );

    return (
        <div className="space-y-4">
            {error && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                    <span>{error}</span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void load(true)}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {loading && !data ? (
                <div className="space-y-2">
                    <div className="h-8 w-full animate-pulse rounded bg-muted" />
                    <div className="h-40 w-full animate-pulse rounded bg-muted" />
                    <div className="h-40 w-full animate-pulse rounded bg-muted" />
                </div>
            ) : (
                <>
                    <Panel
                        title="Shared join columns — type a name like ProdGroup to see who has it and which values exist"
                        right={
                            <div className="flex items-center gap-2">
                                <SharedColumnsExportButton columns={columns} />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void load(true)}
                                    disabled={loading}
                                    className="h-7 text-[10px] tracking-wider uppercase"
                                >
                                    <RefreshCw
                                        className={
                                            loading
                                                ? 'h-3 w-3 animate-spin'
                                                : 'mr-1 h-3 w-3'
                                        }
                                    />
                                    {loading ? 'Analyzing…' : 'Re-analyze'}
                                </Button>
                            </div>
                        }
                    >
                        <ColumnBrowser
                            columns={columns}
                            onOpenEntry={onOpenEntry}
                        />
                    </Panel>

                    <Panel title="Detected primary keys — unique columns ranked by name heuristics (confidence in %)">
                        <EntryKeysTable
                            entries={entries}
                            onOpenEntry={onOpenEntry}
                        />
                    </Panel>

                    <Panel title="Foreign-key candidates — columns matching another endpoint's key (coverage = sampled value overlap)">
                        <ForeignKeyTable
                            foreignKeys={foreignKeys}
                            onOpenEntry={onOpenEntry}
                        />
                    </Panel>
                </>
            )}
        </div>
    );
}
