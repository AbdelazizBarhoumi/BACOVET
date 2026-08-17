import { handleApiError } from '@/lib/session';
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
    status?: string | null;
    /** parameter variant currently served ([] = default/current data) */
    params?: Record<string, string> | null;
};

export async function fetchEndpointDatasets(
    signal?: AbortSignal,
    baseUrl = '/api/endpoint-datasets',
): Promise<EndpointDataset[]> {
    const res = await fetch(baseUrl, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal,
    });
    if (!res.ok) {
        handleApiError(res.status);
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

function tableName(d: EndpointDataset): string {
    return d.label || d.object || d.slug.split('/').pop() || d.slug;
}

function buildTable(d: EndpointDataset, name: string): TableDef {
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
            type: inferFieldType(rows.slice(0, 50).map((r) => r[key] ?? null)),
        }));
    }

    return {
        name,
        displayName: d.name?.trim() || name,
        fields,
        rows,
        slug: d.slug,
        label: d.label,
        object: d.object,
    };
}

/** Column names a dataset exposes, in the order buildTable assigns fields. */
function datasetColumnNames(d: EndpointDataset): string[] {
    if (d.columns && d.columns.length) return d.columns.map((c) => c.name);
    const first = (d.sample_data ?? []).find(
        (r): r is Row => !!r && typeof r === 'object',
    );
    return Object.keys(first ?? {});
}

/**
 * Build the table set for the page builder.
 *
 * The endpoint registry can carry several datasets that resolve to the same
 * table name (e.g. the same API reachable through multiple roots). A single
 * `TableDef` per name keeps React keys unique and the fields list free of
 * duplicates: the entry with explicit label/object metadata wins over a
 * slug-derived fallback name, and genuinely different column sets sharing a
 * name are kept under a disambiguated suffix instead of being dropped.
 */
export function buildTables(datasets: EndpointDataset[]): TableDef[] {
    const tables = new Map<string, TableDef>();
    const usedNames = new Set<string>();

    const sameShape = (table: TableDef, d: EndpointDataset): boolean => {
        const a = table.fields.map((f) => f.name);
        const b = datasetColumnNames(d);
        return a.length === b.length && a.every((name, i) => name === b[i]);
    };

    for (const d of datasets) {
        const name = tableName(d);
        const existing = tables.get(name);

        if (!existing) {
            tables.set(name, buildTable(d, name));
            usedNames.add(name);
            continue;
        }

        const incomingHasMeta = !!(d.label || d.object);
        const existingHasMeta = !!(existing.label || existing.object);

        if (sameShape(existing, d)) {
            if (incomingHasMeta && !existingHasMeta) {
                tables.set(name, buildTable(d, name));
            }
            continue;
        }

        let unique = name;
        let suffix = 2;
        while (usedNames.has(unique)) unique = `${name} (${suffix++})`;
        tables.set(unique, buildTable(d, unique));
        usedNames.add(unique);
    }

    return [...tables.values()];
}
