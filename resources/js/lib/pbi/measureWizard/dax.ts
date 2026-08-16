import type {
    CompositeOperand,
    CompositeSpec,
    DivZeroDefault,
    MeasureKind,
    NumericAgg,
    PathHop,
    PercentOfTotalSpec,
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

/** Compose two already-rendered operands: `DIVIDE([A],[B]) * 100` for ratios,
 *  else `(A op B) * 100`. Ratios always use DIVIDE so the zero denominator is
 *  never a bare `/` (W1-18): the 3rd argument carries the 0 / BLANK / NA policy. */
function composeBody(
    a: string,
    b: string,
    op: CompositeSpec['op'],
    divZero: DivZeroDefault | undefined,
    scale: boolean,
): string {
    let body: string;
    if (op === '/') {
        switch (divZero ?? 'zero') {
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
        body = `(${a} ${op} ${b})`;
    }
    return scale ? `${body} * 100` : body;
}

/** A composed measure: `DIVIDE([A],[B]) * 100` for ratios, else `(A op B)`. */
export function buildCompositionDax(spec: CompositeSpec): string {
    return composeBody(
        operandDax(spec.a),
        operandDax(spec.b),
        spec.op,
        spec.divZero,
        spec.scale,
    );
}

/** DAX X-iterator for each per-row aggregation (W4 row-wise compose). */
const ROW_WISE_ITERS: Record<NumericAgg, string> = {
    sum: 'SUMX',
    avg: 'AVERAGEX',
    min: 'MINX',
    max: 'MAXX',
    count: 'COUNTX',
};

/**
 * Table the row-wise composition iterates over: the operand-A column's table
 * (the "base" side). Falls back to the target table when no column operand
 * drives it.
 */
function rowWiseIterTable(spec: WizardSpec): string {
    const c = spec.composition!;
    if (c.a.type === 'column') return c.a.table;
    if (c.b.type === 'column') return c.b.table;
    return spec.to;
}

/**
 * Correlated predicate on a row of the `hops[j]`-th node (from → … → to) that
 * connects it back to the **current** base-table row being iterated. The base
 * key is referenced as `TRIM(from[fromCol])`, which the engine resolves from
 * the enclosing iterator frame (`ctx.iter`) — never from the node row being
 * filtered, because the reference is table-qualified to `from`.
 *
 *   backToFrame(1) = TRIM(from[h.fromCol]) = TRIM(to[h.toCol])
 *   backToFrame(2) = COUNTROWS(FILTER(node1,
 *                      TRIM(node1[h1.fromCol]) = TRIM(to[h1.toCol])
 *                      && TRIM(from[h0.fromCol]) = TRIM(node1[h0.toCol]))) > 0
 *
 * Evaluated over `to` rows this selects exactly the target rows matching the
 * current base row, so it doubles as the row-wise existence predicate.
 */
function backToFrame(hops: PathHop[], j: number, from: string): string {
    if (j === 0) return '';
    const h = hops[j - 1]!;
    const prev = nodeName(hops, j - 1, from);
    const cur = nodeName(hops, j, from);
    if (j === 1) {
        return `TRIM(${from}[${h.fromCol}]) = TRIM(${cur}[${h.toCol}])`;
    }
    return `COUNTROWS(FILTER(${prev}, TRIM(${prev}[${h.fromCol}]) = TRIM(${cur}[${h.toCol}]) && ${backToFrame(hops, j - 1, from)})) > 0`;
}

/**
 * One operand rendered **in the row context** of the row-wise iterator: a
 * column on the iteration table stays raw (`table[col]`), a column on another
 * table is pulled in through the join chain with a correlated
 * `CALCULATE(SUM(table[col]), FILTER(table, <backToFrame>))` lookup, and
 * measures / literals render as usual.
 */
function rowWiseOperandDax(
    o: CompositeOperand,
    iterTable: string,
    spec: WizardSpec,
): string {
    switch (o.type) {
        case 'number':
            return String(o.value);
        case 'measure':
            return `[${o.name}]`;
        case 'column': {
            if (o.table === iterTable) return `${o.table}[${o.column}]`;
            if (spec.hops.length === 0) return `${o.table}[${o.column}]`;
            const pred = backToFrame(spec.hops, spec.hops.length, spec.from);
            return `CALCULATE(SUM(${o.table}[${o.column}]), FILTER(${o.table}, ${pred}))`;
        }
    }
}

/**
 * Row-by-row composition: `SUMX|AVERAGEX|MINX|MAXX|COUNTX(<base rows>, <per-row
 * A • B>)`, computed per row of the base table instead of over the aggregated
 * totals. `rowWise: 'list'` returns the per-row values as a `VALUEX` list. When
 * an operand column lives on another table, the base rows are restricted to
 * those having a match through the chain and the off-table operand is resolved
 * by the correlated lookup above.
 */
export function buildRowWiseCompositionDax(spec: WizardSpec): string {
    const c = spec.composition!;
    const iterTable = rowWiseIterTable(spec);
    const a = rowWiseOperandDax(c.a, iterTable, spec);
    const b = rowWiseOperandDax(c.b, iterTable, spec);
    const body = composeBody(a, b, c.op, c.divZero, c.scale);

    const offTable =
        (c.a.type === 'column' && c.a.table !== iterTable) ||
        (c.b.type === 'column' && c.b.table !== iterTable);
    let tableArg = iterTable;
    if (offTable && spec.hops.length > 0) {
        const pred = backToFrame(spec.hops, spec.hops.length, spec.from);
        tableArg = `FILTER(${iterTable}, COUNTROWS(FILTER(${spec.to}, ${pred})) > 0)`;
    }

    if (c.rowWise === 'list') return `VALUEX(${tableArg}, ${body})`;
    return `${ROW_WISE_ITERS[c.rowWise!]}(${tableArg}, ${body})`;
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
 * `TOTALYTD(body, table[date])`, `mtd` → `TOTALMTD`, `qtd` → `TOTALQTD`, the
 * year-ago and previous month windows go through `CALCULATE(... ,
 * SAMEPERIODLASTYEAR / PREVIOUSMONTH (table[date]))`. Returns the body
 * untouched when no period is set.
 */
function periodDax(body: string, period: PeriodSpec | undefined): string {
    if (!period) return body;
    const dates = `${period.table}[${period.field}]`;
    switch (period.window) {
        case 'ytd':
            return `TOTALYTD(${body}, ${dates})`;
        case 'mtd':
            return `TOTALMTD(${body}, ${dates})`;
        case 'qtd':
            return `TOTALQTD(${body}, ${dates})`;
        case 'lastYear':
            return `CALCULATE(${body}, SAMEPERIODLASTYEAR(${dates}))`;
        case 'prevMonth':
            return `CALCULATE(${body}, PREVIOUSMONTH(${dates}))`;
    }
}

export function buildMeasureDax(spec: WizardSpec): string {
    if (spec.composition) return buildComposedDax(spec);
    if (spec.ifTemplate) return buildIfTemplateDax(spec);
    if (spec.topN) return buildTopNDax(spec);
    const { from, to, hops, kind, column, agg, condition, conditions } = spec;
    // Numeric bodies are wrapped (innermost → outermost): period, then the
    // percent-of-total share: DIVIDE(<body>, CALCULATE(<body>, ALL(…)), 0)*100.
    const wrapNumber = (body: string) =>
        percentOfTotalDax(periodDax(body, spec.period), spec.percentOfTotal, to);
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

    const aggBody = (expr: string, iter: boolean): string => {
        switch (agg) {
            case 'sum':
                return iter ? `SUMX(${expr})` : `SUM(${expr})`;
            case 'avg':
                return iter ? `AVERAGEX(${expr})` : `AVERAGE(${expr})`;
            case 'min':
                return iter ? `MINX(${expr})` : `MIN(${expr})`;
            case 'max':
                return iter ? `MAXX(${expr})` : `MAX(${expr})`;
            case 'count':
                return iter ? `COUNTX(${expr})` : `COUNT(${expr})`;
        }
    };

    if (
        hops.length === 0 &&
        condition === undefined &&
        conditions === undefined
    ) {
        switch (kind) {
            case 'list':
                return spec.concat
                    ? buildConcatDax(spec)
                    : `VALUES(${to}[${column}])`;
            case 'countrows':
                return `COUNTROWS(${to})`;
            case 'number': {
                const body = aggBody(`${to}[${column}]`, false);
                return wrapNumber(body);
            }
        }
    }

    const filter = `FILTER(${to}, ${scaled})`;

    switch (kind) {
        case 'list':
            return spec.concat
                ? buildConcatDax(spec)
                : `VALUES(${filter}[${column}])`;
        case 'countrows':
            return `COUNTROWS(${filter})`;
        case 'number': {
            const body = aggBody(`${filter}, ${to}[${column}]`, true);
            return wrapNumber(body);
        }
    }
}

/**
 * Percent-of-total (W3-2): `DIVIDE(<expr>, CALCULATE(<expr>, ALL(axis)), 0)*100`
 * with `ALL(<to>)` when no axis column is chosen.
 */
function percentOfTotalDax(
    body: string,
    spec: PercentOfTotalSpec | undefined,
    to: string,
): string {
    if (!spec) return body;
    const all = spec.axis ? `ALL(${to}[${spec.axis}])` : `ALL(${to})`;
    return `DIVIDE(${body}, CALCULATE(${body}, ${all}), 0) * 100`;
}

/**
 * A composed measure wrapped by the shared numeric post-processing (compose
 * flow): innermost → outermost — <condition via CALCULATE + FILTER>, then
 * <period>, then <percent-of-total>. With none of the three set this returns
 * exactly the bare composition, so existing composed DAX is unchanged.
 */
function buildComposedDax(spec: WizardSpec): string {
    let body =
        spec.composition!.rowWise != null
            ? buildRowWiseCompositionDax(spec)
            : buildCompositionDax(spec.composition!);
    const { from, to, hops, condition, conditions } = spec;
    const rows =
        conditions && conditions.rows.length
            ? conditions.rows
            : condition
              ? [condition]
              : [];
    if (rows.length) {
        const combine = conditions?.combine ?? 'and';
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
        if (scaled) body = `CALCULATE(${body}, FILTER(${to}, ${scaled}))`;
    }
    body = periodDax(body, spec.period);
    return percentOfTotalDax(body, spec.percentOfTotal, to);
}

/**
 * Top-N (W3-3): `SUMX(TOPN(n, <target>, <to>[<orderColumn>], <dir>), <to>[col])`
 * over the same filtered target rows the plain number uses.
 */
function buildTopNDax(spec: WizardSpec): string {
    const { to, topN } = spec;
    if (!topN) return 'BLANK()';
    const n = Math.max(1, Math.floor(topN.n || 10));
    const dir = topN.dir === 'asc' ? 'ASC' : 'DESC';
    const rows = targetRowsOf(spec);
    const target = rows.filterExpr || to;
    const expr = `${to}[${spec.column}]`;
    return `SUMX(TOPN(${n}, ${target}, ${to}[${topN.orderColumn}], ${dir}), ${expr})`;
}

/**
 * Conditional branch template (W3-6):
 * `SUMX(<target>, IF(TRIM(to[col]) <op> <literal>, <then>, <else>))`.
 */
function buildIfTemplateDax(spec: WizardSpec): string {
    const { to, ifTemplate } = spec;
    if (!ifTemplate) return 'BLANK()';
    const rows = targetRowsOf(spec);
    const target = rows.filterExpr || to;
    const col = `TRIM(${to}[${ifTemplate.column}])`;
    const literal =
        ifTemplate.op === 'in' || ifTemplate.op === 'notIn'
            ? `{${(
                  ifTemplate.values && ifTemplate.values.length
                      ? ifTemplate.values
                      : [ifTemplate.value]
              )
                  .filter((v): v is string => v !== undefined)
                  .map(quoteValue)
                  .join(', ')}}`
            : quoteValue(ifTemplate.value ?? '');
    return `SUMX(${target}, IF(${col} ${COND_OPS[ifTemplate.op]} ${literal}, ${ifTemplate.then}, ${ifTemplate.else}))`;
}

/**
 * Text-list (W3-5): `CONCATENATEX(<target>, to[column], "<sep>")`.
 */
function buildConcatDax(spec: WizardSpec): string {
    const { to, concat } = spec;
    if (!concat) return 'BLANK()';
    const rows = targetRowsOf(spec);
    const target = rows.filterExpr || to;
    return `CONCATENATEX(${target}, ${to}[${concat.column}], "${concat.sep.replace(/"/g, '""')}")`;
}

/** Shared target-table expression (filtered or whole) for the W3 builders. */
function targetRowsOf(spec: WizardSpec): {
    filterExpr: string;
} {
    const { from, to, hops, condition, conditions } = spec;
    const rows = conditions?.rows.length ? conditions.rows : condition ? [condition] : [];
    const combine = conditions?.combine ?? 'and';
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
    return { filterExpr: scaled ? `FILTER(${to}, ${scaled})` : '' };
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
    qtd: 'Trimestre en cours (cumul QTD)',
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
