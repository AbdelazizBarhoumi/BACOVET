import { useLiveData } from "@/hooks/use-live-data";
import { pushAudit } from "@/lib/audit";

export interface LiveSyncPillProps {
  lastFetchTime?: number;
  hasError?: boolean;
}

const LiveSyncPill = ({ lastFetchTime, hasError }: LiveSyncPillProps) => {
  const { lastSync, isStale, forceSync } = useLiveData();
  // Use props if provided, otherwise use hook data
  const finalLastSync = lastFetchTime ?? lastSync;
  
  // A pill is considered in error if:
  // 1. hasError prop is explicitly true
  // 2. hasError prop is undefined AND (isStale from hook OR local calculation from finalLastSync)
  const isLocallyStale = Date.now() - finalLastSync > 120_000;
  const finalHasError = hasError ?? (isStale || isLocallyStale);
  
  const ago = Math.floor((Date.now() - finalLastSync) / 1000);
  
  return (
    <button
      onClick={() => {
        forceSync();
        pushAudit("SYSTEM", "Synchronisation forcée par l'utilisateur");
      }}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors cursor-pointer ${
        finalHasError
          ? "bg-status-red/20 text-status-red border-status-red/40 hover:bg-status-red/30"
          : "bg-success/15 text-success border-success/30 hover:bg-success/25"
      }`}
      title="Cliquez pour forcer la synchronisation"
    >
      <span
        className={`h-2 w-2 rounded-full ${finalHasError ? "bg-status-red" : "bg-success animate-pulse"}`}
      />
      {finalHasError ? "SYNC: ERREUR" : "LIVE SYNC: OK"}
      <span className="opacity-60">· {ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`}</span>
    </button>
  );
};

export default LiveSyncPill;
