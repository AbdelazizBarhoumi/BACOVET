# Implementation Plan — Tuple-Aware Join Semantics

**Decision locked in:** custom filters and network propagation both preserve real row-level combinations across join paths; no cross-product/phantom matches. This plan covers what changes, in what order, and what the AI agent should test at each step.

---

## 1. Core model change: `RelationEdge` becomes column-set aware

**Today** (`graph.ts`):
```ts
export type RelationEdge = {
    a: string; colA: string;
    b: string; colB: string;
    kind: 'shared' | 'fk_pk';
    confidence: number;
};
```
One edge = one column pair. A composite key (`ShiftCode`+`ProdGroup`+`LogDate`) becomes three independent edges today — that's Bug 1's root cause.

**New shape:**
```ts
export type ColumnPair = { colA: string; colB: string };

export type RelationEdge = {
    a: string;
    b: string;
    /** 1 entry = simple key. 2+ entries = composite/tuple key — every pair
     *  must match together on the same row for the edge to admit a match. */
    columns: ColumnPair[];
    kind: 'shared' | 'fk_pk';
    confidence: number;
};
```

This is a breaking change to every place that reads `.colA`/`.colB` directly — grep for those two field names across the codebase; `propagateNetwork` is the main consumer but there may be UI code (relationship tooltips, the join-editor panel) reading the old shape too.

---

## 2. `joins.ts` registry needs to support grouped fields per table

I haven't seen this file, but `buildRelationGraph` currently does:
```ts
for (const entry of Object.values(joins)) {
    const ps = entry.participants; // { tableName, fieldName }[]
    for i,j: addEdge(ps[i].tableName, ps[i].fieldName, ps[j].tableName, ps[j].fieldName, 'shared', 1);
}
```
That means one registry entry = one column per table, and multiple entries covering the same table pair become separate edges today (which is exactly the decomposition problem). The registry needs to move to:

```ts
export type JoinParticipant = {
    tableName: string;
    /** Columns that together form this table's side of the key, in the
     *  SAME positional order as every other participant's `fields`. */
    fields: string[];
};
export type JoinEntry = { participants: JoinParticipant[] };
export type JoinRegistry = Record<string, JoinEntry>;
```

`buildRelationGraph`'s registry loop becomes:
```ts
for (const entry of Object.values(joins)) {
    const ps = entry.participants;
    for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
            const A = ps[i]!, B = ps[j]!;
            if (A.fields.length !== B.fields.length) continue; // authoring error — log it
            const columns = A.fields.map((f, k) => ({ colA: f, colB: B.fields[k]! }));
            addEdge(A.tableName, B.tableName, columns, 'shared', 1);
        }
    }
}
```

**Whoever authors/generates the registry entries now has to decide composite grouping explicitly** — e.g. one entry named `"production-grain"` listing `fields: ['ShiftCode','ProdGroup','LogDate']` for every participating table, instead of three separate entries. This is a real authoring/migration task, not just a code change — flag it before starting, since it likely means re-generating or hand-editing whatever currently populates `joins`.

`fk_pk` (auto-inferred, differently-named columns): **keep single-column only for now.** Composite inference there means testing joint overlap across combinations of column pairs, which is combinatorially expensive and has a much higher false-positive surface than the registry case. Treat as a phase-2 item, not part of this pass.

---

## 3. `propagateNetwork`: tuple-based allowed sets

```ts
function tupleKey(row: Row, cols: string[]): string | null {
    const parts: string[] = [];
    for (const c of cols) {
        const v = normValue(row[c]);
        if (!v) return null; // any missing component invalidates the whole tuple — no wildcard matching
        parts.push(v);
    }
    return parts.join('\u0001');
}
```

Inside the edge loop, replace the single-column `colSelf`/`colNeighbor` logic with:
```ts
const selfCols = e.a === t ? e.columns.map(c => c.colA) : e.columns.map(c => c.colB);
const neighborCols = e.a === t ? e.columns.map(c => c.colB) : e.columns.map(c => c.colA);

const allowed = new Set<string>();
for (const r of tArr) {
    const k = tupleKey(r, selfCols);
    if (k) allowed.add(k);
}
const next = nArr.filter((r) => {
    const k = tupleKey(r, neighborCols);
    return k !== null && allowed.has(k);
});
```

Single-column edges are just `columns.length === 1` — no special-casing needed elsewhere in the function; the rest of the BFS/seed/cap logic is untouched.

