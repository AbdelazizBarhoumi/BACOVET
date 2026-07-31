import { AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/widgets';
import { cn } from '@/lib/utils';
import {
    fetchEndpoints,
    fetchHealth,
    triggerRefresh,
    type EndpointHealth,
    type EndpointSummary,
} from '@/services/endpointManagerApi';
import { StatusBadge } from './StatusBadge';

function formatRelative(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
        return '—';
    }
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) {
        return `${seconds}s ago`;
    }
    if (seconds < 3600) {
        return `${Math.round(seconds / 60)}m ago`;
    }
    if (seconds < 86400) {
        return `${Math.round(seconds / 3600)}h ago`;
    }
    return `${Math.round(seconds / 86400)}d ago`;
}

function formatDuration(seconds: number | null | undefined): string {
    if (seconds == null) {
        return '—';
    }
    return `${seconds.toFixed(1)}s`;
}

export function RefreshHealthPanel({
    onRefreshed,
    onOpenEntry,
}: {
    onRefreshed: () => void;
    onOpenEntry: (entryId: string) => void;
}) {
    const [health, setHealth] = useState<EndpointHealth | null>(null);
    const [items, setItems] = useState<EndpointSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [healthData, listData] = await Promise.all([
                fetchHealth(),
                fetchEndpoints({ per_page: 500 }),
            ]);
            setHealth(healthData);
            setItems(listData.items);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load health data',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const handleRefreshNow = useCallback(async () => {
        setRunning(true);
        try {
            const result = await triggerRefresh();
            if (result.success) {
                toast.success(
                    `Refresh done — ${result.meta?.ok ?? 0} ok, ${result.meta?.failed ?? 0} failed`,
                );
            } else {
                toast.error(
                    'Refresh command failed (exit code ' +
                        result.exit_code +
                        ')',
                );
            }
            await load();
            onRefreshed();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Refresh failed');
        } finally {
            setRunning(false);
        }
    }, [load, onRefreshed]);

    const meta = health?.meta;
    const lastErrorCount = items.filter((item) => item.last_error).length;

    return (
        <div className="space-y-4">
            {health?.retry_pending && (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        Hourly retries are armed — the last run ended with 0
                        successes. The refresh will retry automatically every
                        hour until 21:59.
                    </span>
                </div>
            )}

            {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <Panel title="Last run">
                    <div className="font-mono text-sm font-bold">
                        {formatRelative(meta?.last_run_at)}
                    </div>
                </Panel>
                <Panel title="Duration">
                    <div className="font-mono text-2xl font-bold">
                        {formatDuration(meta?.last_run_duration_s)}
                    </div>
                </Panel>
                <Panel title="OK">
                    <div className="font-mono text-2xl font-bold text-success">
                        {meta?.ok ?? 0}
                    </div>
                </Panel>
                <Panel title="Failed">
                    <div
                        className={cn(
                            'font-mono text-2xl font-bold',
                            (meta?.failed ?? 0) > 0
                                ? 'text-destructive'
                                : 'text-muted-foreground',
                        )}
                    >
                        {meta?.failed ?? 0}
                    </div>
                </Panel>
                <Panel title="Skipped">
                    <div className="font-mono text-2xl font-bold text-muted-foreground">
                        {meta?.skipped ?? 0}
                    </div>
                </Panel>
                <Panel title="Endpoints with error">
                    <div
                        className={cn(
                            'font-mono text-2xl font-bold',
                            lastErrorCount > 0
                                ? 'text-destructive'
                                : 'text-muted-foreground',
                        )}
                    >
                        {lastErrorCount}
                    </div>
                </Panel>
            </div>

            <Panel
                title="Per-endpoint status"
                right={
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRefreshNow}
                        disabled={running}
                    >
                        <RefreshCw
                            className={cn(
                                'mr-2 h-3.5 w-3.5',
                                running && 'animate-spin',
                            )}
                        />
                        {running ? 'Refreshing…' : 'Refresh now'}
                    </Button>
                }
            >
                {loading ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                        Loading health data…
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    <th className="py-2 pr-3">Name</th>
                                    <th className="py-2 pr-3">Method</th>
                                    <th className="py-2 pr-3">Status</th>
                                    <th className="py-2 pr-3">Checked</th>
                                    <th className="py-2 pr-3">Last OK</th>
                                    <th className="py-2 pr-3">Last error</th>
                                    <th className="py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr
                                        key={item.id}
                                        className="border-b border-border/50 last:border-0"
                                    >
                                        <td className="py-2 pr-3 font-medium">
                                            {item.name}
                                        </td>
                                        <td className="py-2 pr-3">
                                            <span className="font-mono text-[10px] text-muted-foreground">
                                                {item.method}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-3">
                                            <StatusBadge status={item.status} />
                                        </td>
                                        <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">
                                            {formatRelative(item.checked_at)}
                                        </td>
                                        <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">
                                            {formatRelative(item.last_ok_at)}
                                        </td>
                                        <td
                                            className={cn(
                                                'max-w-[260px] py-2 pr-3',
                                                item.last_error
                                                    ? 'text-destructive'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            <span
                                                className="block truncate"
                                                title={
                                                    item.last_error ?? undefined
                                                }
                                            >
                                                {item.last_error ? (
                                                    <>
                                                        <span className="mr-1">
                                                            ✗
                                                        </span>
                                                        {item.last_error}
                                                    </>
                                                ) : (
                                                    '—'
                                                )}
                                            </span>
                                        </td>
                                        <td className="py-2 text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                                title="View entry"
                                                onClick={() =>
                                                    onOpenEntry(item.id)
                                                }
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Panel>
        </div>
    );
}
