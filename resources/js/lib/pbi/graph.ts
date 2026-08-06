// Relationship graph for intelligent (network) filtering.
//
// Two kinds of edges connect loaded tables:
//   - `shared`: the same (normalized) column name appears on both tables
//     (from the existing join registry), plus configured composite tuples
//     that must match as a unit.
//   - `fk_pk`: a differently-named foreign-key / primary-key relationship
//     inferred from overlapping normalized values across the loaded rows,
//     gated by "at least one side is key-like" so generic columns (e.g.
//     "Name") do not become spurious links. Server schema PK/FK data, when
//     available, boosts the confidence of matching pairs.

import type { SchemaAnalysis } from '@/services/endpointManagerApi';
import { normValue } from './filters';
import type { JoinRegistry } from './joins';
import { canonical } from './joins';
import type { Row, TableDef } from './model';

export type ColumnPair = {
    colA: string;
    colB: string;
};

export type RelationEdge = {
    /** table A name */
    a: string;
    /** table B name */
    b: string;
    /** 1 pair = simple key, 2+ pairs = tuple/composite key */
    columns: ColumnPair[];
    kind: 'shared' | 'fk_pk';
    confidence: number;
};

export type RelationGraph = {
    edges: RelationEdge[];
};

export const EMPTY_GRAPH: RelationGraph = { edges: [] };

/**
 * Merge manually persisted joins (shared join library, tier B) into the graph
 * as high-confidence edges. Only joins whose both tables are actually loaded
 * are kept, so a global join library never references absent datasets.
 */
export function graphWithManualJoins(
    graph: RelationGraph,
    manual: readonly {
        tableA: string;
        columnA: string;
        tableB: string;
        columnB: string;
        confidence?: number;
    }[],
    tables: { name: string }[],
): RelationGraph {
    const names = new Set(tables.map((t) => t.name));
    const edges = [...graph.edges];
    for (const j of manual) {
        if (!names.has(j.tableA) || !names.has(j.tableB)) continue;
        const duplicate = edges.some(
            (e) =>
                (e.a === j.tableA && e.b === j.tableB) ||
                (e.a === j.tableB && e.b === j.tableA),
        );
        if (duplicate) continue;
        edges.push({
            a: j.tableA,
            b: j.tableB,
            columns: [{ colA: j.columnA, colB: j.columnB }],
            kind: 'shared',
            confidence: j.confidence ?? 1,
        });
    }
    return { edges };
}

/** Minimum value-overlap (of the smaller side) to infer an fk_pk edge. */
const FK_OVERLAP_THRESHOLD = 0.85;

/** Cap of inferred edges kept per table pair (best-overlap first). */
const MAX_EDGES_PER_PAIR = 3;

/** Shared-key tuples that must match as a unit (not as independent columns). */
const SHARED_COMPOSITE_GROUPS: ReadonlyArray<readonly string[]> = [
    ['shiftcode', 'prodgroup', 'logdate'],
];

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
        const cols = new Set<string>();
        for (const c of entry.columns ?? []) {
            if (c.unique) cols.add(c.name.trim().toLowerCase());
        }
        for (const c of entry.candidate_keys ?? [])
            cols.add(c.trim().toLowerCase());
        if (entry.primary_key?.column) {
            cols.add(entry.primary_key.column.trim().toLowerCase());
        }
        if (!cols.size) continue;

        for (const key of [
            entry.name,
            entry.slug,
            entry.slug?.split('/').pop() ?? '',
        ]) {
            const normalized = key.trim().toLowerCase();
            if (normalized) map.set(normalized, cols);
        }
    }
    return map;
}

function schemaKeysForTable(
    schemaKeys: Map<string, Set<string>>,
    table: TableDef,
): Set<string> | undefined {
    for (const key of [
        table.name,
        table.slug ?? '',
        table.slug?.split('/').pop() ?? '',
        table.label ?? '',
        table.object ?? '',
    ]) {
        const found = schemaKeys.get(key.trim().toLowerCase());
        if (found) return found;
    }
    return undefined;
}

