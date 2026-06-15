import { useLiveData } from '@/hooks/use-live-data';
import { pushAudit } from '@/lib/audit';

export interface LiveSyncPillProps {
    lastFetchTime?: number;
    hasError?: boolean;
}

const LiveSyncPill = ({ lastFetchTime, hasError }: LiveSyncPillProps) => {
    const { lastSync, now, isStale, forceSync } = useLiveData();
    // Use props if provided, otherwise use hook data
    const finalLastSync = lastFetchTime ?? lastSync;

    // A pill is considered in error if:
    // 1. hasError prop is explicitly true
    // 2. hasError prop is undefined AND (isStale from hook OR local calculation from finalLastSync)
    const isLocallyStale = now - finalLastSync > 120_000;
    const finalHasError = hasError ?? (isStale || isLocallyStale);

    const ago = Math.floor((now - finalLastSync) / 1000);

    return (
        <button
            onClick={() => {
                forceSync();
                pushAudit('SYSTEM', "Synchronisation forcée par l'utilisateur");
            }}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors ${
                finalHasError
                    ? 'border-status-red/40 bg-status-red/20 text-status-red hover:bg-status-red/30'
                    : 'border-success/30 bg-success/15 text-success hover:bg-success/25'
            }`}
            title="Cliquez pour forcer la synchronisation"
        >
            <span
                className={`h-2 w-2 rounded-full ${finalHasError ? 'bg-status-red' : 'animate-pulse bg-success'}`}
            />
            {finalHasError ? 'SYNC: ERREUR' : 'LIVE SYNC: OK'}
            <span className="opacity-60">
                · {ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`}
            </span>
        </button>
    );
};

export default LiveSyncPill;
