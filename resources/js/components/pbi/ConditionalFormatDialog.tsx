import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { isColor } from '@/lib/pbi/conditionalFormat';
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
import { ColorInput } from './formatControls';

const STYLE_OPTIONS: { value: ConditionalFormat['style']; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'gradient', label: 'Gradient' },
    { value: 'rules', label: 'Rules' },
    { value: 'fieldValue', label: 'Field value' },
];

const BOUND_LABELS: Record<CfBoundType, string> = {
    none: 'None',
    lowest: 'Lowest value',
    highest: 'Highest value',
    number: 'Number',
    percent: 'Percent',
    percentile: 'Percentile',
};

const COMPARATOR_LABELS: Record<CfComparator, string> = {
    between: 'between',
    greaterThan: 'greater than',
    lessThan: 'less than',
    greaterThanOrEqual: 'greater than or equal to',
    lessThanOrEqual: 'less than or equal to',
};

const CONDITION_LABELS: Record<CfRuleCondition, string> = {
    is: 'is',
    isBlank: 'is blank',
    isNotBlank: 'is not blank',
};

const VALUE_TYPE_LABELS: Record<CfValueType, string> = {
    number: 'Number',
    percent: 'Percent',
    percentile: 'Percentile',
};

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
                <span className="mb-1 block text-muted-foreground">{label}</span>
            )}
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(
                    'w-full rounded border border-border bg-background px-2 py-1',
                    className,
                )}
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
                <span className="mb-1 block text-muted-foreground">{label}</span>
            )}
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={cn(
                    'w-full rounded border border-border bg-background px-2 py-1',
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
        <div className="grid grid-cols-[1fr_auto] gap-2">
            <Select
                label={label}
                value={bound.type}
                options={types.map((t) => ({ value: t, label: BOUND_LABELS[t] }))}
                onChange={(v) => onChange({ type: v as CfBoundType })}
            />
            <div className="w-12">
                <span className="mb-1 block text-muted-foreground">&nbsp;</span>
                <ColorInput
                    value={bound.color}
                    onChange={(v) => onChange({ color: v })}
                />
            </div>
            {['number', 'percent', 'percentile'].includes(bound.type) && (
                <div className="col-span-2">
                    <NumberInput
                        label="Value"
                        value={bound.value ?? 0}
                        onChange={(v) => onChange({ value: v })}
                    />
                </div>
            )}
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
        setDraft((d) => ({
            ...d,
            rules: [
                ...d.rules,
                {
                    condition: 'is',
                    comparator: 'greaterThan',
                    value: 0,
                    valueType: 'number',
                    color: '#4c78d0',
                },
            ],
        }));

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
                  { value: 'sum', label: 'Sum' },
                  { value: 'average', label: 'Average' },
                  { value: 'min', label: 'Min' },
                  { value: 'max', label: 'Max' },
                  { value: 'count', label: 'Count' },
              ]
            : [
                  { value: 'count', label: 'Count' },
                  { value: 'first', label: 'First value' },
              ];
    const effectiveAgg = aggOptions.some((o) => o.value === draft.agg)
        ? draft.agg
        : aggOptions[0]!.value;

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
            <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border bg-panel px-4 py-2">
                    <h2 className="text-sm font-semibold">
                        Conditional formatting
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        ×
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4 text-[11px]">
                    <Select
                        label="Format style"
                        value={draft.style}
                        options={
                            hideFieldValue
                                ? STYLE_OPTIONS.filter(
                                      (o) => o.value !== 'fieldValue',
                                  )
                                : STYLE_OPTIONS
                        }
                        onChange={(v) =>
                            patch({
                                style: v as ConditionalFormat['style'],
                            })
                        }
                    />

                    {draft.style !== 'none' && (
                        <div className="grid grid-cols-2 gap-2">
                            <Select
                                label="What field should we base this on?"
                                value={basedOnKey}
                                options={(() => {
                                    const seen = new Set<string>();
                                    const options: {
                                        value: string;
                                        label: string;
                                    }[] = [];
                                    const push = (value: string, label: string) => {
                                        if (seen.has(value)) return;
                                        seen.add(value);
                                        options.push({ value, label });
                                    };
                                    if (visual.values[0]) {
                                        push(
                                            qualified(
                                                visual.values[0].table ?? '',
                                                visual.values[0].name,
                                            ),
                                            `${visual.values[0].name} (value)`,
                                        );
                                    }
                                    for (const f of fields)
                                        push(
                                            qualified(f.table, f.name),
                                            `${f.table} · ${f.name}`,
                                        );
                                    return options;
                                })()}
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
                                label="Summarization"
                                value={effectiveAgg}
                                options={aggOptions}
                                onChange={(v) =>
                                    patch({ agg: v as CfAgg })
                                }
                            />
                        </div>
                    )}

                    {draft.style === 'gradient' && (
                        <>
                            <Toggle
                                label="Diverging (3-color scale)"
                                checked={draft.diverging}
                                onChange={(v) => patch({ diverging: v })}
                            />
                            <div className="space-y-3 rounded border border-border p-2">
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
                                        label="Center"
                                        bound={draft.center}
                                        allowNone
                                        onChange={(p) =>
                                            patchBound('center', p)
                                        }
                                    />
                                )}
                            </div>
                        </>
                    )}

                    {draft.style === 'rules' && (
                        <div className="space-y-2">
                            {draft.rules.map((rule, i) => (
                                <div
                                    key={i}
                                    className="space-y-2 rounded border border-border p-2"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="w-24">
                                            <Select
                                                value={rule.condition}
                                                options={CF_RULE_CONDITIONS.map(
                                                    (c) => ({
                                                        value: c,
                                                        label: CONDITION_LABELS[
                                                            c
                                                        ],
                                                    }),
                                                )}
                                                onChange={(v) =>
                                                    patchRule(i, {
                                                        condition:
                                                            v as CfRuleCondition,
                                                    })
                                                }
                                            />
                                        </div>
                                        {rule.condition === 'is' && (
                                            <>
                                                <div className="w-40">
                                                    <Select
                                                        value={rule.comparator}
                                                        options={CF_COMPARATORS.map(
                                                            (c) => ({
                                                                value: c,
                                                                label: COMPARATOR_LABELS[
                                                                    c
                                                                ],
                                                            }),
                                                        )}
                                                        onChange={(v) =>
                                                            patchRule(i, {
                                                                comparator:
                                                                    v as CfComparator,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div className="w-20">
                                                    <NumberInput
                                                        value={rule.value}
                                                        onChange={(v) =>
                                                            patchRule(i, {
                                                                value: v,
                                                            })
                                                        }
                                                    />
                                                </div>
                                                {rule.comparator ===
                                                    'between' && (
                                                    <div className="w-20">
                                                        <NumberInput
                                                            value={
                                                                rule.value2 ??
                                                                rule.value
                                                            }
                                                            onChange={(v) =>
                                                                patchRule(i, {
                                                                    value2: v,
                                                                })
                                                            }
                                                        />
                                                    </div>
                                                )}
                                                <div className="w-24">
                                                    <Select
                                                        value={rule.valueType}
                                                        options={CF_VALUE_TYPES.map(
                                                            (t) => ({
                                                                value: t,
                                                                label: VALUE_TYPE_LABELS[
                                                                    t
                                                                ],
                                                            }),
                                                        )}
                                                        onChange={(v) =>
                                                            patchRule(i, {
                                                                valueType:
                                                                    v as CfValueType,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </>
                                        )}
                                        <div className="w-12">
                                            <ColorInput
                                                value={rule.color}
                                                onChange={(v) =>
                                                    patchRule(i, { color: v })
                                                }
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeRule(i)}
                                            className="rounded p-1 text-muted-foreground hover:text-destructive"
                                            aria-label="Delete rule"
                                        >
                                            <Trash2 className="size-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addRule}
                                className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 hover:bg-accent"
                            >
                                <Plus className="size-3" /> New rule
                            </button>
                        </div>
                    )}

                    {draft.style === 'fieldValue' && (
                        <>
                            <Select
                                label="What field should we use?"
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
                                <p className="text-muted-foreground">
                                    No columns contain valid color values (hex
                                    codes) in the current dataset.
                                </p>
                            )}
                        </>
                    )}

                    {['table', 'matrix'].includes(visual.type) && (
                        <Toggle
                            label="Show data bars"
                            checked={draft.showDataBars}
                            onChange={(v) => patch({ showDataBars: v })}
                        />
                    )}
                </div>

                <div className="flex items-center justify-between border-t border-border bg-panel px-4 py-2">
                    <button
                        type="button"
                        onClick={reset}
                        className="rounded border border-border bg-background px-3 py-1 hover:bg-accent"
                    >
                        Reset to default
                    </button>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded border border-border bg-background px-3 py-1 hover:bg-accent"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={apply}
                            className="rounded bg-brand px-3 py-1 text-white hover:opacity-90"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const STYLE_LABELS: Record<ConditionalFormat['style'], string> = {
    none: 'None',
    gradient: 'Gradient',
    rules: 'Rules',
    fieldValue: 'Field value',
};

/**
 * The shared "fx" button that opens the conditional-formatting dialog.
 * Used from every visual's Format tab (charts, tables/matrices and the
 * single-value callout alike).
 */
export function ConditionalFormatControl({
    visual,
    label = 'Conditional formatting (fx)',
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
