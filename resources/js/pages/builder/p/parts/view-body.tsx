import { Maximize2 } from 'lucide-react';
import { useMemo } from 'react';
import { Canvas, PageTabs } from '@/components/pbi/Canvas';
import { usePbi } from '@/lib/pbi/store';
import { themeById, themeCssVars } from '@/lib/pbi/themes';

export function ViewBody() {
    const { page, rows, selected, tables, setFullscreen, theme, customThemes } =
        usePbi();
    const activeTheme =
        customThemes.find((t) => t.id === theme) ?? themeById(theme);
    const themeStyle = useMemo(
        () => themeCssVars(activeTheme) as React.CSSProperties,
        [activeTheme],
    );
    return (
        <div className="flex min-h-0 flex-1 flex-col bg-muted">
            <main className="flex min-h-0 flex-1 overflow-auto" style={themeStyle}>
                <section className="min-h-0 flex-1 overflow-auto">
                    <Canvas readOnly />
                </section>
            </main>
            <PageTabs readOnly />
            <footer className="flex items-center justify-between border-t border-border bg-panel px-3 py-1 text-[10px] text-muted-foreground">
                <span>
                    {page.name} · {page.visuals.length} visuel(s) ·{' '}
                    {tables.length} dataset(s) · {rows.length.toLocaleString()}{' '}
                    lignes · {selected ? '1 sélection' : ''}
                </span>
                <button
                    onClick={() => setFullscreen(true)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    aria-label="Plein écran"
                    title="Plein écran"
                >
                    <Maximize2 className="size-3.5" />
                </button>
            </footer>
        </div>
    );
}