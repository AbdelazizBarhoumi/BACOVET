import type {
    MeasureKind,
    NumericAgg,
    PathHop,
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
};

const quoteValue = (v: string): string =>
    /^-?\d+(\.\d+)?$/.test(v) ? v : `'${v.replace(/['"]/g, '')}'`;

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
 */
function exists(hops: PathHop[], i: number, from: string): string {
    if (i === 0) return '';
    const h = hops[i - 1]!;
    const prev = nodeName(hops, i - 1, from);
    const cur = nodeName(hops, i, from);
    const eq = `TRIM(${prev}[${h.fromCol}]) = TRIM(${cur}[${h.toCol}])`;
    const inner = exists(hops, i - 1, from);
    return `COUNTROWS(FILTER(${prev}, ${eq}${inner ? ` && ${inner}` : ''})) > 0`;
}

/**
 * Build a self-contained DAX expression from the wizard spec. Lists become
 * `VALUES(FILTER(target, <chain>) [column])`, row counts become
 * `COUNTROWS(FILTER(...))`, numbers become iterator aggregations over the
 * filtered target rows. All join keys are TRIM-ed because real keys are
 * left-padded (MONo 15, ProdGroup 40).
 */
export function buildMeasureDax(spec: WizardSpec): string {
    const { from, to, hops, kind, column, agg, condition } = spec;
    const chain = exists(hops, hops.length, from);
    const scaled =
        condition !== undefined && chain
            ? `${chain} && TRIM(${to}[${condition.column}]) ${COND_OPS[condition.op]} ${quoteValue(condition.value)}`
            : condition !== undefined
              ? `TRIM(${to}[${condition.column}]) ${COND_OPS[condition.op]} ${quoteValue(condition.value)}`
              : chain;

    if (hops.length === 0 && condition === undefined) {
        switch (kind) {
            case 'list':
                return `VALUES(${to}[${column}])`;
            case 'countrows':
                return `COUNTROWS(${to})`;
            case 'number': {
                const expr = `${to}[${column}]`;
                switch (agg) {
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

    const filter = `FILTER(${to}, ${scaled})`;

    switch (kind) {
        case 'list':
            return `VALUES(${filter}[${column}])`;
        case 'countrows':
            return `COUNTROWS(${filter})`;
        case 'number': {
            const expr = `${to}[${column}]`;
            switch (agg) {
                case 'sum':
                    return `SUMX(${filter}, ${expr})`;
                case 'avg':
                    return `AVERAGEX(${filter}, ${expr})`;
                case 'min':
                    return `MINX(${filter}, ${expr})`;
                case 'max':
                    return `MAXX(${filter}, ${expr})`;
                case 'count':
                    return `COUNTX(${filter}, ${expr})`;
            }
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
};

export const KIND_LABELS: Record<MeasureKind, string> = {
    list: 'Liste de valeurs',
    countrows: 'Nombre de lignes',
    number: 'Valeur numérique',
};

/**
 * Full measure expression (`Name = <body>`) as stored in the library and
 * accepted by the model's compiler, which requires the `word = ` prefix.
 */
export function measureExpression(name: string, spec: WizardSpec): string {
    return `${name.trim() || 'Mesure'} = ${buildMeasureDax(spec)}`;
}
