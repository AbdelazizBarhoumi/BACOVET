import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

type Ctx = {
    lastSync: number;
    now: number;
    isStale: boolean;
    hasError: boolean;
    refreshIntervalSec: number;
    setRefreshIntervalSec: (n: number) => void;
    forceSync: () => void;
    recordFetchSuccess: () => void;
    recordFetchError: () => void;
};

const LiveCtx = createContext<Ctx>({
    lastSync: Date.now(),
    now: Date.now(),
    isStale: false,
    hasError: false,
    refreshIntervalSec: 60,
    setRefreshIntervalSec: () => {},
    forceSync: () => {},
    recordFetchSuccess: () => {},
    recordFetchError: () => {},
});

export function LiveDataProvider({ children }: { children: ReactNode }) {
    const [lastSync, setLastSync] = useState(() => Date.now());
    const [now, setNow] = useState(() => Date.now());
    const [refreshIntervalSec, setRefreshIntervalSec] = useState(60);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const tick = setInterval(() => {
            setNow(Date.now());
        }, 1000);
        return () => clearInterval(tick);
    }, []);

    const forceSync = useCallback(() => {
        setLastSync(Date.now());
        setHasError(false);
    }, []);

    const recordFetchSuccess = useCallback(() => {
        setLastSync(Date.now());
        setHasError(false);
    }, []);

    const recordFetchError = useCallback(() => {
        setHasError(true);
    }, []);

    const value = useMemo<Ctx>(
        () => ({
            lastSync,
            now,
            isStale:
                now - lastSync > Math.max(120_000, refreshIntervalSec * 2000),
            hasError,
            refreshIntervalSec,
            setRefreshIntervalSec,
            forceSync,
            recordFetchSuccess,
            recordFetchError,
        }),
        [lastSync, now, refreshIntervalSec, hasError, forceSync, recordFetchSuccess, recordFetchError],
    );

    return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}

export const useLiveData = () => useContext(LiveCtx);