function entryFieldForTable(
    joins: JoinRegistry,
    canonicalColumn: string,
    tableName: string,
): string | null {
    return (
        joins[canonicalColumn]?.participants.find(
            (p) => p.tableName === tableName,
        )?.fieldName ?? null
    );
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
    const compositeSkip = new Set<string>();
    for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
            const tableA = tables[i]!.name;
            const tableB = tables[j]!.name;
            for (const group of SHARED_COMPOSITE_GROUPS) {
                const hasGroup = group.every((canonicalColumn) => {
                    return (
                        entryFieldForTable(joins, canonicalColumn, tableA) &&
                        entryFieldForTable(joins, canonicalColumn, tableB)
                    );
                });
                if (!hasGroup) continue;
                for (const canonicalColumn of group) {
                    compositeSkip.add(
                        `${tableA}\u0000${tableB}\u0000${canonicalColumn}`,
                    );
                    compositeSkip.add(
                        `${tableB}\u0000${tableA}\u0000${canonicalColumn}`,
                    );
                }
            }
        }
    }

    const addEdge = (
        a: string,
        b: string,
        columns: ColumnPair[],
        kind: RelationEdge['kind'],
        confidence: number,
    ) => {
        if (!columns.length) return;
        const keyColsA = columns
            .map((pair) => `${pair.colA}\u0001${pair.colB}`)
            .join('\u0002');
        const keyColsB = columns
            .map((pair) => `${pair.colB}\u0001${pair.colA}`)
            .join('\u0002');
        const keyA = [a, b, keyColsA].join('\u0000');
        const keyB = [b, a, keyColsB].join('\u0000');
        if (seen.has(keyA) || seen.has(keyB)) return;
        seen.add(keyA);
        seen.add(keyB);
        edges.push({ a, b, columns, kind, confidence });
    };

    for (const entry of Object.values(joins)) {
        const ps = entry.participants;
        for (let i = 0; i < ps.length; i++) {
            for (let j = i + 1; j < ps.length; j++) {
                const tableA = ps[i]!.tableName;
                const tableB = ps[j]!.tableName;
                const canonicalColumn = canonical(entry.type);
                if (
                    compositeSkip.has(
                        `${tableA}\u0000${tableB}\u0000${canonicalColumn}`,
                    )
                ) {
                    continue;
                }
                addEdge(
                    tableA,
                    tableB,
                    [
                        {
                            colA: ps[i]!.fieldName,
                            colB: ps[j]!.fieldName,
                        },
                    ],
                    'shared',
                    1,
                );
            }
        }
    }

    for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
            const tableA = tables[i]!.name;
            const tableB = tables[j]!.name;
            for (const group of SHARED_COMPOSITE_GROUPS) {
                const columns: ColumnPair[] = [];
                let complete = true;
                for (const canonicalColumn of group) {
                    const colA = entryFieldForTable(
                        joins,
                        canonicalColumn,
                        tableA,
                    );
                    const colB = entryFieldForTable(
                        joins,
                        canonicalColumn,
                        tableB,
                    );
                    if (!colA || !colB) {
                        complete = false;
                        break;
                    }
                    columns.push({ colA, colB });
                }
                if (!complete) continue;
                addEdge(tableA, tableB, columns, 'shared', 1);
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
                    const aSchema = schemaKeysForTable(schemaKeys, A)?.has(
                        fa.name.trim().toLowerCase(),
                    );
                    const bSchema = schemaKeysForTable(schemaKeys, B)?.has(
                        fb.name.trim().toLowerCase(),
                    );
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
                const aKeyed = schemaKeysForTable(schemaKeys, A)?.has(
                    p.colA.trim().toLowerCase(),
                );
                const bKeyed = schemaKeysForTable(schemaKeys, B)?.has(
                    p.colB.trim().toLowerCase(),
                );
                if (aKeyed && bKeyed) confidence = 1;
                addEdge(
                    A.name,
                    B.name,
                    [{ colA: p.colA, colB: p.colB }],
                    'fk_pk',
                    confidence,
                );
            }
        }
    }

    return { edges };
}