**Explicit decision, flag it in the PR:** a row missing any one of the composite columns is excluded from both sides (no partial-tuple wildcard matching). This is the safe default — the alternative (treat missing as wildcard) would reopen a smaller version of Bug 1. Revisit only if real data shows this is too strict (e.g. a column that's legitimately sparse).

---

## 4. Custom filter builder: decompose, don't merge

This is the simplification tuple-aware semantics unlocks. Instead of the current pooled-value mechanism (`applyCustomFilter`, `customFilterDistinctValues`), a "custom filter" becomes a **named group of ordinary per-table filters** that reuse the fixed `propagateNetwork` to stay consistent with each other:

- Each selected `{table, column}` gets its **own** distinct-value list (not pooled — this alone fixes the TransactionID/LogDate pooling problem from Bug 2).
- Selecting a value on any one of them makes that table a seed, exactly like today's report-level filters.
- Consistency across the other selected columns comes for free from `propagateNetwork` — including transitive hops through tables the user never explicitly selected, since that's already what the BFS does.
- The only new logic needed is a **connectivity pre-check**: before creating the group, run a BFS over `graph.edges` between every pair of selected tables. If any pair has no path, refuse to create that pairing and tell the user which two columns have no known relationship — this directly replaces the silent-empty-result failure mode from Bug 2's second test.

```ts
function pathExists(graph: RelationGraph, from: string, to: string): boolean {
    if (from === to) return true;
    const seen = new Set([from]);
    const queue = [from];
    while (queue.length) {
        const t = queue.shift()!;
        for (const e of graph.edges) {
            const next = e.a === t ? e.b : e.b === t ? e.a : null;
            if (next && !seen.has(next)) {
                if (next === to) return true;
                seen.add(next);
                queue.push(next);
            }
        }
    }
    return false;
}
```

### Data shape change (breaking, needs migration)

`ReportFilter` for `kind: 'custom'` currently has one shared `values: string[]` across all `columns`. That has to become per-column:

```ts
columns: { table: string; column: string; values: string[] }[];
```

`normalizeState` in `state.ts` needs a migration branch for existing saved reports: old pooled-value custom filters should convert to the new per-column shape by clearing `values` on each column (don't try to guess which pooled value belonged to which column) and surface a one-time notice — "this custom filter's behavior changed, please re-select values" — rather than silently reinterpreting old selections under new semantics.

`applyCustomFilter` and `customFilterDistinctValues` can likely be deleted once this lands — each `{table, column, values}` triple runs through the existing `applyFilter` list/dropdown path unchanged. The "custom" wrapper becomes pure UI bookkeeping (grouping + a shared label for the filter pane card), not a distinct behavior.

---

## 5. Target-state tests (what should pass after this lands)

Replace the two "FAILS TODAY" tests from the previous file with their fixed-behavior equivalents:

```ts
it('composite edge excludes the phantom (Morning, LineB) combination', () => {
    const graph: RelationGraph = {
        edges: [{
            a: 'ItemTrxEnq', b: 'EmpDefectEff',
            columns: [
                { colA: 'ShiftCode', colB: 'ShiftCode' },
                { colA: 'ProdGroup', colB: 'ProdGroup' },
            ],
            kind: 'shared', confidence: 1,
        }],
    };
    const filtered = {
        ItemTrxEnq: itemTrxEnq.rows.filter((r) => r.TerminalNo === 'T5'),
        EmpDefectEff: empDefectEff.rows,
    };
    const result = propagateNetwork([itemTrxEnq, empDefectEff], filtered, graph, true);
    expect(result.EmpDefectEff).toHaveLength(1); // only the real (Morning, LineA) row
});

it('custom filter group refuses to link two tables with no graph path', () => {
    const graph: RelationGraph = { edges: [] }; // ItemTrxEnq and EmpDefectEff unrelated here
    expect(
        pathExists(graph, 'ItemTrxEnq', 'EmpDefectEff'),
    ).toBe(false);
    // UI-level: addCustomFilter should reject this pairing and report it,
    // not silently create a filter that will always return zero rows.
});

it('each selected column in a custom filter group has its own distinct-value list', () => {
    const values = distinctValuesForColumn(itemTrxEnq, 'TransactionID');
    expect(values).toEqual(['TXN-1001', 'TXN-1002']);
    // no LogDate values mixed in, unlike today's pooled customFilterDistinctValues
});
```

## 6. Suggested landing order

1. `RelationEdge` type + `buildRelationGraph` registry-loop change (2). Keep `fk_pk` single-column.
2. `propagateNetwork` tuple-aware rewrite (3) — run the full existing regression test file plus the new composite test; this is the highest-risk change since it touches every filter/slicer path.
3. Migrate `joins.ts` registry data to grouped `fields[]` for the known composite keys in your schema (`ShiftCode`/`ProdGroup`/`LogDate` being the big one — it spans 6+ tables).
4. Custom filter redesign (4) — data shape migration first, then UI (per-column value lists + connectivity pre-check), then delete `applyCustomFilter`/`customFilterDistinctValues`.
5. Phase 2 (not this pass): composite `fk_pk` inference for differently-named columns.