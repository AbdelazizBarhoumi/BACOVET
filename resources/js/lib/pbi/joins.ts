// Cross-table relationships derived from the endpoint schema analyzer's
// shared join columns, plus the row-level helpers that make cross-filtering
// and multi-table widgets "work in harmony" across related datasets.

import type { SchemaAnalysis } from '@/services/endpointManagerApi';
import { normValue, propagateNetwork } from './filters';
import type { RelationGraph } from './graph';
import {
    type CrossFilter,
    type Interaction,
    type Row,
    type TableDef,
    type Visual,
    type WellField,
    findTableForField,
    isMeasure,
    measureColumnRefs,
    visualTable,
} from './model';

/** One table that exposes a shared join column (with its real field name). */
export type JoinParticipant = {
    tableName: string;
    fieldName: string;
};

/**
 * canonical (trimmed, lowercased) column name -> shared join column.
 * Only columns confirmed as genuine shared joins (endpoint_count >= 2) and
 * that actually connect at least two loaded tables are kept.
 */
export type JoinRegistry = Record<
    string,
    { type: string; participants: JoinParticipant[] }
>;

export type JoinColumn = { colInA: string; colInB: string };

export function canonical(name: string): string {
    return name.trim().toLowerCase();
}

export function buildJoinRegistry(
    schema: SchemaAnalysis,
    tables: TableDef[],
): JoinRegistry {
    const registry: JoinRegistry = {};
    for (const col of schema.columns) {
        if (!col || col.endpoint_count < 2) continue;
        const key = canonical(col.name);
        if (!key) continue;
        const participants: JoinParticipant[] = [];
        for (const t of tables) {
            for (const f of t.fields) {
                if (canonical(f.name) === key) {
                    participants.push({ tableName: t.name, fieldName: f.name });
                    break;
                }
            }
        }
        if (participants.length >= 2) {
            registry[key] = { type: col.type, participants };
        }
    }
    return registry;
}

/** First shared join column linking two tables, or null when unrelated. */
export function findJoin(
    joins: JoinRegistry,
    tableA: string,
    tableB: string,
): JoinColumn | null {
    for (const entry of Object.values(joins)) {
        const a = entry.participants.find((p) => p.tableName === tableA);
        const b = entry.participants.find((p) => p.tableName === tableB);
        if (a && b) return { colInA: a.fieldName, colInB: b.fieldName };
    }
    return null;
}

/** The target table's real field name for a canonical join column, if any. */
export function resolveJoinField(
    joins: JoinRegistry,
    canonicalName: string,
    tableName: string,
): string | null {
    return (
        joins[canonicalName]?.participants.find(
            (p) => p.tableName === tableName,
        )?.fieldName ?? null
    );
}

/**
 * Attach values from related tables onto the visual's primary-table rows for
 * every well field whose table differs from the visual's table and whose
 * column is not already present. Joins are resolved via the first shared join
 * column between the two tables; a row with no matching join value gets null.
 *
 * Many-to-one (fact -> dimension) joins resolve naturally; one-to-many
 * collapses to the first matching value.
 */
export function enrichRows(
    visual: Visual,
    rows: Row[],
    tables: TableDef[],
    joins: JoinRegistry,
    measureExpressions?: Record<string, string>,
): Row[] {
    if (!rows.length || !Object.keys(joins).length) return rows;
    const primary = visualTable(visual);
    if (!primary) return rows;

    const wells: WellField[][] = [
        visual.axis,
        visual.legend,
        visual.values,
        visual.tooltips,
        visual.drillFields,
        visual.smallMultiples,
    ];

    /** {table, column} pairs to join onto the primary rows, deduped. */
    const wanted: { table: string; column: string }[] = [];
    const seen = new Set<string>();

    const addWanted = (table: string | undefined, column: string) => {
        const t = table || findTableForField(column);
        if (!t || t === primary) return;
        const key = `${t}\u0000${column}`;
        if (seen.has(key)) return;
        seen.add(key);
        wanted.push({ table: t, column });
    };

    for (const well of wells) {
        for (const field of well) {
            if (field.name === '') continue;
            if (rows[0] && field.name in rows[0]) continue;
            if (field.table === 'Measures' || isMeasure(field.name)) {
                // Bound measure: enrich every column its expression references
                // so grouped cross-table measures see all their columns.
                const expr = measureExpressions?.[field.name];
                if (expr) {
                    for (const ref of measureColumnRefs(expr)) {
                        addWanted(ref.table, ref.column);
                    }
                }
                continue;
            }
            addWanted(field.table, field.name);
        }
    }

    const targets: {
        field: WellField;
        table: TableDef;
        join: JoinColumn;
    }[] = [];
    for (const { table, column } of wanted) {
        const t = tables.find((td) => td.name === table);
        if (!t) continue;
        const join = findJoin(joins, primary, table);
        if (!join) continue;
        targets.push({
            field: { table, name: column, agg: 'sum' },
            table: t,
            join,
        });
    }
    if (!targets.length) return rows;

    const lookups = targets.map(({ field, table, join }) => {
        const lookup = new Map<string, string | number | boolean | null>();
        for (const tr of table.rows) {
            const key = String(tr[join.colInB]);
            if (!lookup.has(key)) lookup.set(key, tr[field.name] ?? null);
        }
        return lookup;
    });

    return rows.map((r) => {
        const out = { ...r };
        targets.forEach(({ field, join }, i) => {
            if (field.name in out) return;
            const key = String(r[join.colInA]);
            out[field.name] = lookups[i]!.get(key) ?? null;
        });
        return out;
    });
}

