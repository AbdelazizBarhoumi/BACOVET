import { Bookmark, Plus, X } from 'lucide-react';
import { usePbi } from '@/lib/pbi/store';
import { PaneHeader } from './shared';

export function BookmarksPane({ onCollapse }: { onCollapse?: () => void }) {
    const {
        bookmarks,
        addBookmark,
        applyBookmark,
        removeBookmark,
        togglePane,
    } = usePbi();
    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Signets"
                right={
                    <button
                        onClick={() => togglePane('bookmarks')}
                        aria-label="Fermer le volet des signets"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
                onCollapse={onCollapse}
            />
            <div className="px-3 pb-2">
                <button
                    onClick={() =>
                        addBookmark(window.prompt('Nom du signet') ?? '')
                    }
                    className="flex w-full items-center justify-center gap-1 rounded border border-border py-1 text-[11px] hover:bg-accent"
                >
                    <Plus className="size-3" /> Ajouter un signet
                </button>
            </div>
            <div className="flex-1 overflow-auto px-2 pb-2">
                {!bookmarks.length && (
                    <p className="px-1 text-[11px] text-muted-foreground">
                        Les signets capturent les filtres, les sélections des
                        segments, les filtres croisés et la visibilité des
                        visuels.
                    </p>
                )}
                {bookmarks.map((b) => (
                    <div
                        key={b.id}
                        className="mb-1 flex items-center gap-1 rounded px-1 py-1 text-[11px] hover:bg-accent"
                    >
                        <Bookmark className="size-3 text-muted-foreground" />
                        <button
                            onClick={() => applyBookmark(b.id)}
                            className="min-w-0 flex-1 truncate text-left"
                        >
                            {b.name}
                        </button>
                        <button
                            onClick={() => removeBookmark(b.id)}
                            aria-label="Supprimer le signet"
                        >
                            <X className="size-3 text-muted-foreground hover:text-destructive" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}