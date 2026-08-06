import { Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Select as UiSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    conditionalColor,
    conditionalIcon,
    isColor,
} from '@/lib/pbi/conditionalFormat';
import {
    bindRulesToSet,
    defaultIconSet,
    iconById,
    iconSetOf,
    type CFIconSet,
} from '@/lib/pbi/icons';
import {
    CF_BOUND_TYPES,
    CF_COMPARATORS,
    CF_RULE_CONDITIONS,
    CF_VALUE_TYPES,
    fieldType,
    normalizeConditionalFormat,
    type CfAgg,
    type CfBound,
    type CfBoundType,
    type CfComparator,
    type CfRule,
    type CfRuleCondition,
    type CfValueType,
    type ConditionalFormat,
    type FieldType,
    type Visual,
} from '@/lib/pbi/model';
import { usePbi } from '@/lib/pbi/store';
import { cn } from '@/lib/utils';
import { CfIcon } from './CfIcon';
import { ColorInput } from './formatControls';
import { IconPicker, IconSetPicker } from './IconPicker';

const STYLE_OPTIONS: { value: ConditionalFormat['style']; label: string }[] = [
    { value: 'none', label: 'Aucun' },
    { value: 'gradient', label: 'Dégradé' },
    { value: 'rules', label: 'Règles' },
    { value: 'icons', label: 'Icônes' },
    { value: 'fieldValue', label: 'Valeur de champ' },
];

const BOUND_LABELS: Record<CfBoundType, string> = {
    none: 'Aucun',
    lowest: 'Valeur la plus basse',
    highest: 'Valeur la plus haute',
    number: 'Nombre',
    percent: 'Pourcentage',
    percentile: 'Centile',
};

const COMPARATOR_LABELS: Record<CfComparator, string> = {
    between: 'entre',
    greaterThan: 'supérieur à',
    lessThan: 'inférieur à',
    greaterThanOrEqual: 'supérieur ou égal à',
    lessThanOrEqual: 'inférieur ou égal à',
};

const CONDITION_LABELS: Record<CfRuleCondition, string> = {
    is: 'est',
    isBlank: 'est vide',
    isNotBlank: "n'est pas vide",
};

const VALUE_TYPE_LABELS: Record<CfValueType, string> = {
    number: 'Nombre',
    percent: 'Pourcentage',
    percentile: 'Centile',
};

