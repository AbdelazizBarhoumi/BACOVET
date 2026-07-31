import { cn } from '@/lib/utils';
import type { SchemaColumn } from '@/services/endpointManagerApi';

const TYPE_STYLES: Record<SchemaColumn['type'], string> = {
    string: 'bg-blue-500/15 text-blue-500 border-blue-500/40',
    integer: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/40',
    number: 'bg-teal-500/15 text-teal-500 border-teal-500/40',
    boolean: 'bg-purple-500/15 text-purple-500 border-purple-500/40',
    date: 'bg-amber-500/15 text-amber-500 border-amber-500/40',
    null: 'bg-muted text-muted-foreground border-border',
    mixed: 'bg-pink-500/15 text-pink-500 border-pink-500/40',
};

export function TypeBadge({ type }: { type: SchemaColumn['type'] }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wider uppercase',
                TYPE_STYLES[type],
            )}
        >
            {type}
        </span>
    );
}
