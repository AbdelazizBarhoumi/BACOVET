import { useState } from 'react';
import {
    DISPLAY_UNITS,
    fieldLabel,
    normalizeConditionalFormat,
    normalizeGaugeStyle,
    valueGaugeStyle,
    type DisplayUnit,
    type GaugeBoundStyle,
    type GaugeLabelStyle,
    type GaugeStyle,
    type GaugeValueStyle,
    type ValueStyle,
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
    OptionalNumberInput,
    Section,
    Select,
    TextInput,
    TitleSection,
    Toggle,
    ToggleGroup,
    ValueFormatControl,
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

/** The format tab for the gauge: gauge axis, colors, data labels, general.
 * With multiple "Valeur" fields each value gets its own colors / display
 * format / callout via `Visual.valueStyle`. */
export function GaugeFormat({ visual }: { visual: Visual }) {
    const { updateVisual } = usePbi();
    const [scope, setScope] = useState<number | null>(null);
    const multi = visual.values.length > 1;
    const idx = scope ?? 0;
    const gauge =
        scope === null
            ? normalizeGaugeStyle(visual.gauge)
            : valueGaugeStyle(visual, scope);

    /** Write a per-value block (`valueStyle[index]`), growing the array as
     * needed. */
    const setValueStyle = (
        index: number,
        fn: (b: ValueStyle) => ValueStyle,
    ) => {
        const arr = [...(visual.valueStyle ?? [])];
        while (arr.length <= index) arr.push({});
        arr[index] = fn(arr[index] ?? {});
        updateVisual(visual.id, { valueStyle: arr });
    };

    /** Commit a gauge patch to the shared block (scope = all) or into the
     * per-value overrides (per-value colors / display / callout only). */
    const writeGaugePatch = (patch: Partial<GaugeStyle>) => {
        if (scope === null) {
            updateVisual(visual.id, { gauge: { ...gauge, ...patch } });
            return;
        }
        const merged: ValueStyle['gauge'] = {
            ...(visual.valueStyle?.[scope]?.gauge ?? {}),
        };
        if (patch.value !== undefined) merged.value = patch.value;
        if (patch.fillColor !== undefined) merged.fillColor = patch.fillColor;
        if (patch.fillFx !== undefined) merged.fillFx = patch.fillFx;
        if (patch.targetColor !== undefined)
            merged.targetColor = patch.targetColor;
        if (patch.targetFx !== undefined) merged.targetFx = patch.targetFx;
        if (patch.dataLabels?.callout !== undefined)
            merged.callout = patch.dataLabels.callout;
        setValueStyle(scope, (b) => ({ ...b, gauge: merged }));
    };

    const patchValue = (patch: Partial<GaugeValueStyle>) =>
        writeGaugePatch({ value: { ...gauge.value, ...patch } });
    const patchBound = (key: GaugeBoundKey, patch: Partial<GaugeBoundStyle>) =>
        updateVisual(visual.id, {
            gauge: {
                ...gauge,
                axis: {
                    ...gauge.axis,
                    [key]: { ...gauge.axis[key], ...patch },
                },
            },
        });
    const patchLabel = (
        key: GaugeLabelKey,
        patch: Partial<GaugeLabelStyle>,
    ) => {
        if (key === 'callout') {
            writeGaugePatch({
                dataLabels: {
                    ...gauge.dataLabels,
                    callout: { ...gauge.dataLabels.callout, ...patch },
                },
            });
        } else {
            updateVisual(visual.id, {
                gauge: {
                    ...gauge,
                    dataLabels: {
                        ...gauge.dataLabels,
                        [key]: { ...gauge.dataLabels[key], ...patch },
                    },
                },
            });
        }
    };

    /** Typed constant for the selected scope (legacy scalar vs per-value
     * array entry). */
    const constantFor = (key: 'minimum' | 'maximum' | 'target') =>
        scope === null
            ? visual[`${key}Value`]
            : visual[`${key}Values`]?.[scope];
    const setConstant = (
        key: 'minimum' | 'maximum' | 'target',
        v: number | undefined,
    ) => {
        if (scope === null) {
            updateVisual(visual.id, { [`${key}Value`]: v });
        } else {
            const arr = [...(visual[`${key}Values`] ?? [])];
            while (arr.length <= scope) arr.push(undefined);
            arr[scope] = v;
            updateVisual(visual.id, { [`${key}Values`]: arr });
        }
    };

    return (
        <div className="space-y-3 text-[11px]">
            <TitleSection
                visual={visual}
                onPatch={(p) => updateVisual(visual.id, p)}
            />

            {multi && (
                <Section title="Champ formaté" defaultOpen>
                    <Select
                        label="Éditer le format de"
                        value={scope === null ? '__all__' : String(scope)}
                        options={[
                            { value: '__all__', label: 'Toutes les valeurs' },
                            ...visual.values.map((v, i) => ({
                                value: String(i),
                                label: fieldLabel(v),
                            })),
                        ]}
                        onChange={(v) =>
                            setScope(v === '__all__' ? null : Number(v))
                        }
                    />
                </Section>
            )}

            <Section title="Axe de la jauge" defaultOpen>
                <div className="text-muted-foreground">
                    Format numérique Min / Max / Cible. Auto dérive le format
                    d'affichage du champ ou de la valeur saisie ; désactivé,
                    déverrouille une chaîne de format personnalisée.
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Select
                        label="Unités d'affichage"
                        value={gauge.value.displayUnits}
                        options={DISPLAY_UNITS.map((u) => ({
                            value: u,
                            label: DISPLAY_UNIT_LABELS[u],
                        }))}
                        onChange={(v) =>
                            patchValue({
                                displayUnits: v as DisplayUnit,
                            })
                        }
                    />
                    <TextInput
                        label="Suffixe"
                        placeholder="ex. kW"
                        value={gauge.value.suffix ?? ''}
                        onChange={(v) =>
                            patchValue({ suffix: v.trim() || undefined })
                        }
                    />
                </div>
                <NumberInput
                    label="Décimales des valeurs"
                    min={0}
                    max={10}
                    value={gauge.value.decimals ?? 1}
                    onChange={(v) => patchValue({ decimals: v })}
                />
                <div className="grid grid-cols-2 gap-2">
                    <OptionalNumberInput
                        label="Min"
                        value={constantFor('minimum')}
                        onChange={(v) => setConstant('minimum', v)}
                    />
                    <OptionalNumberInput
                        label="Max"
                        value={constantFor('maximum')}
                        onChange={(v) => setConstant('maximum', v)}
                    />
                </div>
                {(
                    [
                        {
                            key: 'min',
                            title: 'Minimum',
                            wellLabel: 'Valeur minimum',
                            field: visual.minimum[idx],
                            constant: constantFor('minimum'),
                        },
                        {
                            key: 'max',
                            title: 'Maximum',
                            wellLabel: 'Valeur maximum',
                            field: visual.maximum[idx],
                            constant: constantFor('maximum'),
                        },
                        {
                            key: 'target',
                            title: 'Cible',
                            wellLabel: 'Valeur cible',
                            field: visual.target[idx],
                            constant: constantFor('target'),
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
                        label="Remplissage"
                        value={gauge.fillColor}
                        onChange={(v) => writeGaugePatch({ fillColor: v })}
                    />
                    <ColorInput
                        label="Cible"
                        value={gauge.targetColor}
                        onChange={(v) => writeGaugePatch({ targetColor: v })}
                    />
                </div>
                <ConditionalFormatControl
                    visual={visual}
                    label="fx — Remplissage"
                    value={normalizeConditionalFormat(gauge.fillFx)}
                    onCommit={(cf) => writeGaugePatch({ fillFx: cf })}
                    hideFieldValue
                />
                <ConditionalFormatControl
                    visual={visual}
                    label="fx — Cible"
                    value={normalizeConditionalFormat(gauge.targetFx)}
                    onCommit={(cf) => writeGaugePatch({ targetFx: cf })}
                    hideFieldValue
                />
            </Section>

            <ToggleGroup
                title="Étiquettes de données"
                checked={gauge.dataLabels.show}
                onToggle={(v) =>
                    writeGaugePatch({
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

            <Section title="Disposition">
                <Select
                    label="Valeurs multiples"
                    value={visual.multiLayout ?? 'grid'}
                    options={[
                        { value: 'grid', label: 'Côte à côte' },
                        { value: 'stack', label: 'Empilées' },
                    ]}
                    onChange={(v) =>
                        updateVisual(visual.id, {
                            multiLayout: v as 'grid' | 'stack',
                        })
                    }
                />
            </Section>

            <GeneralSection
                visual={visual}
                onPatch={(p) => updateVisual(visual.id, p)}
            />
        </div>
    );
}
