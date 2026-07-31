import { ChevronLeft, ChevronRight, Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EndpointSummary } from '@/services/endpointManagerApi';
import { StatusBadge } from './StatusBadge';

const SOURCE_STYLES: Record<string, string> = {
    SDT: 'bg-sky-500/15 text-sky-500 border-sky-500/40',
    QCM: 'bg-violet-500/15 text-violet-500 border-violet-500/40',
    DIVATEX: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40',
    OTHER: 'bg-muted text-muted-foreground border-border',
};

function MethodBadge({ method }: { method: string }) {
    const isGet = method.toUpperCase() === 'GET';
    return (
        <span
            className={cn(
                'inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] tracking-wider',
                isGet
                    ? 'bg-sky-500/15 text-sky-500 border-sky-500/40'
                    : 'bg-amber-500/15 text-amber-500 border-amber-500/40',
            )}
        >
            {method.toUpperCase()}
        </span>
    );
}

function SourceBadge({ source }: { source: string }) {
    const style = SOURCE_STYLES[source] ?? SOURCE_STYLES.OTHER;
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase',
                style,
            )}
        >
            {source}
        </span>
    );
}

function Pagination({
    page,
    perPage,
    total,
    onPageChange,
}: {
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
}) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const from = total === 0 ? 0 : (page - 1) * perPage + 1;
    const to = Math.min(total, page * perPage);

    return (
        <div className="mt-2 flex items-center justify-between font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            <span>
                Showing {from}–{to} of {total} endpoints
            </span>
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    <ChevronLeft className="h-3 w-3" />
                </Button>
                <span>
                    {page} / {totalPages}
                </span>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-6 w-6 p-0"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    <ChevronRight className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

export function EndpointsTable({
    items,
    loading,
    onView,
    onEdit,
    onDuplicate,
    onDelete,
    page,
    perPage,
    total,
    onPageChange,
}: {
    items: EndpointSummary[];
    loading: boolean;
    onView: (item: EndpointSummary) => void;
    onEdit: (item: EndpointSummary) => void;
    onDuplicate: (item: EndpointSummary) => void;
    onDelete: (item: EndpointSummary) => void;
    page: number;
    perPage: number;
    total: number;
    onPageChange: (page: number) => void;
}) {
    return (
        <div>
            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4 py-2">
                            <div className="h-4 w-56 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-14 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                            <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                            <div className="h-7 w-24 animate-pulse rounded bg-muted" />
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                    No endpoints match the current filters.
                </div>
            ) : (
                <div className="max-h-[560px] overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-background">
                            <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                <th className="py-2 px-3 text-left">Name</th>
                                <th className="py-2 px-3 text-left">Method</th>
                                <th className="py-2 px-3 text-left">Endpoint</th>
                                <th className="py-2 px-3 text-left">Source</th>
                                <th className="py-2 px-3 text-left">Status</th>
                                <th className="py-2 px-3 text-right">Rows</th>
                                <th className="py-2 px-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="font-mono">
                            {items.map((item) => (
                                <tr
                                    key={item.id}
                                    className="border-b border-border/50 hover:bg-muted/30"
                                >
                                    <td className="max-w-[240px] py-2 px-3 text-xs font-semibold">
                                        <span className="block truncate" title={item.name}>
                                            {item.name}
                                        </span>
                                    </td>
                                    <td className="px-3">
                                        <MethodBadge method={item.method} />
                                    </td>
                                    <td className="max-w-[260px] px-3">
                                        <span
                                            className="block truncate text-xs text-muted-foreground"
                                            title={item.endpoint}
                                        >
                                            {item.slug || item.endpoint}
                                        </span>
                                    </td>
                                    <td className="px-3">
                                        <SourceBadge source={item.source} />
                                    </td>
                                    <td className="px-3">
                                        <StatusBadge status={item.status} />
                                    </td>
                                    <td className="px-3 text-right text-xs tabular-nums">
                                        {item.row_count}
                                    </td>
                                    <td className="px-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                title="View details"
                                                onClick={() => onView(item)}
                                            >
                                                <Eye className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                title="Edit"
                                                onClick={() => onEdit(item)}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0"
                                                title="Duplicate"
                                                onClick={() => onDuplicate(item)}
                                            >
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 w-7 p-0 hover:text-destructive"
                                                title="Delete"
                                                onClick={() => onDelete(item)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination
                page={page}
                perPage={perPage}
                total={total}
                onPageChange={onPageChange}
            />
        </div>
    );
}
