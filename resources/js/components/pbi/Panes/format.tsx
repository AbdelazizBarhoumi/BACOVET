import { usePage } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import {
    DISPLAY_UNITS,
    NUMBER_FORMATS,
    normalizeDataLabelStyle,
    normalizeTableNumber,
    type DataLabelStyle,
    type DisplayUnit,
    type NumberFormat,
    type TableNumberStyle,
    type Visual,
} from '@/lib/pbi/model';
import { SHAPE_KINDS, SHAPES, type ShapeKind } from '@/lib/pbi/shapes';
import { usePbi } from '@/lib/pbi/store';
import { uploadPageImage } from '@/lib/pbi/uploadImage';
import { ConditionalFormatControl } from '../ConditionalFormatDialog';
import {
    AlignControls,
    Biu,
    ColorInput,
    FONT_OPTIONS,
    NumberInput,
    Section,
    Select,
    TextInput,
    Toggle,
    TitleSection,
} from '../formatControls';
import { CONDITIONAL_FORMAT_TYPES } from './shared';

const DISPLAY_UNIT_LABELS: Record<DisplayUnit, string> = {
    auto: 'Auto',
    none: 'Aucune',
    thousands: 'Milliers (K)',
    millions: 'Millions (M)',
    billions: 'Milliards (B)',
    percent: 'Pourcentage (%)',
    currency: 'Devise ($)',
};

/** "Part du tout et distribution" charts that display numeric values and share
 * the value display format (units / suffix / decimals). */
const VALUE_FORMAT_TYPES = new Set([
    'pie',
    'donut',
    'treemap',
    'funnel',
    'waterfall',
    'scatter',
    'bubble',
]);

/** Shared "General" block for text/image elements: background, border (color,
 * width, radius), shadow and position/size. No chart-only options. */
function ElementGeneral({ visual }: { visual: Visual }) {
    const { updateVisual } = usePbi();
    return (
        <Section title="Général" defaultOpen>
            <ColorInput
                label="Arrière-plan"
                value={visual.background}
                onChange={(v) => updateVisual(visual.id, { background: v })}
            />
            <Toggle
                label="Bordure"
                checked={visual.border}
                onChange={(v) => updateVisual(visual.id, { border: v })}
            />
            {visual.border && (
                <div className="grid grid-cols-3 gap-2">
                    <ColorInput
                        label="Couleur"
                        value={visual.borderColor}
                        onChange={(v) =>
                            updateVisual(visual.id, { borderColor: v })
                        }
                    />
                    <NumberInput
                        label="Largeur"
                        min={1}
                        max={8}
                        value={visual.borderWidth ?? 1}
                        onChange={(v) =>
                            updateVisual(visual.id, { borderWidth: v })
                        }
                    />
                    <NumberInput
                        label="Rayon"
                        min={0}
                        max={24}
                        value={visual.radius ?? 0}
                        onChange={(v) => updateVisual(visual.id, { radius: v })}
                    />
                </div>
            )}
            <Toggle
                label="Ombre"
                checked={visual.shadow}
                onChange={(v) => updateVisual(visual.id, { shadow: v })}
            />
            <div className="grid grid-cols-2 gap-2">
                {(['x', 'y', 'w', 'h'] as const).map((k) => (
                    <NumberInput
                        key={k}
                        label={
                            k === 'w'
                                ? 'Largeur'
                                : k === 'h'
                                  ? 'Hauteur'
                                  : `${k.toUpperCase()} px`
                        }
                        value={visual[k]}
                        onChange={(v) => updateVisual(visual.id, { [k]: v })}
                    />
                ))}
            </div>
        </Section>
    );
}

