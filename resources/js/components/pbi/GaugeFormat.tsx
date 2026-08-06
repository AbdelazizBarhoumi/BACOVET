import {
    fieldLabel,
    normalizeConditionalFormat,
    normalizeGaugeStyle,
    type GaugeBoundStyle,
    type GaugeLabelStyle,
    type GaugeStyle,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { ConditionalFormatControl } from './ConditionalFormatDialog';
import {
    Biu,
    ColorInput,
    FONT_OPTIONS,
    GeneralSection,
    NumberInput,
    Section,
    Select,
    TextInput,
    TitleSection,
    Toggle,
    ToggleGroup,
    ValueFormatControl,
} from './formatControls';

type GaugeBoundKey = 'min' | 'max' | 'target';
type GaugeLabelKey = 'values' | 'targetLabel' | 'callout';

/** One Min/Max/Target bound row: field name, Auto toggle, custom format
 * string (when Auto is off) and an fx button. */
function GaugeBoundRow({
    title,
    field,
    style,
    onPatch,
    wellLabel,
    hasValue,
}: {
    title: string;
    field?: Visual['minimum'][number];
    style: GaugeBoundStyle;
    onPatch: (patch: Partial<GaugeBoundStyle>) => void;
    wellLabel: string;
    hasValue: boolean;
}) {
    const hasField = Boolean(field);
    return (
        <div
            className={cn(
                'space-y-2 rounded border border-border p-2',
                !hasValue && 'opacity-50',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-muted-foreground">
                    {hasField ? fieldLabel(field!) : `${title} (${wellLabel})`}
                </span>
                <label className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                    Auto
                    <input
                        type="checkbox"
                        checked={style.auto}
                        disabled={!hasValue}
                        onChange={(e) => onPatch({ auto: e.target.checked })}
                        className="accent-[var(--brand)]"
                    />
                </label>
            </div>
            {hasValue && !style.auto && (
                <TextInput
                    label="Chaîne de format"
                    value={style.format ?? ''}
                    placeholder="$#,##0"
                    onChange={(v) => onPatch({ format: v || undefined })}
                />
            )}
        </div>
    );
}

/** One collapsible data-label sub-section with its own On/Off switch. */
function GaugeLabelSection({
    title,
    style,
    onPatch,
    visual,
}: {
    title: string;
    style: GaugeLabelStyle;
    onPatch: (patch: Partial<GaugeLabelStyle>) => void;
    visual: Visual;
}) {
    return (
        <Section title={title}>
            <Toggle
                label="Afficher"
                checked={style.show}
                onChange={(v) => onPatch({ show: v })}
            />
            {style.show && (
                <>
                    <Select
                        label="Police"
                        value={style.fontFamily ?? ''}
                        options={FONT_OPTIONS}
                        onChange={(v) =>
                            onPatch({ fontFamily: v || undefined })
                        }
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <NumberInput
                            label="Taille de police"
                            min={8}
                            max={96}
                            value={style.fontSize ?? 11}
                            onChange={(v) => onPatch({ fontSize: v })}
                        />
                        <ColorInput
                            label="Couleur"
                            value={style.color}
                            onChange={(v) => onPatch({ color: v })}
                        />
                    </div>
                    <Biu
                        label="Style de police"
                        bold={style.bold}
                        italic={style.italic}
                        underline={style.underline}
                        onChange={(p) => onPatch(p)}
                    />
                    <ValueFormatControl
                        label="Format numérique"
                        value={style.valueFormat ?? { auto: true }}
                        onChange={(vf) => onPatch({ valueFormat: vf })}
                    />
                    <ConditionalFormatControl
                        visual={visual}
                        label={`fx — couleur ${title}`}
                        value={normalizeConditionalFormat(style.fx)}
                        onCommit={(cf) => onPatch({ fx: cf })}
                        hideFieldValue
                    />
                </>
            )}
        </Section>
    );
}

/** The format tab for the gauge: gauge axis, colors, data labels, general. */
export function GaugeFormat({ visual }: { visual: Visual }) {
    const { updateVisual } = usePbi();
    const gauge = normalizeGaugeStyle(visual.gauge);

    const patchGauge = (patch: Partial<GaugeStyle>) =>
        updateVisual(visual.id, { gauge: { ...gauge, ...patch } });
    const patchBound = (key: GaugeBoundKey, patch: Partial<GaugeBoundStyle>) =>
        patchGauge({
            axis: { ...gauge.axis, [key]: { ...gauge.axis[key], ...patch } },
        });
    const patchLabel = (key: GaugeLabelKey, patch: Partial<GaugeLabelStyle>) =>
        patchGauge({
            dataLabels: {
                ...gauge.dataLabels,
                [key]: { ...gauge.dataLabels[key], ...patch },
            },
        });

    return (
        <div className="space-y-3 text-[11px]">
            <TitleSection
                visual={visual}
                onPatch={(p) => updateVisual(visual.id, p)}
            />

            <Section title="Axe de la jauge" defaultOpen>
                <div className="text-muted-foreground">
                    Format numérique Min / Max / Cible. Auto dérive le format
                    d'affichage du champ ou de la valeur saisie ; désactivé,
                    déverrouille une chaîne de format personnalisée.
                </div>
                {(
                    [
                        {
                            key: 'min',
                            title: 'Minimum',
                            wellLabel: 'Valeur minimum',
                            field: visual.minimum[0],
                            constant: visual.minimumValue,
                        },
                        {
                            key: 'max',
                            title: 'Maximum',
                            wellLabel: 'Valeur maximum',
                            field: visual.maximum[0],
                            constant: visual.maximumValue,
                        },
                        {
                            key: 'target',
                            title: 'Cible',
                            wellLabel: 'Valeur cible',
                            field: visual.target[0],
                            constant: visual.targetValue,
                        },
                    ] as const
                ).map(
                    ({ key, title: rowTitle, wellLabel, field, constant }) => (
                        <GaugeBoundRow
                            key={key}
                            title={rowTitle}
                            wellLabel={wellLabel}
                            field={field}
                            style={gauge.axis[key]}
                            hasValue={Boolean(field || constant)}
                            onPatch={(p) => patchBound(key, p)}
                        />
                    ),
                )}
            </Section>

            <Section title="Couleurs">
                <div className="grid grid-cols-2 gap-2">
                    <ColorInput
                        label="Couleur de remplissage"
                        value={gauge.fillColor}
                        onChange={(v) => patchGauge({ fillColor: v })}
                    />
                    <ColorInput
                        label="Couleur cible"
                        value={gauge.targetColor}
                        onChange={(v) => patchGauge({ targetColor: v })}
                    />
                </div>
                <ConditionalFormatControl
                    visual={visual}
                    label="fx — Remplissage"
                    value={normalizeConditionalFormat(gauge.fillFx)}
                    onCommit={(cf) => patchGauge({ fillFx: cf })}
                    hideFieldValue
                />
                <ConditionalFormatControl
                    visual={visual}
                    label="fx — Cible"
                    value={normalizeConditionalFormat(gauge.targetFx)}
                    onCommit={(cf) => patchGauge({ targetFx: cf })}
                    hideFieldValue
                />
            </Section>

            <ToggleGroup
                title="Étiquettes de données"
                checked={gauge.dataLabels.show}
                onToggle={(v) =>
                    patchGauge({
                        dataLabels: { ...gauge.dataLabels, show: v },
                    })
                }
            >
                <GaugeLabelSection
                    title="Valeurs"
                    style={gauge.dataLabels.values}
                    visual={visual}
                    onPatch={(p) => patchLabel('values', p)}
                />
                <GaugeLabelSection
                    title="Étiquette cible"
                    style={gauge.dataLabels.targetLabel}
                    visual={visual}
                    onPatch={(p) => patchLabel('targetLabel', p)}
                />
                <GaugeLabelSection
                    title="Valeur principale"
                    style={gauge.dataLabels.callout}
                    visual={visual}
                    onPatch={(p) => patchLabel('callout', p)}
                />
            </ToggleGroup>

            <GeneralSection
                visual={visual}
                onPatch={(p) => updateVisual(visual.id, p)}
            />
        </div>
    );
}
