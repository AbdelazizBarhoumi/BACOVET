import { ChevronDown } from 'lucide-react';
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
    type Visual,
} from '@/lib/pbi/model';
import { cn } from '@/lib/utils';

export const FONT_OPTIONS = [
    { value: '', label: 'Report font' },
    { value: 'ui-sans-serif, system-ui, sans-serif', label: 'Sans-serif' },
    { value: "Georgia, 'Times New Roman', serif", label: 'Serif' },
    { value: 'ui-monospace, monospace', label: 'Monospace' },
];

export const HEADINGS: { value: TitleStyle['heading']; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'h1', label: 'H1' },
    { value: 'h2', label: 'H2' },
    { value: 'h3', label: 'H3' },
    { value: 'h4', label: 'H4' },
];

export const ALIGNS: { value: 'left' | 'center' | 'right'; label: string }[] = [
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' },
];

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
                        aria-label={ariaLabel ?? label ?? 'Pick a color'}
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
            <div className="flex gap-1">
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
                            className={cn(
                                'h-6 flex-1 rounded border border-border text-[11px]',
                                on && 'bg-brand/15 text-brand',
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
                label={`${label} — font family`}
                value={font?.fontFamily ?? ''}
                options={FONT_OPTIONS}
                onChange={(v) => onChange({ fontFamily: v || undefined })}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
                <NumberInput
                    label="Font size"
                    min={8}
                    max={48}
                    value={font?.fontSize ?? 11}
                    onChange={(v) => onChange({ fontSize: v })}
                />
                <ColorInput
                    label="Color"
                    value={font?.color}
                    onChange={(v) => onChange({ color: v })}
                />
            </div>
            <div className="mt-2">
                <Biu
                    label="Font style"
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
                    aria-label={open ? 'Collapse' : 'Expand'}
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
        <Section title="General">
            <ColorInput
                label="Background"
                value={visual.background}
                onChange={(v) => onPatch({ background: v })}
            />
            <Toggle
                label="Border"
                checked={visual.border}
                onChange={(v) => onPatch({ border: v })}
            />
            <Toggle
                label="Shadow"
                checked={visual.shadow}
                onChange={(v) => onPatch({ shadow: v })}
            />
            <TextInput
                label="Alt text (accessibility)"
                value={visual.altText}
                onChange={(v) => onPatch({ altText: v })}
            />
            <div className="grid grid-cols-2 gap-2">
                {(['x', 'y', 'w', 'h'] as const).map((k) => (
                    <NumberInput
                        key={k}
                        label={
                            k === 'w'
                                ? 'Width'
                                : k === 'h'
                                  ? 'Height'
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
        <Section title="Title" defaultOpen>
            <TextInput
                label="Text"
                value={visual.title}
                onChange={(v) => onPatch({ title: v })}
            />
            <Select
                label="Heading style"
                value={title.heading}
                options={HEADINGS}
                onChange={(v) =>
                    patchTitle({ heading: v as TitleStyle['heading'] })
                }
            />
            <Select
                label="Font family"
                value={visual.fontFamily ?? ''}
                options={FONT_OPTIONS}
                onChange={(v) => onPatch({ fontFamily: v || undefined })}
            />
            <Biu
                label="Font style"
                bold={title.bold}
                italic={title.italic}
                underline={title.underline}
                onChange={(p) => patchTitle(p)}
            />
            <div className="grid grid-cols-2 gap-2">
                <ColorInput
                    label="Text color"
                    value={title.color}
                    onChange={(v) => patchTitle({ color: v })}
                />
                <ColorInput
                    label="Background color"
                    value={title.background}
                    onChange={(v) => patchTitle({ background: v })}
                />
            </div>
            <OptionalNumberInput
                label="Font size"
                value={title.fontSize}
                onChange={(v) => patchTitle({ fontSize: v })}
            />
            <Select
                label="Horizontal alignment"
                value={title.align ?? 'center'}
                options={ALIGNS}
                onChange={(v) =>
                    patchTitle({ align: v as 'left' | 'center' | 'right' })
                }
            />
            <Toggle
                label="Text wrap"
                checked={title.textWrap ?? false}
                onChange={(v) => patchTitle({ textWrap: v })}
            />
            <Toggle
                label="Show title"
                checked={visual.showTitle}
                onChange={(v) => onPatch({ showTitle: v })}
            />
        </Section>
    );
}
