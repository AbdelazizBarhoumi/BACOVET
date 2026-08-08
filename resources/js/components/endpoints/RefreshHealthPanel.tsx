import { AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/widgets';
import { cn } from '@/lib/utils';
import {
    fetchEndpoints,
    fetchHealth,
    triggerEndpointRefresh,
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
        return `il y a ${seconds}s`;
    }
    if (seconds < 3600) {
        return `il y a ${Math.round(seconds / 60)}m`;
    }
    if (seconds < 86400) {
        return `il y a ${Math.round(seconds / 3600)}h`;
    }
    return `il y a ${Math.round(seconds / 86400)}j`;
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
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [refreshingId, setRefreshingId] = useState<string | null>(null);

    const load = useCallback(async (quiet = false) => {
        if (!quiet) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }
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
                    : 'Échec du chargement des données de santé',
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
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
                    `Rafraîchissement terminé — ${result.meta?.ok ?? 0} ok, ${result.meta?.failed ?? 0} en échec`,
                );
            } else {
                toast.error(
                    'Échec de la commande de rafraîchissement (code de sortie ' +
                        result.exit_code +
                        ')',
                );
            }
            await load(true);
            onRefreshed();
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Échec du rafraîchissement',
            );
        } finally {
            setRunning(false);
        }
    }, [load, onRefreshed]);

    const handleRefreshOne = useCallback(
        async (item: EndpointSummary) => {
            setRefreshingId(item.id);
            try {
                const result = await triggerEndpointRefresh(item.id);
                if (result.success) {
                    const entry = result.entry;
                    toast.success(
                        entry?.last_error
                            ? `Échec du rafraîchissement de « ${entry.name} » : ${entry.last_error}`
                            : `« ${entry?.name ?? item.name} » rafraîchi`,
                    );
                } else {
                    toast.error(
                        `Échec du rafraîchissement de « ${item.name} » (code de sortie ${result.exit_code})`,
                    );
                }
                await load(true);
                onRefreshed();
            } catch (err) {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : 'Échec du rafraîchissement',
                );
            } finally {
                setRefreshingId(null);
            }
        },
        [load, onRefreshed],
    );

    const meta = health?.meta;
    const lastErrorCount = items.filter((item) => item.last_error).length;

    return (
        <div className="space-y-4">
            {health?.retry_pending && (
                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        Relances horaires armées — la dernière exécution s'est
                        terminée avec 0 succès. Le rafraîchissement sera relancé
                        automatiquement toutes les heures jusqu'à 21:59.
                    </span>
                </div>
            )}

            {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <Panel title="Dernière exécution">
                    <div className="font-mono text-sm font-bold">
                        {formatRelative(meta?.last_run_at)}
                    </div>
                </Panel>
                <Panel title="Durée">
                    <div className="font-mono text-2xl font-bold">
                        {formatDuration(meta?.last_run_duration_s)}
                    </div>
                </Panel>
                <Panel title="OK">
                    <div className="font-mono text-2xl font-bold text-success">
                        {meta?.ok ?? 0}
                    </div>
                </Panel>
                <Panel title="Échecs">
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
                <Panel title="Ignorés">
                    <div className="font-mono text-2xl font-bold text-muted-foreground">
                        {meta?.skipped ?? 0}
                    </div>
                </Panel>
                <Panel title="Endpoints en erreur">
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
                title="État par endpoint"
                right={
                    <div className="flex items-center gap-2">
                        {refreshing && (
                            <span className="text-[10px] text-muted-foreground">
                                Mise à jour…
                            </span>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleRefreshNow}
                            disabled={running || refreshing}
                        >
                            <RefreshCw
                                className={cn(
                                    'mr-2 h-3.5 w-3.5',
                                    running && 'animate-spin',
                                )}
                            />
                            {running
                                ? 'Rafraîchissement…'
                                : 'Rafraîchir maintenant'}
                        </Button>
                    </div>
                }
            >
                {loading ? (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                        Chargement des données de santé…
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                    <th className="py-2 pr-3">Nom</th>
                                    <th className="py-2 pr-3">Méthode</th>
                                    <th className="py-2 pr-3">Statut</th>
                                    <th className="py-2 pr-3">Vérifié</th>
                                    <th className="py-2 pr-3">Dernier OK</th>
                                    <th className="py-2 pr-3">
                                        Dernière erreur
                                    </th>
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
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0"
                                                    title="Rafraîchir cet endpoint maintenant"
                                                    disabled={
                                                        refreshingId === item.id
                                                    }
                                                    onClick={() =>
                                                        handleRefreshOne(item)
                                                    }
                                                >
                                                    <RefreshCw
                                                        className={cn(
                                                            'h-3.5 w-3.5',
                                                            refreshingId ===
                                                                item.id &&
                                                                'animate-spin',
                                                        )}
                                                    />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 w-6 p-0"
                                                    title="Voir l'entrée"
                                                    onClick={() =>
                                                        onOpenEntry(item.id)
                                                    }
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
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
