// Field reference parsing/normalization, labels, number/date formatting and
// the single-value / style normalizer helpers.

import {
    AGGREGATIONS,
    CF_AGGS,
    CF_BOUND_TYPES,
    CF_COMPARATORS,
    CF_RULE_CONDITIONS,
    CF_STYLES,
    CF_VALUE_TYPES,
    CURRENCY_SYMBOL,
    DATA_LABEL_CONTENTS,
    DATA_LABEL_POSITIONS,
    DECIMALS,
    GRIDLINE_STYLES,
    isDisplayUnit,
    isNumberFormat,
    isValueAggregationMode,
    LEGEND_POSITIONS,
    TITLE_HEADING_SIZES,
} from './consts';
import { fieldType, findTableForField, isMeasure, TABLES } from './state';
import type {
    Agg,
    AxisStyle,
    AxisDef,
    AxisPosition,
    BarStyle,
    CalloutStyle,
    CategoryLabelStyle,
    CfBound,
    CfBoundType,
    CfComparator,
    CfRule,
    CfRuleCondition,
    CfStyle,
    CfAgg,
    CfValueType,
    ClockDateFormat,
    ClockStyle,
    ConditionalFormat,
    DataLabelContent,
    DataLabelPosition,
    DataLabelStyle,
    DataLabelSeriesOverride,
    DisplayUnit,
    FieldReference,
    FieldType,
    FontStyle,
    FxFormat,
    FxOp,
    FxRule,
    GaugeBoundStyle,
    GaugeDataLabelsStyle,
    GaugeLabelStyle,
    GaugeStyle,
    GaugeValueStyle,
    GridlineStyle,
    GridlinesStyle,
    LegendPosition,
    LegendStyle,
    NumberFormat,
    PlotAreaStyle,
    TableNumberStyle,
    TitleStyle,
    ValueAggregationMode,
    ValueFormat,
    Visual,
    WellField,
} from './types';

/** Coerces an arbitrary value to a positive integer, or `undefined`. */
function positiveInt(value: unknown): number | undefined {
    if (typeof value !== 'number' && typeof value !== 'string')
        return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) return undefined;
    const int = Math.floor(n);
    return int >= 1 ? int : undefined;
}

/** Converts drag metadata and legacy persisted values into a physical field reference. */
export function parseFieldReference(
    input: unknown,
    fallbackTable?: string,
): FieldReference | null {
    if (typeof input === 'string') {
        const value = input.trim();
        if (!value) return null;
        try {
            const parsed: unknown = JSON.parse(value);
            if (parsed && typeof parsed === 'object')
                return parseFieldReference(parsed, fallbackTable);
        } catch {
            // A normal column name is not JSON and is valid as-is. Values
            // that look like serialized metadata but are malformed are not.
            if (value.startsWith('{') || value.startsWith('[')) return null;
        }
        return { name: value, table: fallbackTable || undefined };
    }

    if (!input || typeof input !== 'object') return null;
    const value = input as Record<string, unknown>;
    const name = parseFieldReference(value.name, fallbackTable);
    if (!name) return null;
    const table =
        typeof value.table === 'string' && value.table.trim()
            ? value.table.trim()
            : name.table || fallbackTable;
    return { name: name.name, table: table || undefined };
}

export function normalizeWellField(
    input: unknown,
    fallbackTable?: string,
): WellField | null {
    if (!input || typeof input !== 'object') {
        const reference = parseFieldReference(input, fallbackTable);
        return reference
            ? { table: reference.table ?? '', name: reference.name, agg: 'sum' }
            : null;
    }

    const value = input as Record<string, unknown>;
    const reference = parseFieldReference(
        value.name,
        typeof value.table === 'string' ? value.table : fallbackTable,
    );
    if (!reference) return null;
    const agg = AGGREGATIONS.includes(value.agg as Agg)
        ? (value.agg as Agg)
        : 'sum';
    const label =
        typeof value.label === 'string' && value.label.trim()
            ? value.label.trim()
            : undefined;
    const format = isNumberFormat(value.format) ? value.format : undefined;
    const valueAggregation = isValueAggregationMode(value.valueAggregation)
        ? value.valueAggregation
        : undefined;
    const listAgg = AGGREGATIONS.includes(value.listAgg as Agg)
        ? (value.listAgg as Agg)
        : undefined;
    const index = positiveInt(value.index);
    const window = positiveInt(value.window);
    const windowDir =
        value.windowDir === 'first' || value.windowDir === 'last'
            ? value.windowDir
            : undefined;
    const rank = value.rank === true ? true : undefined;
    const running = value.running === true ? true : undefined;
    const detail = value.detail === true ? true : undefined;
    const axisId = typeof value.axisId === 'string' ? value.axisId : undefined;
    const seriesType =
        value.seriesType === 'bar' ||
        value.seriesType === 'line' ||
        value.seriesType === 'area'
            ? value.seriesType
            : undefined;
    return {
        table: reference.table ?? '',
        name: reference.name,
        agg,
        ...(label ? { label } : {}),
        ...(format ? { format } : {}),
        ...(valueAggregation ? { valueAggregation } : {}),
        ...(listAgg ? { listAgg } : {}),
        ...(index !== undefined ? { index } : {}),
        ...(window !== undefined ? { window } : {}),
        ...(windowDir ? { windowDir } : {}),
        ...(rank ? { rank } : {}),
        ...(running ? { running } : {}),
        ...(detail ? { detail } : {}),
        ...(axisId ? { axisId } : {}),
        ...(seriesType ? { seriesType } : {}),
    };
}

export function fieldLabel(wf: Pick<WellField, 'name' | 'label'>): string {
    return wf.label?.trim() || wf.name;
}

/** Builds a `WellField` (usable by `aggregate`) from a field reference. */
export function wellForReference(
    ref: { name: string; table?: string } | null | undefined,
    agg: Agg = 'sum',
): WellField | null {
    if (!ref || !ref.name) return null;
    const table = ref.table || findTableForField(ref.name);
    return { table, name: ref.name, agg };
}

/** Auto/custom number formatting normalizer. */
export function normalizeValueFormat(input: unknown): ValueFormat {
    if (!input || typeof input !== 'object') return { auto: true };
    const value = input as Record<string, unknown>;
    return {
        auto: typeof value.auto === 'boolean' ? value.auto : true,
        format:
            typeof value.format === 'string' && value.format.trim()
                ? value.format.trim()
                : undefined,
    };
}

/**
 * Returns a human-readable reason a field cannot be resolved against the
 * loaded dataset, or `null` when it is fine. Used to surface "incorrect
 * field assignment" warnings (badge + tooltip) in the wells UI.
 */
export function fieldIssue(f: WellField): string | null {
    if (isMeasure(f.name)) return null;
    if (f.table && !TABLES.some((t) => t.name === f.table)) {
        return `Table « ${f.table} » introuvable dans le jeu de données.`;
    }
    if (TABLES.length) {
        const found = TABLES.some((t) =>
            t.fields.some((x) => x.name === f.name),
        );
        if (!found) {
            return `Colonne « ${f.name} » introuvable dans les données chargées.`;
        }
    }
    return null;
}

/** Returns a reason when a field is text but used where a number is expected. */
export function fieldNumericIssue(f: WellField): string | null {
    if (isMeasure(f.name)) return null;
    if (fieldType(f.name, f.table) === 'number') return null;
    return `« ${fieldLabel(f)} » est un champ texte.`;
}

/** The fully-default (disabled) conditional format. */
export function defaultConditionalFormat(): ConditionalFormat {
    return {
        style: 'none',
        basedOn: '',
        agg: 'none',
        diverging: false,
        min: { type: 'lowest', color: '#e11d48' },
        max: { type: 'highest', color: '#16a34a' },
        center: { type: 'none', color: '#f59e0b' },
        rules: [],
        fieldValue: '',
        iconSet: '',
        showDataBars: false,
    };
}

