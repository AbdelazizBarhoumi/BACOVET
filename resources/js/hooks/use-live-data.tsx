import { usePage } from '@inertiajs/react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { getCsrfToken } from '@/lib/session';

const STATUS_URL = '/api/endpoint-datasets/status';
const SYNC_URL = '/api/endpoint-datasets/sync';
const SETTINGS_URL = '/api/settings';
const INTERVAL_SETTING_KEY = 'sync_interval_seconds';

const POLL_INTERVAL_MS = 10_000;
const TICK_INTERVAL_MS = 5_000;
const MIN_INTERVAL_SEC = 60;
const MAX_INTERVAL_SEC = 600;

export type SyncTriggerResult = {
    queued: boolean;
    /** True when the server ran the sync in-request (no shell on that host). */
    synchronous: boolean;
    success?: boolean;
    output?: string;
};

type Ctx = {
    lastSync: number;
    now: number;
    elapsedMs: number;
    isStale: boolean;
    hasError: boolean;
    okCount: number;
    errorCount: number;
    refreshIntervalSec: number;
    setRefreshIntervalSec: (n: number) => void;
    running: boolean;
    runningSince: number;
    forceSync: () => Promise<SyncTriggerResult>;
};

const LiveCtx = createContext<Ctx>({
    lastSync: 0,
    now: Date.now(),
    elapsedMs: 0,
    isStale: true,
    hasError: false,
    okCount: 0,
    errorCount: 0,
    refreshIntervalSec: 60,
    setRefreshIntervalSec: () => {},
    running: false,
    runningSince: 0,
    forceSync: async () => ({ queued: true, synchronous: false }),
});

async function fetchStatus(): Promise<{
    last_success_at: string | null;
    last_run_at: string | null;
    server_now: string | null;
    ok_count: number;
    error_count: number;
    retry_pending: boolean;
    running?: boolean;
    running_since?: string | null;
}> {
    const response = await fetch(STATUS_URL, {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    if (!response.ok) {
        throw new Error(`Sync status error: ${response.status}`);
    }

    return response.json();
}

async function triggerWorkerSync(): Promise<SyncTriggerResult> {
    const response = await fetch(SYNC_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getCsrfToken(),
        },
    });

    if (!response.ok) {
        let detail = '';
        try {
            const body = (await response.json()) as {
                error?: unknown;
                message?: unknown;
                output?: unknown;
            };
            const raw = body.error ?? body.message ?? body.output;
            if (typeof raw === 'string' && raw.trim() !== '') {
                detail = raw.trim().slice(0, 500);
            }
        } catch {
            // Fall through to the generic message below.
        }
        throw new Error(detail || `Sync trigger error: ${response.status}`);
    }

    const data = (await response.json()) as {
        queued?: boolean;
        mode?: unknown;
        success?: unknown;
        output?: unknown;
    };
    return {
        queued: data.queued !== false,
        synchronous: data.mode === 'sync' || 'exit_code' in data,
        success: typeof data.success === 'boolean' ? data.success : undefined,
        output: typeof data.output === 'string' ? data.output : undefined,
    };
}

