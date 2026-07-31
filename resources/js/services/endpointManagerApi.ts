/**
 * Endpoint Manager API Service
 *
 * CRUD + structure retrieval for the endpoint registry stored in data.json.
 * Write operations require an authenticated IT user (backend enforces role:it).
 */

import {
    detectSource,
    extractColumnNames,
    extractRowCount,
    extractSlug,
    inferStructure,
    type EntryStructure,
} from '@/lib/endpoint-structure';

const BASE_URL = '';

export type EndpointResponse =
    | Record<string, unknown>
    | unknown[]
    | string
    | number
    | boolean
    | null;

export type EndpointEntry = {
    id: string;
    name: string;
    method: 'GET' | 'POST';
    endpoint: string;
    status: number;
    response: EndpointResponse;
};

export type EndpointSummary = {
    id: string;
    name: string;
    method: string;
    endpoint: string;
    slug: string;
    status: number | null;
    source: string;
    object_type: string | null;
    row_count: number;
    has_data: boolean;
    columns: string[];
};

export type EndpointsStats = {
    total: number;
    by_method: Record<string, number>;
    by_source: Record<string, number>;
    by_status: Record<number, number>;
};

export type EndpointsIndexResponse = {
    items: EndpointSummary[];
    total: number;
    page: number;
    per_page: number;
    stats: EndpointsStats;
};

export type EndpointFilters = {
    search?: string;
    method?: string;
    status?: string;
    status_group?: 'ok' | 'warn' | 'error';
    source?: string;
    page?: number;
    per_page?: number;
};

export type EndpointPayload = {
    name: string;
    method: 'GET' | 'POST';
    endpoint: string;
    status: number;
    response: EndpointResponse;
};

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function fetchWithToken<T>(url: string, options: RequestInit = {}): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const response = await fetch(url, {
        ...options,
        cache: 'no-store',
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(isStateChanging ? { 'X-XSRF-TOKEN': getCsrfToken() } : {}),
        },
    });

    const json: unknown = await response.json().catch(() => null);

    if (!response.ok) {
        const message =
            (json as { error?: string } | null)?.error ||
            `HTTP ${response.status} ${response.statusText}`;
        throw new Error(message);
    }

    return json as T;
}

// ── Retrieval ────────────────────────────────────────────────────────────

export const fetchEndpoints = (
    filters: EndpointFilters = {},
): Promise<EndpointsIndexResponse> => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.method) params.set('method', filters.method);
    if (filters.status) params.set('status', filters.status);
    if (filters.status_group) params.set('status_group', filters.status_group);
    if (filters.source) params.set('source', filters.source);
    params.set('page', String(filters.page ?? 1));
    params.set('per_page', String(filters.per_page ?? 50));

    return fetchWithToken<EndpointsIndexResponse>(
        `${BASE_URL}/novacity-endpoints/list?${params.toString()}`,
    );
};

export const fetchEndpoint = async (id: string): Promise<EndpointEntry> => {
    const result = await fetchWithToken<{ entry: EndpointEntry }>(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}`,
    );
    return result.entry;
};

export const fetchStructures = async (): Promise<EntryStructure[]> => {
    const result = await fetchWithToken<{ structure: EntryStructure[] }>(
        `${BASE_URL}/novacity-endpoints/structure`,
    );
    return result.structure;
};

// ── Mutations ────────────────────────────────────────────────────────────

export const createEndpoint = async (
    payload: EndpointPayload,
): Promise<EndpointEntry> => {
    const result = await fetchWithToken<{ entry: EndpointEntry }>(
        `${BASE_URL}/novacity-endpoints`,
        { method: 'POST', body: JSON.stringify(payload) },
    );
    return result.entry;
};

export const updateEndpoint = async (
    id: string,
    payload: Partial<EndpointPayload>,
): Promise<EndpointEntry> => {
    const result = await fetchWithToken<{ entry: EndpointEntry }>(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}`,
        { method: 'PUT', body: JSON.stringify(payload) },
    );
    return result.entry;
};

export const deleteEndpoint = async (id: string): Promise<void> => {
    await fetchWithToken<{ success: boolean }>(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
    );
};

export const duplicateEndpoint = async (id: string): Promise<EndpointEntry> => {
    const result = await fetchWithToken<{ entry: EndpointEntry }>(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}/duplicate`,
        { method: 'POST' },
    );
    return result.entry;
};

export const reorderEndpoints = async (
    ids: string[],
): Promise<EndpointSummary[]> => {
    const result = await fetchWithToken<{ items: EndpointSummary[] }>(
        `${BASE_URL}/novacity-endpoints/reorder`,
        { method: 'POST', body: JSON.stringify({ ids }) },
    );
    return result.items;
};

export const testLiveEndpoint = async (payload: {
    name: string;
    method: 'GET' | 'POST';
    path: string;
    baseUrl?: string;
}): Promise<{
    success: boolean;
    entry?: EndpointEntry;
    error?: string;
    status?: number;
}> => {
    return fetchWithToken(`${BASE_URL}/novacity-endpoints/test-and-save`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

// ── Pure retrieval helpers (also available for client-side inference) ────

export { detectSource, extractSlug, inferStructure };
export type { EntryStructure };
export { extractColumnNames as entryFields, extractRowCount as entryRowCount };