function normalizeCfBound(
    input: unknown,
    fallback: CfBound,
    allowNone: boolean,
): CfBound {
    if (!input || typeof input !== 'object') return { ...fallback };
    const value = input as Record<string, unknown>;
    const types: CfBoundType[] = allowNone
        ? CF_BOUND_TYPES
        : CF_BOUND_TYPES.filter((t) => t !== 'none');
    return {
        type: types.includes(value.type as CfBoundType)
            ? (value.type as CfBoundType)
            : fallback.type,
        ...(typeof value.value === 'number' && isFinite(value.value)
            ? { value: value.value }
            : {}),
        color:
            typeof value.color === 'string' && value.color.trim()
                ? value.color.trim()
                : fallback.color,
    };
}

/**
 * Accepts a legacy boolean, the old `{mode, minColor, midColor, maxColor}`
 * table config, or a full `ConditionalFormat`; returns a normalized config.
 */
export function normalizeConditionalFormat(input: unknown): ConditionalFormat {
    const out = defaultConditionalFormat();
    if (input === true) {
        out.showDataBars = true;
        return out;
    }
    if (!input || typeof input !== 'object') return out;
    const value = input as Record<string, unknown>;
    if (value.mode === 'databars') out.showDataBars = true;
    if (value.mode === 'colorScale') {
        out.style = 'gradient';
        out.min.color =
            typeof value.minColor === 'string' ? value.minColor : out.min.color;
        out.max.color =
            typeof value.maxColor === 'string' ? value.maxColor : out.max.color;
    }
    if (CF_STYLES.includes(value.style as CfStyle))
        out.style = value.style as CfStyle;
    if (typeof value.basedOn === 'string') out.basedOn = value.basedOn;
    if (typeof value.basedOnTable === 'string')
        out.basedOnTable = value.basedOnTable;
    if (CF_AGGS.includes(value.agg as CfAgg)) out.agg = value.agg as CfAgg;
    if (typeof value.diverging === 'boolean') out.diverging = value.diverging;
    if (value.min) out.min = normalizeCfBound(value.min, out.min, false);
    if (value.max) out.max = normalizeCfBound(value.max, out.max, false);
    if (value.center)
        out.center = normalizeCfBound(value.center, out.center, true);
    if (Array.isArray(value.rules)) {
        out.rules = value.rules
            .filter(
                (r): r is Record<string, unknown> =>
                    !!r && typeof r === 'object',
            )
            .map((r): CfRule | null => {
                const c = r as Record<string, unknown>;
                if (
                    !CF_RULE_CONDITIONS.includes(c.condition as CfRuleCondition)
                )
                    return null;
                const comparator = CF_COMPARATORS.includes(
                    c.comparator as CfComparator,
                )
                    ? (c.comparator as CfComparator)
                    : 'greaterThan';
                return {
                    condition: c.condition as CfRuleCondition,
                    comparator,
                    value:
                        typeof c.value === 'number' && isFinite(c.value)
                            ? c.value
                            : 0,
                    ...(typeof c.value2 === 'number' && isFinite(c.value2)
                        ? { value2: c.value2 }
                        : {}),
                    valueType: CF_VALUE_TYPES.includes(
                        c.valueType as CfValueType,
                    )
                        ? (c.valueType as CfValueType)
                        : 'number',
                    color:
                        typeof c.color === 'string' && c.color.trim()
                            ? c.color.trim()
                            : '#4c78d0',
                    ...(typeof c.icon === 'string' && c.icon.trim()
                        ? { icon: c.icon.trim() }
                        : {}),
                };
            })
            .filter((r): r is CfRule => r !== null);
    }
    if (typeof value.fieldValue === 'string') out.fieldValue = value.fieldValue;
    if (typeof value.fieldValueTable === 'string')
        out.fieldValueTable = value.fieldValueTable;
    if (typeof value.iconSet === 'string' && value.iconSet.trim())
        out.iconSet = value.iconSet.trim();
    if (typeof value.showDataBars === 'boolean')
        out.showDataBars = value.showDataBars;
    return out;
}

/**
 * Migrates a legacy single-value `callout.fx` rule set into a `rules`
 * conditional format, or `null` when there is nothing to migrate.
 */
export function conditionalFormatFromFx(
    fx: FxFormat | undefined,
): ConditionalFormat | null {
    if (!fx?.enabled || !Array.isArray(fx.rules) || !fx.rules.length)
        return null;
    const cmp = (op: FxOp): CfComparator =>
        op === '>'
            ? 'greaterThan'
            : op === '>='
              ? 'greaterThanOrEqual'
              : op === '<'
                ? 'lessThan'
                : op === '<='
                  ? 'lessThanOrEqual'
                  : 'between';
    const out = defaultConditionalFormat();
    out.style = 'rules';
    out.rules = fx.rules
        .filter((r) => r.op !== '!=')
        .map((r) => ({
            condition: 'is' as const,
            comparator: cmp(r.op),
            value: r.value,
            ...(r.op === '=' ? { value2: r.value } : {}),
            valueType: 'number' as const,
            color: r.color,
        }));
    return out;
}

function windowSuffix(wf: WellField): string {
    if (!wf.window || !Number.isFinite(wf.window) || wf.window <= 0) return '';
    const n = Math.floor(wf.window);
    const dir = wf.windowDir === 'first' ? 'premiers' : 'derniers';
    return ` (${dir} ${n} lignes)`;
}

function nthLabel(wf: WellField): string {
    return `Valeur N°${wf.index ?? 1} de ${fieldLabel(wf)}${windowSuffix(wf)}`;
}

export function measureLabel(wf: WellField) {
    if (isMeasure(wf.name)) return wf.name;
    if (wf.label?.trim()) return wf.label.trim();
    if (fieldType(wf.name, wf.table) === 'number') {
        if (wf.agg === 'raw') return fieldLabel(wf) + windowSuffix(wf);
        if (wf.agg === 'nth') return nthLabel(wf);
        const p =
            wf.agg === 'sum'
                ? 'Somme de'
                : wf.agg === 'avg'
                  ? 'Moyenne de'
                  : wf.agg === 'count'
                    ? 'Nombre de'
                    : wf.agg === 'distinct'
                      ? 'Nombre distinct de'
                      : wf.agg === 'first'
                        ? 'Premier de'
                        : wf.agg === 'latest'
                          ? 'Dernier de'
                          : wf.agg === 'min'
                            ? 'Min de'
                            : 'Max de';
        return `${p} ${fieldLabel(wf)}${windowSuffix(wf)}`;
    }
    return `Nombre de ${fieldLabel(wf)}${windowSuffix(wf)}`;
}

export function singleValueLabel(
    wf: WellField,
    type: FieldType,
    mode?: ValueAggregationMode,
): string {
    if (isMeasure(wf.name)) return wf.name;
    const aggregation = mode ?? wf.valueAggregation;
    if (aggregation === 'nth' && type !== 'number') return nthLabel(wf);
    if (type === 'number' || aggregation === 'count') return measureLabel(wf);
    if (aggregation === 'first')
        return `Premier de ${fieldLabel(wf)}${windowSuffix(wf)}`;
    if (aggregation === 'latest')
        return `Dernier de ${fieldLabel(wf)}${windowSuffix(wf)}`;
    return fieldLabel(wf);
}