export type InteractiveRows = {
    rows: Row[];
    dim: boolean;
    match: ((r: Row) => boolean) | null;
};

/**
 * Cross-filter fallback when the two tables share no registry join column:
 * reduces the source table to the selected value, then propagates that
 * reduction outward through the relationship graph. `rows` is the target
 * visual's base rows (the fallback for when nothing can be derived). The
 * match predicate for highlight mode compares rows by the target table's own
 * fields, so it also works on join-enriched copies of those rows.
 */
export function networkCrossFilter(
    rows: Row[],
    tables: TableDef[],
    graph: RelationGraph,
    crossFilter: CrossFilter,
    vt: string,
    mode: Interaction,
    smartNetwork = true,
): InteractiveRows {
    const noop: InteractiveRows = { rows, dim: false, match: null };
    if (!crossFilter?.table || !crossFilter.column || crossFilter.value == null)
        return noop;
    const source = tables.find((t) => t.name === crossFilter.table);
    if (!source || graph.edges.length === 0) return noop;
    if (mode === 'none') return noop;

    const want = normValue(crossFilter.value);
    const seed = source.rows.filter(
        (r) => normValue(r[crossFilter.column]) === want,
    );
    const map: Record<string, Row[]> = {};
    for (const t of tables) map[t.name] = t.rows;
    map[source.name] = seed;

    const propagated = propagateNetwork(tables, map, graph, smartNetwork);
    const targetRows = propagated[vt] ?? rows;

    if (mode === 'highlight') {
        const target = tables.find((t) => t.name === vt);
        if (!target?.fields.length) return noop;
        const keys = target.fields.map((f) => f.name);
        const fingerprint = (r: Row) =>
            keys.map((k) => normValue(r[k])).join('\u0001');
        const allowed = new Set(targetRows.map(fingerprint));
        return { rows, dim: false, match: (r) => allowed.has(fingerprint(r)) };
    }

    return { rows: targetRows, dim: false, match: null };
}

/**
 * Apply an incoming cross-filter to a visual's rows. Same-table filters work
 * as before; cross-table filters propagate through a shared join column (the
 * target's real field name is resolved from the registry). `axisHasColumn`
 * guards the legacy table-less case, which only applies when the target axis
 * exposes the same column.
 */
export function crossFilterRows(
    rows: Row[],
    crossFilter: CrossFilter,
    sourceId: string,
    vt: string,
    axisHasColumn: boolean,
    mode: Interaction,
    joins: JoinRegistry,
    tables?: TableDef[],
    graph?: RelationGraph,
    smartNetwork = true,
): InteractiveRows {
    if (!crossFilter || crossFilter.sourceId === sourceId)
        return { rows, dim: false, match: null };

    let colName = crossFilter.column;
    let apply = false;

    if (crossFilter.table && crossFilter.table === vt) {
        apply = true;
    } else if (crossFilter.table) {
        if (!vt) return { rows, dim: false, match: null };
        const field = resolveJoinField(
            joins,
            canonical(crossFilter.column),
            vt,
        );
        if (field) {
            colName = field;
            apply = true;
        } else if (mode !== 'none' && tables && graph) {
            return networkCrossFilter(
                rows,
                tables,
                graph,
                crossFilter,
                vt,
                mode,
                smartNetwork,
            );
        }
        // No shared join and no graph: fall through and return rows unchanged.
    } else if (!crossFilter.table) {
        if (!vt || !axisHasColumn) return { rows, dim: false, match: null };
        apply = true;
    }

    if (!apply) return { rows, dim: false, match: null };

    const matches = (r: Row) =>
        normValue(r[colName]) === normValue(crossFilter.value);
    if (mode === 'filter')
        return { rows: rows.filter(matches), dim: false, match: null };
    if (mode === 'none') return { rows, dim: false, match: null };
    return { rows, dim: false, match: matches };
}
