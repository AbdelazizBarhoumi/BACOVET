import {
    normalizeTitleStyle,
    type TitleStyle,
    type ValueFormat,
    type Visual,
} from '@/lib/pbi/model';
import {
    AlignControls,
    Biu,
    ColorInput,
    FONT_OPTIONS,
    HEADINGS,
    NumberInput,
    OptionalNumberInput,
    Section,
    Select,
    TextInput,
    Toggle,
} from './primitives';

export function ValueFormatControl({
    label = 'Format',
    value,
    onChange,
}: {
    label?: string;
    value: ValueFormat;
    onChange: (v: ValueFormat) => void;
}) {
    const active = !value.auto && Boolean(value.format);
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">{label}</span>
                <label className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
                    Auto
                    <input
                        type="checkbox"
                        checked={value.auto}
                        onChange={(e) =>
                            onChange({ ...value, auto: e.target.checked })
                        }
                        className="accent-[var(--brand)]"
                    />
                </label>
            </div>
            {active && (
                <TextInput
                    label="Chaîne de format"
                    value={value.format ?? ''}
                    placeholder="$#,##0"
                    onChange={(format) => onChange({ ...value, format })}
                />
            )}
        </div>
    );
}

export function FontStyleControls({
    label,
    font,
    onChange,
}: {
    label: string;
    font?: {
        fontFamily?: string;
        fontSize?: number;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        color?: string;
    };
    onChange: (patch: {
        fontFamily?: string;
        fontSize?: number;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        color?: string;
    }) => void;
}) {
    return (
        <div className="rounded border border-border p-2">
            <Select
                label={`${label} — police`}
                value={font?.fontFamily ?? ''}
                options={FONT_OPTIONS}
                onChange={(v) => onChange({ fontFamily: v || undefined })}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
                <NumberInput
                    label="Taille de police"
                    min={8}
                    max={48}
                    value={font?.fontSize ?? 11}
                    onChange={(v) => onChange({ fontSize: v })}
                />
                <ColorInput
                    label="Couleur"
                    value={font?.color}
                    onChange={(v) => onChange({ color: v })}
                />
            </div>
            <div className="mt-2">
                <Biu
                    label="Style de police"
                    bold={font?.bold}
                    italic={font?.italic}
                    underline={font?.underline}
                    onChange={(p) => onChange(p)}
                />
            </div>
        </div>
    );
}

export function GeneralSection({
    visual,
    onPatch,
}: {
    visual: Visual;
    onPatch: (patch: Partial<Visual>) => void;
}) {
    return (
        <Section title="Général">
            <ColorInput
                label="Arrière-plan"
                value={visual.background}
                onChange={(v) => onPatch({ background: v })}
            />
            <Toggle
                label="Bordure"
                checked={visual.border}
                onChange={(v) => onPatch({ border: v })}
            />
            <Toggle
                label="Ombre"
                checked={visual.shadow}
                onChange={(v) => onPatch({ shadow: v })}
            />
            <TextInput
                label="Texte alternatif (accessibilité)"
                value={visual.altText}
                onChange={(v) => onPatch({ altText: v })}
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
                        onChange={(v) => onPatch({ [k]: v })}
                    />
                ))}
            </div>
        </Section>
    );
}

export function TitleSection({
    visual,
    onPatch,
}: {
    visual: Visual;
    onPatch: (patch: Partial<Visual>) => void;
}) {
    const title = normalizeTitleStyle(visual.titleStyle);
    const patchTitle = (patch: Partial<TitleStyle>) =>
        onPatch({ titleStyle: { ...title, ...patch } });
    return (
        <Section title="Titre" defaultOpen>
            <TextInput
                label="Texte"
                value={visual.title}
                onChange={(v) => onPatch({ title: v })}
            />
            <Select
                label="Style de titre"
                value={title.heading}
                options={HEADINGS}
                onChange={(v) =>
                    patchTitle({ heading: v as TitleStyle['heading'] })
                }
            />
            <Select
                label="Police"
                value={visual.fontFamily ?? ''}
                options={FONT_OPTIONS}
                onChange={(v) => onPatch({ fontFamily: v || undefined })}
            />
            <div className="grid grid-cols-2 gap-2">
                <Biu
                    label="Style de police"
                    bold={title.bold}
                    italic={title.italic}
                    underline={title.underline}
                    onChange={(p) => patchTitle(p)}
                />
                <AlignControls
                    label="Alignement horizontal"
                    value={title.align ?? 'center'}
                    onChange={(v) => patchTitle({ align: v })}
                />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <ColorInput
                    label="Couleur du texte"
                    value={title.color}
                    onChange={(v) => patchTitle({ color: v })}
                />
                <ColorInput
                    label="Couleur d'arrière-plan"
                    value={title.background}
                    onChange={(v) => patchTitle({ background: v })}
                />
            </div>
            <OptionalNumberInput
                label="Taille de police"
                value={title.fontSize}
                onChange={(v) => patchTitle({ fontSize: v })}
            />
            <Toggle
                label="Renvoi à la ligne"
                checked={title.textWrap ?? false}
                onChange={(v) => patchTitle({ textWrap: v })}
            />
            <Toggle
                label="Afficher le titre"
                checked={visual.showTitle}
                onChange={(v) => onPatch({ showTitle: v })}
            />
        </Section>
    );
}