export function formatNumber(n: number, compact = true) {
    if (!isFinite(n)) return '—';
    if (Math.abs(n) < 1 && n !== 0) return `${(n * 100).toFixed(1)}%`;
    if (!compact)
        return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/**
 * Formats a number with an explicit presentation format. `auto` keeps the
 * existing heuristic behavior (percent when |n| < 1, compact otherwise).
 */
export function formatNumberWith(n: number, code: NumberFormat): string {
    if (!isFinite(n)) return '—';
    switch (code) {
        case 'percent':
            return `${(n * 100).toFixed(1)}%`;
        case 'currency':
            return `${CURRENCY_SYMBOL}${n.toLocaleString('en-US', {
                maximumFractionDigits: 0,
            })}`;
        case 'compact': {
            const abs = Math.abs(n);
            if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
            if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
            return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
        case 'int':
        case '1dec':
        case '2dec':
            return n.toLocaleString('en-US', {
                minimumFractionDigits: DECIMALS[code] ?? 0,
                maximumFractionDigits: DECIMALS[code] ?? 0,
            });
        default:
            return formatNumber(n);
    }
}

/**
 * Formats a number with a Power BI-style custom format string (a pragmatic
 * subset of Excel syntax). Supports `0`/`#` digit placeholders, thousands
 * separators, decimal places, `%` scaling, literal prefix/suffix (quoted or
 * plain) and `;` positive/negative sections.
 */
export function formatNumberPattern(n: number, pattern: string): string {
    if (!isFinite(n)) return '—';
    const sections = pattern.split(';');
    const neg = sections[1] !== undefined ? sections[1]! : null;
    const section = n < 0 && neg !== null ? neg : (sections[0] ?? '');
    const negative = n < 0 && neg === null;
    const abs = Math.abs(n);

    let percent = false;
    let thousands = false;
    let decimals = 0;
    let scaling = 0;
    let intBlock = '';
    let fracBlock = '';
    let prefix = '';
    let suffix = '';
    let readingFrac = false;

    for (let i = 0; i < section.length; i++) {
        const ch = section[i]!;
        if (ch === '"') {
            const end = section.indexOf('"', i + 1);
            const lit =
                end === -1 ? section.slice(i + 1) : section.slice(i + 1, end);
            if (intBlock || readingFrac) suffix += lit;
            else prefix += lit;
            if (end === -1) break;
            i = end;
            continue;
        }
        if (ch === '\\') {
            const lit = section[i + 1] ?? '';
            if (intBlock || readingFrac) suffix += lit;
            else prefix += lit;
            i += 1;
            continue;
        }
        if (ch === '0' || ch === '#' || ch === '?') {
            if (readingFrac) {
                fracBlock += ch;
                decimals += 1;
            } else {
                intBlock += ch;
            }
            continue;
        }
        if (ch === '.') {
            readingFrac = true;
            continue;
        }
        if (ch === ',') {
            if (!readingFrac && intBlock) thousands = true;
            else if (!intBlock && !fracBlock) prefix += ch;
            else scaling += 1;
            continue;
        }
        if (ch === '%') {
            percent = true;
            continue;
        }
        if (intBlock || readingFrac) suffix += ch;
        else prefix += ch;
    }

    if (!intBlock && !fracBlock)
        return `${negative ? '-' : ''}${prefix}${suffix}`;

    let v = abs;
    if (percent) v *= 100;
    while (scaling > 0) {
        v /= 1000;
        scaling -= 1;
    }

    const factor = 10 ** decimals;
    const rounded = Math.round(v * factor) / factor;
    const [intRaw, fracRaw = ''] = rounded.toFixed(decimals).split('.');
    let intPart = intRaw;
    const minInt = (intBlock.match(/0/g) ?? []).length;
    if (intPart.length < minInt) intPart = intPart.padStart(minInt, '0');
    if (thousands) intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fracOut = decimals > 0 ? `.${fracRaw}` : '';
    return `${negative ? '-' : ''}${prefix}${intPart}${fracOut}${
        percent ? '%' : ''
    }${suffix}`;
}

/** Resolves the effective format for a field, then formats the number. */
export function formatWellValue(
    n: number,
    wf: Pick<WellField, 'format'> | undefined,
    visualDefault: NumberFormat = 'auto',
): string {
    const code = wf?.format && wf.format !== 'auto' ? wf.format : visualDefault;
    return formatNumberWith(n, code);
}

/* ------------------------- Single-value callout ------------------------- */

/** First matching rule's color wins; `undefined` when none match. */
export function applyFx(rules: FxRule[], value: number): string | undefined {
    for (const rule of rules) {
        const match =
            rule.op === '>'
                ? value > rule.value
                : rule.op === '>='
                  ? value >= rule.value
                  : rule.op === '<'
                    ? value < rule.value
                    : rule.op === '<='
                      ? value <= rule.value
                      : rule.op === '='
                        ? value === rule.value
                        : value !== rule.value;
        if (match) return rule.color;
    }
    return undefined;
}

export const DEFAULT_CALLOUT: CalloutStyle = {
    displayUnits: 'auto',
    decimals: 1,
    textWrap: false,
    sourceSpacing: false,
    fx: { enabled: false, rules: [] },
};

/** Default table/matrix value-cell number presentation: pure auto. */
export const DEFAULT_TABLE_NUMBER: TableNumberStyle = {
    displayUnits: 'auto',
};

export const DEFAULT_CATEGORY_LABEL: CategoryLabelStyle = {
    show: true,
    fontSize: 11,
};

export const DEFAULT_TITLE_STYLE: TitleStyle = {
    heading: 'none',
    align: 'center',
};

export const DEFAULT_AXIS_STYLE: AxisStyle = {
    show: true,
    title: '',
    displayUnits: 'auto',
};

/** Default fill for the empty space behind stacked bars when the value axis
 * has no `emptyColor` set. A light gray track by default. */
export const STACKED_EMPTY_FILL = '#d1d5db';

export const DEFAULT_GRIDLINES: GridlinesStyle = {
    horizontal: true,
    vertical: false,
    color: 'var(--border)',
    style: 'solid',
};

export const DEFAULT_BAR_STYLE: BarStyle = {
    applyTo: 'all',
    categoryColors: {},
    transparency: 0,
};

export const DEFAULT_DATA_LABELS: DataLabelStyle = {
    show: false,
    applyTo: 'all',
    position: 'auto',
    content: 'value',
    displayUnits: 'auto',
    decimals: 1,
};

export const DEFAULT_LEGEND: LegendStyle = {
    show: true,
    position: 'top',
    font: { fontSize: 10 },
};

export const DEFAULT_PLOT_AREA: PlotAreaStyle = {
    border: false,
    borderWidth: 1,
};

/**
 * Applies display-unit scaling/behavior and decimal places to a number. A
 * custom `suffix` (when non-empty) is appended as a postfix in place of the
 * unit's built-in token (K/M/B/%/$); an empty/absent suffix keeps the token.
 */
function formatUnitValue(
    n: number,
    unit: DisplayUnit,
    decimals?: number,
    suffix?: string,
): string {
    const d =
        typeof decimals === 'number' && isFinite(decimals)
            ? decimals
            : undefined;
    const post = suffix && suffix.trim().length > 0 ? suffix : undefined;
    const fixed = (value: number, dp: number | undefined) =>
        value.toLocaleString('en-US', {
            minimumFractionDigits: dp ?? 0,
            maximumFractionDigits: dp ?? 0,
        });
    switch (unit) {
        case 'none':
            return `${fixed(n, d ?? 2)}${post ?? ''}`;
        case 'thousands':
            return `${fixed(n / 1_000, d ?? 1)}${post ?? 'K'}`;
        case 'millions':
            return `${fixed(n / 1_000_000, d ?? 1)}${post ?? 'M'}`;
        case 'billions':
            return `${fixed(n / 1_000_000_000, d ?? 1)}${post ?? 'B'}`;
        case 'percent':
            return `${(n * 100).toFixed(d ?? 1)}${post ?? '%'}`;
        case 'currency':
            return post !== undefined
                ? `${fixed(n, d ?? 0)}${post}`
                : `$${fixed(n, d ?? 0)}`;
        default:
            return formatAutoNumber(n, d, post);
    }
}

/** Applies display-unit scaling and decimal places to a number. */
export function formatDisplayUnitValue(
    n: number,
    displayUnits: DisplayUnit = 'auto',
    decimals?: number,
    suffix?: string,
): string {
    if (!isFinite(n)) return '—';
    const unit = isDisplayUnit(displayUnits) ? displayUnits : 'auto';
    return formatUnitValue(n, unit, decimals, suffix);
}

/** Resolves an axis tick's effective unit + decimal places from its explicit
 * display-unit selection, custom suffix and the loose "Format" presets, then
 * formats the tick. `decimals` wins; otherwise the Format's digit presets
 * (int/1dec/2dec) apply. Percent/currency Formats are honored only when the
 * display unit is left on `auto`, so Unités + suffix always compose. */
export function formatAxisDefTick(
    n: number,
    opts: {
        displayUnits?: DisplayUnit;
        numberFormat?: NumberFormat;
        decimals?: number;
        suffix?: string;
    },
): string {
    const decimals =
        opts.decimals ??
        (opts.numberFormat === 'int'
            ? 0
            : opts.numberFormat === '1dec'
              ? 1
              : opts.numberFormat === '2dec'
                ? 2
                : undefined);
    const unit =
        opts.displayUnits && opts.displayUnits !== 'auto'
            ? opts.displayUnits
            : opts.numberFormat === 'percent'
              ? 'percent'
              : opts.numberFormat === 'currency'
                ? 'currency'
                : 'auto';
    return formatDisplayUnitValue(n, unit, decimals, opts.suffix);
}

/**
 * Auto display-unit formatting: keeps the compact K/M scaling for large
 * values but honors the decimal-places cap, and shows raw decimals rather
 * than a surprise percentage for values below 1. A custom `post` suffix
 * overrides the built-in K/M token (and is appended to small values too).
 */
function formatAutoNumber(n: number, decimals?: number, post?: string): string {
    const dp =
        typeof decimals === 'number' && isFinite(decimals)
            ? decimals
            : undefined;
    const abs = Math.abs(n);
    const scaled = (value: number, token: string) =>
        `${value.toLocaleString('en-US', {
            maximumFractionDigits: dp ?? 1,
        })}${post ?? token}`;
    if (abs >= 1_000_000) return scaled(n / 1_000_000, 'M');
    if (abs >= 1_000) return scaled(n / 1_000, 'K');
    return `${n.toLocaleString('en-US', {
        maximumFractionDigits: dp ?? 0,
    })}${post ?? ''}`;
}

/**
 * Formats a callout value, honoring display units, per-field format and an
 * optional custom suffix; non-numeric values go through `formatValue`.
 */
export function formatCallout(
    value: string | number | boolean | null,
    style: {
        displayUnits?: DisplayUnit;
        decimals?: number;
        valueFormat?: ValueFormat;
        /** Custom suffix overriding the unit's built-in token. */
        suffix?: string;
    },
    wf?: Pick<WellField, 'format'>,
    type: FieldType = 'number',
): string {
    if (value === null || value === undefined) return '—';
    if (type !== 'number' || typeof value !== 'number')
        return formatValue(value, type);
    const n = value;
    if (!isFinite(n)) return '—';
    const vf = normalizeValueFormat(style.valueFormat);
    if (!vf.auto && vf.format) return formatNumberPattern(n, vf.format);
    if (wf?.format && wf.format !== 'auto')
        return formatNumberWith(n, wf.format);
    const unit = isDisplayUnit(style.displayUnits)
        ? style.displayUnits
        : 'auto';
    const decimals =
        typeof style.decimals === 'number' && isFinite(style.decimals)
            ? style.decimals
            : undefined;
    return formatUnitValue(n, unit, decimals, style.suffix);
}

export function normalizeFxFormat(input: unknown): FxFormat {
    if (!input || typeof input !== 'object') {
        return { enabled: false, rules: [] };
    }
    const value = input as Record<string, unknown>;
    const ops: FxOp[] = ['>', '>=', '<', '<=', '=', '!='];
    const rules = Array.isArray(value.rules)
        ? value.rules
              .map((r): FxRule | null => {
                  if (!r || typeof r !== 'object') return null;
                  const rule = r as Record<string, unknown>;
                  if (!ops.includes(rule.op as FxOp)) return null;
                  return {
                      op: rule.op as FxOp,
                      value:
                          typeof rule.value === 'number' && isFinite(rule.value)
                              ? rule.value
                              : 0,
                      color:
                          typeof rule.color === 'string' && rule.color.trim()
                              ? rule.color.trim()
                              : '#4c78d0',
                  };
              })
              .filter((r): r is FxRule => r !== null)
        : [];
    return { enabled: value.enabled === true, rules };
}

export function normalizeCalloutStyle(input: unknown): CalloutStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_CALLOUT };
    const value = input as Record<string, unknown>;
    const style: CalloutStyle = {
        displayUnits: isDisplayUnit(value.displayUnits)
            ? value.displayUnits
            : DEFAULT_CALLOUT.displayUnits,
        decimals:
            typeof value.decimals === 'number' && isFinite(value.decimals)
                ? value.decimals
                : DEFAULT_CALLOUT.decimals,
        textWrap:
            typeof value.textWrap === 'boolean'
                ? value.textWrap
                : DEFAULT_CALLOUT.textWrap,
        sourceSpacing:
            typeof value.sourceSpacing === 'boolean'
                ? value.sourceSpacing
                : DEFAULT_CALLOUT.sourceSpacing,
        fx: normalizeFxFormat(value.fx),
    };
    if (typeof value.suffix === 'string' && value.suffix.trim())
        style.suffix = value.suffix.trim();
    if (typeof value.fontFamily === 'string' && value.fontFamily.trim())
        style.fontFamily = value.fontFamily.trim();
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.fontSize = value.fontSize;
    if (typeof value.bold === 'boolean') style.bold = value.bold;
    if (typeof value.italic === 'boolean') style.italic = value.italic;
    if (typeof value.underline === 'boolean') style.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    return style;
}