/** shadcn/Radix wrapper exposing the same API as the old native <select>. */
function Select({
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

function NumberInput({
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

function Toggle({
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

function BoundEditor({
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
function StylePicker({
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

/** One conditional-formatting rule row (color or icon flavor). */
function RuleCard({
    index,
    rule,
    set,
    iconMode,
    onPatch,
    onRemove,
}: {
    index: number;
    rule: CfRule;
    set: CFIconSet | undefined;
    iconMode: boolean;
    onPatch: (p: Partial<CfRule>) => void;
    onRemove: () => void;
}) {
    return (
        <div className="rounded-lg border border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Règle {index + 1}
                </span>
                <button
                    type="button"
                    onClick={onRemove}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                    aria-label="Supprimer la règle"
                >
                    <Trash2 className="size-3.5" />
                </button>
            </div>
            <div className="flex flex-wrap items-end gap-2">
                <div className="w-24">
                    <Select
                        label="Condition"
                        value={rule.condition}
                        options={CF_RULE_CONDITIONS.map((c) => ({
                            value: c,
                            label: CONDITION_LABELS[c],
                        }))}
                        onChange={(v) =>
                            onPatch({ condition: v as CfRuleCondition })
                        }
                    />
                </div>
                {rule.condition === 'is' && (
                    <>
                        <div className="w-44">
                            <Select
                                label="Opérateur"
                                value={rule.comparator}
                                options={CF_COMPARATORS.map((c) => ({
                                    value: c,
                                    label: COMPARATOR_LABELS[c],
                                }))}
                                onChange={(v) =>
                                    onPatch({ comparator: v as CfComparator })
                                }
                            />
                        </div>
                        <div className="w-20">
                            <NumberInput
                                label="Valeur"
                                value={rule.value}
                                onChange={(v) => onPatch({ value: v })}
                            />
                        </div>
                        {rule.comparator === 'between' && (
                            <div className="w-20">
                                <NumberInput
                                    label="à"
                                    value={rule.value2 ?? rule.value}
                                    onChange={(v) => onPatch({ value2: v })}
                                />
                            </div>
                        )}
                        <div className="w-24">
                            <Select
                                label="Type"
                                value={rule.valueType}
                                options={CF_VALUE_TYPES.map((t) => ({
                                    value: t,
                                    label: VALUE_TYPE_LABELS[t],
                                }))}
                                onChange={(v) =>
                                    onPatch({ valueType: v as CfValueType })
                                }
                            />
                        </div>
                    </>
                )}
                {iconMode ? (
                    <div className="w-44">
                        <span className="mb-1 block text-[11px] text-muted-foreground">
                            Icône
                        </span>
                        <IconPicker
                            value={rule.icon}
                            set={set}
                            onChange={(v) => onPatch({ icon: v })}
                            className="h-8"
                        />
                    </div>
                ) : (
                    <div className="w-24">
                        <span className="mb-1 block text-[11px] text-muted-foreground">
                            Couleur
                        </span>
                        <ColorInput
                            value={rule.color}
                            onChange={(v) => onPatch({ color: v })}
                            className="h-8"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

const formatNum = (v: number) =>
    Number.isInteger(v) ? String(v) : v.toFixed(1);

/** Live swatch strip sampling how the format will look across the field range. */
function PreviewStrip({
    cf,
    values,
    basedOnLabel,
}: {
    cf: ConditionalFormat;
    values: number[];
    basedOnLabel: string;
}) {
    const set = iconSetOf(cf.iconSet) ?? defaultIconSet();
    return (
        <div className="rounded-lg border border-border bg-panel p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                    Aperçu
                </span>
                <span className="truncate text-[10px] text-muted-foreground">
                    {basedOnLabel}
                </span>
            </div>
            <div className="flex flex-wrap items-end gap-2">
                {values.map((v, i) => {
                    const color = conditionalColor(cf, v, values, v);
                    const icon =
                        cf.style === 'icons'
                            ? iconById(set.id, conditionalIcon(cf, v, values))
                            : undefined;
                    return (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    'flex h-10 w-10 items-center justify-center rounded-md border',
                                    color ? 'border-transparent' : 'border-border',
                                )}
                                style={
                                    color
                                        ? { backgroundColor: color }
                                        : undefined
                                }
                            >
                                {icon && <CfIcon icon={icon} size={20} />}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                                {formatNum(v)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function ConditionalFormatDialog({
    open,
    visual,
    onClose,
    value,
    onCommit,
    hideFieldValue,
}: {
    open: boolean;
    visual: Visual;
    onClose: () => void;
    /** Override the source value (for per-target fx, e.g. gauge). */
    value?: ConditionalFormat;
    /** Commit override (for per-target fx). Defaults to the store writer. */
    onCommit?: (cf: ConditionalFormat | undefined) => void;
    /** Hide the "Field value" style (inert for single-value targets). */
    hideFieldValue?: boolean;
}) {
    const { tables, setConditionalFormat, resetConditionalFormat } = usePbi();
    const draftInit = () => {
        const base = normalizeConditionalFormat(
            value ?? visual.conditionalFormat,
        );
        return hideFieldValue && base.style === 'fieldValue'
            ? { ...base, style: 'none' as const }
            : base;
    };
    const [draft, setDraft] = useState<ConditionalFormat>(draftInit);
    const [prevOpen, setPrevOpen] = useState(open);

    if (prevOpen !== open) {
        setPrevOpen(open);
        if (open) setDraft(draftInit());
    }

    if (!open) return null;

    const patch = (p: Partial<ConditionalFormat>) =>
        setDraft((d) => ({ ...d, ...p }));
    const patchBound = (key: 'min' | 'max' | 'center', p: Partial<CfBound>) =>
        setDraft((d) => ({ ...d, [key]: { ...d[key], ...p } }));
    const patchRule = (i: number, p: Partial<CfRule>) =>
        setDraft((d) => ({
            ...d,
            rules: d.rules.map((r, idx) => (idx === i ? { ...r, ...p } : r)),
        }));
    const removeRule = (i: number) =>
        setDraft((d) => ({
            ...d,
            rules: d.rules.filter((_, idx) => idx !== i),
        }));
    const addRule = () =>
        setDraft((d) => {
            const set = iconSetOf(d.iconSet) ?? defaultIconSet();
            return {
                ...d,
                rules: [
                    ...d.rules,
                    {
                        condition: 'is',
                        comparator: 'greaterThan',
                        value: 0,
                        valueType: 'number',
                        color: '#4c78d0',
                        icon: set.icons[0]?.id,
                    },
                ],
            };
        });
    const seedIconRules = (set: CFIconSet): CfRule[] => {
        const n = set.icons.length;
        return set.icons.map((ic, idx) => {
            const high = (100 * (n - idx)) / n;
            const low = (100 * (n - idx - 1)) / n;
            return {
                condition: 'is' as const,
                comparator:
                    idx === 0
                        ? ('greaterThan' as const)
                        : idx === n - 1
                          ? ('lessThanOrEqual' as const)
                          : ('between' as const),
                value: idx === 0 ? low : idx === n - 1 ? high : low,
                ...(idx === 0 || idx === n - 1 ? {} : { value2: high }),
                valueType: 'percentile' as const,
                color: '#4c78d0',
                icon: ic.id,
            };
        });
    };
    const changeIconSet = (id: string) =>
        setDraft((d) => {
            const set = iconSetOf(id) ?? defaultIconSet();
            return {
                ...d,
                iconSet: set.id,
                rules: d.rules.length ? bindRulesToSet(set, d.rules) : seedIconRules(set),
            };
        });
    const changeStyle = (style: ConditionalFormat['style']) =>
        setDraft((d) => {
            if (style !== 'icons') return { ...d, style };
            const set = iconSetOf(d.iconSet) ?? defaultIconSet();
            if (d.rules.length) return { ...d, style, iconSet: set.id };
            return { ...d, style, iconSet: set.id, rules: seedIconRules(set) };
        });

    const fields = (() => {
        const seen = new Set<string>();
        const out: { table: string; name: string; type: FieldType }[] = [];
        for (const t of tables) {
            for (const f of t.fields) {
                const key = `${t.name}::${f.name}`;
                if (seen.has(key)) continue;
                seen.add(key);
                out.push({ table: t.name, name: f.name, type: f.type });
            }
        }
        return out;
    })();
    const effectiveBasedOn = draft.basedOn || visual.values[0]?.name || '';
    const effectiveBasedOnTable =
        draft.basedOnTable ||
        (draft.basedOn
            ? fields.find((f) => f.name === draft.basedOn)?.table
            : visual.values[0]?.table);
    const basedOnType = fieldType(effectiveBasedOn, effectiveBasedOnTable);

    /** Table-qualified value so columns with the same name in different tables stay unique keys. */
    const qualified = (table: string, name: string) => `${table}::${name}`;
    const splitQualified = (v: string) => {
        const sep = v.indexOf('::');
        return sep === -1
            ? { table: '', name: v }
            : { table: v.slice(0, sep), name: v.slice(sep + 2) };
    };
    const basedOnKey = effectiveBasedOn
        ? qualified(effectiveBasedOnTable ?? '', effectiveBasedOn)
        : '';

    const colorColumns = (() => {
        const seen = new Set<string>();
        const out: { table: string; name: string; valid: boolean }[] = [];
        for (const t of tables) {
            for (const f of t.fields) {
                const key = `${t.name}::${f.name}`;
                if (seen.has(key)) continue;
                seen.add(key);
                let valid = true;
                let scanned = 0;
                for (const row of t.rows) {
                    const v = row[f.name];
                    if (v === null || v === undefined || v === '') continue;
                    scanned++;
                    if (typeof v !== 'string' || !isColor(v)) {
                        valid = false;
                        break;
                    }
                    if (scanned >= 50) break;
                }
                out.push({ table: t.name, name: f.name, valid });
            }
        }
        return out.filter((f) => f.valid);
    })();

    const fieldValueKey = draft.fieldValue
        ? qualified(
              draft.fieldValueTable ??
                  (colorColumns.find((f) => f.name === draft.fieldValue)
                      ?.table ?? ''),
              draft.fieldValue,
          )
        : '';

    const aggOptions: { value: CfAgg; label: string }[] =
        basedOnType === 'number'
            ? [
                  { value: 'sum', label: 'Somme' },
                  { value: 'average', label: 'Moyenne' },
                  { value: 'min', label: 'Min' },
                  { value: 'max', label: 'Max' },
                  { value: 'count', label: 'Nombre' },
              ]
            : [
                  { value: 'count', label: 'Nombre' },
                  { value: 'first', label: 'Première valeur' },
              ];
    const effectiveAgg = aggOptions.some((o) => o.value === draft.agg)
        ? draft.agg
        : aggOptions[0]!.value;

    const basedOnOptions = (() => {
        const seen = new Set<string>();
        const options: { value: string; label: string }[] = [];
        const push = (value: string, label: string) => {
            if (seen.has(value)) return;
            seen.add(value);
            options.push({ value, label });
        };
        if (visual.values[0]) {
            push(
                qualified(visual.values[0].table ?? '', visual.values[0].name),
                `${visual.values[0].name} (valeur)`,
            );
        }
        for (const f of fields)
            push(
                qualified(f.table, f.name),
                `${f.table} · ${f.name}`,
            );
        return options;
    })();
    const basedOnSelectValue = basedOnKey || basedOnOptions[0]?.value || '';

    /** ~7 sample values spanning the based-on field for the live preview. */
    const previewValues = (() => {
        if (!effectiveBasedOn) return [];
        const nums: number[] = [];
        for (const t of tables) {
            if (effectiveBasedOnTable && t.name !== effectiveBasedOnTable)
                continue;
            for (const row of t.rows) {
                const v = row[effectiveBasedOn];
                if (typeof v === 'number' && isFinite(v)) nums.push(v);
                else if (
                    typeof v === 'string' &&
                    v.trim() !== '' &&
                    isFinite(Number(v))
                )
                    nums.push(Number(v));
            }
        }
        if (!nums.length) return [];
        const min = Math.min(...nums);
        const max = Math.max(...nums);
        if (min === max) return [min];
        const out: number[] = [];
        for (let i = 0; i < 7; i++)
            out.push(min + ((max - min) * i) / 6);
        return out;
    })();

    const iconSet = iconSetOf(draft.iconSet) ?? defaultIconSet();

    const apply = () => {
        if (onCommit) onCommit(draft);
        else setConditionalFormat(visual.id, draft);
        onClose();
    };
    const reset = () => {
        if (onCommit) onCommit(undefined);
        else resetConditionalFormat(visual.id);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                <header className="flex items-center justify-between border-b border-border bg-panel px-5 py-3">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-semibold">
                            Mise en forme conditionnelle
                        </h2>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                                draft.style !== 'none'
                                    ? 'bg-brand/10 text-brand'
                                    : 'bg-accent text-muted-foreground',
                            )}
                        >
                            {STYLE_LABELS[draft.style]}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        aria-label="Fermer"
                    >
                        <X className="size-4" />
                    </button>
                </header>

                <div className="min-h-0 flex-1 space-y-5 overflow-auto p-5 text-[12px]">
                    <section>
                        <span className="mb-1.5 block text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                            Style de format
                        </span>
                        <StylePicker
                            value={draft.style}
                            options={
                                hideFieldValue
                                    ? STYLE_OPTIONS.filter(
                                          (o) => o.value !== 'fieldValue',
                                      )
                                    : STYLE_OPTIONS
                            }
                            onChange={(v) =>
                                changeStyle(v as ConditionalFormat['style'])
                            }
                        />
                    </section>

                    {draft.style !== 'none' && (
                        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Select
                                label="Sur quel champ nous baser ?"
                                value={basedOnSelectValue}
                                options={basedOnOptions}
                                onChange={(v) => {
                                    const { table, name } =
                                        splitQualified(v);
                                    patch({
                                        basedOn: name,
                                        basedOnTable: table || undefined,
                                    });
                                }}
                            />
                            <Select
                                label="Agrégation"
                                value={effectiveAgg}
                                options={aggOptions}
                                onChange={(v) =>
                                    patch({ agg: v as CfAgg })
                                }
                            />
                        </section>
                    )}

                    {draft.style === 'gradient' && (
                        <section className="space-y-3">
                            <Toggle
                                label="Divergente (échelle 3 couleurs)"
                                checked={draft.diverging}
                                onChange={(v) => patch({ diverging: v })}
                            />
                            <div className="space-y-3 rounded-lg border border-border bg-panel p-3">
                                <BoundEditor
                                    label="Minimum"
                                    bound={draft.min}
                                    allowNone={false}
                                    onChange={(p) => patchBound('min', p)}
                                />
                                <BoundEditor
                                    label="Maximum"
                                    bound={draft.max}
                                    allowNone={false}
                                    onChange={(p) => patchBound('max', p)}
                                />
                                {draft.diverging && (
                                    <BoundEditor
                                        label="Centre"
                                        bound={draft.center}
                                        allowNone
                                        onChange={(p) =>
                                            patchBound('center', p)
                                        }
                                    />
                                )}
                            </div>
                        </section>
                    )}

                    {draft.style === 'icons' && (
                        <section className="space-y-3">
                            <div>
                                <span className="mb-1 block text-[11px] text-muted-foreground">
                                    Jeu d'icônes
                                </span>
                                <IconSetPicker
                                    value={iconSet.id}
                                    onChange={changeIconSet}
                                />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Les icônes sont attribuées par règle. Les
                                règles non configurées utilisent la première
                                icône du jeu.
                            </p>
                        </section>
                    )}

                    {(draft.style === 'rules' ||
                        draft.style === 'icons') && (
                        <section className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                                    Règles
                                </span>
                                <button
                                    type="button"
                                    onClick={addRule}
                                    className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium transition-colors hover:bg-accent"
                                >
                                    <Plus className="size-3.5" /> Nouvelle règle
                                </button>
                            </div>
                            {draft.rules.map((rule, i) => (
                                <RuleCard
                                    key={i}
                                    index={i}
                                    rule={rule}
                                    set={
                                        draft.style === 'icons'
                                            ? iconSet
                                            : undefined
                                    }
                                    iconMode={draft.style === 'icons'}
                                    onPatch={(p) => patchRule(i, p)}
                                    onRemove={() => removeRule(i)}
                                />
                            ))}
                        </section>
                    )}

                    {draft.style === 'fieldValue' && (
                        <section className="space-y-2">
                            <Select
                                label="Quel champ utiliser ?"
                                value={fieldValueKey}
                                options={colorColumns.map((f) => ({
                                    value: qualified(f.table, f.name),
                                    label: `${f.table} · ${f.name}`,
                                }))}
                                onChange={(v) => {
                                    const { table, name } =
                                        splitQualified(v);
                                    patch({
                                        fieldValue: name,
                                        fieldValueTable: table || undefined,
                                    });
                                }}
                            />
                            {!colorColumns.length && (
                                <p className="text-[11px] text-muted-foreground">
                                    Aucune colonne ne contient de valeurs de
                                    couleur valides (codes hex) dans le jeu de
                                    données actuel.
                                </p>
                            )}
                        </section>
                    )}

                    {['table', 'matrix'].includes(visual.type) && (
                        <Toggle
                            label="Afficher les barres de données"
                            checked={draft.showDataBars}
                            onChange={(v) => patch({ showDataBars: v })}
                        />
                    )}

                    {draft.style !== 'none' &&
                        previewValues.length > 0 && (
                            <PreviewStrip
                                cf={draft}
                                values={previewValues}
                                basedOnLabel={
                                    effectiveBasedOn
                                        ? `${effectiveBasedOnTable ? `${effectiveBasedOnTable} · ` : ''}${effectiveBasedOn}`
                                        : 'basé sur…'
                                }
                            />
                        )}
                </div>

                <footer className="flex items-center justify-between gap-2 border-t border-border bg-panel px-5 py-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={reset}
                    >
                        Réinitialiser par défaut
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                        >
                            Annuler
                        </Button>
                        <Button type="button" size="sm" onClick={apply}>
                            OK
                        </Button>
                    </div>
                </footer>
            </div>
        </div>
    );
}

const STYLE_LABELS: Record<ConditionalFormat['style'], string> = {
    none: 'Aucun',
    gradient: 'Dégradé',
    rules: 'Règles',
    icons: 'Icônes',
    fieldValue: 'Valeur de champ',
};

/**
 * The shared "fx" button that opens the conditional-formatting dialog.
 * Used from every visual's Format tab (charts, tables/matrices and the
 * single-value callout alike).
 */
export function ConditionalFormatControl({
    visual,
    label = 'Mise en forme conditionnelle (fx)',
    value,
    onCommit,
    hideFieldValue,
}: {
    visual: Visual;
    label?: string;
    /** Per-target source value (e.g. a gauge fx target). */
    value?: ConditionalFormat;
    /** Per-target commit (e.g. write to a gauge fx target). */
    onCommit?: (cf: ConditionalFormat | undefined) => void;
    /** Hide the "Field value" style (inert for single-value targets). */
    hideFieldValue?: boolean;
}) {
    const [open, setOpen] = useState(false);
    let cf = normalizeConditionalFormat(value ?? visual.conditionalFormat);
    if (hideFieldValue && cf.style === 'fieldValue')
        cf = { ...cf, style: 'none' };
    const active = cf.style !== 'none';
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                    'flex w-full items-center justify-between rounded border px-2 py-1.5 text-[11px]',
                    active
                        ? 'border-brand/40 bg-brand/10 font-medium text-brand'
                        : 'border-border bg-background hover:bg-accent',
                )}
            >
                <span>{label}</span>
                <span className="flex items-center gap-1">
                    {active && <SlidersHorizontal className="size-3" />}
                    {STYLE_LABELS[cf.style]}
                </span>
            </button>
            <ConditionalFormatDialog
                open={open}
                visual={visual}
                value={value}
                onCommit={onCommit}
                onClose={() => setOpen(false)}
                hideFieldValue={hideFieldValue}
            />
        </>
    );
}
