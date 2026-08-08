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

type Ctx = {
    lastSync: number;
    now: number;
    elapsedMs: number;
    isStale: boolean;
    hasError: boolean;
    refreshIntervalSec: number;
    setRefreshIntervalSec: (n: number) => void;
    forceSync: () => void;
};

const LiveCtx = createContext<Ctx>({
    lastSync: 0,
    now: Date.now(),
    elapsedMs: 0,
    isStale: true,
    hasError: false,
    refreshIntervalSec: 60,
    setRefreshIntervalSec: () => {},
    forceSync: () => {},
});

async function fetchStatus(): Promise<{
    last_success_at: string | null;
    server_now: string | null;
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

async function triggerWorkerSync(): Promise<void> {
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
        throw new Error(`Sync trigger error: ${response.status}`);
    }
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
    const [refreshIntervalSec, setRefreshIntervalSecState] = useState(60);

    const syncInFlight = useRef(false);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clock offset between the browser and the server (ms). Elapsed time is
    // measured against the server clock so clock skew can't produce negatives.
    const clockOffsetRef = useRef(0);

    const poll = useCallback(async (): Promise<void> => {
        try {
            const data = await fetchStatus();
            if (data.server_now) {
                const serverTs = Date.parse(data.server_now);
                if (!Number.isNaN(serverTs)) {
                    clockOffsetRef.current = serverTs - Date.now();
                }
            }
            if (data.last_success_at) {
                const ts = Date.parse(data.last_success_at);
                if (!Number.isNaN(ts)) {
                    setLastSync(ts);
                }
            }
            setHasError(false);
        } catch {
            setHasError(true);
        }
    }, []);

    useEffect(() => {
        if (!authenticated) return;
        void poll();
        const id = setInterval(() => {
            void poll();
        }, POLL_INTERVAL_MS);
        return () => clearInterval(id);
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

    const forceSync = useCallback(async () => {
        if (syncInFlight.current) return;
        syncInFlight.current = true;
        try {
            await triggerWorkerSync();
        } catch {
            setHasError(true);
        } finally {
            syncInFlight.current = false;
            await poll();
        }
    }, [poll]);

    const elapsedMs = now + clockOffsetRef.current - lastSync;

    const value = useMemo<Ctx>(
        () => ({
            lastSync,
            now,
            elapsedMs,
            isStale: elapsedMs > 180_000,
            hasError,
            refreshIntervalSec,
            setRefreshIntervalSec,
            forceSync,
        }),
        [
            lastSync,
            now,
            elapsedMs,
            hasError,
            refreshIntervalSec,
            setRefreshIntervalSec,
            forceSync,
        ],
    );

    return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}

export const useLiveData = () => useContext(LiveCtx);
