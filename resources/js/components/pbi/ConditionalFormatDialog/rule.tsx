import { Trash2 } from 'lucide-react';
import { ColorInput } from '@/components/pbi/formatControls';
import { IconPicker } from '@/components/pbi/IconPicker';
import type { CFIconSet } from '@/lib/pbi/icons';
import {
    CF_COMPARATORS,
    CF_RULE_CONDITIONS,
    CF_VALUE_TYPES,
    type CfComparator,
    type CfRule,
    type CfRuleCondition,
    type CfValueType,
} from '@/lib/pbi/model';
import {
    COMPARATOR_LABELS,
    CONDITION_LABELS,
    VALUE_TYPE_LABELS,
} from './constants';
import { NumberInput, Select } from './controls';

/** One conditional-formatting rule row (color or icon flavor). */
export function RuleCard({
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