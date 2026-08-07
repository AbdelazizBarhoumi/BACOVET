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
import { handleApiError, statusOfError } from '@/lib/session';

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
    checked_at?: string | null;
    last_ok_at?: string | null;
    last_error?: string | null;
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

async function fetchWithToken<T>(
    url: string,
    options: RequestInit = {},
): Promise<T> {
    const method = (options.method || 'GET').toUpperCase();
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    let response: Response;
    try {
        response = await fetch(url, {
            ...options,
            signal: options.signal
                ? AbortSignal.any([options.signal, controller.signal])
                : controller.signal,
            cache: 'no-store',
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(isStateChanging ? { 'X-XSRF-TOKEN': getCsrfToken() } : {}),
            },
        });
    } catch (err) {
        if (controller.signal.aborted) {
            throw new Error('Request timed out after 60 seconds');
        }
        throw err;
    } finally {
        clearTimeout(timeout);
    }

    const json: unknown = await response.json().catch(() => null);

    if (!response.ok) {
        const body = (json ?? {}) as {
            error?: string;
            message?: string;
        };
        const message =
            body.error ||
            body.message ||
            `HTTP ${response.status} ${response.statusText}`;
        const err = new Error(message) as Error & { status?: number };
        err.status = response.status;
        throw err;
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

export const fetchEndpoint = async (
    id: string,
    signal?: AbortSignal,
): Promise<EndpointEntry> => {
    const result = await fetchWithToken<{ entry: EndpointEntry }>(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}`,
        { signal },
    );
    return result.entry;
};

export const fetchStructures = async (): Promise<EntryStructure[]> => {
    const result = await fetchWithToken<{ structure: EntryStructure[] }>(
        `${BASE_URL}/novacity-endpoints/structure`,
    );
    return result.structure;
};

// ── Schema analysis (primary/foreign keys + shared join columns) ────────

export type SchemaColumn = {
    name: string;
    type:
        | 'string'
        | 'integer'
        | 'number'
        | 'boolean'
        | 'date'
        | 'null'
        | 'mixed';
    nullable: boolean;
    distinct_count: number;
    unique: boolean;
    samples: unknown[];
};

export type SchemaEntry = {
    id: string;
    name: string;
    slug: string;
    source: string;
    object_type: string | null;
    row_count: number;
    columns: SchemaColumn[];
    primary_key: { column: string; confidence: number } | null;
    candidate_keys: string[];
};

export type SharedColumnEndpoint = {
    entry_id: string;
    entry_name: string;
    slug: string;
    source: string;
    distinct_count: number;
};

export type SharedColumn = {
    name: string;
    type: SchemaColumn['type'];
    endpoint_count: number;
    sources: string[];
    endpoints: SharedColumnEndpoint[];
    distinct_values: unknown[];
};

export type ForeignKeyRef = {
    entry_id: string;
    entry_name: string;
    column: string;
    match: 'name';
    coverage: number;
    confidence: number;
};

export type ForeignKey = {
    entry_id: string;
    entry_name: string;
    references: {
        column: string;
        refs: ForeignKeyRef[];
    }[];
};

export type SchemaAnalysis = {
    entries: SchemaEntry[];
    columns: SharedColumn[];
    foreign_keys: ForeignKey[];
    generated_at: string;
};

// ── In-memory caches for expensive tab data (schema + health) ───────────
// These panels are lazy-loaded, and the results are reused across tab
// switches to avoid re-running the heavy analysis on every visit.

let schemaCache: SchemaAnalysis | null = null;
let healthCache: EndpointHealth | null = null;

export const clearEndpointCaches = (): void => {
    schemaCache = null;
    healthCache = null;
};

export const fetchSchema = async (
    column?: string,
    force = false,
): Promise<SchemaAnalysis> => {
    if (column) {
        return fetchSchemaColumn(column);
    }
    if (schemaCache && !force) {
        return schemaCache;
    }
    schemaCache = await fetchSchemaColumn('');
    return schemaCache;
};

async function fetchSchemaColumn(column: string): Promise<SchemaAnalysis> {
    const params = new URLSearchParams();
    if (column) params.set('column', column);
    const query = params.toString();
    return fetchWithToken<SchemaAnalysis>(
        `${BASE_URL}/novacity-endpoints/schema${query ? `?${query}` : ''}`,
    );
}

// ── Schema (cross-table joins) ──────────────────────────────────────────
// The builder runs under the main protected routes and uses the dedicated
// /api/schema endpoint instead of the IT-only /novacity-endpoints/schema
// route used by the main endpoints manager.

let builderSchemaCache: SchemaAnalysis | null = null;

export const fetchBuilderSchema = async (
    force = false,
): Promise<SchemaAnalysis> => {
    if (builderSchemaCache && !force) {
        return builderSchemaCache;
    }
    try {
        builderSchemaCache = await fetchWithToken<SchemaAnalysis>(
            `${BASE_URL}/api/schema`,
        );
        return builderSchemaCache;
    } catch (err) {
        handleApiError(statusOfError(err));
        throw err;
    }
};

// ── Refresh health (last-run metadata + manual trigger) ─────────────────

export type RefreshMeta = {
    last_run_at?: string | null;
    last_run_duration_s?: number | null;
    ok?: number;
    failed?: number;
    skipped?: number;
    retry_pending?: boolean;
};

export type EndpointHealth = {
    stats: EndpointsStats;
    meta: RefreshMeta | null;
    retry_pending: boolean;
};

export const fetchHealth = async (force = false): Promise<EndpointHealth> => {
    if (healthCache && !force) {
        return healthCache;
    }
    healthCache = await fetchWithToken<EndpointHealth>(
        `${BASE_URL}/novacity-endpoints/health`,
    );
    return healthCache;
};

export const triggerRefresh = async (): Promise<{
    success: boolean;
    exit_code: number;
    output: string;
    meta: RefreshMeta | null;
}> => {
    clearEndpointCaches();
    return fetchWithToken(`${BASE_URL}/novacity-endpoints/refresh`, {
        method: 'POST',
    });
};

export const triggerEndpointRefresh = async (id: string): Promise<{
    success: boolean;
    exit_code: number;
    output: string;
    meta: RefreshMeta | null;
    entry?: EndpointSummary;
}> => {
    clearEndpointCaches();
    return fetchWithToken(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}/refresh`,
        { method: 'POST' },
    );
};

