// Relationship graph for intelligent (network) filtering.
//
// Two kinds of edges connect loaded tables:
//   - `shared`: the same (normalized) column name appears on both tables
//     (from the existing join registry).
//   - `fk_pk`: a differently-named foreign-key / primary-key relationship
//     inferred from overlapping normalized values across the loaded rows,
//     gated by "at least one side is key-like" so generic columns (e.g.
//     "Name") do not become spurious links. Server schema PK/FK data, when
//     available, boosts the confidence of matching pairs.

import type { SchemaAnalysis } from '@/services/endpointManagerApi';
import { normValue } from './filters';
import type { JoinRegistry } from './joins';
import type { Row, TableDef } from './model';

export type RelationEdge = {
    /** table A name */
    a: string;
    /** join column on A */
    colA: string;
    /** table B name */
    b: string;
    /** join column on B */
    colB: string;
    kind: 'shared' | 'fk_pk';
    confidence: number;
};

export type RelationGraph = {
    edges: RelationEdge[];
};

export const EMPTY_GRAPH: RelationGraph = { edges: [] };

/** Minimum value-overlap (of the smaller side) to infer an fk_pk edge. */
const FK_OVERLAP_THRESHOLD = 0.85;

/** Cap of inferred edges kept per table pair (best-overlap first). */
const MAX_EDGES_PER_PAIR = 3;

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
    if (
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
    ) {
        return true;
    }
    return false;
}

function isNearUnique(rows: Row[], col: string): boolean {
    const set = distinctSet(rows, col);
    if (set.size < 2) return false;
    let nonNull = 0;
    for (const r of rows) {
        const v = r[col];
        if (v !== null && v !== undefined) nonNull++;
    }
    return nonNull > 0 && set.size >= nonNull * 0.8;
}

/** schema-normalized table name -> set of normalized key/unique column names. */
function schemaKeyMap(
    schema: SchemaAnalysis | undefined,
): Map<string, Set<string>> {
    const map = new Map<string, Set<string>>();
    if (!schema) return map;
    for (const entry of schema.entries ?? []) {
        const key = entry.name.trim().toLowerCase();
        if (!key) continue;
        const cols = new Set<string>();
        for (const c of entry.columns ?? []) {
            if (c.unique) cols.add(c.name.trim().toLowerCase());
        }
        for (const c of entry.candidate_keys ?? [])
            cols.add(c.trim().toLowerCase());
        if (entry.primary_key?.column) {
            cols.add(entry.primary_key.column.trim().toLowerCase());
        }
        if (cols.size) map.set(key, cols);
    }
    return map;
}

/**
 * Build the relationship graph over the loaded tables.
 *
 * Shared-name edges come from the existing `joins` registry; fk_pk edges are
 * inferred from overlapping values on the loaded sample rows, so
 * differently-named foreign/primary keys are discovered without needing the
 * schema analyzer to have matched them by name.
 */
export function buildRelationGraph(
    tables: TableDef[],
    joins: JoinRegistry = {},
    schema?: SchemaAnalysis,
): RelationGraph {
    const edges: RelationEdge[] = [];
    const seen = new Set<string>();
    const addEdge = (
        a: string,
        colA: string,
        b: string,
        colB: string,
        kind: RelationEdge['kind'],
        confidence: number,
    ) => {
        const keyA = [a, colA, b, colB].join('\u0000');
        const keyB = [b, colB, a, colA].join('\u0000');
        if (seen.has(keyA) || seen.has(keyB)) return;
        seen.add(keyA);
        seen.add(keyB);
        edges.push({ a, colA, b, colB, kind, confidence });
    };

    for (const entry of Object.values(joins)) {
        const ps = entry.participants;
        for (let i = 0; i < ps.length; i++) {
            for (let j = i + 1; j < ps.length; j++) {
                addEdge(
                    ps[i]!.tableName,
                    ps[i]!.fieldName,
                    ps[j]!.tableName,
                    ps[j]!.fieldName,
                    'shared',
                    1,
                );
            }
        }
    }

    const schemaKeys = schemaKeyMap(schema);

    for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
            const A = tables[i]!;
            const B = tables[j]!;
            const pairs: { colA: string; colB: string; overlap: number }[] = [];

            for (const fa of A.fields) {
                if (fa.type === 'boolean') continue;
                const setA = distinctSet(A.rows, fa.name);
                if (setA.size < 2) continue;
                for (const fb of B.fields) {
                    if (fb.type === 'boolean') continue;
                    const setB = distinctSet(B.rows, fb.name);
                    if (setB.size < 2) continue;
                    // Same-named columns are the join registry's territory (and
                    // routinely collide across unrelated tables, e.g. `id`,
                    // `code`, `date`), so fk_pk inference only links differently
                    // named columns.
                    if (
                        fa.name.trim().toLowerCase() ===
                        fb.name.trim().toLowerCase()
                    )
                        continue;
                    const denom = Math.min(setA.size, setB.size);
                    if (!denom) continue;
                    const [small, big] =
                        setA.size <= setB.size ? [setA, setB] : [setB, setA];
                    let overlap = 0;
                    for (const v of small) if (big.has(v)) overlap++;
                    const ratio = overlap / denom;
                    if (ratio < FK_OVERLAP_THRESHOLD) continue;
                    const aKey =
                        keyLikeName(fa.name) || isNearUnique(A.rows, fa.name);
                    const bKey =
                        keyLikeName(fb.name) || isNearUnique(B.rows, fb.name);
                    if (!aKey || !bKey) continue;
                    // At least one side must be key-like *by name* (or be a
                    // schema-confirmed key). A near-unique value alone (e.g.
                    // Amount, Target, dates) is too weak and would link columns
                    // that merely happen to overlap.
                    const aNameKey = keyLikeName(fa.name);
                    const bNameKey = keyLikeName(fb.name);
                    const aSchema = schemaKeys
                        .get(A.name.trim().toLowerCase())
                        ?.has(fa.name.trim().toLowerCase());
                    const bSchema = schemaKeys
                        .get(B.name.trim().toLowerCase())
                        ?.has(fb.name.trim().toLowerCase());
                    if (!aNameKey && !bNameKey && !aSchema && !bSchema)
                        continue;
                    pairs.push({
                        colA: fa.name,
                        colB: fb.name,
                        overlap: ratio,
                    });
                }
            }

            pairs.sort((x, y) => y.overlap - x.overlap);
            for (const p of pairs.slice(0, MAX_EDGES_PER_PAIR)) {
                let confidence = Math.min(1, p.overlap + 0.1);
                const aC = A.name.trim().toLowerCase();
                const bC = B.name.trim().toLowerCase();
                const aKeyed = schemaKeys
                    .get(aC)
                    ?.has(p.colA.trim().toLowerCase());
                const bKeyed = schemaKeys
                    .get(bC)
                    ?.has(p.colB.trim().toLowerCase());
                if (aKeyed && bKeyed) confidence = 1;
                addEdge(A.name, p.colA, B.name, p.colB, 'fk_pk', confidence);
            }
        }
    }

    return { edges };
}
