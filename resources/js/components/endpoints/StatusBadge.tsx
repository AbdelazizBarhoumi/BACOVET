import { cn } from '@/lib/utils';

export type StatusTone = 'ok' | 'warn' | 'error' | 'grey';

const STATUS_META: Record<StatusTone, { badge: string; dot: string }> = {
    ok: {
        badge: 'bg-success/15 text-success border-success/40',
        dot: 'bg-success',
    },
    warn: {
        badge: 'bg-warning/15 text-warning border-warning/40',
        dot: 'bg-warning',
    },
    error: {
        badge: 'bg-destructive/15 text-destructive border-destructive/40',
        dot: 'bg-destructive',
    },
    grey: {
        badge: 'bg-muted text-muted-foreground border-border',
        dot: 'bg-muted-foreground',
    },
};

export function statusTone(status: number | null | undefined): StatusTone {
    if (status == null) {
        return 'grey';
    }
    if (status >= 200 && status < 300) {
        return 'ok';
    }
    if (status >= 300 && status < 500) {
        return 'warn';
    }
    return 'error';
}

export function StatusBadge({
    status,
    showLabel = true,
}: {
    status: number | null | undefined;
    showLabel?: boolean;
}) {
    const tone = statusTone(status);
    const meta = STATUS_META[tone];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase',
                meta.badge,
            )}
        >
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
            {showLabel ? (status ?? 'N/D') : null}
        </span>
    );
}