/** The Format pane for text boxes and images: content + look only. */
function TextImageFormat({ visual }: { visual: Visual }) {
    const { updateVisual, updateVisualSingle } = usePbi();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { pageId } = usePage().props as unknown as { pageId: number };

    const uploadImage = async (file: File) => {
        try {
            const url = await uploadPageImage(pageId, file);
            updateVisualSingle(visual.id, { imageUrl: url });
            toast.success('Image téléversée');
        } catch {
            toast.error("Échec du téléversement de l'image");
        }
    };

    return (
        <div className="space-y-3 text-[11px]">
            {visual.type === 'text' && (
                <>
                    <Section title="Texte" defaultOpen>
                        <label className="block">
                            <span className="mb-1 block text-muted-foreground">
                                Contenu
                            </span>
                            <textarea
                                value={visual.text ?? ''}
                                onChange={(e) =>
                                    updateVisualSingle(visual.id, {
                                        text: e.target.value,
                                    })
                                }
                                className="h-20 w-full rounded border border-border bg-background px-2 py-1"
                            />
                        </label>
                    </Section>
                    <Section title="Police" defaultOpen>
                        <Select
                            label="Famille de police"
                            value={visual.fontFamily ?? ''}
                            options={FONT_OPTIONS}
                            onChange={(v) =>
                                updateVisual(visual.id, {
                                    fontFamily: v || undefined,
                                })
                            }
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <NumberInput
                                label="Taille"
                                min={8}
                                max={48}
                                value={visual.fontSize ?? 14}
                                onChange={(v) =>
                                    updateVisual(visual.id, {
                                        fontSize: v,
                                    })
                                }
                            />
                            <ColorInput
                                label="Couleur"
                                value={visual.fontColor}
                                onChange={(v) =>
                                    updateVisual(visual.id, { fontColor: v })
                                }
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Biu
                                label="Style de police"
                                bold={visual.fontBold}
                                italic={visual.fontItalic}
                                underline={visual.fontUnderline}
                                onChange={(p) =>
                                    updateVisual(visual.id, {
                                        fontBold: p.bold ?? visual.fontBold,
                                        fontItalic:
                                            p.italic ?? visual.fontItalic,
                                        fontUnderline:
                                            p.underline ?? visual.fontUnderline,
                                    })
                                }
                            />
                            <AlignControls
                                label="Alignement"
                                value={visual.textAlign ?? 'left'}
                                onChange={(v) =>
                                    updateVisual(visual.id, {
                                        textAlign: v,
                                    })
                                }
                            />
                        </div>
                    </Section>
                </>
            )}
            {visual.type === 'image' && (
                <Section title="Image" defaultOpen>
                    <TextInput
                        label="URL de l'image"
                        value={visual.imageUrl ?? ''}
                        onChange={(v) =>
                            updateVisualSingle(visual.id, { imageUrl: v })
                        }
                    />
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Importer une image
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadImage(file);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground hover:bg-accent"
                        >
                            <Upload className="size-3.5" />
                            Choisir un fichier…
                        </button>
                    </label>
                    {visual.imageUrl && (
                        <div className="flex items-center justify-center rounded border border-border bg-background p-1">
                            <img
                                src={visual.imageUrl}
                                alt="Aperçu"
                                className="max-h-24 object-contain"
                            />
                        </div>
                    )}
                    <TextInput
                        label="Texte alternatif (accessibilité)"
                        value={visual.altText ?? ''}
                        onChange={(v) =>
                            updateVisual(visual.id, { altText: v })
                        }
                    />
                </Section>
            )}
            <ElementGeneral visual={visual} />
        </div>
    );
}

