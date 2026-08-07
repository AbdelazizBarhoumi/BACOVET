import { describe, expect, it } from 'vitest';
import type { RelationGraph } from './graph';
import type { Row, TableDef } from './model';
import { buildRelationMap, type RelationNode } from './relations';

const pad = (v: string, n: number) => `${v}${' '.repeat(n)}`;

const sourceNode = (
    table: string,
    count: number,
    column = 'Key',
): Partial<RelationNode> => ({
    table,
    level: 0,
    count,
    parent: null,
    edgeKind: null,
    edgeConfidence: null,
    joinColumns: [column],
    emptyReason: null,
    emptyDetail: null,
});

const childNode = (
    table: string,
    level: number,
    count: number,
    parent: string,
    columns: string,
    kind: 'shared' | 'fk_pk',
    emptyReason: RelationNode['emptyReason'] = null,
    emptyDetail: string | null = null,
    joinColumns: string[] = [],
): Partial<RelationNode> => ({
    table,
    level,
    count,
    parent: { table: parent, columns },
    edgeKind: kind,
    edgeConfidence: 1,
    joinColumns,
    emptyReason,
    emptyDetail,
});

function rowsMap(tables: TableDef[]): Record<string, Row[]> {
    const map: Record<string, Row[]> = {};
    for (const t of tables) map[t.name] = t.rows;
    return map;
}

