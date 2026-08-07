// Pure, unit-testable "join map" explorer. Given a source key (table.column)
// and a concrete value, it walks the relationship graph outward as far as it
// can reach and reports, for every table, the matched records — so the user
// can see everything related to a key no matter how far, including the other
// columns carried by the matched rows ("the keys inside the same record").

import { normValue, propagateNetwork } from './filters';
import type { RelationGraph, RelationEdge } from './graph';
import type { Row, TableDef } from './model';

export type RelationNode = {
    /** table name */
    table: string;
    /** hop distance from the source table (0 = source) */
    level: number;
    /** matched row count after propagation */
    count: number;
    /** the table this one was reached through, with the join label; null for the source */
    parent: { table: string; columns: string } | null;
    /** kind of the reaching edge (shared vs inferred fk_pk); null for the source */
    edgeKind: RelationEdge['kind'] | null;
    /** confidence (0..1) of the reaching edge; null for the source */
    edgeConfidence: number | null;
    /** columns on this table that carry the reaching join (source = the key column) */
    joinColumns: string[];
    /** why this table has zero matched records (null when it has some, or is the source) */
    emptyReason: 'missing_value' | 'chain_break' | null;
    /** human-readable French explanation of the empty state */
    emptyDetail: string | null;
};

export type RelationLink = {
    from: string;
    to: string;
    /** human-readable join columns, e.g. "ProdGroup" or "ShiftCode · ProdGroup · LogDate" */
    columns: string;
    kind: 'shared' | 'fk_pk';
};

export type RelationMap = {
    source: { table: string; column: string; value: string };
    nodes: RelationNode[];
    links: RelationLink[];
    records: Record<string, Row[]>;
};

function linkLabel(edge: RelationGraph['edges'][number]): string {
    return edge.columns
        .map((pair) =>
            edge.kind === 'fk_pk' && pair.colA !== pair.colB
                ? `${pair.colA} ↔ ${pair.colB}`
                : pair.colA,
        )
        .join(' · ');
}

/**
 * Build the relation map from a source key + value.
 *
 * `rows` is the live filtered context (the store's `tableRows`): non-source
 * tables start from those rows so the map reflects the current report state,
 * then the value seeds the source table and reductions propagate outward
 * through the same engine used for intelligent filtering.
 */
export function buildRelationMap(
    tables: TableDef[],
    rows: Record<string, Row[]>,
    graph: RelationGraph,
    source: { table: string; column: string; value: string },
): RelationMap {
    const empty: RelationMap = {
        source,
        nodes: [],
        links: [],
        records: {},
    };
    const table = tables.find((t) => t.name === source.table);
    if (!table) return empty;
    if (!table.fields.some((f) => f.name === source.column)) return empty;

    const map: Record<string, Row[]> = {};
    for (const t of tables) {
        map[t.name] = rows[t.name] ?? t.rows;
    }
    // Pre-seed copy for diagnosis: which values the source key carries here.
    const base = { ...map };
    const seed = map[source.table]!.filter(
        (r) => normValue(r[source.column]) === normValue(source.value),
    );
    map[source.table] = seed;
    const propagated = propagateNetwork(tables, map, graph, true);

    const levelOf = new Map<string, number>();
    const parentOf = new Map<string, { table: string; edge: RelationEdge }>();
    levelOf.set(source.table, 0);
    const queue = [source.table];
    while (queue.length) {
        const t = queue.shift()!;
        const level = levelOf.get(t)!;
        for (const edge of graph.edges) {
            let next: string;
            if (edge.a === t) next = edge.b;
            else if (edge.b === t) next = edge.a;
            else continue;
            if (levelOf.has(next)) continue;
            levelOf.set(next, level + 1);
            parentOf.set(next, { table: t, edge });
            queue.push(next);
        }
    }

    const sideColumn = (table: string, edge: RelationEdge): string | null => {
        const pair = edge.columns[0];
        if (!pair) return null;
        return edge.a === table
            ? pair.colA
            : edge.b === table
              ? pair.colB
              : null;
    };

    const nodes: RelationNode[] = [...levelOf.entries()]
        .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
        .map(([name, level]) => {
            const count = propagated[name]?.length ?? 0;
            const parentEntry = parentOf.get(name);
            let emptyReason: RelationNode['emptyReason'] = null;
            let emptyDetail: string | null = null;
            if (count === 0) {
                const col =
                    level === 0
                        ? source.column
                        : parentEntry && sideColumn(name, parentEntry.edge);
                const present =
                    col &&
                    (base[name] ?? []).some(
                        (r) => normValue(r[col]) === normValue(source.value),
                    );
                if (level === 0) {
                    emptyReason = 'missing_value';
                    emptyDetail =
                        col && present
                            ? `La valeur « ${source.value} » est présente, mais un filtre sur une table liée vide l'ensemble.`
                            : `Aucune valeur « ${source.value} » dans ${source.table}.${source.column}`;
                } else {
                    let brokenAt: string | null = null;
                    let cur = name;
                    while (true) {
                        const pe = parentOf.get(cur);
                        if (!pe) break;
                        if ((propagated[pe.table]?.length ?? 0) === 0) {
                            brokenAt = pe.table;
                            break;
                        }
                        cur = pe.table;
                    }
                    if (brokenAt && present) {
                        emptyReason = 'chain_break';
                        emptyDetail = `Chaîne rompue à ${brokenAt}`;
                    } else {
                        emptyReason = 'missing_value';
                        emptyDetail = present
                            ? `La valeur « ${source.value} » ne correspond pas via ${linkLabel(parentEntry!.edge)}`
                            : `Aucune valeur « ${source.value} » dans ${name}.${col}`;
                    }
                }
            }
            return {
                table: name,
                level,
                count,
                parent: parentEntry
                    ? {
                          table: parentEntry.table,
                          columns: linkLabel(parentEntry.edge),
                      }
                    : null,
                edgeKind: parentEntry?.edge.kind ?? null,
                edgeConfidence: parentEntry?.edge.confidence ?? null,
                joinColumns: parentEntry
                    ? parentEntry.edge.columns.map((pair) =>
                          parentEntry.edge.a === name ? pair.colA : pair.colB,
                      )
                    : [source.column],
                emptyReason,
                emptyDetail,
            };
        });

    const links: RelationLink[] = [];
    const seenLinks = new Set<string>();
    for (const edge of graph.edges) {
        const aLevel = levelOf.get(edge.a);
        const bLevel = levelOf.get(edge.b);
        if (aLevel === undefined || bLevel === undefined) continue;
        const [from, to] =
            aLevel <= bLevel ? [edge.a, edge.b] : [edge.b, edge.a];
        const label = linkLabel(edge);
        const key = `${from}\u0000${to}\u0000${label}`;
        if (seenLinks.has(key)) continue;
        seenLinks.add(key);
        links.push({ from, to, columns: label, kind: edge.kind });
    }

    const records: Record<string, Row[]> = {};
    for (const name of levelOf.keys()) {
        records[name] = propagated[name] ?? [];
    }

    return { source, nodes, links, records };
}