export function LiveDataProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth();
    const { url } = usePage();
    // Skip polling on auth pages even with a lingering session cookie.
    const isAuthPage = url === '/login' || url.startsWith('/auth/');
    const authenticated = !!session && !isAuthPage;

    // lastSync is the worker's last successful run (an endpoint HTTP 200).
    const [lastSync, setLastSync] = useState(0);
    const [now, setNow] = useState(() => Date.now());
    const [hasError, setHasError] = useState(false);
    const [errorCount, setErrorCount] = useState(0);
    const [refreshIntervalSec, setRefreshIntervalSecState] = useState(60);
    const [running, setRunning] = useState(false);
    const [runningSince, setRunningSince] = useState(0);

    const syncInFlight = useRef(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clock offset between the browser and the server (ms). Elapsed time is
    // measured against the server clock so clock skew can't produce negatives.
    const [clockOffset, setClockOffset] = useState(0);

    const poll = useCallback(async (): Promise<void> => {
        try {
            const data = await fetchStatus();
            if (data.server_now) {
                const serverTs = Date.parse(data.server_now);
                if (!Number.isNaN(serverTs)) {
                    setClockOffset(serverTs - Date.now());
                }
            }
            if (data.last_success_at) {
                const ts = Date.parse(data.last_success_at);
                if (!Number.isNaN(ts)) {
                    setLastSync(ts);
                }
            }
            setErrorCount(Number.isFinite(data.error_count) ? data.error_count : 0);
            setHasError(false);
            setRunning(Boolean(data.running));
            if (data.running_since) {
                const started = Date.parse(data.running_since);
                if (!Number.isNaN(started)) {
                    setRunningSince(started);
                }
            } else if (!data.running) {
                setRunningSince(0);
            }
        } catch {
            setHasError(true);
        }
    }, []);

    useEffect(() => {
        if (!authenticated) return;
        const t = setTimeout(() => {
            void poll();
        }, 0);
        const id = setInterval(() => {
            void poll();
        }, POLL_INTERVAL_MS);
        return () => {
            clearTimeout(t);
            clearInterval(id);
        };
    }, [authenticated, poll]);

    useEffect(() => {
        const tick = setInterval(() => {
            setNow(Date.now());
        }, TICK_INTERVAL_MS);
        return () => clearInterval(tick);
    }, []);

    // Load the persisted worker interval once on mount.
    useEffect(() => {
        if (!authenticated) return;
        let cancelled = false;
        fetch(`${SETTINGS_URL}/${INTERVAL_SETTING_KEY}`, {
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (cancelled) return;
                const value = Number(data?.value);
                if (Number.isFinite(value) && value >= MIN_INTERVAL_SEC) {
                    setRefreshIntervalSecState(
                        Math.min(MAX_INTERVAL_SEC, Math.round(value)),
                    );
                }
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [authenticated]);

    // Persist the worker interval (min 60s) back to the server on change.
    const setRefreshIntervalSec = useCallback((n: number) => {
        const clamped = Math.max(
            MIN_INTERVAL_SEC,
            Math.min(MAX_INTERVAL_SEC, Math.round(n)),
        );
        setRefreshIntervalSecState(clamped);

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
            fetch(SETTINGS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({
                    key: INTERVAL_SETTING_KEY,
                    value: String(clamped),
                }),
            }).catch(() => {});
        }, 600);
    }, []);

    useEffect(
        () => () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        },
        [],
    );

    const forceSync = useCallback(async (): Promise<SyncTriggerResult> => {
        if (syncInFlight.current)
            return { queued: true, synchronous: false };
        syncInFlight.current = true;
        try {
            const result = await triggerWorkerSync();
            if (!result.queued) {
                setHasError(false);
            }
            return result;
        } catch (err) {
            setHasError(true);
            throw err instanceof Error
                ? err
                : new Error('Synchronisation impossible à lancer');
        } finally {
            syncInFlight.current = false;
            await poll();
        }
    }, [poll]);

    const elapsedMs = now + clockOffset - lastSync;

    // Staleness follows the configured interval (with a 2× grace margin) so
    // the badge doesn't flag red on long intervals. When we've never synced,
    // it's never "stale" — the pill handles that state itself.
    const staleAfterMs = Math.max(180_000, refreshIntervalSec * 2_000);

    const value = useMemo<Ctx>(
        () => ({
            lastSync,
            now,
            elapsedMs,
            isStale: lastSync > 0 && elapsedMs > staleAfterMs,
            hasError,
            okCount: 0,
            errorCount,
            refreshIntervalSec,
            setRefreshIntervalSec,
            running,
            runningSince,
            forceSync,
        }),
        [
            lastSync,
            now,
            elapsedMs,
            staleAfterMs,
            hasError,
            errorCount,
            refreshIntervalSec,
            setRefreshIntervalSec,
            running,
            runningSince,
            forceSync,
        ],
    );

    return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}

export const useLiveData = () => useContext(LiveCtx);
