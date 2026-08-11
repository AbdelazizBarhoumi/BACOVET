import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import ColorPicker, { themes } from 'react-pick-color';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import type { TitleStyle } from '@/lib/pbi/model';
import { cn } from '@/lib/utils';
import { pickerColorToHex, resolveColor } from './color';

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
                className="w-full rounded border border-border bg-background px-2 py-1 placeholder:text-muted-foreground/50"
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

/** Stepper with − / + buttons for small integer adjustments (e.g. title
 * offset). Shows the raw value between the buttons. */
export function Stepper({
    label,
    value,
    onChange,
    min,
    max,
    step = 1,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
}) {
    const clamp = (v: number) =>
        Math.min(max ?? v, Math.max(min ?? v, v));
    return (
        <div className="block">
            <span className="mb-1 block text-muted-foreground">{label}</span>
            <div className="flex items-center">
                <button
                    type="button"
                    onClick={() => onChange(clamp(value - step))}
                    disabled={min !== undefined && value <= min}
                    className="h-7 w-7 rounded-l border border-border bg-background text-sm hover:border-brand disabled:opacity-30"
                    aria-label={`Réduire ${label.toLowerCase()}`}
                >
                    −
                </button>
                <span className="h-7 flex-1 border-y border-border bg-background px-1 text-center text-[11px] leading-7 tabular-nums text-foreground">
                    {value}
                </span>
                <button
                    type="button"
                    onClick={() => onChange(clamp(value + step))}
                    disabled={max !== undefined && value >= max}
                    className="h-7 w-7 rounded-r border border-border bg-background text-sm hover:border-brand disabled:opacity-30"
                    aria-label={`Augmenter ${label.toLowerCase()}`}
                >
                    +
                </button>
            </div>
        </div>
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
