import { useLiveData } from '@/hooks/use-live-data';
import { pushAudit } from '@/lib/audit';

function formatAgo(seconds: number): string {
    if (seconds < 60) {
        return `${seconds}s`;
    }
    if (seconds < 3600) {
        return `${Math.floor(seconds / 60)}m`;
    }
    if (seconds < 86400) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h${m > 0 ? ` ${m}m` : ''}`;
    }
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    return `${d}j${h > 0 ? ` ${h}h` : ''}`;
}

const LiveSyncPill = () => {
    const { lastSync, elapsedMs, hasError, errorCount, refreshIntervalSec, forceSync } =
        useLiveData();

    const neverSynced = lastSync === 0;
    const ago = Math.max(0, Math.floor(elapsedMs / 1000));

    // Status bands are relative to the configured refresh interval so a 10-min
    // interval is not flagged red like a 1-min one would be.
    const warningAfterMs = Math.max(180_000, refreshIntervalSec * 1_000);
    const staleAfterMs = Math.max(300_000, refreshIntervalSec * 2_000);

    let status: 'green' | 'orange' | 'red';
    if (hasError || neverSynced) {
        status = 'red';
    } else if (errorCount > 0) {
        status = 'orange';
    } else if (elapsedMs >= staleAfterMs) {
        status = 'red';
    } else if (elapsedMs >= warningAfterMs) {
        status = 'orange';
    } else {
        status = 'green';
    }

    const statusConfig = {
        green: {
            label: 'LIVE SYNC: OK',
            dot: 'bg-success animate-pulse',
            wrapper: 'border-success/30 bg-success/15 text-success hover:bg-success/25',
        },
        orange: {
            label: errorCount > 0 ? 'SYNC: PARTIEL' : 'SYNC: ATTENTION',
            dot: 'bg-warning',
            wrapper: 'border-warning/40 bg-warning/20 text-warning hover:bg-warning/30',
        },
        red: {
            label: 'SYNC: ERREUR',
            dot: 'bg-status-red',
            wrapper: 'border-status-red/40 bg-status-red/20 text-status-red hover:bg-status-red/30',
        },
    };

    const cfg = statusConfig[status];

    return (
        <button
            onClick={() => {
                forceSync();
                pushAudit('SYSTEM', "Synchronisation forcée par l'utilisateur");
            }}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors ${cfg.wrapper}`}
            title="Cliquez pour forcer la synchronisation"
        >
            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
            {cfg.label}
            {status === 'orange' && errorCount > 0 && (
                <span className="opacity-60">· {errorCount} err</span>
            )}
            <span className="opacity-60">
                · {neverSynced ? 'jamais' : formatAgo(ago)}
            </span>
        </button>
    );
};

export default LiveSyncPill;
