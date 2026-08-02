import { handleV5Error } from '@/lib/v5-session';
import {
    inferFieldType,
    type Field,
    type FieldType,
    type Row,
    type TableDef,
} from './model';

export type { TableDef } from './model';

export type EndpointDataset = {
    slug: string;
    name: string;
    label: string | null;
    object: string | null;
    object_type: string | null;
    source: string | null;
    method: string;
    columns: { name: string; type: string }[] | null;
    sample_data: Record<string, unknown>[] | null;
    row_count: number;
    last_synced_at: string | null;
};

export async function fetchEndpointDatasets(
    signal?: AbortSignal,
    baseUrl = '/api/v5/endpoint-datasets',
): Promise<EndpointDataset[]> {
    const res = await fetch(baseUrl, {
        headers: { Accept: 'application/json' },
        signal,
    });
    if (!res.ok) {
        handleV5Error(res.status);
        throw new Error(`HTTP ${res.status}`);
    }
    const body: unknown = await res.json();
    if (
        body &&
        typeof body === 'object' &&
        'datasets' in body &&
        Array.isArray((body as { datasets: unknown }).datasets)
    ) {
        return (body as { datasets: EndpointDataset[] }).datasets;
    }
    return [];
}

function normalizeType(t: string): FieldType {
    if (t === 'number' || t === 'integer' || t === 'float') return 'number';
    if (t === 'date') return 'date';
    if (t === 'boolean' || t === 'bool') return 'boolean';
    return 'text';
}

export function buildTables(datasets: EndpointDataset[]): TableDef[] {
    return datasets.map((d) => {
        const name = d.label || d.object || d.slug.split('/').pop() || d.slug;
        const rows = (d.sample_data ?? []).filter(
            (r): r is Row => !!r && typeof r === 'object',
        ) as Row[];

        let fields: Field[];
        if (d.columns && d.columns.length) {
            fields = d.columns.map((c) => ({
                table: name,
                name: c.name,
                type: normalizeType(c.type),
            }));
        } else {
            const first = rows[0];
            fields = Object.keys(first ?? {}).map((key) => ({
                table: name,
                name: key,
                type: inferFieldType(
                    rows.slice(0, 50).map((r) => r[key] ?? null),
                ),
            }));
        }

        return { name, fields, rows };
    });
}
