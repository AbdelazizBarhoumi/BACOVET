import {
    DISPLAY_UNITS,
    normalizeCalloutStyle,
    normalizeCategoryLabelStyle,
    type CalloutStyle,
    type CategoryLabelStyle,
    type DisplayUnit,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { ConditionalFormatControl } from './ConditionalFormatDialog';
import {
    Biu,
    ColorInput,
    NumberInput,
    Section,
    Select,
    TextInput,
    TitleSection,
    Toggle,
    FONT_OPTIONS,
} from './formatControls';

const DISPLAY_UNIT_LABELS: Record<DisplayUnit, string> = {
    auto: 'Auto',
    none: 'Aucune',
    thousands: 'Milliers (K)',
    millions: 'Millions (M)',
    billions: 'Milliards (B)',
    percent: 'Pourcentage (%)',
    currency: 'Devise ($)',
};

/** The format tab for card / kpi / gauge: callout, label, title, general. */
export function SingleValueFormat({ visual }: { visual: Visual }) {
    const { updateVisual } = usePbi();
    const callout = normalizeCalloutStyle(visual.callout);
    const category = normalizeCategoryLabelStyle(visual.categoryLabel);

    const patchCallout = (patch: Partial<CalloutStyle>) =>
        updateVisual(visual.id, {
            callout: { ...callout, ...patch },
        });
    const patchCategory = (patch: Partial<CategoryLabelStyle>) =>
        updateVisual(visual.id, {
            categoryLabel: { ...category, ...patch },
        });

    return (
        <div className="space-y-3 text-[11px]">
            <Section title="Valeur principale" defaultOpen>
                <Select
                    label="Police"
                    value={callout.fontFamily ?? ''}
                    options={FONT_OPTIONS}
                    onChange={(v) =>
                        patchCallout({ fontFamily: v || undefined })
                    }
                />
                <div className="grid grid-cols-2 gap-2">
                    <NumberInput
                        label="Taille de police"
                        min={8}
                        max={96}
                        value={callout.fontSize ?? 24}
                        onChange={(v) => patchCallout({ fontSize: v })}
                    />
                    <ColorInput
                        label="Couleur"
                        value={callout.color}
                        onChange={(v) => patchCallout({ color: v })}
                    />
                </div>
                <Biu
                    label="Style de police"
                    bold={callout.bold}
                    italic={callout.italic}
                    underline={callout.underline}
                    onChange={(p) => patchCallout(p)}
                />
                <div className="grid grid-cols-2 gap-2">
                    <Select
                        label="Unités d'affichage"
                        value={callout.displayUnits}
                        options={DISPLAY_UNITS.map((u) => ({
                            value: u,
                            label: DISPLAY_UNIT_LABELS[u],
                        }))}
                        onChange={(v) =>
                            patchCallout({ displayUnits: v as DisplayUnit })
                        }
                    />
                    <TextInput
                        label="Suffixe"
                        placeholder="ex. kW"
                        value={callout.suffix ?? ''}
                        onChange={(v) =>
                            patchCallout({ suffix: v.trim() || undefined })
                        }
                    />
                </div>
                <NumberInput
                    label="Décimales des valeurs"
                    min={0}
                    max={10}
                    value={callout.decimals ?? 1}
                    onChange={(v) => patchCallout({ decimals: v })}
                />
                <Toggle
                    label="Renvoi à la ligne"
                    checked={callout.textWrap ?? false}
                    onChange={(v) => patchCallout({ textWrap: v })}
                />
                <Toggle
                    label="Espacement de la source"
                    checked={callout.sourceSpacing ?? false}
                    onChange={(v) => patchCallout({ sourceSpacing: v })}
                />

                <ConditionalFormatControl visual={visual} />
            </Section>

            <Section title="Étiquette de catégorie" defaultOpen>
                <Toggle
                    label="Afficher l'étiquette"
                    checked={category.show}
                    onChange={(v) => patchCategory({ show: v })}
                />
                {category.show && (
                    <>
                        <Select
                            label="Police"
                            value={category.fontFamily ?? ''}
                            options={FONT_OPTIONS}
                            onChange={(v) =>
                                patchCategory({ fontFamily: v || undefined })
                            }
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <NumberInput
                                label="Taille de police"
                                min={8}
                                max={48}
                                value={category.fontSize ?? 11}
                                onChange={(v) => patchCategory({ fontSize: v })}
                            />
                            <ColorInput
                                label="Couleur"
                                value={category.color}
                                onChange={(v) => patchCategory({ color: v })}
                            />
                        </div>
                        <Biu
                            label="Style de police"
                            bold={category.bold}
                            italic={category.italic}
                            underline={category.underline}
                            onChange={(p) => patchCategory(p)}
                        />
                    </>
                )}
            </Section>

            <TitleSection
                visual={visual}
                onPatch={(p) => updateVisual(visual.id, p)}
            />

            <Section title="Général">
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
                <Toggle
                    label="Ombre"
                    checked={visual.shadow}
                    onChange={(v) => updateVisual(visual.id, { shadow: v })}
                />
                <TextInput
                    label="Texte alternatif (accessibilité)"
                    value={visual.altText}
                    onChange={(v) => updateVisual(visual.id, { altText: v })}
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
                            onChange={(v) =>
                                updateVisual(visual.id, { [k]: v })
                            }
                        />
                    ))}
                </div>
            </Section>
        </div>
    );
}
