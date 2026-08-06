// Pure, unit-testable engine for the "Measure Studio" wizard.
//
// Two responsibilities:
//   1. Explore how tables can be related (join candidates + BFS paths) so the
//      user can build a cross-table measure hop by hop, even when the
//      relationship graph missed an edge (e.g. `taging_reel.MONo` ↔
//      `codestyle.SONo` falls below the fk_pk value-overlap threshold and yet
//      is a real relation the user wants to navigate).
//   2. Generate self-contained DAX that correlates the hops through nested
//      `FILTER`/`COUNTROWS(... TRIM(a[x]) = TRIM(b[y]) ...)` expressions, so
//      the produced measure needs no persisted graph at evaluation time.
//
// The generated expressions are validated against the model's own compiler
// (`compileMeasure` / `compileListMeasure`), so this module stays in sync with
// what the engine can actually evaluate.

import { normValue } from './filters';
import type { Row, TableDef } from './model';

/** A single candidate link between two loaded tables. */
export type JoinCandidate = {
    /** table on the "from" side */
    a: string;
    /** column on the `a` side */
    aCol: string;
    /** table on the "to" side */
    b: string;
    /** column on the `b` side */
    bCol: string;
    kind: 'shared' | 'fk_pk' | 'manual';
    /** shared-name 1 / value overlap ratio for fk_pk */
    overlap: number;
    /** 0..1 confidence used for ranking */
    confidence: number;
    /**
     * true when the candidate was confirmed against real values; false when it
     * is only a column-name coincidence that the UI should flag "à vérifier".
     * undefined for persistsed/manual links which are user-approved.
     */
    verified?: boolean;
};

/** One directed hop in a proposed path. `fromCol` lives on `from`. */
export type PathHop = {
    from: string;
    to: string;
    fromCol: string;
    toCol: string;
    kind: JoinCandidate['kind'];
    overlap: number;
    confidence: number;
    verified?: boolean;
};

export type ProposedPath = {
    /** start table */
    from: string;
    /** target table */
    to: string;
    /** ordered hops forming the chain (length 0 when from === to) */
    hops: PathHop[];
    blocked: null | { reason: string; detail: string };
};

export type MeasureKind = 'list' | 'countrows' | 'number';

export type NumericAgg = 'sum' | 'avg' | 'min' | 'max' | 'count';

export type ValueCondition = {
    column: string;
    op: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq';
    value: string;
};

export type WizardSpec = {
    /** base table (the measure's own dataset) */
    from: string;
    /** target table where rows/columns are counted or listed */
    to: string;
    /** ordered hops from → to (the chain the DAX correlates) */
    hops: PathHop[];
    kind: MeasureKind;
    /** column on the target table (number: aggregated; list: VALUES) */
    column: string;
    /** numeric aggregation when kind === 'number' */
    agg: NumericAgg;
    /** optional extra condition applied to target rows */
    condition?: ValueCondition;
};

/** A join the user can persist and share across sessions (backend tier B). */
export type PersistedJoin = {
    id?: string;
    tableA: string;
    columnA: string;
    tableB: string;
    columnB: string;
    trimCompare: boolean;
};

/** Fuzzy value-overlap floor for proposing an fk_pk hop (lenient in wizard). */
export const FUZZY_OVERLAP_THRESHOLD = 0.2;

/** Minimum overlap to consider a link even without a key-like column name. */
const STRONG_OVERLAP = 0.5;

function distinctSet(rows: Row[], col: string): Set<string> {
    const set = new Set<string>();
    for (const r of rows) {
        const v = r[col];
        if (v === null || v === undefined) continue;
        const n = normValue(v);
        if (n) set.add(n);
    }
    return set;
}

function keyLikeName(name: string): boolean {
    const c = name.trim().toLowerCase();
    return (
        c === 'id' ||
        c === 'code' ||
        c === 'reference' ||
        c.startsWith('id') ||
        c.startsWith('code') ||
        c.startsWith('num') ||
        c.startsWith('ref') ||
        c.endsWith('id') ||
        c.endsWith('code') ||
        c.endsWith('no') ||
        c.endsWith('num') ||
        c.endsWith('ref')
    );
}

/**
 * Columns that are clearly measures/quantities (or stored numbers) must never
 * be suggested as join keys: they produce absurd high-overlap "links" such as
 * `entree_chaine ↔ OrderQty`. Keys are text-ish identifiers.
 */
