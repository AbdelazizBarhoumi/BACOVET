import { describe, expect, it } from 'vitest';
import type { RelationGraph } from './graph';
import type { Row, TableDef } from './model';
import { buildRelationMap } from './relations';

const pad = (v: string, n: number) => `${v}${' '.repeat(n)}`;

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
            { table: 'WipChaine', level: 0, count: 1 },
            { table: 'EmpDefectEff', level: 1, count: 1 },
        ]);
        expect(map.links).toEqual([
            {
                from: 'WipChaine',
                to: 'EmpDefectEff',
                columns: 'ProdGroup',
                kind: 'shared',
            },
        ]);
        expect(map.records.WipChaine).toEqual([
            { ProdGroup: pad('CH14', 36) },
        ]);
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
            { table: 'Families', level: 0, count: 1 },
            { table: 'ProductFamilies', level: 1, count: 1 },
            { table: 'SalesByProduct', level: 2, count: 1 },
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
        expect(map.records.ItemTrxEnq).toEqual([]);
    });

    it('returns an empty map for an unknown source table or column', () => {
        const t: TableDef = {
            name: 'Sales',
            fields: [{ table: 'Sales', name: 'Region', type: 'text' }],
            rows: [{ Region: 'North' }],
        };
        const graph: RelationGraph = { edges: [] };

        const unknownTable = buildRelationMap(
            [t],
            rowsMap([t]),
            graph,
            { table: 'Nope', column: 'Region', value: 'x' },
        );
        expect(unknownTable.nodes).toEqual([]);
        expect(unknownTable.records).toEqual({});

        const unknownColumn = buildRelationMap(
            [t],
            rowsMap([t]),
            graph,
            { table: 'Sales', column: 'Nope', value: 'x' },
        );
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

        const map = buildRelationMap(
            [a, b],
            rowsMap([a, b]),
            graph,
            { table: 'A', column: 'ShiftCode', value: 'S1' },
        );

        expect(map.links[0]!.columns).toBe('ShiftCode · ProdGroup');
    });
});