function GenericFormat({ visual }: { visual: Visual }) {
    const selected = visual;
    const { updateVisual, updateVisualSingle } = usePbi();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { pageId } = usePage().props as unknown as { pageId: number };

    const tn = normalizeTableNumber(selected.tableNumber);
    const patchTableNumber = (patch: Partial<TableNumberStyle>) =>
        updateVisual(selected.id, { tableNumber: { ...tn, ...patch } });

    const dl = normalizeDataLabelStyle(selected.dataLabels);
    const patchDl = (patch: Partial<DataLabelStyle>) =>
        updateVisual(selected.id, { dataLabels: { ...dl, ...patch } });

    const uploadImage = async (file: File) => {
        try {
            const url = await uploadPageImage(pageId, file);
            updateVisualSingle(selected.id, { imageUrl: url });
            toast.success('Image téléversée');
        } catch {
            toast.error("Échec du téléversement de l'image");
        }
    };

    return (
        <div className="space-y-3 text-[11px]">
            <TitleSection
                visual={selected}
                onPatch={(p) => updateVisual(selected.id, p)}
            />
            {CONDITIONAL_FORMAT_TYPES.has(selected.type) && (
                <ConditionalFormatControl visual={selected} />
            )}
            {(selected.type === 'text' || selected.type === 'button') && (
                <label className="block">
                    <span className="mb-1 block text-muted-foreground">
                        Texte
                    </span>
                    <textarea
                        value={selected.text ?? ''}
                        onChange={(e) =>
                            updateVisualSingle(selected.id, {
                                text: e.target.value,
                            })
                        }
                        className="h-20 w-full rounded border border-border bg-background px-2 py-1"
                    />
                </label>
            )}
            {selected.type === 'image' && (
                <>
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            URL de l'image
                        </span>
                        <input
                            value={selected.imageUrl ?? ''}
                            onChange={(e) =>
                                updateVisualSingle(selected.id, {
                                    imageUrl: e.target.value,
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Importer une image
                        </span>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadImage(file);
                                e.target.value = '';
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex w-full items-center justify-center gap-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground hover:bg-accent"
                        >
                            <Upload className="size-3.5" />
                            Choisir un fichier…
                        </button>
                    </label>
                    {selected.imageUrl && (
                        <div className="flex items-center justify-center rounded border border-border bg-background p-1">
                            <img
                                src={selected.imageUrl}
                                alt="Aperçu"
                                className="max-h-24 object-contain"
                            />
                        </div>
                    )}
                </>
            )}
            {selected.type === 'shape' && (
                <>
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Forme
                        </span>
                        <select
                            value={selected.shape ?? 'rectangle'}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    shape: e.target.value as ShapeKind,
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        >
                            {SHAPE_KINDS.map((k) => (
                                <option key={k} value={k}>
                                    {SHAPES[k].label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <ColorInput
                        label="Couleur de contour"
                        value={selected.background}
                        onChange={(v) =>
                            updateVisual(selected.id, {
                                background: v,
                            })
                        }
                    />
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Rotation (degré)
                        </span>
                        <input
                            type="number"
                            min={-180}
                            max={180}
                            value={selected.rotation ?? 0}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    rotation: Number(e.target.value),
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                    {selected.shape !== 'line' && (
                        <label className="block">
                            <span className="mb-1 block text-muted-foreground">
                                Rayon des coins
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={40}
                                value={selected.radius ?? 0}
                                onChange={(e) =>
                                    updateVisual(selected.id, {
                                        radius: Number(e.target.value),
                                    })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1"
                            />
                        </label>
                    )}
                </>
            )}
            {(
                [
                    ['showLegend', 'Afficher la légende'],
                    ['showLabels', 'Étiquettes de données'],
                    ['border', 'Bordure'],
                    ['shadow', 'Ombre'],
                    ['subtotals', 'Totaux / sous-totaux'],
                ] as const
            )
                .filter(
                    ([key]) =>
                        selected.type !== 'shape' ||
                        key === 'border' ||
                        key === 'shadow',
                )
                .map(([key, label]) => (
                    <label
                        key={key}
                        className="flex items-center justify-between"
                    >
                        <span>{label}</span>
                        <input
                            type="checkbox"
                            checked={Boolean(selected[key])}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    [key]: e.target.checked,
                                })
                            }
                            className="accent-[var(--brand)]"
                        />
                    </label>
                ))}
            {selected.type !== 'shape' && (
                <ColorInput
                    label="Arrière-plan"
                    value={selected.background}
                    onChange={(v) =>
                        updateVisual(selected.id, {
                            background: v,
                        })
                    }
                />
            )}
            {selected.type !== 'shape' && (
                <>
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Police
                        </span>
                        <select
                            value={selected.fontFamily ?? ''}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    fontFamily: e.target.value || undefined,
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        >
                            <option value="">Police du rapport</option>
                            <option value="ui-sans-serif, system-ui, sans-serif">
                                Sans-serif
                            </option>
                            <option value="Georgia, 'Times New Roman', serif">
                                Serif
                            </option>
                            <option value="ui-monospace, monospace">
                                Monospace
                            </option>
                        </select>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            <label className="block">
                                <span className="mb-1 block text-muted-foreground">
                                    Taille
                                </span>
                                <input
                                    type="number"
                                    min={8}
                                    max={24}
                                    value={selected.fontSize ?? 10}
                                    onChange={(e) =>
                                        updateVisual(selected.id, {
                                            fontSize: Number(e.target.value),
                                        })
                                    }
                                    className="w-full rounded border border-border bg-background px-2 py-1"
                                />
                            </label>
                            <ColorInput
                                label="Couleur"
                                value={selected.fontColor}
                                onChange={(v) =>
                                    updateVisual(selected.id, {
                                        fontColor: v,
                                    })
                                }
                            />
                        </div>
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Format numérique
                        </span>
                        <select
                            value={selected.numberFormat ?? 'auto'}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    numberFormat:
                                        (e.target.value as NumberFormat) ||
                                        undefined,
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        >
                            {NUMBER_FORMATS.map((f) => (
                                <option key={f} value={f}>
                                    {f}
                                </option>
                            ))}
                        </select>
                    </label>
                    {VALUE_FORMAT_TYPES.has(selected.type) && (
                        <div className="mt-2 rounded border border-border p-2">
                            <span className="mb-2 block text-[11px] font-semibold">
                                Valeurs
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <Select
                                    label="Unités d'affichage"
                                    value={dl.displayUnits}
                                    options={DISPLAY_UNITS.map((u) => ({
                                        value: u,
                                        label: DISPLAY_UNIT_LABELS[u],
                                    }))}
                                    onChange={(v) =>
                                        patchDl({
                                            displayUnits: v as DisplayUnit,
                                        })
                                    }
                                />
                                <TextInput
                                    label="Suffixe"
                                    placeholder="ex. kW"
                                    value={dl.suffix ?? ''}
                                    onChange={(v) =>
                                        patchDl({
                                            suffix: v.trim() || undefined,
                                        })
                                    }
                                />
                            </div>
                            <NumberInput
                                label="Décimales des valeurs"
                                min={0}
                                max={10}
                                value={dl.decimals ?? 1}
                                onChange={(v) =>
                                    patchDl({ decimals: v })
                                }
                            />
                        </div>
                    )}
                    {(selected.type === 'table' || selected.type === 'matrix') && (
                        <div className="mt-2 rounded border border-border p-2">
                            <span className="mb-2 block text-[11px] font-semibold">
                                Valeurs numériques
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                <Select
                                    label="Unités d'affichage"
                                    value={tn.displayUnits}
                                    options={DISPLAY_UNITS.map((u) => ({
                                        value: u,
                                        label: DISPLAY_UNIT_LABELS[u],
                                    }))}
                                    onChange={(v) =>
                                        patchTableNumber({
                                            displayUnits: v as DisplayUnit,
                                        })
                                    }
                                />
                                <TextInput
                                    label="Suffixe"
                                    placeholder="ex. kW"
                                    value={tn.suffix ?? ''}
                                    onChange={(v) =>
                                        patchTableNumber({
                                            suffix: v.trim() || undefined,
                                        })
                                    }
                                />
                            </div>
                            <NumberInput
                                label="Décimales des valeurs"
                                min={0}
                                max={10}
                                value={tn.decimals ?? 1}
                                onChange={(v) =>
                                    patchTableNumber({ decimals: v })
                                }
                            />
                        </div>
                    )}
                </>
            )}
            {selected.border && (
                <div className="grid grid-cols-3 gap-2">
                    <ColorInput
                        label="Bordure"
                        value={selected.borderColor}
                        onChange={(v) =>
                            updateVisual(selected.id, {
                                borderColor: v,
                            })
                        }
                    />
                    <label className="block">
                        <span className="mb-1 block text-muted-foreground">
                            Épaisseur
                        </span>
                        <input
                            type="number"
                            min={1}
                            max={8}
                            value={selected.borderWidth ?? 1}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    borderWidth: Number(e.target.value),
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                    {selected.type !== 'shape' && (
                        <label className="block">
                            <span className="mb-1 block text-muted-foreground">
                                Rayon
                            </span>
                            <input
                                type="number"
                                min={0}
                                max={24}
                                value={selected.radius ?? 0}
                                onChange={(e) =>
                                    updateVisual(selected.id, {
                                        radius: Number(e.target.value),
                                    })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1"
                            />
                        </label>
                    )}
                </div>
            )}
            <label className="block">
                <span className="mb-1 block text-muted-foreground">
                    Couleurs de données (décalage de palette)
                </span>
                <input
                    type="range"
                    min={0}
                    max={7}
                    value={selected.colorIndex ?? 0}
                    onChange={(e) =>
                        updateVisual(selected.id, {
                            colorIndex: Number(e.target.value),
                        })
                    }
                    className="w-full accent-[var(--brand)]"
                />
                p
            </label>
            <label className="block">
                <span className="mb-1 block text-muted-foreground">
                    Texte alternatif (accessibilité)
                </span>
                <input
                    value={selected.altText ?? ''}
                    onChange={(e) =>
                        updateVisual(selected.id, {
                            altText: e.target.value,
                        })
                    }
                    className="w-full rounded border border-border bg-background px-2 py-1"
                />
            </label>
            {![
                'card',
                'table',
                'matrix',
                'scatter',
                'bubble',
                'text',
                'image',
                'button',
                'shape',
            ].includes(selected.type) && (
                <label className="block">
                    <span className="mb-1 block text-muted-foreground">
                        Nombre max de catégories (les autres sont regroupées
                        dans « Autre »)
                    </span>
                    <input
                        type="number"
                        min={2}
                        value={selected.maxCategories}
                        onChange={(e) =>
                            updateVisual(selected.id, {
                                maxCategories: Number(e.target.value),
                            })
                        }
                        className="w-full rounded border border-border bg-background px-2 py-1"
                    />
                </label>
            )}
            <div className="grid grid-cols-2 gap-2">
                {(['x', 'y', 'w', 'h'] as const).map((k) => (
                    <label key={k}>
                        <span className="mb-1 block text-muted-foreground">
                            {k === 'w'
                                ? 'Largeur'
                                : k === 'h'
                                  ? 'Hauteur'
                                  : k.toUpperCase()}{' '}
                            px
                        </span>
                        <input
                            type="number"
                            value={selected[k]}
                            onChange={(e) =>
                                updateVisual(selected.id, {
                                    [k]: Number(e.target.value),
                                })
                            }
                            className="w-full rounded border border-border bg-background px-2 py-1"
                        />
                    </label>
                ))}
            </div>
        </div>
    );
}

export { ElementGeneral, GenericFormat, TextImageFormat };