/** Normalizes a persisted `Visual.tableNumber` block; garbage yields the
 *  auto default so tables never break on a malformed blob. */
export function normalizeTableNumber(input: unknown): TableNumberStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_TABLE_NUMBER };
    const value = input as Record<string, unknown>;
    const style: TableNumberStyle = {
        displayUnits: isDisplayUnit(value.displayUnits)
            ? value.displayUnits
            : DEFAULT_TABLE_NUMBER.displayUnits,
    };
    if (typeof value.decimals === 'number' && isFinite(value.decimals))
        style.decimals = value.decimals;
    if (typeof value.suffix === 'string' && value.suffix.trim())
        style.suffix = value.suffix.trim();
    return style;
}

/** Formats a table/matrix value cell: a per-field `WellField.format` wins,
 * otherwise the visual's `tableNumber` block (display units, decimals,
 * suffix) composes with its `numberFormat` presets — the same semantics as
 * the cartesian value axes (`formatAxisDefTick`). The auto/auto combination
 * reproduces `formatWellValue`, so unconfigured tables are unchanged. */
export function formatTableNumber(
    n: number,
    visual: Pick<Visual, 'numberFormat' | 'tableNumber'>,
    wf?: Pick<WellField, 'format'>,
): string {
    if (wf?.format && wf.format !== 'auto')
        return formatNumberWith(n, wf.format);
    const tn = normalizeTableNumber(visual.tableNumber);
    return formatAxisDefTick(n, {
        displayUnits: tn.displayUnits,
        numberFormat: visual.numberFormat,
        decimals: tn.decimals,
        suffix: tn.suffix,
    });
}

