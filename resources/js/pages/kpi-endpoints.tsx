import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Panel } from '@/components/widgets';
import {
    fetchKpiEndpoints,
    fireKpiEndpoint,
    fireAllKpiEndpoints,
    type KpiEndpointRow,
} from '@/services/kpiEndpointApi';

function IconRefresh({ className = '' }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
        </svg>
    );
}

function IconPlay({ className = '' }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
    );
}

function IconCheck({ className = '' }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

function IconX({ className = '' }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}

function IconClock({ className = '' }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function IconEye({ className = '' }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

const FREQ_COLORS: Record<string, string> = {
    instant: 'bg-blue-500/15 text-blue-500 border-blue-500/40',
    daily: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40',
    weekly: 'bg-amber-500/15 text-amber-500 border-amber-500/40',
    monthly: 'bg-purple-500/15 text-purple-500 border-purple-500/40',
};

const STATUS_META: Record<string, { dot: string; text: string; icon: typeof IconCheck }> = {
    ok: { dot: 'bg-success', text: 'text-success', icon: IconCheck },
    error: { dot: 'bg-destructive', text: 'text-destructive', icon: IconX },
    pending: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', icon: IconClock },
};

const STATUS_PRIORITY: Record<string, number> = { error: 0, pending: 1, ok: 2 };

export default function KpiEndpointsPage() {
    const [rows, setRows] = useState<KpiEndpointRow[]>([]);
    const mountedRef = useRef(true);
    const [now, setNow] = useState(Date.now());

    const [initialLoad, setInitialLoad] = useState(true);
    const [firing, setFiring] = useState<Set<string>>(new Set());
    const [firingAll, setFiringAll] = useState(false);
    const [filterFreq, setFilterFreq] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [detailRow, setDetailRow] = useState<KpiEndpointRow | null>(null);

    // Shared timer state, kept in refs so ANY fetch path (auto-poll, manual
    // refresh, fire, fire all) can see and reset the same pending timer —
    // instead of it being trapped inside one useEffect closure.
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSyncedAtRef = useRef<string>('');
    const lastFetchAtRef = useRef<number>(Date.now());
    const runPollRef = useRef<(() => void) | null>(null);

    const clearPollTimer = () => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    };

    // Given a fresh rows snapshot, (re)schedule the next auto-refetch so it
    // fires once the freshest last_synced_at turns 60s old. e.g. if the
    // freshest row is already 33s old, the next check happens in 27s, not
    // in a fresh 60s. Always clears any pending timer first so we never end
    // up with two competing schedules running at once.
    const scheduleNextPoll = useCallback((data: KpiEndpointRow[]) => {
        clearPollTimer();
        if (!mountedRef.current) return;

        const latest = data.reduce((max, r) =>
            r.last_synced_at && r.last_synced_at > max ? r.last_synced_at : max
            , '');

        if (!latest || latest === lastSyncedAtRef.current) {
            pollTimerRef.current = setTimeout(() => runPollRef.current?.(), 5_000);
            return;
        }

        lastSyncedAtRef.current = latest;
        const ageMs = Date.now() - new Date(latest).getTime();
        const elapsed = Date.now() - lastFetchAtRef.current;
        // Dynamic delay: when data hits 60s, but never within 10s of last fetch
        const delay = Math.max(10_000 - elapsed, 1_000, 60_000 - ageMs);
        pollTimerRef.current = setTimeout(() => runPollRef.current?.(), delay);
    }, []);

    const runPoll = useCallback(async () => {
        if (!mountedRef.current) return;
        lastFetchAtRef.current = Date.now();
        try {
            const data = await fetchKpiEndpoints();
            if (!mountedRef.current) return;
            setRows(data);
            setInitialLoad(false);
            scheduleNextPoll(data);
        } catch {
            if (mountedRef.current) {
                pollTimerRef.current = setTimeout(() => runPollRef.current?.(), 5_000);
            }
        }
         
    }, [scheduleNextPoll]);

    runPollRef.current = runPoll;

    // Single fetch function — used by manual refresh, fire, and fire all.
    // Also reschedules the auto-poll timer so manual actions stay in sync
    // with it instead of leaving a stale background timer running.
    const fetchRows = useCallback(async (): Promise<KpiEndpointRow[]> => {
        lastFetchAtRef.current = Date.now()
        try {
            const data = await fetchKpiEndpoints();
            if (mountedRef.current) {
                setRows(data);
                setInitialLoad(false);
                scheduleNextPoll(data);
            }
            return data;
        } catch {
            return [];
        }
    }, [scheduleNextPoll]);

    useEffect(() => {
        mountedRef.current = true;
        runPoll();
        const tickId = setInterval(() => setNow(Date.now()), 1_000);
        return () => {
            mountedRef.current = false;
            clearPollTimer();
            clearInterval(tickId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = rows
        .filter((r) => {
            if (filterFreq !== 'all' && r.refresh_frequency !== filterFreq) return false;
            if (filterStatus !== 'all' && r.last_status !== filterStatus) return false;
            return true;
        })
        .sort((a, b) => {
            const pa = STATUS_PRIORITY[a.last_status] ?? 3;
            const pb = STATUS_PRIORITY[b.last_status] ?? 3;
            if (pa !== pb) return pa - pb;
            // Within same status, stale rows (warning) come before fresh
            if (a.row_class !== b.row_class) return a.row_class ? -1 : 1;
            return 0;
        });

    const stats = {
        total: rows.length,
        ok: rows.filter((r) => r.last_status === 'ok').length,
        error: rows.filter((r) => r.last_status === 'error').length,
        pending: rows.filter((r) => r.last_status === 'pending').length,
    };

    // Fire single — optimistic row update, refetch on completion
    const handleFire = async (row: KpiEndpointRow) => {
        const key = `${row.kpi_code}:${row.variable_key}`;
        setFiring((prev) => new Set(prev).add(key));
        // Optimistically mark row as pending with fresh timestamp
        setRows((prev) =>
            prev.map((r) =>
                r.kpi_code === row.kpi_code && r.variable_key === row.variable_key
                    ? { ...r, last_status: 'pending' as const, last_error: null, last_synced_at: new Date().toISOString() }
                    : r,
            ),
        );
        try {
            await fireKpiEndpoint(row.endpoint, row.kpi_code, row.variable_key);
            // Refetch immediately to get real DB state
            await fetchRows();
        } catch {
            toast.error('Failed to dispatch job');
            fetchRows();
        } finally {
            setFiring((prev) => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    // Fire all — optimistic update, then refetch real DB state
    const handleFireAll = async () => {
        setFiringAll(true);
        // Optimistically mark all filtered rows as pending
        setRows((prev) =>
            prev.map((r) => {
                if (filterFreq !== 'all' && r.refresh_frequency !== filterFreq) return r;
                return { ...r, last_status: 'pending' as const, last_error: null, last_synced_at: new Date().toISOString() };
            }),
        );
        try {
            const freq = filterFreq !== 'all' ? filterFreq : undefined;
            const result = await fireAllKpiEndpoints(freq);
            toast.success(`Synced ${result.dispatched} endpoints`);
            // Refetch to get real DB state
            await fetchRows();
        } catch {
            toast.error('Failed to sync endpoints');
            fetchRows();
        } finally {
            setFiringAll(false);
        }
    };

    const timeAgo = (iso: string | null) => {
        if (!iso) return '—';
        // Clamp negative diffs: `now` only updates once per second via the
        // tick interval, so it can briefly lag behind a timestamp stamped
        // at the exact current instant (e.g. right after an optimistic
        // "Fire" update), which would otherwise show as "-1s".
        const diff = Math.max(0, now - new Date(iso).getTime());
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        // >= not > — at exactly 60 minutes this must roll over to "1h 0m"
        // instead of falling through to "60m Xs".
        if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    };

    return (
        <>
            <Head title="KPI Endpoints — BACOVET" />
            <AppShell page="/kpi-endpoints" title="KPI Endpoints" subtitle="Endpoint health, values & manual dispatch">
                <div className="space-y-4">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Panel title="Total">
                            <div className="text-2xl font-bold font-mono">{stats.total}</div>
                        </Panel>
                        <Panel title="Healthy">
                            <div className="text-2xl font-bold font-mono text-success">{stats.ok}</div>
                        </Panel>
                        <Panel title="Errors">
                            <div className="text-2xl font-bold font-mono text-destructive">{stats.error}</div>
                        </Panel>
                        <Panel title="Pending">
                            <div className="text-2xl font-bold font-mono text-muted-foreground">{stats.pending}</div>
                        </Panel>
                    </div>

                    {/* Filters + actions */}
                    <Panel
                        title="Endpoints"
                        right={
                            <div className="flex items-center gap-2">
                                <select
                                    value={filterFreq}
                                    onChange={(e) => setFilterFreq(e.target.value)}
                                    className="h-7 rounded border border-border bg-background px-2 font-mono text-[10px] tracking-wider uppercase"
                                >
                                    <option value="all">All frequencies</option>
                                    <option value="instant">Instant</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="h-7 rounded border border-border bg-background px-2 font-mono text-[10px] tracking-wider uppercase"
                                >
                                    <option value="all">All status</option>
                                    <option value="ok">OK</option>
                                    <option value="error">Error</option>
                                    <option value="pending">Pending</option>
                                </select>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fetchRows()}
                                    className="h-7 text-[10px] tracking-wider uppercase"
                                >
                                    <IconRefresh className="mr-1 h-3 w-3" /> Refresh
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={firingAll}
                                    onClick={handleFireAll}
                                    className="h-7 text-[10px] tracking-wider uppercase"
                                >
                                    <IconPlay className="mr-1 h-3 w-3" />
                                    {firingAll ? 'Dispatching…' : 'Fire All'}
                                </Button>
                            </div>
                        }
                    >
                        {initialLoad ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-center gap-4 py-2">
                                        <Skeleton className="h-4 w-40" />
                                        <Skeleton className="h-4 w-20" />
                                        <Skeleton className="h-4 w-16" />
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-7 w-20" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="max-h-[600px] overflow-auto">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-background">
                                        <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                                            <th className="py-2 px-3 text-left">Endpoint</th>
                                            <th className="py-2 px-3 text-left">KPI</th>
                                            <th className="py-2 px-3 text-left">Key</th>
                                            <th className="py-2 px-3 text-left">Freq</th>
                                            <th className="py-2 px-3 text-left">Status</th>
                                            <th className="py-2 px-3 text-left">Last Sync</th>
                                            <th className="py-2 px-3 text-left">Last Valid Sync</th>
                                            <th className="py-2 px-3 text-left">Value</th>
                                            <th className="py-2 px-3 text-left">Diagnostic</th>
                                            <th className="py-2 px-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="font-mono">
                                        {filtered.map((row) => {
                                            const meta = STATUS_META[row.last_status] || STATUS_META.pending;
                                            const StatusIcon = meta.icon;
                                            const key = `${row.kpi_code}:${row.variable_key ?? 'null'}`;
                                            const isFiring = firing.has(key);
                                            const extractedVal = row.extracted_value;

                                            return (
                                                <tr key={key} className={`border-b border-border/50 hover:bg-muted/30 ${row.row_class || ''}`}>
                                                    <td className="py-2 px-3 text-xs text-muted-foreground max-w-[200px] truncate" title={row.endpoint}>
                                                        {row.endpoint}
                                                    </td>
                                                    <td className="px-3 text-xs font-bold">{row.kpi_code}</td>
                                                    <td className="px-3 text-xs">{row.variable_key ?? '—'}</td>
                                                    <td className="px-3">
                                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] tracking-wider uppercase ${FREQ_COLORS[row.refresh_frequency] || 'bg-muted text-muted-foreground border-border'}`}>
                                                            {row.refresh_frequency}
                                                        </span>
                                                    </td>
                                                    <td className="px-3">
                                                        <span className={`inline-flex items-center gap-1.5 text-xs ${meta.text}`}>
                                                            <span className={`h-2 w-2 rounded-full ${meta.dot} ${row.last_status === 'ok' ? 'animate-pulse' : ''}`} />
                                                            <StatusIcon className="h-3 w-3" />
                                                            {row.last_status.toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 text-xs text-muted-foreground">
                                                        {timeAgo(row.last_synced_at)}
                                                    </td>
                                                    <td className="px-3 text-xs text-muted-foreground">
                                                        {row.last_valid_synced_at ? timeAgo(row.last_valid_synced_at) : 'jamais'}
                                                    </td>
                                                    <td className="px-3 text-xs font-bold tabular-nums">
                                                        {extractedVal != null ? String(extractedVal) : '—'}
                                                    </td>
                                                    <td className="px-3 max-w-[250px]">
                                                        {row.last_status === 'error' && row.last_error ? (
                                                            <span className="inline-flex items-start gap-1 text-[10px] text-destructive break-words" title={row.last_error}>
                                                                <IconX className="h-3 w-3 shrink-0 mt-0.5" />
                                                                {row.diagnostic}
                                                            </span>
                                                        ) : row.diagnostic === 'never_synced' ? (
                                                            <span className="text-[10px] text-muted-foreground italic">never synced</span>
                                                        ) : row.diagnostic.startsWith('stale') ? (
                                                            <span className="text-[10px] text-warning">{row.diagnostic}</span>
                                                        ) : (
                                                            <span className="text-[10px] text-success">ok</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0"
                                                            title="View details"
                                                            onClick={() => setDetailRow(row)}
                                                        >
                                                            <IconEye className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isFiring}
                                                            onClick={() => handleFire(row)}
                                                            className="h-7 text-[10px] tracking-wider uppercase"
                                                        >
                                                            {isFiring ? '…' : 'Fire'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filtered.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="py-8 text-center text-xs text-muted-foreground">
                                                    No endpoints found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="mt-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                            Showing {filtered.length} of {rows.length} endpoints
                        </div>
                    </Panel>
                </div>

                {/* Detail modal */}
                <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="font-mono text-sm tracking-wider uppercase">
                                {detailRow?.kpi_code} — {detailRow?.variable_key}
                            </DialogTitle>
                        </DialogHeader>
                        {detailRow && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Endpoint</span>
                                        <div className="mt-1 break-all font-mono text-xs">{detailRow.endpoint}</div>
                                    </div>
                                    <div>
                                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Frequency</span>
                                        <div className="mt-1 font-mono">{detailRow.refresh_frequency}</div>
                                    </div>
                                    <div>
                                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Status</span>
                                        <div className={`mt-1 font-mono ${STATUS_META[detailRow.last_status]?.text || ''}`}>
                                            {detailRow.last_status.toUpperCase()}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Last Sync</span>
                                        <div className="mt-1 font-mono">{detailRow.last_synced_at ? new Date(detailRow.last_synced_at).toLocaleString() : '—'}</div>
                                    </div>
                                    <div>
                                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Extracted Value</span>
                                        <div className="mt-1 font-mono">{detailRow.extracted_value != null ? String(detailRow.extracted_value) : '—'}</div>
                                    </div>
                                    <div>
                                        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Diagnostic</span>
                                        <div className="mt-1 font-mono text-xs break-words">{detailRow.diagnostic}</div>
                                    </div>
                                </div>

                                {detailRow.last_error && (
                                    <div>
                                        <span className="font-mono text-[10px] tracking-wider text-destructive uppercase">Error</span>
                                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-destructive/10 p-2 text-xs text-destructive break-words whitespace-pre-wrap">
                                            {detailRow.last_error}
                                        </pre>
                                    </div>
                                )}

                                <div>
                                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Computed Data</span>
                                    <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-3 text-xs break-words whitespace-pre-wrap">
                                        {JSON.stringify(detailRow.computed_data, null, 2)}
                                    </pre>
                                </div>

                                <div>
                                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Response Data (excerpt)</span>
                                    <pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-3 text-xs break-words whitespace-pre-wrap">
                                        {JSON.stringify(
                                            detailRow.response_data
                                                ? typeof detailRow.response_data === 'object' && (detailRow.response_data as Record<string, unknown>).raw
                                                    ? (detailRow.response_data as Record<string, unknown>).raw
                                                    : detailRow.response_data
                                                : null,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </AppShell>
        </>
    );
}