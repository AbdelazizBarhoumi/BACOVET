import type {
    CompositeOperand,
    CompositeSpec,
    MeasureKind,
    NumericAgg,
    PathHop,
    PeriodSpec,
    ValueCondition,
    WizardSpec,
} from './types';

// --- DAX generation ---------------------------------------------------------

export const COND_OPS: Record<ValueCondition['op'], string> = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    eq: '=',
    neq: '<>',
    in: 'IN',
    notIn: 'NOT IN',
};

/** A composed operand: an existing measure `[Name]`, a column aggregate, or a literal. */
function operandDax(o: CompositeOperand): string {
    switch (o.type) {
        case 'number':
            return String(o.value);
        case 'measure':
            return `[${o.name}]`;
        case 'column': {
            const expr = `${o.table}[${o.column}]`;
            switch (o.agg) {
                case 'sum':
                    return `SUM(${expr})`;
                case 'avg':
                    return `AVERAGE(${expr})`;
                case 'min':
                    return `MIN(${expr})`;
                case 'max':
                    return `MAX(${expr})`;
                case 'count':
                    return `COUNT(${expr})`;
            }
        }
    }
}

/** A composed measure: `DIVIDE([A],[B]) * 100` for ratios, else `(A op B)`. */
export function buildCompositionDax(spec: CompositeSpec): string {
    const a = operandDax(spec.a);
    const b = operandDax(spec.b);
    // Ratios always use DIVIDE so the zero denominator is never a bare `/`
    // (W1-18): the 3rd argument carries the user's 0 / BLANK / NA policy.
    let body: string;
    if (spec.op === '/') {
        switch (spec.divZero ?? 'zero') {
            case 'blank':
                body = `DIVIDE(${a}, ${b})`;
                break;
            case 'na':
                body = `DIVIDE(${a}, ${b}, NA())`;
                break;
            default:
                body = `DIVIDE(${a}, ${b}, 0)`;
        }
    } else {
        body = `(${a} ${spec.op} ${b})`;
    }
    return spec.scale ? `${body} * 100` : body;
}

/**
 * Quote a scalar literal for DAX: numeric strings stay raw, everything else is
 * wrapped in single quotes with apostrophes escaped by doubling (`''`), so
 * `O'Brien` becomes `'O''Brien'` (W2-5).
 */
const quoteValue = (v: string): string =>
    /^-?\d+(\.\d+)?$/.test(v) ? v : `'${v.replace(/'/g, "''")}'`;

/** One scalar predicate: `TRIM(table[col]) <op> <literal>` or `… IN {…}`. */
function conditionDax(c: ValueCondition, to: string): string {
    const table = c.table ?? to;
    const col = `TRIM(${table}[${c.column}])`;
    if (c.op === 'in' || c.op === 'notIn') {
        const list = (c.values ?? []).map(quoteValue).join(', ');
        return `${col} ${COND_OPS[c.op]} {${list}}`;
    }
    return `${col} ${COND_OPS[c.op]} ${quoteValue(c.value)}`;
}

/**
 * Render a set of scalar predicates: a single condition stays bare so existing
 * generated DAX is unchanged; several conditions become a parenthesized
 * `(a && b)` / `(a || b)` group. `null` when there are no rows.
 */
function rowsToBlock(
    rows: ValueCondition[],
    combine: 'and' | 'or',
    to: string,
): string | null {
    if (!rows.length) return null;
    if (rows.length === 1) return conditionDax(rows[0]!, to);
    const joiner = combine === 'or' ? ' || ' : ' && ';
    return `(${rows.map((c) => conditionDax(c, to)).join(joiner)})`;
}

function nodeName(hops: PathHop[], i: number, from: string): string {
    return i === 0 ? from : hops[i - 1]!.to;
}

/**
 * Existence predicate for a row of `node[i]` to be reachable from the base
 * table through the chain. Nested correlated COUNTROWS, e.g. for
 * `from=taging_reel → to=codestyle`:
 *
 *   COUNTROWS(FILTER(taging_reel,
 *     TRIM(taging_reel[MONo]) = TRIM(codestyle[SONo]) && TRUE())) > 0
 *
 * Base-table conditions (`basePred`) belong in the innermost FILTER over the
 * base table, where that table is in the row context (W2-3). Without this the
 * predicate would run in the outer FILTER(to, …) context and always be false.
 */
function exists(
    hops: PathHop[],
    i: number,
    from: string,
    basePred?: string,
): string {
    if (i === 0) return '';
    const h = hops[i - 1]!;
    const prev = nodeName(hops, i - 1, from);
    const cur = nodeName(hops, i, from);
    const eq = `TRIM(${prev}[${h.fromCol}]) = TRIM(${cur}[${h.toCol}])`;
    const inner = exists(hops, i - 1, from, basePred);
    const extra = i === 1 && basePred ? ` && ${basePred}` : '';
    return `COUNTROWS(FILTER(${prev}, ${eq}${extra}${inner ? ` && ${inner}` : ''})) > 0`;
}

/**
 * Build a self-contained DAX expression from the wizard spec. Lists become
 * `VALUES(FILTER(target, <chain>) [column])`, row counts become
 * `COUNTROWS(FILTER(...))`, numbers become iterator aggregations over the
 * filtered target rows. All join keys are TRIM-ed because real keys are
 * left-padded (MONo 15, ProdGroup 40).
 */
