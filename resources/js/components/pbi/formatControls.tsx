import { AlignCenter, AlignLeft, AlignRight, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import ColorPicker, { themes } from 'react-pick-color';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    normalizeTitleStyle,
    type TitleStyle,
    type ValueFormat,
    type Visual,
} from '@/lib/pbi/model';
import { cn } from '@/lib/utils';

export const FONT_OPTIONS = [
    { value: '', label: 'Police du rapport' },
    { value: 'ui-sans-serif, system-ui, sans-serif', label: 'Sans-serif' },
    { value: "Georgia, 'Times New Roman', serif", label: 'Serif' },
    { value: 'ui-monospace, monospace', label: 'Monospace' },
];

export const HEADINGS: { value: TitleStyle['heading']; label: string }[] = [
    { value: 'none', label: 'Aucun' },
    { value: 'h1', label: 'H1' },
    { value: 'h2', label: 'H2' },
    { value: 'h3', label: 'H3' },
    { value: 'h4', label: 'H4' },
];

type Align = 'left' | 'center' | 'right';

export const ALIGNS: { value: Align; icon: typeof AlignLeft; label: string }[] = [
    { value: 'left', icon: AlignLeft, label: 'Aligné à gauche' },
    { value: 'center', icon: AlignCenter, label: 'Centré' },
    { value: 'right', icon: AlignRight, label: 'Aligné à droite' },
];

