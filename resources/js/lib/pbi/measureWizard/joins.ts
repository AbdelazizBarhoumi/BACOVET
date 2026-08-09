import { normValue } from '../filters';
import type { Row, TableDef } from '../model';
import { FUZZY_OVERLAP_THRESHOLD, type JoinCandidate } from './types';

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

/**
 * Pre-computed distinct value-sets for every (table, field) pair, built once
 * per all-pairs scan. Whole-graph paths (buildGraph) call joinCandidates once
 * per table pair; without this cache each call re-scans a table's rows for
 * *every* field pair, turning an all-pairs scan into
 * O(pairs × columns² × rows). A single per-field computation collapses it to
 * O(tables × columns × rows). Only the fields joinCandidates will actually
 * read are materialised, so the cached map is exactly what the pair-wise
 * decision logic needs. Built per call — never shared across table versions.
 */
export type FieldSets = ReadonlyMap<string, ReadonlySet<string>>;

/**
 * Callback producing the cached distinct-sets of a table's join-relevant
 * fields. Supplied by whole-graph callers; omitted by single-pair callers,
 * which keep computing their sets inline.
 */
export type GetFieldSets = (t: TableDef) => FieldSets;

export function makeFieldSetsCache(): GetFieldSets {
    const cache = new WeakMap<TableDef, FieldSets>();
    return (t: TableDef): FieldSets => {
        let sets = cache.get(t);
        if (!sets) {
            const built = new Map<string, ReadonlySet<string>>();
            for (const f of t.fields) {
                if (f.type === 'boolean' || isShiftKeyColumn(f)) continue;
                built.set(f.name, distinctSet(t.rows, f.name));
            }
            sets = built;
            cache.set(t, sets);
        }
        return sets;
    };
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
function overlapRatio(
    setA: ReadonlySet<string>,
    setB: ReadonlySet<string>,
): number | null {
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
export function joinCandidates(
    a: TableDef,
    b: TableDef,
    getSets?: GetFieldSets,
): JoinCandidate[] {
    const out: JoinCandidate[] = [];
    const push = (c: JoinCandidate) => out.push(c);

    for (const fa of a.fields) {
        if (fa.type === 'boolean' || isShiftKeyColumn(fa)) continue;
        for (const fb of b.fields) {
            if (fb.type === 'boolean' || isShiftKeyColumn(fb)) continue;

            const sameName =
                fa.name.trim().toLowerCase() === fb.name.trim().toLowerCase();
            const setA = getSets
                ? (getSets(a).get(fa.name) ?? distinctSet(a.rows, fa.name))
                : distinctSet(a.rows, fa.name);
            const setB = getSets
                ? (getSets(b).get(fb.name) ?? distinctSet(b.rows, fb.name))
                : distinctSet(b.rows, fb.name);
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

    // Rank: confidence first, then prefer genuine identifier columns
    // (MONo/SONo/StyleCode/OeNo…) over generic name-coincidence columns like
    // `chaine`, so the UI lists real keys ahead of shared hub names when their
    // value-overlap confidence is equal. Confidence is left untouched.
    const identScore = (c: JoinCandidate) =>
        (keyLikeName(c.aCol) ? 1 : 0) + (keyLikeName(c.bCol) ? 1 : 0);
    out.sort(
        (x, y) =>
            y.confidence - x.confidence ||
            identScore(y) - identScore(x) ||
            (y.kind === 'shared' ? 1 : 0) - (x.kind === 'shared' ? 1 : 0),
    );
    return out;
}
