// Pure, unit-testable "join map" explorer. Given a source key (table.column)
// and a concrete value, it walks the relationship graph outward as far as it
// can reach and reports, for every table, the matched records — so the user
// can see everything related to a key no matter how far, including the other
// columns carried by the matched rows ("the keys inside the same record").

import { normValue, propagateNetwork } from './filters';
import type { RelationGraph } from './graph';
import type { Row, TableDef } from './model';

export type RelationNode = {
    /** table name */
    table: string;
    /** hop distance from the source table (0 = source) */
    level: number;
    /** matched row count after propagation */
    count: number;
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
    const seed = map[source.table]!.filter(
        (r) => normValue(r[source.column]) === normValue(source.value),
    );
    map[source.table] = seed;
    const propagated = propagateNetwork(tables, map, graph, true);

    const levelOf = new Map<string, number>();
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
            queue.push(next);
        }
    }

    const nodes: RelationNode[] = [...levelOf.entries()]
        .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
        .map(([name, level]) => ({
            table: name,
            level,
            count: propagated[name]?.length ?? 0,
        }));

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
