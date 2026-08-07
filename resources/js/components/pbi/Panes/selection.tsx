import { ChevronDown, ChevronUp, Eye, EyeOff, X } from 'lucide-react';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { PaneHeader } from './shared';

export function SelectionPane({ onCollapse }: { onCollapse?: () => void }) {
    const {
        page,
        selected,
        select,
        updateVisual,
        toggleVisualHidden,
        reorderVisual,
        togglePane,
    } = usePbi();
    const ordered = [...page.visuals].sort((a, b) => b.z - a.z);
    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Sélection"
                right={
                    <button
                        onClick={() => togglePane('selection')}
                        aria-label="Fermer le volet de sélection"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
                onCollapse={onCollapse}
            />
            <p className="px-3 pb-1 text-[10px] text-muted-foreground">
                Ordre des couches (avant → arrière) · ordre des onglets
            </p>
            <div className="flex-1 overflow-auto px-2 pb-2">
                {ordered.map((v, i) => (
                    <div
                        key={v.id}
                        className={cn(
                            'mb-1 flex items-center gap-1 rounded px-1 py-1 text-[11px]',
                            selected?.id === v.id
                                ? 'bg-brand/15'
                                : 'hover:bg-accent',
                        )}
                    >
                        <span className="w-4 text-center text-[9px] text-muted-foreground">
                            {i + 1}
                        </span>
                        <input
                            value={v.name}
                            onChange={(e) =>
                                updateVisual(v.id, { name: e.target.value })
                            }
                            onFocus={() => select(v.id)}
                            className="min-w-0 flex-1 truncate bg-transparent outline-none"
                        />
                        <button
                            onClick={() => reorderVisual(v.id, -1)}
                            aria-label="Monter"
                        >
                            <ChevronUp className="size-3 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button
                            onClick={() => reorderVisual(v.id, 1)}
                            aria-label="Descendre"
                        >
                            <ChevronDown className="size-3 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button
                            onClick={() => toggleVisualHidden(v.id)}
                            aria-label="Afficher/masquer"
                        >
                            {v.hidden ? (
                                <EyeOff className="size-3 text-muted-foreground" />
                            ) : (
                                <Eye className="size-3 text-muted-foreground hover:text-foreground" />
                            )}
                        </button>
                    </div>
                ))}
                {!ordered.length && (
                    <p className="px-1 text-[11px] text-muted-foreground">
                        Aucun objet sur cette page.
                    </p>
                )}
            </div>
        </div>
    );
}