/**
 * Columns that are clearly measures/quantities (or stored numbers) must never
 * be suggested as join keys: they produce absurd high-overlap "links" such as
 * `entree_chaine ↔ OrderQty`. Keys are text-ish identifiers.
 */
function isShiftKeyColumn(field: { name: string; type?: string }): boolean {
    if (field.type === 'number') return true;
    const c = field.name.trim().toLowerCase();
    const tokens =
        c
            .match(/[a-z0-9]+/g)
            ?.filter(Boolean)
            .join(' ') ?? '';
    return [
        'qty',
        'quantity',
        'qte',
        'qtt',
        'amount',
        'montant',
        'weight',
        'poids',
        'price',
        'prix',
        'total',
        'defectqty',
        'todayqty',
        'clocktime',
        'losttime',
        'smv',
        'sum',
        'count',
    ].some((k) => tokens.includes(k));
}

/**
 * Normalized value-overlap between two columns. Returns null when either side
 * is too small to make a judgement (2+ distinct values required), which callers
 * use to fall back to name-only trust.
 */
function overlapRatio(setA: Set<string>, setB: Set<string>): number | null {
    if (setA.size < 2 || setB.size < 2) return null;
    const denom = Math.min(setA.size, setB.size);
    const [small, big] = setA.size <= setB.size ? [setA, setB] : [setB, setA];
    let num = 0;
    for (const v of small) if (big.has(v)) num++;
    return num / denom;
}

/**
 * Candidate links between two tables:
 *   - shared-name columns with verified value overlap always win;
 *   - differently-named columns with overlapping normalized values follow;
 *   - metric/number columns are never keys.
 * A shared *name* without matching values is kept but demoted to a low,
 * "nom seul — à vérifier" confidence so it never beats a real, value-verified
 * link. (e.g. `EmpDefectEff.MONo` name-matches `codestyle.MONo` yet shares no
 * order number, while `etat_avancement.OF_No` genuinely overlaps.)
 */
export function joinCandidates(a: TableDef, b: TableDef): JoinCandidate[] {
    const out: JoinCandidate[] = [];
    const push = (c: JoinCandidate) => out.push(c);

    for (const fa of a.fields) {
        if (fa.type === 'boolean') continue;
        if (isShiftKeyColumn(fa)) continue;
        for (const fb of b.fields) {
            if (fb.type === 'boolean') continue;
            if (isShiftKeyColumn(fb)) continue;

            const sameName =
                fa.name.trim().toLowerCase() === fb.name.trim().toLowerCase();
            const setA = distinctSet(a.rows, fa.name);
            const setB = distinctSet(b.rows, fb.name);
            const ratio = overlapRatio(setA, setB);

            if (sameName) {
                if (ratio === null) {
                    // Sufficient data to confirm but not refute: trust the name.
                    push({
                        a: a.name,
                        aCol: fa.name,
                        b: b.name,
                        bCol: fb.name,
                        kind: 'shared',
                        overlap: 1,
                        confidence: 1,
                    });
                    continue;
                }
                const verified = ratio >= FUZZY_OVERLAP_THRESHOLD;
                const confidence = verified ? ratio : 0.05;
                push({
                    a: a.name,
                    aCol: fa.name,
                    b: b.name,
                    bCol: fb.name,
                    kind: 'shared',
                    overlap: ratio,
                    confidence,
                    verified,
                });
                continue;
            }

            if (ratio === null) continue;
            const denom = Math.min(setA.size, setB.size);
            if (!denom) continue;
            if (ratio < FUZZY_OVERLAP_THRESHOLD) continue;
            if (
                !keyLikeName(fa.name) &&
                !keyLikeName(fb.name) &&
                ratio < STRONG_OVERLAP
            )
                continue;
            push({
                a: a.name,
                aCol: fa.name,
                b: b.name,
                bCol: fb.name,
                kind: 'fk_pk',
                overlap: ratio,
                confidence: Math.min(1, ratio + 0.1),
                verified: ratio >= STRONG_OVERLAP,
            });
        }
    }

    out.sort(
        (x, y) =>
            y.confidence - x.confidence ||
            (y.kind === 'shared' ? 1 : 0) - (x.kind === 'shared' ? 1 : 0),
    );
    return out;
}

/**
 * Dijkstra hop search from `from` to `to` over the lenient candidate links
 * (plus any persisted `manual` joins). Edges are weighted so the *most
 * plausible* chain wins (few unreliable hops over many), falling back to the
 * shortest when the quality is equal. Manual/persisted joins are free.
 */
