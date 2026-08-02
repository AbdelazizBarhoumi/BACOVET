import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const FONT_OPTIONS = [
    { value: '', label: 'Report font' },
    { value: 'ui-sans-serif, system-ui, sans-serif', label: 'Sans-serif' },
    { value: "Georgia, 'Times New Roman', serif", label: 'Serif' },
    { value: 'ui-monospace, monospace', label: 'Monospace' },
];

export const HEX_FALLBACK = '#000000';

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
}: {
    label: string;
    value?: string;
    onChange: (v: string) => void;
}) {
    const safe = value?.startsWith('#') ? value : HEX_FALLBACK;
    return (
        <label className="block">
            <span className="mb-1 block text-muted-foreground">{label}</span>
            <input
                type="color"
                value={safe}
                onChange={(e) => onChange(e.target.value)}
                className="h-7 w-full cursor-pointer rounded border border-border bg-background"
            />
        </label>
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
    onChange: (
        patch: { bold?: boolean; italic?: boolean; underline?: boolean },
    ) => void;
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
    onChange: (
        patch: {
            fontFamily?: string;
            fontSize?: number;
            bold?: boolean;
            italic?: boolean;
            underline?: boolean;
            color?: string;
        },
    ) => void;
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