/** True when the visual's table number block carries any explicit setting
 * (a unit other than auto, decimal places or a suffix) — gates per-row chip
 * reformatting so unconfigured tables keep their raw values. */
export function isTableNumberCustomized(
    visual: Pick<Visual, 'tableNumber'>,
): boolean {
    const tn = normalizeTableNumber(visual.tableNumber);
    return (
        tn.displayUnits !== 'auto' || tn.decimals !== undefined || !!tn.suffix
    );
}

/**
 * Formats a `listAgg`-treated list cell (count/sum/min/max/first/latest/nth)
 * through the visual's "Valeurs numériques" block. Unconfigured tables keep
 * the raw treated output byte-for-byte; configured ones apply the display
 * unit/decimals/suffix to numeric results while text codes (from `first`,
 * `raw`, `latest` or `nth`) pass through untouched. `null` stays `null` so
 * callers render `—`.
 */
export function formatTableTreated(
    treated: string | null,
    visual: Pick<Visual, 'numberFormat' | 'tableNumber'>,
    wf?: Pick<WellField, 'format'>,
): string | null {
    if (treated === null) return null;
    if (!isTableNumberCustomized(visual)) return treated;
    const n = Number(String(treated).trim());
    return Number.isFinite(n) ? formatTableNumber(n, visual, wf) : treated;
}

export function normalizeCategoryLabelStyle(
    input: unknown,
): CategoryLabelStyle {
    if (!input || typeof input !== 'object')
        return { ...DEFAULT_CATEGORY_LABEL };
    const value = input as Record<string, unknown>;
    const style: CategoryLabelStyle = {
        show: typeof value.show === 'boolean' ? value.show : true,
    };
    if (typeof value.fontFamily === 'string' && value.fontFamily.trim())
        style.fontFamily = value.fontFamily.trim();
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.fontSize = value.fontSize;
    if (typeof value.bold === 'boolean') style.bold = value.bold;
    if (typeof value.italic === 'boolean') style.italic = value.italic;
    if (typeof value.underline === 'boolean') style.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    return style;
}

export function normalizeTitleStyle(input: unknown): TitleStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_TITLE_STYLE };
    const value = input as Record<string, unknown>;
    const headings: TitleStyle['heading'][] = ['none', 'h1', 'h2', 'h3', 'h4'];
    const style: TitleStyle = {
        heading: headings.includes(value.heading as TitleStyle['heading'])
            ? (value.heading as TitleStyle['heading'])
            : DEFAULT_TITLE_STYLE.heading,
        align:
            value.align === 'left' ||
            value.align === 'right' ||
            value.align === 'center'
                ? value.align
                : DEFAULT_TITLE_STYLE.align,
    };
    if (typeof value.bold === 'boolean') style.bold = value.bold;
    if (typeof value.italic === 'boolean') style.italic = value.italic;
    if (typeof value.underline === 'boolean') style.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    if (typeof value.background === 'string' && value.background.trim())
        style.background = value.background.trim();
    if (typeof value.textWrap === 'boolean') style.textWrap = value.textWrap;
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.fontSize = value.fontSize;
    return style;
}

/** Power BI-style title CSS props. */
export function visualTitleStyle(
    v: Pick<Visual, 'fontFamily' | 'fontSize' | 'fontColor' | 'titleStyle'>,
) {
    const t = normalizeTitleStyle(v.titleStyle);
    return {
        fontFamily: v.fontFamily || undefined,
        fontSize: t.fontSize ?? TITLE_HEADING_SIZES[t.heading] ?? v.fontSize,
        color: t.color ?? v.fontColor,
        fontWeight: t.bold ? 700 : 600,
        fontStyle: t.italic ? 'italic' : undefined,
        textDecoration: t.underline ? 'underline' : undefined,
        backgroundColor: t.background || undefined,
        textAlign: t.align,
        whiteSpace: t.textWrap ? 'normal' : 'nowrap',
    } as const;
}

export function normalizeFontStyle(input: unknown): FontStyle | undefined {
    if (!input || typeof input !== 'object') return undefined;
    const value = input as Record<string, unknown>;
    const style: FontStyle = {};
    if (typeof value.fontFamily === 'string' && value.fontFamily.trim())
        style.fontFamily = value.fontFamily.trim();
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.fontSize = value.fontSize;
    if (typeof value.bold === 'boolean') style.bold = value.bold;
    if (typeof value.italic === 'boolean') style.italic = value.italic;
    if (typeof value.underline === 'boolean') style.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    return Object.keys(style).length ? style : undefined;
}

export function normalizeAxisStyle(input: unknown): AxisStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_AXIS_STYLE };
    const value = input as Record<string, unknown>;
    const style: AxisStyle = {
        show: typeof value.show === 'boolean' ? value.show : true,
        displayUnits: isDisplayUnit(value.displayUnits)
            ? value.displayUnits
            : DEFAULT_AXIS_STYLE.displayUnits,
    };
    if (typeof value.showTitle === 'boolean') style.showTitle = value.showTitle;
    if (typeof value.showLine === 'boolean') style.showLine = value.showLine;
    if (typeof value.showLabels === 'boolean')
        style.showLabels = value.showLabels;
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    if (typeof value.suffix === 'string' && value.suffix.trim())
        style.suffix = value.suffix.trim();
    if (typeof value.title === 'string') style.title = value.title;
    if (typeof value.titleOffset === 'number' && isFinite(value.titleOffset))
        style.titleOffset = value.titleOffset;
    if (typeof value.gap === 'number' && isFinite(value.gap))
        style.gap = value.gap;
    const titleFont = normalizeFontStyle(value.titleFont);
    if (titleFont) style.titleFont = titleFont;
    const labelsFont = normalizeFontStyle(value.labelsFont);
    if (labelsFont) style.labelsFont = labelsFont;
    if (typeof value.decimals === 'number' && isFinite(value.decimals))
        style.decimals = value.decimals;
    if (typeof value.min === 'number' && isFinite(value.min))
        style.min = value.min;
    if (typeof value.max === 'number' && isFinite(value.max))
        style.max = value.max;
    if (typeof value.emptyColor === 'string' && value.emptyColor.trim())
        style.emptyColor = value.emptyColor.trim();
    return style;
}

const AXIS_POSITIONS: AxisPosition[] = ['left', 'right', 'bottom', 'top'];

/** Default value axes for a new cartesian visual: one auto-ranged left axis. */
export const DEFAULT_AXES: AxisDef[] = [
    {
        id: 'y0',
        position: 'left',
        order: 0,
        auto: true,
        title: '',
        showTitle: true,
        showLine: true,
        showLabels: true,
        showGridlines: true,
        color: '',
        numberFormat: 'auto',
        displayUnits: 'auto',
    },
];

export function defaultAxes(): AxisDef[] {
    return DEFAULT_AXES.map((a) => ({ ...a }));
}

/** Right-side Pareto secondary axis: locked to 0–100 % by definition (the
 * cumulative % line plots here). `lockRange` hides the Min/Max inputs in the
 * format pane; `normalizeAxes` snaps it back to a fixed 0–1 domain. */
export function lockedPctAxis(): AxisDef {
    return {
        id: 'pct',
        position: 'right',
        order: 1,
        auto: false,
        min: 0,
        max: 1,
        title: '',
        showTitle: true,
        showLine: true,
        showLabels: true,
        showGridlines: false,
        color: '',
        numberFormat: 'percent',
        displayUnits: 'auto',
        lockRange: true,
    };
}