export function proposePath(
    tables: TableDef[],
    from: string,
    to: string,
    manual: JoinCandidate[] = [],
): ProposedPath {
    const blocked = (reason: string, detail: string): ProposedPath => ({
        from,
        to,
        hops: [],
        blocked: { reason, detail },
    });

    if (from === to) return { from, to, hops: [], blocked: null };

    const start = tables.find((t) => t.name === from);
    const target = tables.find((t) => t.name === to);
    if (!start)
        return blocked('Table inconnue', `« ${from} » n'est pas chargée.`);
    if (!target)
        return blocked('Table inconnue', `« ${to} » n'est pas chargée.`);

    const adjacency = new Map<string, PathHop[]>();
    const addDir = (hop: PathHop) => {
        const list = adjacency.get(hop.from) ?? [];
        list.push(hop);
        adjacency.set(hop.from, list);
    };
    const link = (c: JoinCandidate) => {
        const seed = (hop: PathHop) => addDir(hop);
        seed({
            from: c.a,
            to: c.b,
            fromCol: c.aCol,
            toCol: c.bCol,
            kind: c.kind,
            overlap: c.overlap,
            confidence: c.confidence,
            verified: c.verified,
        });
        seed({
            from: c.b,
            to: c.a,
            fromCol: c.bCol,
            toCol: c.aCol,
            kind: c.kind,
            overlap: c.overlap,
            confidence: c.confidence,
            verified: c.verified,
        });
    };

    for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
            for (const c of joinCandidates(tables[i]!, tables[j]!)) link(c);
        }
    }
    for (const c of manual) link(c);

    const hopCost = (h: PathHop): number => {
        if (h.kind === 'manual') return 0;
        if (h.kind === 'shared') {
            // verified shared name: cheap; same name but no shared value: expensive
            return h.confidence >= FUZZY_OVERLAP_THRESHOLD
                ? 0.1 + (1 - Math.min(1, h.confidence)) * 0.6
                : 2;
        }
        // fk_pk: cheaper as overlap grows
        return 1 - Math.min(1, h.confidence);
    };

    // A hop is "reliable" when its value match was confirmed (or the user
    // persisted it manually). Unverified name-only links are excluded unless
    // no fully-reliable route exists.
    const isReliable = (h: PathHop): boolean =>
        h.kind === 'manual' || h.verified !== false;

    const shortest = (reliableOnly: boolean): PathHop[] | null => {
        const dist = new Map<string, number>();
        const prev = new Map<string, PathHop>();
        const done = new Set<string>();
        for (const t of tables) dist.set(t.name, Infinity);
        dist.set(from, 0);

        let cur: string | null = from;
        while (cur !== null) {
            if (cur === to) break;
            done.add(cur);
            const base = dist.get(cur) ?? Infinity;
            for (const hop of adjacency.get(cur) ?? []) {
                if (done.has(hop.to)) continue;
                if (reliableOnly && !isReliable(hop)) continue;
                const nd = base + hopCost(hop);
                if (nd < (dist.get(hop.to) ?? Infinity)) {
                    dist.set(hop.to, nd);
                    prev.set(hop.to, hop);
                }
            }
            let next: string | null = null;
            let best = Infinity;
            for (const t of tables) {
                if (done.has(t.name)) continue;
                const d = dist.get(t.name) ?? Infinity;
                if (d < best) {
                    best = d;
                    next = t.name;
                }
            }
            cur = next;
        }

        if ((dist.get(to) ?? Infinity) === Infinity) return null;
        const hops: PathHop[] = [];
        let trail: string | undefined = to;
        while (trail && trail !== from) {
            const p = prev.get(trail);
            if (!p) return null;
            hops.unshift(p);
            trail = p.from;
        }
        if (!hops.length || hops[0]!.from !== from) return null;
        return hops;
    };

    const reliable = shortest(true);
    if (reliable) return { from, to, hops: reliable, blocked: null };

    const fallback = shortest(false);
    if (fallback) return { from, to, hops: fallback, blocked: null };

    return blocked(
        'Chemin introuvable',
        `Aucune colonne ne relie « ${from} » à « ${to} », même sur les valeurs partagées.`,
    );
}

/**
 * True when a hop is backed by confirmed values (or a persisted manual join).
 * Used by the UI to gate a measure behind validated relationships.
 */
export function isReliableHop(h: PathHop | undefined): boolean {
    if (!h) return false;
    return h.kind === 'manual' || h.verified !== false;
}

/** True only when every hop of the path is reliable. */
export function isReliablePath(hops: PathHop[]): boolean {
    return hops.every(isReliableHop);
}

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