/**
 * Wrap a numeric body in the DAX of a time window (W2 time engine). `ytd` →
 * `TOTALYTD(body, table[date])`, `mtd` → `TOTALMTD`, the year-ago and previous
 * month windows go through `CALCULATE(... , SAMEPERIODLASTYEAR / PREVIOUSMONTH
 * (table[date]))`. Returns the body untouched when no period is set.
 */
function periodDax(body: string, period: PeriodSpec | undefined): string {
    if (!period) return body;
    const dates = `${period.table}[${period.field}]`;
    switch (period.window) {
        case 'ytd':
            return `TOTALYTD(${body}, ${dates})`;
        case 'mtd':
            return `TOTALMTD(${body}, ${dates})`;
        case 'lastYear':
            return `CALCULATE(${body}, SAMEPERIODLASTYEAR(${dates}))`;
        case 'prevMonth':
            return `CALCULATE(${body}, PREVIOUSMONTH(${dates}))`;
    }
}

export function buildMeasureDax(spec: WizardSpec): string {
    if (spec.composition) return buildCompositionDax(spec.composition);
    const { from, to, hops, kind, column, agg, condition, conditions } = spec;
    const rows =
        conditions && conditions.rows.length
            ? conditions.rows
            : condition
              ? [condition]
              : [];
    const combine = conditions?.combine ?? 'and';
    // Conditions that target the base table (from !== to) must be evaluated
    // inside the innermost FILTER(from, …) where that table is in scope;
    // conditions on the target table stay in the outer block.
    const baseRows = rows.filter(
        (c) => c.table !== undefined && c.table !== to,
    );
    const targetRows = rows.filter(
        (c) => c.table === undefined || c.table === to,
    );
    const baseBlock = rowsToBlock(baseRows, combine, to);
    const block = rowsToBlock(targetRows, combine, to);
    const chain = exists(hops, hops.length, from, baseBlock ?? undefined);
    const scaled =
        block !== null && chain
            ? `${chain} && ${block}`
            : block !== null
              ? block
              : chain;

    if (
        hops.length === 0 &&
        condition === undefined &&
        conditions === undefined
    ) {
        switch (kind) {
            case 'list':
                return `VALUES(${to}[${column}])`;
            case 'countrows':
                return `COUNTROWS(${to})`;
            case 'number': {
                const expr = `${to}[${column}]`;
                let body: string;
                switch (agg) {
                    case 'sum':
                        body = `SUM(${expr})`;
                        break;
                    case 'avg':
                        body = `AVERAGE(${expr})`;
                        break;
                    case 'min':
                        body = `MIN(${expr})`;
                        break;
                    case 'max':
                        body = `MAX(${expr})`;
                        break;
                    case 'count':
                        body = `COUNT(${expr})`;
                        break;
                }
                return periodDax(body, spec.period);
            }
        }
    }

    const filter = `FILTER(${to}, ${scaled})`;

    switch (kind) {
        case 'list':
            return `VALUES(${filter}[${column}])`;
        case 'countrows':
            return `COUNTROWS(${filter})`;
        case 'number': {
            const expr = `${to}[${column}]`;
            let body: string;
            switch (agg) {
                case 'sum':
                    body = `SUMX(${filter}, ${expr})`;
                    break;
                case 'avg':
                    body = `AVERAGEX(${filter}, ${expr})`;
                    break;
                case 'min':
                    body = `MINX(${filter}, ${expr})`;
                    break;
                case 'max':
                    body = `MAXX(${filter}, ${expr})`;
                    break;
                case 'count':
                    body = `COUNTX(${filter}, ${expr})`;
                    break;
            }
            return periodDax(body, spec.period);
        }
    }
}

// --- French labels ----------------------------------------------------------

export const AGG_LABELS: Record<NumericAgg, string> = {
    sum: 'Somme',
    avg: 'Moyenne',
    min: 'Minimum',
    max: 'Maximum',
    count: 'Nombre (non vides)',
};

export const COND_LABELS: Record<ValueCondition['op'], string> = {
    gt: 'Supérieur à',
    gte: 'Supérieur ou égal à',
    lt: 'Inférieur à',
    lte: 'Inférieur ou égal à',
    eq: 'Égal à',
    neq: 'Différent de',
    in: 'Fait partie de',
    notIn: 'Ne fait pas partie de',
};

export const KIND_LABELS: Record<MeasureKind, string> = {
    list: 'Liste de valeurs',
    countrows: 'Nombre de lignes',
    number: 'Valeur numérique',
};

export const PERIOD_LABELS: Record<PeriodSpec['window'], string> = {
    ytd: 'Année en cours (cumul YTD)',
    mtd: 'Mois en cours (cumul MTD)',
    lastYear: 'Même année l’an dernier (SPLY)',
    prevMonth: 'Mois précédent (M-1)',
};

/**
 * Full measure expression (`Name = <body>`) as stored in the library and
 * accepted by the model's compiler, which requires the `word = ` prefix.
 */
export function measureExpression(name: string, spec: WizardSpec): string {
    return `${name.trim() || 'Mesure'} = ${buildMeasureDax(spec)}`;
}