/** Alignment segmented control (Power BI Fluent style). */
export function AlignControls({
    label,
    value,
    options = ALIGNS,
    onChange,
}: {
    label: string;
    value: Align;
    options?: typeof ALIGNS;
    onChange: (v: Align) => void;
}) {
    return (
        <div className="space-y-1">
            <span className="mb-1 block text-muted-foreground">{label}</span>
            <div className="flex" role="group" aria-label={label}>
                {options.map(({ value: v, icon: Icon, label: iconLabel }) => {
                    const on = value === v;
                    return (
                        <button
                            key={v}
                            type="button"
                            onClick={() => onChange(v)}
                            aria-pressed={on}
                            title={iconLabel}
                            className={cn(
                                'h-7 w-7 flex items-center justify-center border transition-colors',
                                'first:rounded-l-sm last:rounded-r-sm -ml-px first:ml-0',
                                on
                                    ? 'relative z-10 border-[#0078D4] bg-[#EFF6FC] text-[#0078D4]'
                                    : 'border-[#8A8886] bg-white text-[#323130] hover:bg-[#F3F2F1]',
                            )}
                        >
                            <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export const HEX_FALLBACK = '#000000';

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNCTIONAL_RE = /^(rgb|rgba|hsl|hsla)\(/i;
const CSS_VAR_RE = /^var\(\s*(--[\w-]+)/;

function cssColorToHex(color: string): string | null {
    if (HEX_RE.test(color)) return color.toLowerCase();
    if (typeof document === 'undefined') return null;
    try {
        const ctx = document.createElement('canvas').getContext('2d');
        if (!ctx) return null;
        ctx.fillStyle = color;
        if (!ctx.fillStyle) return null;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        const hex = [r, g, b]
            .map((n) => n.toString(16).padStart(2, '0'))
            .join('');
        return a < 255
            ? `#${hex}${a.toString(16).padStart(2, '0')}`
            : `#${hex}`;
    } catch {
        return null;
    }
}

function resolveCssVar(value: string, depth = 0): string | null {
    if (depth > 5) return null;
    const match = CSS_VAR_RE.exec(value);
    if (!match) return null;
    if (typeof document === 'undefined') return null;
    const resolved = getComputedStyle(document.documentElement)
        .getPropertyValue(match[1]!)
        .trim();
    if (!resolved) return null;
    return CSS_VAR_RE.test(resolved)
        ? resolveCssVar(resolved, depth + 1)
        : resolved;
}

export function resolveColor(value: string): string {
    const input = value.trim();
    if (HEX_RE.test(input) || FUNCTIONAL_RE.test(input)) return input;
    const resolved = CSS_VAR_RE.test(input) ? resolveCssVar(input) : input;
    if (resolved) {
        const hex = cssColorToHex(resolved);
        if (hex) return hex;
    }
    return HEX_FALLBACK;
}

function pickerColorToHex(c: {
    hex: string;
    rgb: { r: number; g: number; b: number };
    alpha: number;
}): string {
    if (c.alpha >= 1) return c.hex;
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(c.rgb.r)}${toHex(c.rgb.g)}${toHex(c.rgb.b)}${toHex(
        Math.round(c.alpha * 255),
    )}`;
}

/** Collapsible format-pane section with a chevron header. */
export function Section({
    title,
    children,
    defaultOpen = false,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="overflow-hidden rounded border border-border">
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] font-semibold hover:bg-accent"
            >
                {title}
                <ChevronDown
                    className={cn(
                        'size-3 text-muted-foreground transition-transform',
                        open && 'rotate-180',
                    )}
                />
            </button>
            {open && (
                <div className="space-y-2.5 border-t border-border p-2">
                    {children}
                </div>
            )}
        </div>
    );
}

export function TextInput({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-muted-foreground">{label}</span>
            <input
                value={value ?? ''}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1"
            />
        </label>
    );
}

/** Auto/custom number formatting, mirroring the Gauge bound-row pattern: an
 * Auto checkbox and, when off, a Power BI style format string. */
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

export function NumberInput({
    label,
    value,
    onChange,
    min,
    max,
    step,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-muted-foreground">{label}</span>
            <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full rounded border border-border bg-background px-2 py-1"
            />
        </label>
    );
}

export function ColorInput({
    label,
    value,
    onChange,
    className,
    ariaLabel,
}: {
    label?: string;
    value?: string;
    onChange: (v: string) => void;
    className?: string;
    ariaLabel?: string;
}) {
    const [open, setOpen] = useState(false);
    const safe = resolveColor(value ?? '');
    return (
        <div className="block">
            {label && (
                <span className="mb-1 block text-muted-foreground">
                    {label}
                </span>
            )}
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'h-7 w-full rounded border border-border bg-background transition-colors hover:border-brand',
                            className,
                        )}
                        style={{ backgroundColor: safe }}
                        aria-label={ariaLabel ?? label ?? 'Choisir une couleur'}
                    />
                </PopoverTrigger>
                <PopoverContent
                    className="w-auto p-1"
                    align="start"
                    side="right"
                >
                    <ColorPicker
                        color={safe}
                        theme={{
                            ...themes.light,
                            background: 'var(--popover)',
                            inputBackground: 'var(--input)',
                            borderColor: 'var(--border)',
                            color: 'var(--popover-foreground)',
                            width: '220px',
                        }}
                        hideAlpha={false}
                        onChange={(c) => onChange(pickerColorToHex(c))}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}

export function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between">
            <span>{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="accent-[var(--brand)]"
            />
        </label>
    );
}

export function Select({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-muted-foreground">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded border border-border bg-background px-2 py-1"
            >
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

/** Bold / Italic / Underline triple, sharing one label. */
export function Biu({
    label,
    bold,
    italic,
    underline,
    onChange,
}: {
    label: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    onChange: (patch: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
    }) => void;
}) {
    return (
        <div>
            <span className="mb-1 block text-muted-foreground">{label}</span>
            <div className="flex">
                {(
                    [
                        ['bold', 'B'],
                        ['italic', 'I'],
                        ['underline', 'U'],
                    ] as const
                ).map(([key, glyph]) => {
                    const on =
                        key === 'bold'
                            ? bold
                            : key === 'italic'
                              ? italic
                              : underline;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => onChange({ [key]: !on })}
                            aria-pressed={!!on}
                            title={key}
                            className={cn(
                                'h-7 w-7 flex items-center justify-center border text-[12px] transition-colors',
                                'first:rounded-l-sm last:rounded-r-sm -ml-px first:ml-0',
                                key === 'bold' && 'font-bold',
                                key === 'italic' && 'italic',
                                key === 'underline' &&
                                    'underline underline-offset-2',
                                on
                                    ? 'relative z-10 border-[#0078D4] bg-[#EFF6FC] text-[#0078D4]'
                                    : 'border-[#8A8886] bg-white text-[#323130] hover:bg-[#F3F2F1]',
                            )}
                        >
                            {glyph}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** A compact B/I/U row used inside a two-column grid with another control. */
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

/** A collapsible section whose header carries an On/Off switch plus a
 * collapse chevron. Body renders only when the switch is on and expanded.
 * This is the "nested toggle group" pattern: a parent switch wrapping
 * independently-toggleable sub-sections. */
export function ToggleGroup({
    title,
    checked,
    onToggle,
    defaultOpen = true,
    children,
}: {
    title: string;
    checked: boolean;
    onToggle: (v: boolean) => void;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="overflow-hidden rounded border border-border">
            <div className="flex items-center justify-between gap-2 px-2 py-1">
                <label className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate text-[11px] font-semibold">
                        {title}
                    </span>
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onToggle(e.target.checked)}
                        className="accent-[var(--brand)]"
                    />
                </label>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={open ? 'Réduire' : 'Déplier'}
                >
                    <ChevronDown
                        className={cn(
                            'size-3 transition-transform',
                            open && 'rotate-180',
                        )}
                    />
                </button>
            </div>
            {checked && open && (
                <div className="space-y-2.5 border-t border-border p-2">
                    {children}
                </div>
            )}
        </div>
    );
}

/** The shared "General" format section (background, border, shadow, alt text,
 * position/size). Used by every format pane. */
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

/** Number input that maps an empty field to `undefined` (for "auto" values). */
export function OptionalNumberInput({
    label,
    value,
    onChange,
}: {
    label: string;
    value?: number;
    onChange: (v: number | undefined) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-muted-foreground">{label}</span>
            <input
                type="number"
                value={value ?? ''}
                onChange={(e) =>
                    onChange(
                        e.target.value === ''
                            ? undefined
                            : Number(e.target.value),
                    )
                }
                className="w-full rounded border border-border bg-background px-2 py-1"
            />
        </label>
    );
}

/** The shared "Title" format section (text, heading, font, colors, font size,
 * alignment, wrap, visibility) used by every format pane. */
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