/** Position for the horizontal (bar) family where the value axis runs X. */
export function axisPositionDefault(horizontal: boolean): AxisPosition {
    return horizontal ? 'bottom' : 'left';
}

/**
 * Normalizes a persisted `Visual.axes` array into a valid multi-axis list:
 * ids are stringified, positions coerced, orders re-derived after sorting,
 * and Pareto-style locked axes are snapped to a 0–100% range. Empty or
 * malformed input yields a single default left axis so every visual always
 * has a plot scale.
 */
export function normalizeAxes(input: unknown): AxisDef[] {
    if (!Array.isArray(input)) return defaultAxes();
    const primaries = input.filter(
        (a): a is Record<string, unknown> =>
            !!a && typeof a === 'object' && typeof a['id'] === 'string',
    );
    if (!primaries.length) return defaultAxes();

    const seen = new Set<string>();
    const parsed: { a: AxisDef; order: number }[] = [];
    for (const raw of primaries) {
        const id = String(raw.id);
        if (seen.has(id)) continue;
        seen.add(id);
        const position = AXIS_POSITIONS.includes(raw.position as AxisPosition)
            ? (raw.position as AxisPosition)
            : 'left';
        const lockRange = raw.lockRange === true;
        const min =
            typeof raw.min === 'number' && isFinite(raw.min)
                ? raw.min
                : undefined;
        const max =
            typeof raw.max === 'number' && isFinite(raw.max)
                ? raw.max
                : undefined;
        const axis: AxisDef = {
            id,
            position,
            order: 0,
            auto: lockRange ? false : raw.auto !== false,
            min: lockRange ? 0 : min,
            max: lockRange ? 1 : max,
            title: typeof raw.title === 'string' ? raw.title : '',
            showTitle: raw.showTitle !== false,
            titleOffset:
                typeof raw.titleOffset === 'number' && isFinite(raw.titleOffset)
                    ? raw.titleOffset
                    : undefined,
            gap:
                typeof raw.gap === 'number' && isFinite(raw.gap)
                    ? raw.gap
                    : undefined,
            showLine: raw.showLine !== false,
            showLabels: raw.showLabels !== false,
            showGridlines: raw.showGridlines === true,
            color:
                typeof raw.color === 'string' && raw.color.trim()
                    ? raw.color.trim()
                    : '',
            numberFormat: isNumberFormat(raw.numberFormat)
                ? raw.numberFormat
                : 'auto',
            displayUnits: isDisplayUnit(raw.displayUnits)
                ? raw.displayUnits
                : 'auto',
            lockRange,
        };
        if (typeof raw.suffix === 'string' && raw.suffix.trim())
            axis.suffix = raw.suffix.trim();
        if (typeof raw.lineColor === 'string' && raw.lineColor.trim())
            axis.lineColor = raw.lineColor.trim();
        if (raw.lineLabels !== undefined)
            axis.lineLabels = normalizeDataLabelStyle(raw.lineLabels);
        if (typeof raw.decimals === 'number' && isFinite(raw.decimals))
            axis.decimals = raw.decimals;
        if (typeof raw.emptyColor === 'string' && raw.emptyColor.trim())
            axis.emptyColor = raw.emptyColor.trim();
        const titleFont = normalizeFontStyle(raw.titleFont);
        if (titleFont) axis.titleFont = titleFont;
        const labelsFont = normalizeFontStyle(raw.labelsFont);
        if (labelsFont) axis.labelsFont = labelsFont;
        parsed.push({
            a: axis,
            order: typeof raw.order === 'number' ? raw.order : parsed.length,
        });
    }
    const axes = parsed
        .sort((x, y) => x.order - y.order)
        .map(({ a }, i) => ({ ...a, order: i }));
    if (!axes.length) return defaultAxes();

    // Make sure exactly one axis drives gridlines (only the first requested).
    const firstGridAxes = axes.filter((a) => a.showGridlines);
    if (firstGridAxes.length > 1)
        for (const a of axes) a.showGridlines = a === firstGridAxes[0];

    return axes;
}

export function normalizeGridlinesStyle(input: unknown): GridlinesStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_GRIDLINES };
    const value = input as Record<string, unknown>;
    return {
        horizontal:
            typeof value.horizontal === 'boolean'
                ? value.horizontal
                : DEFAULT_GRIDLINES.horizontal,
        vertical:
            typeof value.vertical === 'boolean'
                ? value.vertical
                : DEFAULT_GRIDLINES.vertical,
        color:
            typeof value.color === 'string' && value.color.trim()
                ? value.color.trim()
                : DEFAULT_GRIDLINES.color,
        style: GRIDLINE_STYLES.includes(value.style as GridlineStyle)
            ? (value.style as GridlineStyle)
            : DEFAULT_GRIDLINES.style,
    };
}

export function normalizeBarStyle(input: unknown): BarStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_BAR_STYLE };
    const value = input as Record<string, unknown>;
    const style: BarStyle = {
        applyTo: value.applyTo === 'perCategory' ? 'perCategory' : 'all',
        categoryColors: {},
        transparency:
            typeof value.transparency === 'number' &&
            isFinite(value.transparency)
                ? Math.max(0, Math.min(100, value.transparency))
                : DEFAULT_BAR_STYLE.transparency,
    };
    if (typeof value.color === 'string' && value.color.trim())
        style.color = value.color.trim();
    if (value.categoryColors && typeof value.categoryColors === 'object') {
        for (const [key, color] of Object.entries(
            value.categoryColors as Record<string, unknown>,
        )) {
            if (typeof color === 'string' && color.trim())
                style.categoryColors[key] = color.trim();
        }
    }
    if (typeof value.radius === 'number' && isFinite(value.radius))
        style.radius = value.radius;
    return style;
}

export function normalizeDataLabelStyle(input: unknown): DataLabelStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_DATA_LABELS };
    const value = input as Record<string, unknown>;
    const style: DataLabelStyle = {
        show: typeof value.show === 'boolean' ? value.show : false,
        applyTo: value.applyTo === 'perSeries' ? 'perSeries' : 'all',
        position: DATA_LABEL_POSITIONS.includes(
            value.position as DataLabelPosition,
        )
            ? (value.position as DataLabelPosition)
            : DEFAULT_DATA_LABELS.position,
        content: DATA_LABEL_CONTENTS.includes(value.content as DataLabelContent)
            ? (value.content as DataLabelContent)
            : DEFAULT_DATA_LABELS.content,
        displayUnits: isDisplayUnit(value.displayUnits)
            ? value.displayUnits
            : DEFAULT_DATA_LABELS.displayUnits,
        decimals:
            typeof value.decimals === 'number' && isFinite(value.decimals)
                ? value.decimals
                : DEFAULT_DATA_LABELS.decimals,
    };
    if (typeof value.suffix === 'string' && value.suffix.trim())
        style.suffix = value.suffix.trim();
    const font = normalizeFontStyle(value.font);
    if (font) style.font = font;
    if (value.seriesStyles && typeof value.seriesStyles === 'object') {
        const out: Record<string, DataLabelSeriesOverride> = {};
        for (const [key, raw] of Object.entries(
            value.seriesStyles as Record<string, unknown>,
        )) {
            if (!raw || typeof raw !== 'object') continue;
            const o = raw as Record<string, unknown>;
            const override: DataLabelSeriesOverride = {};
            if (typeof o.color === 'string' && o.color.trim())
                override.color = o.color.trim();
            const overrideFont = normalizeFontStyle(o.font);
            if (overrideFont) override.font = overrideFont;
            if (Object.keys(override).length) out[key] = override;
        }
        if (Object.keys(out).length) style.seriesStyles = out;
    }
    return style;
}

