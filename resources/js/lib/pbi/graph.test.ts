import { describe, expect, it } from 'vitest';
import type { SchemaAnalysis } from '@/services/endpointManagerApi';
import { buildRelationGraph, EMPTY_GRAPH } from './graph';
import type { JoinRegistry } from './joins';
import type { TableDef } from './model';

const orders: TableDef = {
    name: 'Orders',
    fields: [
        { table: 'Orders', name: 'OrderId', type: 'text' },
        { table: 'Orders', name: 'ProductRef', type: 'text' },
    ],
    rows: [
        { OrderId: 'O1', ProductRef: 'P1' },
        { OrderId: 'O2', ProductRef: 'P2' },
        { OrderId: 'O3', ProductRef: 'P3' },
    ],
};

const products: TableDef = {
    name: 'Products',
    fields: [
        { table: 'Products', name: 'Id', type: 'text' },
        { table: 'Products', name: 'Name', type: 'text' },
    ],
    rows: [
        { Id: 'P1', Name: 'Widget' },
        { Id: 'P2', Name: 'Gadget' },
        { Id: 'P3', Name: 'Doodad' },
    ],
};

function table(name: string, col: string, values: string[]): TableDef {
    return {
        name,
        fields: [{ table: name, name: col, type: 'text' }],
        rows: values.map((v) => ({ [col]: v })),
    };
}

describe('buildRelationGraph', () => {
    it('is empty without tables', () => {
        expect(buildRelationGraph([])).toEqual(EMPTY_GRAPH);
    });

    it('infers a differently-named fk_pk edge from overlapping values', () => {
        const graph = buildRelationGraph([orders, products]);
        expect(graph.edges).toHaveLength(1);
        const e = graph.edges[0]!;
        expect(e.kind).toBe('fk_pk');
        expect([e.a, e.b].sort()).toEqual(['Orders', 'Products']);
        expect([e.colA, e.colB].sort()).toEqual(['Id', 'ProductRef']);
        expect(e.confidence).toBe(1);
    });

    it('does not link generic overlapping columns (not key-like)', () => {
        // Repeated values → not near-unique, and 'Label' is not a key-like
        // name, so no edge should be inferred despite full value overlap.
        const a = table('A', 'Label', ['X', 'X', 'Y', 'Y']);
        const b = table('B', 'Label', ['X', 'X', 'Y', 'Y']);
        expect(buildRelationGraph([a, b]).edges).toEqual([]);
    });

    it('adds shared edges from the join registry with confidence 1', () => {
        const a = table('A', 'Label', ['X']);
        const b = table('B', 'Label', ['X']);
        const joins: JoinRegistry = {
            label: {
                type: 'string',
                participants: [
                    { tableName: 'A', fieldName: 'Label' },
                    { tableName: 'B', fieldName: 'Label' },
                ],
            },
        };
        const graph = buildRelationGraph([a, b], joins);
        expect(graph.edges).toContainEqual({
            a: 'A',
            colA: 'Label',
            b: 'B',
            colB: 'Label',
            kind: 'shared',
            confidence: 1,
        });
    });

    it('boosts confidence to 1 when the schema confirms both keys', () => {
        // 43 of 50 distinct values overlap on both sides → ratio 0.86, which
        // would yield confidence 0.96 without schema confirmation.
        const aRows = Array.from({ length: 50 }, (_, i) => `K${i}`);
        const bRows = Array.from({ length: 50 }, (_, i) =>
            i < 43 ? `K${i}` : `X${i}`,
        );
        const a = table('A', 'Ref', aRows);
        const b = table('B', 'Id', bRows);

        const withoutSchema = buildRelationGraph([a, b]);
        expect(withoutSchema.edges[0]!.kind).toBe('fk_pk');
        expect(withoutSchema.edges[0]!.confidence).toBeCloseTo(0.96);

        const schema: SchemaAnalysis = {
            entries: [
                {
                    id: 'a',
                    name: 'A',
                    slug: 'a',
                    source: '',
                    object_type: null,
                    row_count: 50,
                    columns: [],
                    primary_key: { column: 'Ref', confidence: 0.9 },
                    candidate_keys: [],
                },
                {
                    id: 'b',
                    name: 'B',
                    slug: 'b',
                    source: '',
                    object_type: null,
                    row_count: 50,
                    columns: [],
                    primary_key: { column: 'Id', confidence: 0.9 },
                    candidate_keys: [],
                },
            ],
            columns: [],
            foreign_keys: [],
            generated_at: '',
        };
        const withSchema = buildRelationGraph([a, b], {}, schema);
        expect(withSchema.edges[0]!.confidence).toBe(1);
    });

    it('dedupes edges regardless of direction', () => {
        const graph = buildRelationGraph([products, orders]);
        expect(graph.edges).toHaveLength(1);
    });

    it('does not infer edges for same-named columns (e.g. `id`)', () => {
        const a = table('A', 'id', ['1', '2', '3']);
        const b = table('B', 'id', ['1', '2', '3']);
        expect(buildRelationGraph([a, b]).edges).toEqual([]);
    });

    it('does not link near-unique overlapping columns that are not key-like', () => {
        // Fully overlapping, near-unique values on both sides, but neither
        // name is key-like nor schema-confirmed → must not become an edge.
        const a = table('A', 'Target', ['A1', 'A2']);
        const b = table('B', 'Goal', ['A1', 'A2']);
        expect(buildRelationGraph([a, b]).edges).toEqual([]);
    });
});