// ── Mutations ────────────────────────────────────────────────────────────

export const createEndpoint = async (
    payload: EndpointPayload,
    signal?: AbortSignal,
): Promise<EndpointEntry> => {
    const result = await fetchWithToken<{ entry: EndpointEntry }>(
        `${BASE_URL}/novacity-endpoints`,
        { method: 'POST', body: JSON.stringify(payload), signal },
    );
    clearEndpointCaches();
    return result.entry;
};

export const updateEndpoint = async (
    id: string,
    payload: Partial<EndpointPayload>,
    signal?: AbortSignal,
): Promise<EndpointEntry> => {
    const result = await fetchWithToken<{ entry: EndpointEntry }>(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}`,
        { method: 'PUT', body: JSON.stringify(payload), signal },
    );
    clearEndpointCaches();
    return result.entry;
};

export const deleteEndpoint = async (id: string): Promise<void> => {
    await fetchWithToken<{ success: boolean }>(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
    );
    clearEndpointCaches();
};

export const duplicateEndpoint = async (id: string): Promise<EndpointEntry> => {
    const result = await fetchWithToken<{ entry: EndpointEntry }>(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}/duplicate`,
        { method: 'POST' },
    );
    clearEndpointCaches();
    return result.entry;
};

export const reorderEndpoints = async (
    ids: string[],
): Promise<EndpointSummary[]> => {
    const result = await fetchWithToken<{ items: EndpointSummary[] }>(
        `${BASE_URL}/novacity-endpoints/reorder`,
        { method: 'POST', body: JSON.stringify({ ids }) },
    );
    clearEndpointCaches();
    return result.items;
};

export type TestEndpointPayload = {
    name: string;
    method: 'GET' | 'POST';
    path: string;
    baseUrl?: string;
};

export type TestEndpointResult =
    | { success: true; status: 200; url: string; response: EndpointResponse }
    | { success: false; status: number | null; error: string };

type NovacityConfig = { baseUrl: string; apiKey: string; token: string };

let cachedNovacityConfig: NovacityConfig | null = null;
let loadingNovacityConfig: Promise<NovacityConfig> | null = null;

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
    try {
        const res = await fetch(url, {
            headers: { Accept: 'application/json' },
        });
        const json: unknown = res.ok ? await res.json() : null;
        return json && typeof json === 'object'
            ? (json as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

function getNovacityConfig(): Promise<NovacityConfig> {
    if (cachedNovacityConfig) return Promise.resolve(cachedNovacityConfig);
    if (loadingNovacityConfig) return loadingNovacityConfig;
    loadingNovacityConfig = fetchJson('/api/settings/novacity_base_url')
        .then((setting) => {
            const saved =
                typeof setting?.value === 'string' ? setting.value : '';
            return fetchJson('/novacity-config').then((cfg) => ({
                baseUrl:
                    saved ||
                    (typeof cfg?.base_url === 'string' ? cfg.base_url : ''),
                apiKey: typeof cfg?.api_key === 'string' ? cfg.api_key : '',
                token: typeof cfg?.token === 'string' ? cfg.token : '',
            }));
        })
        .catch(() => ({ baseUrl: '', apiKey: '', token: '' }))
        .then((config) => {
            cachedNovacityConfig = config;
            return config;
        })
        .finally(() => {
            loadingNovacityConfig = null;
        });
    return loadingNovacityConfig;
}

export const testEndpoint = async (
    payload: TestEndpointPayload,
    signal?: AbortSignal,
): Promise<TestEndpointResult> => {
    const { baseUrl: configBaseUrl, apiKey, token } = await getNovacityConfig();
    const baseUrl =
        (payload.baseUrl ?? '').trim().replace(/\/+$/, '') ||
        (configBaseUrl ?? '').replace(/\/+$/, '');
    if (!baseUrl) {
        return {
            success: false,
            status: null,
            error: 'Novacity base URL not configured',
        };
    }

    const url = `${baseUrl}/${payload.path.replace(/^\/+/, '')}`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;
    if (token) headers.Authorization = `Bearer ${token}`;

    let response: Response;
    try {
        response = await fetch(url, {
            method: payload.method,
            headers,
            signal,
            cache: 'no-store',
        });
    } catch (err) {
        if (signal?.aborted) throw err;
        return {
            success: false,
            status: null,
            error:
                err instanceof Error
                    ? `Request failed: ${err.message}`
                    : 'Request failed',
        };
    }

    const status = response.status;
    if (status !== 200) {
        return {
            success: false,
            status,
            error: `HTTP ${status}: ${response.statusText}`,
        };
    }

    const body: unknown = await response.json().catch(() => null);
    if (!Array.isArray(body) && (typeof body !== 'object' || body === null)) {
        return {
            success: false,
            status,
            error: 'Response is not a valid JSON object or array',
        };
    }

    return { success: true, status, url, response: body as EndpointResponse };
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
