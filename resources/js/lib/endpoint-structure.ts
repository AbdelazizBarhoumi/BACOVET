import type { EndpointEntry } from '@/services/endpointManagerApi';

export type ColumnType =
    | 'string'
    | 'integer'
    | 'number'
    | 'boolean'
    | 'date'
    | 'null'
    | 'mixed';

export type ColumnDef = {
    name: string;
    type: ColumnType;
    sample: unknown;
    nullable: boolean;
};

export type EntryStructure = {
    id: string;
    name: string;
    method: string;
    endpoint: string;
    slug: string;
    status: number;
    source: string;
    object_type: string | null;
    row_count: number;
    has_data: boolean;
    columns: ColumnDef[];
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}([T ].*)?$/;

export function extractSlug(endpoint: string): string {
    try {
        const { pathname } = new URL(endpoint);
        const path = pathname.replace(/^\/+/, '');
        if (!path.startsWith('api/')) {
            return '';
        }
        return path;
    } catch {
        return '';
    }
}

export function detectSource(
    entry: Pick<EndpointEntry, 'name' | 'response'>,
): string {
    const match = /\((SDT|QCM|DIVATEX)\)/i.exec(entry.name ?? '');
    if (match) {
        return match[1].toUpperCase();
    }
    const source = (
        entry.response as Record<string, unknown> | null | undefined
    )?.source;
    if (typeof source === 'string' && source !== '') {
        return source.toUpperCase();
    }
    return 'OTHER';
}

export function isDateString(value: string): boolean {
    const trimmed = value.trim();
    if (!DATE_RE.test(trimmed)) {
        return false;
    }
    return !Number.isNaN(Date.parse(trimmed.slice(0, 10)));
}

export function inferColumnType(values: unknown[]): ColumnType {
    const types = new Set<ColumnType>();
    for (const value of values.slice(0, 20)) {
        if (value === null || value === undefined) {
            continue;
        }
        if (typeof value === 'boolean') {
            types.add('boolean');
        } else if (typeof value === 'number' && Number.isInteger(value)) {
            types.add('integer');
        } else if (typeof value === 'number') {
            types.add('number');
        } else if (typeof value === 'string') {
            types.add(isDateString(value) ? 'date' : 'string');
        } else {
            types.add('mixed');
        }
    }
    if (types.size === 0) {
        return 'null';
    }
    if (types.size === 1) {
        return [...types][0];
    }
    return 'mixed';
}

export function extractColumnNames(entry: EndpointEntry): string[] {
    const response = entry.response as Record<string, unknown> | null | undefined;
    const columns = response?.columns;
    if (Array.isArray(columns) && columns.length > 0) {
        return columns.map(String);
    }
    const data = response?.data;
    if (
        Array.isArray(data) &&
        data.length > 0 &&
        typeof data[0] === 'object' &&
        data[0] !== null
    ) {
        return Object.keys(data[0] as Record<string, unknown>);
    }
    return [];
}

export function extractRowCount(entry: EndpointEntry): number {
    const response = entry.response as Record<string, unknown> | null | undefined;
    const data = response?.data;
    if (!Array.isArray(data)) {
        return 0;
    }
    return data.length;
}

export function inferStructure(entry: EndpointEntry): EntryStructure {
    const response = entry.response as Record<string, unknown> | null | undefined;
    const data = Array.isArray(response?.data) ? response.data : [];
    const rows = data.filter(
        (row): row is Record<string, unknown> =>
            typeof row === 'object' && row !== null,
    );
    const fields = extractColumnNames(entry);

    const columns: ColumnDef[] = fields.map((field) => {
        const samples: unknown[] = [];
        let nullable = false;
        for (const row of rows.slice(0, 50)) {
            if (!(field in row)) {
                continue;
            }
            const value = row[field];
            if (value === null || value === undefined) {
                nullable = true;
                continue;
            }
            if (samples.length < 20) {
                samples.push(value);
            }
        }
        return {
            name: field,
            type: inferColumnType(samples),
            sample: samples[0] ?? null,
            nullable,
        };
    });

    return {
        id: entry.id,
        name: entry.name,
        method: entry.method,
        endpoint: entry.endpoint,
        slug: extractSlug(entry.endpoint),
        status: entry.status,
        source: detectSource(entry),
        object_type: (response?.object_type as string | undefined) ?? null,
        row_count: rows.length,
        has_data: rows.length > 0,
        columns,
    };
}
