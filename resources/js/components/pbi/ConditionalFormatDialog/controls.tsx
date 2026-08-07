import { ColorInput } from '@/components/pbi/formatControls';
import {
    Select as UiSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    CF_BOUND_TYPES,
    type CfBound,
    type CfBoundType,
} from '@/lib/pbi/model';
import { cn } from '@/lib/utils';
import { BOUND_LABELS } from './constants';

/** shadcn/Radix wrapper exposing the same API as the old native <select>. */
export function Select({
    label,
    value,
    options,
    onChange,
    className,
}: {
    label?: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
    className?: string;
}) {
    return (
        <label className="block">
            {label && (
                <span className="mb-1 block text-[11px] text-muted-foreground">
                    {label}
                </span>
            )}
            <UiSelect value={value} onValueChange={onChange}>
                <SelectTrigger className={cn('h-8 text-[12px]', className)}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-[12px]">
                            {o.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </UiSelect>
        </label>
    );
}

export function NumberInput({
    label,
    value,
    onChange,
    className,
}: {
    label?: string;
    value: number;
    onChange: (v: number) => void;
    className?: string;
}) {
    return (
        <label className="block">
            {label && (
                <span className="mb-1 block text-[11px] text-muted-foreground">
                    {label}
                </span>
            )}
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={cn(
                    'h-8 w-full rounded-md border border-input bg-transparent px-2 text-[12px] shadow-sm focus:outline-none focus:ring-1 focus:ring-ring',
                    className,
                )}
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
        <div className="flex items-center justify-between gap-3">
            <span className="text-[12px]">{label}</span>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

export function BoundEditor({
    label,
    bound,
    allowNone,
    onChange,
}: {
    label: string;
    bound: CfBound;
    allowNone: boolean;
    onChange: (patch: Partial<CfBound>) => void;
}) {
    const types = allowNone
        ? CF_BOUND_TYPES
        : CF_BOUND_TYPES.filter((t) => t !== 'none');
    return (
        <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <Select
                    label={label}
                    value={bound.type}
                    options={types.map((t) => ({ value: t, label: BOUND_LABELS[t] }))}
                    onChange={(v) => onChange({ type: v as CfBoundType })}
                />
                <div className="w-9 pb-0.5">
                    <span className="mb-1 block text-[11px] text-muted-foreground">
                        Couleur
                    </span>
                    <ColorInput
                        value={bound.color}
                        onChange={(v) => onChange({ color: v })}
                        className="h-8 w-9"
                    />
                </div>
            </div>
            {['number', 'percent', 'percentile'].includes(bound.type) && (
                <NumberInput
                    label="Valeur"
                    value={bound.value ?? 0}
                    onChange={(v) => onChange({ value: v })}
                />
            )}
        </div>
    );
}

/** Segmented pill control for the format style. */
export function StylePicker({
    value,
    options,
    onChange,
}: {
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => onChange(o.value)}
                        className={cn(
                            'rounded-md border px-3 py-1.5 text-[11px] font-medium transition-colors',
                            active
                                ? 'border-brand bg-brand text-white shadow-sm'
                                : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

export { STYLE_OPTIONS } from './constants';