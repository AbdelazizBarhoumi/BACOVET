import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { usePbi } from '@/lib/pbi/store';
import {
    THEME_COLOR_COUNT,
    THEMES,
    isValidPalette,
    themeById,
    type ReportTheme,
} from '@/lib/pbi/themes';
import { ColorInput, resolveColor } from '../formatControls';
import { PaneHeader } from './shared';

export function ThemesPane({ onCollapse }: { onCollapse?: () => void }) {
    const {
        theme,
        customThemes,
        setTheme,
        saveTheme,
        updateTheme,
        removeTheme,
        togglePane,
    } = usePbi();
    const [name, setName] = useState('');
    const active = customThemes.find((t) => t.id === theme) ?? themeById(theme);

    const allThemes: ReportTheme[] = [
        ...THEMES,
        ...customThemes.filter((t) => !THEMES.some((b) => b.id === t.id)),
    ];

    const paletteEditor = (t: ReportTheme, onChange: (p: string[]) => void) => (
        <div className="grid grid-cols-8 gap-1">
            {t.palette.slice(0, THEME_COLOR_COUNT).map((c, i) => (
                <ColorInput
                    key={i}
                    value={c}
                    onChange={(v) => {
                        const next = [...t.palette];
                        next[i] = v;
                        onChange(next);
                    }}
                    className="h-5 w-full"
                    ariaLabel={`Couleur ${i + 1} de ${t.name}`}
                />
            ))}
        </div>
    );

    const paletteSwatch = (t: ReportTheme) => (
        <div className="grid grid-cols-8 gap-1">
            {t.palette.slice(0, THEME_COLOR_COUNT).map((c, i) => (
                <span
                    key={i}
                    className="h-5 rounded border border-border"
                    style={{ backgroundColor: resolveColor(c) }}
                />
            ))}
        </div>
    );

    return (
        <div className="flex h-full flex-col">
            <PaneHeader
                title="Thèmes"
                right={
                    <button
                        onClick={() => togglePane('themes')}
                        aria-label="Fermer le volet des thèmes"
                    >
                        <X className="size-3 text-muted-foreground" />
                    </button>
                }
                onCollapse={onCollapse}
            />
            <div className="flex-1 space-y-3 overflow-auto px-3 pb-3 text-[11px]">
                <div className="text-muted-foreground">
                    Les couleurs s’appliquent instantanément à chaque visuel.
                </div>
                {allThemes.map((t) => {
                    const isActive = active?.id === t.id;
                    const isCustom = customThemes.some((c) => c.id === t.id);
                    return (
                        <div
                            key={t.id}
                            className="rounded border border-border p-2"
                        >
                            <button
                                onClick={() => setTheme(t.id)}
                                className="flex w-full items-center justify-between"
                            >
                                <span className="font-medium">{t.name}</span>
                                <span
                                    className={
                                        isActive
                                            ? 'text-[var(--brand)]'
                                            : 'text-muted-foreground'
                                    }
                                >
                                    {isActive ? 'Active' : 'Appliquer'}
                                </span>
                            </button>
                            <div className="mt-2">
                                {isCustom
                                    ? paletteEditor(t, (p) =>
                                          updateTheme(t.id, { palette: p }),
                                      )
                                    : paletteSwatch(t)}
                            </div>
                            {isCustom && (
                                <button
                                    onClick={() => removeTheme(t.id)}
                                    className="mt-2 flex items-center gap-1 text-destructive"
                                >
                                    <Trash2 className="size-3" /> Supprimer
                                </button>
                            )}
                        </div>
                    );
                })}
                <div className="rounded border border-border p-2">
                    <div className="mb-1 font-medium">
                        Enregistrer le thème actuel
                    </div>
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nom du thème"
                        className="w-full rounded border border-border bg-background px-2 py-1"
                    />
                    <button
                        onClick={() => {
                            if (!isValidPalette(active.palette)) return;
                            saveTheme(name, active.palette, active.fontFamily);
                            setName('');
                        }}
                        disabled={
                            !name.trim() || !isValidPalette(active.palette)
                        }
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded bg-[var(--brand)] py-1 text-background disabled:opacity-50"
                    >
                        <Plus className="size-3" /> Enregistrer le thème
                    </button>
                </div>
            </div>
        </div>
    );
}