export function normalizeLegendStyle(input: unknown): LegendStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_LEGEND };
    const value = input as Record<string, unknown>;
    const style: LegendStyle = {
        show: typeof value.show === 'boolean' ? value.show : true,
        position: LEGEND_POSITIONS.includes(value.position as LegendPosition)
            ? (value.position as LegendPosition)
            : DEFAULT_LEGEND.position,
    };
    const font = normalizeFontStyle(value.font);
    if (font) style.font = font;
    else if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        style.font = { fontSize: value.fontSize };
    return style;
}

export function normalizePlotAreaStyle(input: unknown): PlotAreaStyle {
    if (!input || typeof input !== 'object') return { ...DEFAULT_PLOT_AREA };
    const value = input as Record<string, unknown>;
    const style: PlotAreaStyle = {
        border: typeof value.border === 'boolean' ? value.border : false,
    };
    if (typeof value.background === 'string' && value.background.trim())
        style.background = value.background.trim();
    if (typeof value.borderColor === 'string' && value.borderColor.trim())
        style.borderColor = value.borderColor.trim();
    if (typeof value.borderWidth === 'number' && isFinite(value.borderWidth))
        style.borderWidth = value.borderWidth;
    return style;
}

/* ------------------------- Gauge normalizers ------------------------- */

export const DEFAULT_GAUGE_BOUND: GaugeBoundStyle = { auto: true };

export const DEFAULT_GAUGE_VALUE: GaugeValueStyle = { displayUnits: 'auto' };

/** Whether the shared gauge value format was explicitly configured (non-auto
 * units, decimals or a custom suffix) — when set it drives every gauge value
 * instead of the per-field derivation. */
export function hasExplicitGaugeValueFormat(v: GaugeValueStyle): boolean {
    return (
        v.displayUnits !== 'auto' ||
        v.decimals !== undefined ||
        Boolean(v.suffix?.trim())
    );
}

export const DEFAULT_GAUGE_LABEL: GaugeLabelStyle = {
    show: true,
    displayUnits: 'auto',
    decimals: 1,
    valueFormat: { auto: true },
};

export const DEFAULT_GAUGE_DATA_LABELS: GaugeDataLabelsStyle = {
    show: false,
    values: { ...DEFAULT_GAUGE_LABEL, show: true },
    targetLabel: { ...DEFAULT_GAUGE_LABEL, show: true },
    callout: { ...DEFAULT_GAUGE_LABEL, show: true },
};

export const DEFAULT_GAUGE: GaugeStyle = {
    value: { ...DEFAULT_GAUGE_VALUE },
    axis: {
        min: { ...DEFAULT_GAUGE_BOUND },
        max: { ...DEFAULT_GAUGE_BOUND },
        target: { ...DEFAULT_GAUGE_BOUND },
    },
    dataLabels: {
        show: false,
        values: { ...DEFAULT_GAUGE_LABEL, show: true },
        targetLabel: { ...DEFAULT_GAUGE_LABEL, show: true },
        callout: { ...DEFAULT_GAUGE_LABEL, show: true },
    },
};

/** Fresh deep copy of the default gauge style (never shared across visuals). */
export function defaultGaugeStyle(): GaugeStyle {
    return {
        value: { ...DEFAULT_GAUGE_VALUE },
        axis: {
            min: { ...DEFAULT_GAUGE_BOUND },
            max: { ...DEFAULT_GAUGE_BOUND },
            target: { ...DEFAULT_GAUGE_BOUND },
        },
        dataLabels: {
            show: false,
            values: { ...DEFAULT_GAUGE_LABEL, show: true },
            targetLabel: { ...DEFAULT_GAUGE_LABEL, show: true },
            callout: { ...DEFAULT_GAUGE_LABEL, show: true },
        },
    };
}

function normalizeGaugeValue(
    input: unknown,
    fallback: GaugeValueStyle,
): GaugeValueStyle {
    if (!input || typeof input !== 'object') return { ...fallback };
    const value = input as Record<string, unknown>;
    const out: GaugeValueStyle = {
        displayUnits: isDisplayUnit(value.displayUnits)
            ? (value.displayUnits as DisplayUnit)
            : fallback.displayUnits,
    };
    if (typeof value.decimals === 'number' && isFinite(value.decimals))
        out.decimals = value.decimals;
    if (typeof value.suffix === 'string' && value.suffix.trim())
        out.suffix = value.suffix.trim();
    return out;
}

function normalizeGaugeBound(
    input: unknown,
    fallback: GaugeBoundStyle,
): GaugeBoundStyle {
    if (!input || typeof input !== 'object') return { ...fallback };
    const value = input as Record<string, unknown>;
    const out: GaugeBoundStyle = {
        auto: typeof value.auto === 'boolean' ? value.auto : fallback.auto,
    };
    if (typeof value.format === 'string' && value.format.trim())
        out.format = value.format.trim();
    return out;
}

function normalizeGaugeLabel(
    input: unknown,
    fallback: GaugeLabelStyle,
): GaugeLabelStyle {
    if (!input || typeof input !== 'object') return { ...fallback };
    const value = input as Record<string, unknown>;
    const out: GaugeLabelStyle = {
        show: typeof value.show === 'boolean' ? value.show : fallback.show,
        displayUnits: isDisplayUnit(value.displayUnits)
            ? (value.displayUnits as DisplayUnit)
            : fallback.displayUnits,
    };
    if (typeof value.fontFamily === 'string' && value.fontFamily)
        out.fontFamily = value.fontFamily;
    if (typeof value.fontSize === 'number' && isFinite(value.fontSize))
        out.fontSize = value.fontSize;
    if (typeof value.bold === 'boolean') out.bold = value.bold;
    if (typeof value.italic === 'boolean') out.italic = value.italic;
    if (typeof value.underline === 'boolean') out.underline = value.underline;
    if (typeof value.color === 'string' && value.color.trim())
        out.color = value.color.trim();
    if (typeof value.decimals === 'number' && isFinite(value.decimals))
        out.decimals = value.decimals;
    out.valueFormat = normalizeValueFormat(value.valueFormat);
    if (value.fx !== undefined)
        out.fx = value.fx as ConditionalFormat | boolean;
    return out;
}

export function normalizeGaugeStyle(input: unknown): GaugeStyle {
    const d = defaultGaugeStyle();
    if (!input || typeof input !== 'object') return d;
    const value = input as Record<string, unknown>;
    const axis = value.axis as Record<string, unknown> | undefined;
    const dataLabels = value.dataLabels as Record<string, unknown> | undefined;
    const out: GaugeStyle = {
        value: normalizeGaugeValue(value.value, d.value),
        axis: {
            min: normalizeGaugeBound(axis?.min, d.axis.min),
            max: normalizeGaugeBound(axis?.max, d.axis.max),
            target: normalizeGaugeBound(axis?.target, d.axis.target),
        },
        dataLabels: {
            show:
                typeof dataLabels?.show === 'boolean'
                    ? dataLabels.show
                    : d.dataLabels.show,
            values: normalizeGaugeLabel(
                dataLabels?.values,
                d.dataLabels.values,
            ),
            targetLabel: normalizeGaugeLabel(
                dataLabels?.targetLabel,
                d.dataLabels.targetLabel,
            ),
            callout: normalizeGaugeLabel(
                dataLabels?.callout,
                d.dataLabels.callout,
            ),
        },
    };
    if (typeof value.fillColor === 'string' && value.fillColor.trim())
        out.fillColor = value.fillColor.trim();
    if (value.fillFx !== undefined)
        out.fillFx = value.fillFx as ConditionalFormat | boolean;
    if (typeof value.targetColor === 'string' && value.targetColor.trim())
        out.targetColor = value.targetColor.trim();
    if (value.targetFx !== undefined)
        out.targetFx = value.targetFx as ConditionalFormat | boolean;
    return out;
}

