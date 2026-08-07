import type {
    CfBoundType,
    CfComparator,
    CfRuleCondition,
    CfValueType,
    ConditionalFormat,
} from '@/lib/pbi/model';

export const STYLE_OPTIONS: {
    value: ConditionalFormat['style'];
    label: string;
}[] = [
    { value: 'none', label: 'Aucun' },
    { value: 'gradient', label: 'Dégradé' },
    { value: 'rules', label: 'Règles' },
    { value: 'icons', label: 'Icônes' },
    { value: 'fieldValue', label: 'Valeur de champ' },
];

export const STYLE_LABELS: Record<ConditionalFormat['style'], string> = {
    none: 'Aucun',
    gradient: 'Dégradé',
    rules: 'Règles',
    icons: 'Icônes',
    fieldValue: 'Valeur de champ',
};

export const BOUND_LABELS: Record<CfBoundType, string> = {
    none: 'Aucun',
    lowest: 'Valeur la plus basse',
    highest: 'Valeur la plus haute',
    number: 'Nombre',
    percent: 'Pourcentage',
    percentile: 'Centile',
};

export const COMPARATOR_LABELS: Record<CfComparator, string> = {
    between: 'entre',
    greaterThan: 'supérieur à',
    lessThan: 'inférieur à',
    greaterThanOrEqual: 'supérieur ou égal à',
    lessThanOrEqual: 'inférieur ou égal à',
};

export const CONDITION_LABELS: Record<CfRuleCondition, string> = {
    is: 'est',
    isBlank: 'est vide',
    isNotBlank: "n'est pas vide",
};

export const VALUE_TYPE_LABELS: Record<CfValueType, string> = {
    number: 'Nombre',
    percent: 'Pourcentage',
    percentile: 'Centile',
};