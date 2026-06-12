import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Ctx = {
  lastSync: number;
  now: number;
  isStale: boolean;
  refreshIntervalSec: number;
  setRefreshIntervalSec: (n: number) => void;
  forceSync: () => void;
};

const LiveCtx = createContext<Ctx>({
  lastSync: Date.now(),
  now: Date.now(),
  isStale: false,
  refreshIntervalSec: 60,
  setRefreshIntervalSec: () => {},
  forceSync: () => {},
});

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [lastSync, setLastSync] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(60);

  useEffect(() => {
    const tick = setInterval(() => {
      const time = Date.now();
      setNow(time);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setLastSync(Date.now()), refreshIntervalSec * 1000);
    return () => clearInterval(id);
  }, [refreshIntervalSec]);

  const value = useMemo<Ctx>(
    () => ({
      lastSync,
      now,
      isStale: now - lastSync > Math.max(120_000, refreshIntervalSec * 2000),
      refreshIntervalSec,
      setRefreshIntervalSec,
      forceSync: () => setLastSync(Date.now()),
    }),
    [lastSync, now, refreshIntervalSec],
  );

  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>;
}

export const useLiveData = () => useContext(LiveCtx);