/* --------------------- Per-value style resolvers --------------------- */

/** The per-value styling block for `index`, or `undefined` when the visual
 * has no override there. */
function valueStyleBlock(visual: Visual, index: number) {
    const block = visual.valueStyle?.[index];
    return block && typeof block === 'object' ? block : undefined;
}

/** Per-value callout style for a card/gauge value; falls back to the shared
 * block when the visual carries no per-value override. */
export function valueCallout(visual: Visual, index: number): CalloutStyle {
    const block = valueStyleBlock(visual, index);
    return normalizeCalloutStyle(block?.callout ?? visual.callout);
}

/** Per-value category label style for a card/gauge value; falls back to the
 * shared block when the visual carries no per-value override. */
export function valueCategoryLabel(
    visual: Visual,
    index: number,
): CategoryLabelStyle {
    const block = valueStyleBlock(visual, index);
    return normalizeCategoryLabelStyle(
        block?.categoryLabel ?? visual.categoryLabel,
    );
}

/** Per-value conditional format for a card/gauge value; falls back to the
 * shared visual format when no per-value override exists. */
export function valueConditionalFormat(
    visual: Visual,
    index: number,
): boolean | ConditionalFormat {
    const block = valueStyleBlock(visual, index);
    return block && block.conditionalFormat !== undefined
        ? block.conditionalFormat
        : visual.conditionalFormat;
}

/** Per-value gauge style: the shared gauge block with any per-value color /
 * fx / display-format overrides applied on top. */
export function valueGaugeStyle(visual: Visual, index: number): GaugeStyle {
    const base = normalizeGaugeStyle(visual.gauge);
    const block = valueStyleBlock(visual, index);
    const ov = block?.gauge;
    if (!ov) return base;
    const out: GaugeStyle = { ...base };
    if (ov.fillColor !== undefined) out.fillColor = ov.fillColor;
    if (ov.fillFx !== undefined) out.fillFx = ov.fillFx;
    if (ov.targetColor !== undefined) out.targetColor = ov.targetColor;
    if (ov.targetFx !== undefined) out.targetFx = ov.targetFx;
    if (ov.value !== undefined)
        out.value = normalizeGaugeValue(ov.value, base.value);
    if (ov.callout !== undefined)
        out.dataLabels = {
            ...base.dataLabels,
            callout: normalizeGaugeLabel(ov.callout, base.dataLabels.callout),
        };
    return out;
}

/* ------------------------- Clock normalizers ------------------------- */

export const CLOCK_DATE_FORMATS: ClockDateFormat[] = [
    'dd/MM/yyyy',
    'dd/MM/yyyy HH:mm',
    'dd MMMM yyyy',
    'dd MMMM yyyy HH:mm',
    'EEEE dd MMMM yyyy',
    'MMMM yyyy',
];

export const CLOCK_DATE_LABELS: Record<ClockDateFormat, string> = {
    'dd/MM/yyyy': '18/08/2026',
    'dd/MM/yyyy HH:mm': '18/08/2026 14:05',
    'dd MMMM yyyy': '18 août 2026',
    'dd MMMM yyyy HH:mm': '18 août 2026 14:05',
    'EEEE dd MMMM yyyy': 'mardi 18 août 2026',
    'MMMM yyyy': 'août 2026',
};

export const DEFAULT_CLOCK: ClockStyle = {
    showClock: true,
    hourFormat: '24',
    showSeconds: true,
    showDate: true,
    dateFormat: 'dd/MM/yyyy',
};

/** Fresh copy of the default clock style (never shared across visuals). */
export function defaultClockStyle(): ClockStyle {
    return { ...DEFAULT_CLOCK };
}

export function normalizeClockStyle(input: unknown): ClockStyle {
    const d = defaultClockStyle();
    if (!input || typeof input !== 'object') return d;
    const value = input as Record<string, unknown>;
    return {
        showClock:
            typeof value.showClock === 'boolean'
                ? value.showClock
                : d.showClock,
        hourFormat: value.hourFormat === '12' ? '12' : d.hourFormat,
        showSeconds:
            typeof value.showSeconds === 'boolean'
                ? value.showSeconds
                : d.showSeconds,
        showDate:
            typeof value.showDate === 'boolean' ? value.showDate : d.showDate,
        dateFormat: CLOCK_DATE_FORMATS.includes(
            value.dateFormat as ClockDateFormat,
        )
            ? (value.dateFormat as ClockDateFormat)
            : d.dateFormat,
    };
}

/** Formats a Date for the clock element, honoring the given clock style. */
export function formatClock(
    date: Date,
    style: ClockStyle = defaultClockStyle(),
): { time: string; date: string } {
    const opts: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: style.hourFormat === '12',
    };
    if (style.showSeconds) opts.second = '2-digit';
    const time = date.toLocaleTimeString('fr-FR', opts);
    const dateOpts: Intl.DateTimeFormatOptions = { day: '2-digit' };
    switch (style.dateFormat) {
        case 'dd/MM/yyyy':
            dateOpts.month = '2-digit';
            dateOpts.year = 'numeric';
            break;
        case 'dd/MM/yyyy HH:mm':
            dateOpts.month = '2-digit';
            dateOpts.year = 'numeric';
            break;
        case 'dd MMMM yyyy':
            dateOpts.month = 'long';
            dateOpts.year = 'numeric';
            break;
        case 'dd MMMM yyyy HH:mm':
            dateOpts.month = 'long';
            dateOpts.year = 'numeric';
            break;
        case 'EEEE dd MMMM yyyy':
            dateOpts.weekday = 'long';
            dateOpts.month = 'long';
            dateOpts.year = 'numeric';
            break;
        case 'MMMM yyyy':
            dateOpts.day = undefined;
            dateOpts.month = 'long';
            dateOpts.year = 'numeric';
            break;
    }
    let dateStr = date.toLocaleDateString('fr-FR', dateOpts);
    if (
        style.dateFormat === 'dd/MM/yyyy HH:mm' ||
        style.dateFormat === 'dd MMMM yyyy HH:mm'
    ) {
        dateStr += ` ${time}`;
    }
    return { time, date: dateStr };
}

export function formatValue(value: unknown, type: FieldType = 'text'): string {
    if (value === null || value === undefined) return '—';
    if (type === 'number' && typeof value === 'number')
        return formatNumber(value);
    if (type === 'boolean')
        return value === true ? 'Oui' : value === false ? 'Non' : String(value);
    if (type === 'date') {
        const parsed = value instanceof Date ? value : new Date(String(value));
        if (!Number.isNaN(parsed.getTime()))
            return parsed.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
            });
    }
    return String(value);
}

/* ------------------------- Column type inference ------------------------- */

function isDateString(v: string): boolean {
    const trimmed = v.trim();
    if (!/^\d{4}-\d{2}-\d{2}([T ].*)?$/.test(trimmed)) return false;
    return !Number.isNaN(Date.parse(trimmed.slice(0, 10)));
}

export function inferFieldType(values: unknown[]): FieldType {
    let numbers = 0;
    let dates = 0;
    let booleans = 0;
    let texts = 0;
    for (const v of values) {
        if (v === null || v === undefined) continue;
        if (typeof v === 'boolean') booleans++;
        else if (typeof v === 'number') numbers++;
        else if (typeof v === 'string') {
            if (isDateString(v)) dates++;
            else texts++;
        } else texts++;
    }
    const total = numbers + dates + booleans + texts;
    if (!total) return 'text';
    if (numbers === total) return 'number';
    if (booleans === total) return 'boolean';
    if (dates === total) return 'date';
    if (numbers >= total * 0.8) return 'number';
    return 'text';
}
