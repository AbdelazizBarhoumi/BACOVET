import { describe, expect, it } from 'vitest';
import { buildTables, type EndpointDataset } from './datasets';

const dataset = (
    overrides: Partial<EndpointDataset> & Pick<EndpointDataset, 'slug'>,
): EndpointDataset => ({
    name: overrides.slug.split('/').pop() ?? overrides.slug,
    label: null,
    object: null,
    object_type: null,
    source: null,
    method: 'GET',
    columns: null,
    sample_data: null,
    row_count: 0,
    last_synced_at: null,
    ...overrides,
});

describe('buildTables', () => {
    it('names tables from label, then object, then the slug tail', () => {
        const tables = buildTables([
            dataset({
                slug: 'api/data/checkpassqte',
                label: 'Contrôle qualité',
                columns: [{ name: 'Qty', type: 'number' }],
            }),
            dataset({
                slug: 'api/data/qcmdefecttrx',
                object: 'QCMDefectTrx',
                columns: [{ name: 'Qty', type: 'number' }],
            }),
            dataset({
                slug: 'api/data/reject_qte',
                columns: [{ name: 'Qty', type: 'number' }],
            }),
        ]);

        expect(tables.map((t) => t.name)).toEqual([
            'Contrôle qualité',
            'QCMDefectTrx',
            'reject_qte',
        ]);
    });

    it('shows the endpoint display name as displayName while keeping the technical binding name', () => {
        const tables = buildTables([
            dataset({
                slug: 'api/data/reject_qte',
                name: 'Contrôle des rejets',
                columns: [{ name: 'Qty', type: 'number' }],
            }),
        ]);

        expect(tables[0]!.name).toBe('reject_qte');
        expect(tables[0]!.displayName).toBe('Contrôle des rejets');
    });

    it('falls back to the table name when the endpoint has no display name', () => {
        const tables = buildTables([
            dataset({
                slug: 'api/data/reject_qte',
                columns: [{ name: 'Qty', type: 'number' }],
            }),
        ]);

        expect(tables[0]!.displayName).toBe('reject_qte');
    });

    it('keeps a single table when two datasets resolve to the same name', () => {
        const tables = buildTables([
            dataset({
                slug: 'api/data/qcm/reject_qte',
                sample_data: [{ Qty: 1 }],
            }),
            dataset({
                slug: 'api/data/reject_qte',
                label: 'reject_qte',
                object: 'RejectQty',
                name: 'Contrôle des rejets',
                sample_data: [{ Qty: 2 }],
            }),
        ]);

        expect(tables).toHaveLength(1);
        expect(tables[0]!.name).toBe('reject_qte');
        // The entry with explicit metadata wins.
        expect(tables[0]!.object).toBe('RejectQty');
        expect(tables[0]!.rows).toEqual([{ Qty: 2 }]);
        expect(tables[0]!.displayName).toBe('Contrôle des rejets');
    });

    it('prefers metadata even when the fallback entry comes first', () => {
        const tables = buildTables([
            dataset({ slug: 'api/data/vue_stock', sample_data: [{ Qty: 1 }] }),
            dataset({
                slug: 'api/data/vue_stock?limit=1',
                label: 'vue_stock',
                object: 'VueStock',
                sample_data: [{ Qty: 3 }],
            }),
        ]);

        expect(tables).toHaveLength(1);
        expect(tables[0]!.label).toBe('vue_stock');
        expect(tables[0]!.rows).toEqual([{ Qty: 3 }]);
    });

    it('disambiguates datasets that share a name but differ in shape', () => {
        const tables = buildTables([
            dataset({
                slug: 'api/data/production',
                columns: [
                    { name: 'Day', type: 'date' },
                    { name: 'Qty', type: 'number' },
                ],
                sample_data: [{ Day: '2026-01-01', Qty: 10 }],
            }),
            dataset({
                slug: 'api/data/other/production',
                columns: [{ name: 'Chaine', type: 'text' }],
                sample_data: [{ Chaine: 'A' }],
            }),
        ]);

        expect(tables.map((t) => t.name)).toEqual([
            'production',
            'production (2)',
        ]);
        expect(tables[1]!.fields.map((f) => f.name)).toEqual(['Chaine']);
    });

    it('preserves the dataset order for distinct names', () => {
        const tables = buildTables([
            dataset({
                slug: 'api/data/a',
                columns: [{ name: 'A', type: 'text' }],
            }),
            dataset({
                slug: 'api/data/b',
                columns: [{ name: 'B', type: 'text' }],
            }),
            dataset({
                slug: 'api/data/c',
                columns: [{ name: 'C', type: 'text' }],
            }),
        ]);

        expect(tables.map((t) => t.name)).toEqual(['a', 'b', 'c']);
    });

    it('infers fields from the first sample row when no columns are provided', () => {
        const tables = buildTables([
            dataset({
                slug: 'api/data/articles',
                sample_data: [
                    { IDArticle: 1, Name: 'X' },
                    { IDArticle: 2, Name: 'Y' },
                ],
            }),
        ]);

        expect(tables[0]!.fields.map((f) => f.name)).toEqual([
            'IDArticle',
            'Name',
        ]);
        expect(tables[0]!.rows).toHaveLength(2);
    });
});
