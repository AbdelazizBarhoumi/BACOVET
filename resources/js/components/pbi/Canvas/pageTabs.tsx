import { EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { MenuItem } from './menu';

export function PageTabs({ readOnly = false }: { readOnly?: boolean }) {
    const {
        pages,
        activePageId,
        setActivePage,
        addPage,
        removePage,
        renamePage,
        duplicatePage,
        togglePageHidden,
    } = usePbi();
    const [menu, setMenu] = useState<{
        id: string;
        x: number;
        y: number;
    } | null>(null);

    useEffect(() => {
        const close = () => setMenu(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    return (
        <div className="flex items-center gap-1 border-t border-border bg-panel px-2 py-1">
            {pages.map((p) => (
                <div
                    key={p.id}
                    onContextMenu={(e) => {
                        if (readOnly) return;
                        e.preventDefault();
                        setMenu({ id: p.id, x: e.clientX, y: e.clientY });
                    }}
                    className={cn(
                        'group flex items-center gap-1 rounded-t px-3 py-1 text-[11px]',
                        p.id === activePageId
                            ? 'border-b-2 border-brand bg-card font-semibold'
                            : 'text-muted-foreground hover:bg-accent',
                        p.format.hidden && 'italic opacity-50',
                    )}
                >
                    <button onClick={() => setActivePage(p.id)}>
                        {p.name}
                    </button>
                    {p.format.hidden && <EyeOff className="size-3" />}
                </div>
            ))}
            {!readOnly && (
                <button
                    onClick={addPage}
                    className="rounded px-2 py-1 text-[13px] text-muted-foreground hover:bg-accent"
                    aria-label="Nouvelle page"
                >
                    +
                </button>
            )}

            {!readOnly && menu && (
                <div
                    className="fixed z-50 w-44 rounded border border-border bg-popover py-1 text-[11px] shadow-lg"
                    style={{ left: menu.x, top: menu.y - 140 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <MenuItem
                        label="Dupliquer la page"
                        onClick={() => duplicatePage(menu.id)}
                    />
                    <MenuItem
                        label="Renommer la page"
                        onClick={() => {
                            const cur =
                                pages.find((p) => p.id === menu.id)?.name ?? '';
                            const name = window.prompt('Renommer la page', cur);
                            if (name) renamePage(menu.id, name);
                            setMenu(null);
                        }}
                    />
                    <MenuItem
                        label="Masquer / afficher la page"
                        onClick={() => togglePageHidden(menu.id)}
                    />
                    <MenuItem
                        label="Supprimer la page"
                        onClick={() => removePage(menu.id)}
                    />
                </div>
            )}
        </div>
    );
}