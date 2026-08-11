import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RetryBadge({
    attempts,
    className = '',
}: {
    attempts?: number;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-warning uppercase',
                className,
            )}
            title="Endpoint retryable (5xx / timeout) — relancé automatiquement"
        >
            <RotateCcw className="h-2.5 w-2.5" />
            {attempts && attempts > 1 ? `↻ ${attempts}` : '↻'}
        </span>
    );
}
