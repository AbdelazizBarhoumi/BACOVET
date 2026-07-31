import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SharedColumn } from '@/services/endpointManagerApi';
import { TypeBadge } from './TypeBadge';

function valueText(value: unknown): string {
    if (value === null || value === undefined) {
        return '—';
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }
    return String(value);
}

export function ColumnBrowser({
    columns,
    onOpenEntry,
}: {
    columns: SharedColumn[];
    onOpenEntry: (entryId: string) => void;
}) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = q
            ? columns.filter((column) => column.name.toLowerCase().includes(q))
            : columns;
        return list;
    }, [columns, query]);

    const active = useMemo(
        () => filtered.find((column) => column.name === selected) ?? filtered[0] ?? null,
        [filtered, selected],
    );

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="space-y-2">
                <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelected(null);
                        }}
                        placeholder="Search a column, e.g. ProdGroup…"
                        className="h-7 pl-8 font-mono text-xs"
                    />
                </div>
                <div className="max-h-96 overflow-auto rounded-md border border-border">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            No column matches “{query}”.
                        </div>
                    ) : (
                        filtered.map((column) => (
                            <button
                                key={column.name}
                                type="button"
                                onClick={() => {
                                    setSelected(column.name);
                                }}
                                className={cn(
                                    'flex w-full items-center justify-between gap-2 border-b border-border/50 px-3 py-2 text-left transition-colors last:border-0 hover:bg-muted/40',
                                    active?.name === column.name && 'bg-muted/60',
                                )}
                            >
                                <span className="truncate font-mono text-xs font-semibold">
                                    {column.name}
                                </span>
                                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                    ×{column.endpoint_count}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {active ? (
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold">{active.name}</span>
                        <TypeBadge type={active.type} />
                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            {active.endpoint_count} endpoint{active.endpoint_count === 1 ? '' : 's'}
                        </span>
                        {active.sources.map((source) => (
                            <span
                                key={source}
                                className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase"
                            >
                                {source}
                            </span>
                        ))}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-md border border-border">
                            <div className="border-b border-border px-3 py-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Endpoints containing this column
                            </div>
                            <div className="max-h-64 overflow-auto">
                                {active.endpoints.map((endpoint) => (
                                    <button
                                        key={endpoint.entry_id}
                                        type="button"
                                        onClick={() => onOpenEntry(endpoint.entry_id)}
                                        className="flex w-full items-center justify-between gap-2 border-b border-border/50 px-3 py-1.5 text-left transition-colors last:border-0 hover:bg-muted/40"
                                    >
                                        <span className="truncate text-xs font-medium">
                                            {endpoint.entry_name}
                                        </span>
                                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                                            {endpoint.distinct_count} distinct
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-md border border-border">
                            <div className="border-b border-border px-3 py-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                Sample values ({active.distinct_values.length} shown)
                            </div>
                            <div className="flex max-h-64 flex-wrap gap-1.5 overflow-auto p-2">
                                {active.distinct_values.map((value, index) => (
                                    <span
                                        key={`${valueText(value)}-${index}`}
                                        className="max-w-full truncate rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px]"
                                        title={valueText(value)}
                                    >
                                        {valueText(value)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                    Select a column to inspect which endpoints share it and what values exist.
                </div>
            )}
        </div>
    );
}
