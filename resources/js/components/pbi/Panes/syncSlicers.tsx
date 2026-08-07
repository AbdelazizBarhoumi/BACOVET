import { X } from 'lucide-react';
import { usePbi, visualTypeLabel } from '@/lib/pbi/store';
import { PaneHeader } from './shared';

export function SyncSlicersPane({ onCollapse }: { onCollapse?: () => void }) {
    const { page, pages, slicerSync, setSlicerSync, togglePane } = usePbi();
    const slicers = page.visuals.filter((v) =>
        v.type.toLowerCase().includes('slicer'),
    );
    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Synchroniser les segments"
                right={
                    <button
                        onClick={() => togglePane('syncSlicers')}
                        aria-label="Fermer le volet de synchronisation des segments"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
                onCollapse={onCollapse}
            />
            <div className="flex-1 overflow-auto px-3 pb-3 text-[11px]">
                {!slicers.length && (
                    <p className="text-muted-foreground">
                        Ajoutez un segment à cette page pour le synchroniser.
                    </p>
                )}
                {slicers.map((s) => (
                    <div key={s.id} className="mb-3">
                        <div className="mb-1 font-medium">
                            {s.name || visualTypeLabel(s.type)}
                        </div>
                        {pages.map((p) => (
                            <label
                                key={p.id}
                                className="flex items-center justify-between py-[1px]"
                            >
                                <span className="truncate">{p.name}</span>
                                <input
                                    type="checkbox"
                                    checked={
                                        p.id === page.id ||
                                        (slicerSync[s.id] ?? []).includes(p.id)
                                    }
                                    disabled={p.id === page.id}
                                    onChange={() => setSlicerSync(s.id, p.id)}
                                    className="size-3 accent-[var(--brand)]"
                                />
                            </label>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