describe('buildRelationMap', () => {
    it('maps a shared ProdGroup edge with differently padded values', () => {
        const wipChaine: TableDef = {
            name: 'WipChaine',
            fields: [{ table: 'WipChaine', name: 'ProdGroup', type: 'text' }],
            rows: [
                { ProdGroup: pad('CH14', 36) },
                { ProdGroup: pad('CH16', 36) },
            ],
        };
        const empDefectEff: TableDef = {
            name: 'EmpDefectEff',
            fields: [
                { table: 'EmpDefectEff', name: 'ProdGroup', type: 'text' },
                { table: 'EmpDefectEff', name: 'ShiftCode', type: 'text' },
            ],
            rows: [
                { ProdGroup: pad('CH14', 6), ShiftCode: 'JOUR' },
                { ProdGroup: pad('CH16', 6), ShiftCode: 'JOUR' },
            ],
        };
        const graph: RelationGraph = {
            edges: [
                {
                    a: 'WipChaine',
                    b: 'EmpDefectEff',
                    columns: [{ colA: 'ProdGroup', colB: 'ProdGroup' }],
                    kind: 'shared',
                    confidence: 1,
                },
            ],
        };

        const map = buildRelationMap(
            [wipChaine, empDefectEff],
            rowsMap([wipChaine, empDefectEff]),
            graph,
            { table: 'WipChaine', column: 'ProdGroup', value: pad('CH14', 36) },
        );

        expect(map.nodes).toEqual([
            sourceNode('WipChaine', 1, 'ProdGroup'),
            childNode(
                'EmpDefectEff',
                1,
                1,
                'WipChaine',
                'ProdGroup',
                'shared',
                null,
                null,
                ['ProdGroup'],
            ),
        ]);
        expect(map.links).toEqual([
            {
                from: 'WipChaine',
                to: 'EmpDefectEff',
                columns: 'ProdGroup',
                kind: 'shared',
            },
        ]);
        expect(map.records.WipChaine).toEqual([{ ProdGroup: pad('CH14', 36) }]);
        expect(map.records.EmpDefectEff).toEqual([
            { ProdGroup: pad('CH14', 6), ShiftCode: 'JOUR' },
        ]);
    });

    it('reaches tables several hops away and returns their records', () => {
        const families: TableDef = {
            name: 'Families',
            fields: [{ table: 'Families', name: 'FamilyId', type: 'text' }],
            rows: [{ FamilyId: 'F1' }, { FamilyId: 'F2' }],
        };
        const productFamilies: TableDef = {
            name: 'ProductFamilies',
            fields: [
                { table: 'ProductFamilies', name: 'FamilyRef', type: 'text' },
                { table: 'ProductFamilies', name: 'ProductId', type: 'text' },
            ],
            rows: [
                { FamilyRef: 'F1', ProductId: 'P1' },
                { FamilyRef: 'F2', ProductId: 'P2' },
            ],
        };
        const salesByProduct: TableDef = {
            name: 'SalesByProduct',
            fields: [
                { table: 'SalesByProduct', name: 'ProductRef', type: 'text' },
                { table: 'SalesByProduct', name: 'Amount', type: 'number' },
            ],
            rows: [
                { ProductRef: 'P1', Amount: 10 },
                { ProductRef: 'P2', Amount: 20 },
            ],
        };
        const graph: RelationGraph = {
            edges: [
                {
                    a: 'Families',
                    b: 'ProductFamilies',
                    columns: [{ colA: 'FamilyId', colB: 'FamilyRef' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
                {
                    a: 'ProductFamilies',
                    b: 'SalesByProduct',
                    columns: [{ colA: 'ProductId', colB: 'ProductRef' }],
                    kind: 'fk_pk',
                    confidence: 1,
                },
            ],
        };

        const map = buildRelationMap(
            [families, productFamilies, salesByProduct],
            rowsMap([families, productFamilies, salesByProduct]),
            graph,
            { table: 'Families', column: 'FamilyId', value: 'F1' },
        );

        expect(map.nodes).toEqual([
            sourceNode('Families', 1, 'FamilyId'),
            childNode(
                'ProductFamilies',
                1,
                1,
                'Families',
                'FamilyId ↔ FamilyRef',
                'fk_pk',
                null,
                null,
                ['FamilyRef'],
            ),
            childNode(
                'SalesByProduct',
                2,
                1,
                'ProductFamilies',
                'ProductId ↔ ProductRef',
                'fk_pk',
                null,
                null,
                ['ProductRef'],
            ),
        ]);
        expect(map.records.SalesByProduct).toEqual([
            { ProductRef: 'P1', Amount: 10 },
        ]);
    });

    it('keeps orphaned tables in the map with zero matching records', () => {
        const wipChaine: TableDef = {
            name: 'WipChaine',
            fields: [{ table: 'WipChaine', name: 'ProdGroup', type: 'text' }],
            rows: [{ ProdGroup: 'CH14' }, { ProdGroup: 'CH16' }],
        };
        const orphan: TableDef = {
            name: 'ItemTrxEnq',
            fields: [{ table: 'ItemTrxEnq', name: 'ProdGroup', type: 'text' }],
            rows: [{ ProdGroup: 'CH05' }, { ProdGroup: 'CH08' }],
        };
        const graph: RelationGraph = {
            edges: [
                {
                    a: 'WipChaine',
                    b: 'ItemTrxEnq',
                    columns: [{ colA: 'ProdGroup', colB: 'ProdGroup' }],
                    kind: 'shared',
                    confidence: 1,
                },
            ],
        };

        const map = buildRelationMap(
            [wipChaine, orphan],
            rowsMap([wipChaine, orphan]),
            graph,
            { table: 'WipChaine', column: 'ProdGroup', value: 'CH14' },
        );

        expect(map.nodes).toHaveLength(2);
        const orphanNode = map.nodes.find((n) => n.table === 'ItemTrxEnq')!;
        expect(orphanNode.level).toBe(1);
        expect(orphanNode.count).toBe(0);
        expect(orphanNode.emptyReason).toBe('missing_value');
        expect(orphanNode.emptyDetail).toBe(
            'Aucune valeur « CH14 » dans ItemTrxEnq.ProdGroup',
        );
        expect(orphanNode.parent).toEqual({
            table: 'WipChaine',
            columns: 'ProdGroup',
        });
        expect(orphanNode.joinColumns).toEqual(['ProdGroup']);
        expect(map.records.ItemTrxEnq).toEqual([]);
    });

    it('keeps neighbours populated when an empty seeded table cannot cascade', () => {
        // A chain A-B-C with B already emptied by a report filter (a seed).
        // Empty seeds must not wipe their neighbours: A keeps its X1 record
        // and C keeps its rows instead of collapsing the whole chain to
        // "Aucune donnée".
        const a: TableDef = {
            name: 'A',
            fields: [{ table: 'A', name: 'Key', type: 'text' }],
            rows: [{ Key: 'X1' }, { Key: 'X2' }],
        };
        const b: TableDef = {
            name: 'B',
            fields: [{ table: 'B', name: 'Key', type: 'text' }],
            rows: [{ Key: 'X1' }, { Key: 'X2' }],
        };
        const c: TableDef = {
            name: 'C',
            fields: [{ table: 'C', name: 'Key', type: 'text' }],
            rows: [{ Key: 'X1' }, { Key: 'X2' }],
        };
        const graph: RelationGraph = {
            edges: [
                {
                    a: 'A',
                    b: 'B',
                    columns: [{ colA: 'Key', colB: 'Key' }],
                    kind: 'shared',
                    confidence: 1,
                },
                {
                    a: 'B',
                    b: 'C',
                    columns: [{ colA: 'Key', colB: 'Key' }],
                    kind: 'shared',
                    confidence: 1,
                },
            ],
        };
        // Live context: B is already emptied by a report filter (a seed).
        const rows: Record<string, Row[]> = {
            A: a.rows,
            B: [],
            C: c.rows,
        };

        const map = buildRelationMap([a, b, c], rows, graph, {
            table: 'A',
            column: 'Key',
            value: 'X1',
        });

        const aNode = map.nodes.find((n) => n.table === 'A')!;
        expect(aNode.count).toBe(1);
        expect(aNode.emptyReason).toBeNull();

        const bNode = map.nodes.find((n) => n.table === 'B')!;
        expect(bNode.count).toBe(0);
        expect(bNode.emptyReason).toBe('missing_value');

        const cNode = map.nodes.find((n) => n.table === 'C')!;
        expect(cNode.count).toBe(2);
        expect(cNode.emptyReason).toBeNull();
    });

    it('reports a non-matching value present on the table without claiming it is absent', () => {
        const a: TableDef = {
            name: 'A',
            fields: [
                { table: 'A', name: 'Key', type: 'text' },
                { table: 'A', name: 'Extra', type: 'text' },
            ],
            rows: [
                { Key: 'X1', Extra: 'E1' },
                { Key: 'X2', Extra: 'E2' },
            ],
        };
        const b: TableDef = {
            name: 'B',
            fields: [
                { table: 'B', name: 'Key', type: 'text' },
                { table: 'B', name: 'Extra', type: 'text' },
            ],
            rows: [{ Key: 'X1', Extra: 'E2' }],
        };
        // Composite edge: B carries X1 but not the full tuple the seed needs.
        const graph: RelationGraph = {
            edges: [
                {
                    a: 'A',
                    b: 'B',
                    columns: [
                        { colA: 'Key', colB: 'Key' },
                        { colA: 'Extra', colB: 'Extra' },
                    ],
                    kind: 'shared',
                    confidence: 1,
                },
            ],
        };

        const map = buildRelationMap([a, b], rowsMap([a, b]), graph, {
            table: 'A',
            column: 'Key',
            value: 'X1',
        });

        const bNode = map.nodes.find((n) => n.table === 'B')!;
        expect(bNode.count).toBe(0);
        expect(bNode.emptyReason).toBe('missing_value');
        expect(bNode.emptyDetail).toBe(
            'La valeur « X1 » ne correspond pas via Key · Extra',
        );
    });

    it('returns an empty map for an unknown source table or column', () => {
        const t: TableDef = {
            name: 'Sales',
            fields: [{ table: 'Sales', name: 'Region', type: 'text' }],
            rows: [{ Region: 'North' }],
        };
        const graph: RelationGraph = { edges: [] };

        const unknownTable = buildRelationMap([t], rowsMap([t]), graph, {
            table: 'Nope',
            column: 'Region',
            value: 'x',
        });
        expect(unknownTable.nodes).toEqual([]);
        expect(unknownTable.records).toEqual({});

        const unknownColumn = buildRelationMap([t], rowsMap([t]), graph, {
            table: 'Sales',
            column: 'Nope',
            value: 'x',
        });
        expect(unknownColumn.nodes).toEqual([]);
    });

    it('labels composite edges with the full key tuple', () => {
        const a: TableDef = {
            name: 'A',
            fields: [{ table: 'A', name: 'ShiftCode', type: 'text' }],
            rows: [{ ShiftCode: 'S1' }],
        };
        const b: TableDef = {
            name: 'B',
            fields: [{ table: 'B', name: 'ShiftCode', type: 'text' }],
            rows: [{ ShiftCode: 'S1' }],
        };
        const graph: RelationGraph = {
            edges: [
                {
                    a: 'A',
                    b: 'B',
                    columns: [
                        { colA: 'ShiftCode', colB: 'ShiftCode' },
                        { colA: 'ProdGroup', colB: 'ProdGroup' },
                    ],
                    kind: 'shared',
                    confidence: 1,
                },
            ],
        };

        const map = buildRelationMap([a, b], rowsMap([a, b]), graph, {
            table: 'A',
            column: 'ShiftCode',
            value: 'S1',
        });

        expect(map.links[0]!.columns).toBe('ShiftCode · ProdGroup');
        const bNode = map.nodes.find((n) => n.table === 'B')!;
        expect(bNode.parent).toEqual({
            table: 'A',
            columns: 'ShiftCode · ProdGroup',
        });
        expect(bNode.joinColumns).toEqual(['ShiftCode', 'ProdGroup']);
    });
});
