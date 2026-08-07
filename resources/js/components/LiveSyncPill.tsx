import { useLiveData } from '@/hooks/use-live-data';
import { pushAudit } from '@/lib/audit';

const LiveSyncPill = () => {
    const { lastSync, now, hasError, forceSync } = useLiveData();

    const ago = Math.floor((now - lastSync) / 1000);
    const agoMs = now - lastSync;

    let status: 'green' | 'orange' | 'red';
    if (hasError || agoMs >= 600_000) {
        status = 'red';
    } else if (agoMs >= 120_000) {
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
            label: 'SYNC: ATTENTION',
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
            <span className="opacity-60">
                · {ago < 60 ? `${ago}s` : `${Math.floor(ago / 60)}m`}
            </span>
        </button>
    );
};

export default LiveSyncPill;
