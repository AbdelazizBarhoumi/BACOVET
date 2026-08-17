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
    Record<string, unknown> | unknown[] | string | number | boolean | null;

/** A declared query parameter definition (name + available values). */
export type EndpointParameter = {
    name: string;
    values: string[];
};

/** A parameter as shown in a row: definition + the value selected in the URL. */
export type EndpointParameterView = EndpointParameter & {
    selected: string;
};

export type EndpointEntry = {
    id: string;
    name: string;
    method: 'GET' | 'POST';
    endpoint: string;
    status: number;
    response: EndpointResponse;
    parameters?: EndpointParameterView[];
};

export type EndpointSummary = {
    id: string;
    name: string;
    method: string;
    endpoint: string;
    slug: string;
    root: string;
    status: number | null;
    source: string;
    object_type: string | null;
    row_count: number;
    has_data: boolean;
    columns: string[];
    checked_at?: string | null;
    last_ok_at?: string | null;
    last_error_at?: string | null;
    last_error?: string | null;
    consecutive_failures?: number;
    disabled?: boolean;
    root_disabled?: boolean;
    retry_pending?: boolean;
    parameters?: EndpointParameterView[];
};

export type EndpointsStats = {
    total: number;
    by_method: Record<string, number>;
    by_source: Record<string, number>;
    by_status: Record<number, number>;
    by_root: Record<string, number>;
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
    root?: string;
    enabled?: '1' | '0' | 'all';
    page?: number;
    per_page?: number;
};

export type EndpointPayload = {
    name: string;
    method: 'GET' | 'POST';
    endpoint: string;
    status: number;
    response: EndpointResponse;
    disabled?: boolean;
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
            throw new Error('Délai de requête dépassé après 60 secondes');
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
    if (filters.root) params.set('root', filters.root);
    params.set('enabled', String(filters.enabled ?? '1'));
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
        'string' | 'integer' | 'number' | 'boolean' | 'date' | 'null' | 'mixed';
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
    builderSchemaCache = null;
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
    retry_pending_count?: number;
};

export type RetryRecord = {
    id: string;
    name: string;
    status: number | null;
    attempts: number;
    last_attempt_at: string;
};

export type RefreshResult = {
    success: boolean;
    exit_code: number;
    output: string;
    meta: RefreshMeta | null;
    retry_pending_count?: number;
    retry_ids?: RetryRecord[];
    never_started?: boolean;
};

/**
 * Response of the async refresh launch: the web request returns immediately
 * and the actual sweep runs in a detached process. `meta` is only meaningful
 * once the `running` flag clears (see waitForRefreshCompletion).
 */
export type RefreshLaunchResult = {
    success: boolean;
    queued: boolean;
    running: boolean;
    reason?: string;
};

export type EndpointHealth = {
    stats: EndpointsStats;
    meta: RefreshMeta | null;
    retry_pending: boolean;
    retry_pending_count?: number;
    retry_ids?: RetryRecord[];
    running?: boolean;
    running_since?: string | null;
    sync?: {
        last_success_at?: string | null;
        last_run_at?: string | null;
        registry_last_run_at?: string | null;
        datasets_last_run_at?: string | null;
        ok_count?: number;
        error_count?: number;
        retry_pending?: boolean;
        running?: boolean;
        running_since?: string | null;
        server_now?: string | null;
    } | null;
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

export const triggerRefresh = async (): Promise<RefreshLaunchResult> => {
    clearEndpointCaches();
    return fetchWithToken<RefreshLaunchResult>(
        `${BASE_URL}/novacity-endpoints/refresh`,
        {
            method: 'POST',
        },
    );
};

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll /health until the background sync finishes (running flag clears).
 * Returns a RefreshResult populated with the final meta, or null when the
 * polling budget is exhausted (the sweep is still running). Budget defaults to
 * 600 x 4s = 40 min so slow environments (long per-request timeouts) are
 * tracked to completion instead of being abandoned after 2 minutes.
 */
export const waitForRefreshCompletion = async (
    intervalMs = 4000,
    maxTries = 600,
): Promise<RefreshResult | null> => {
    let observedRunning = false;
    let baselineLastRun: string | null | undefined;

    for (let i = 0; i < maxTries; i++) {
        const health = await fetchHealth(true);

        if (baselineLastRun === undefined) {
            baselineLastRun = health.meta?.last_run_at ?? null;
        }

        if (health.running) {
            observedRunning = true;
        } else if (health.running === false) {
            // "Started" = we saw it running, or the meta was refreshed since we
            // began waiting (a fast sweep may finish before the first poll).
            const started =
                observedRunning ||
                (health.meta?.last_run_at ?? null) !== baselineLastRun;

            return {
                success: true,
                exit_code: 0,
                output: started
                    ? ''
                    : 'Le rafraîchissement n’a pas démarré — réessayez.',
                meta: health.meta,
                retry_pending_count: health.retry_pending_count,
                retry_ids: health.retry_ids,
                never_started: !started,
            };
        }

        await sleep(intervalMs);
    }

    return null;
};

export const triggerEndpointRefresh = async (
    id: string,
): Promise<RefreshResult & { entry?: EndpointSummary }> => {
    clearEndpointCaches();
    return fetchWithToken(
        `${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}/refresh`,
        { method: 'POST' },
    );
};

export const triggerGroupRefresh = async (
    root: string,
): Promise<RefreshResult> => {
    clearEndpointCaches();
    return fetchWithToken<RefreshResult>(
        `${BASE_URL}/novacity-endpoints/refresh-group`,
        {
            method: 'POST',
            body: JSON.stringify({ root }),
        },
    );
};

export const triggerRetryFailed = async (): Promise<RefreshResult> => {
    clearEndpointCaches();
    return fetchWithToken<RefreshResult>(
        `${BASE_URL}/novacity-endpoints/retry-failed`,
        { method: 'POST' },
    );
};

export const rewriteEndpointRoot = async (
    oldRoot: string,
    newRoot: string,
): Promise<{ success: boolean; changed: number }> => {
    clearEndpointCaches();
    return fetchWithToken(`${BASE_URL}/novacity-endpoints/rewrite-root`, {
        method: 'POST',
        body: JSON.stringify({ old_root: oldRoot, new_root: newRoot }),
    });
};

export type RootCredentialInfo = {
    root: string;
    count: number;
    disabled: boolean;
    disabled_count: number;
    has_api_key: boolean;
    masked_api_key: string;
};

export type ToggleRootResult = {
    success: boolean;
    root: string;
    disabled: boolean;
    count: number;
};

export const fetchRootCredentials = async (): Promise<{
    roots: RootCredentialInfo[];
}> => {
    return fetchWithToken(`${BASE_URL}/novacity-endpoints/roots`);
};

export const toggleRootDisabled = async (
    root: string,
    disabled: boolean,
): Promise<ToggleRootResult> => {
    const result = await fetchWithToken<ToggleRootResult>(
        `${BASE_URL}/novacity-endpoints/roots/toggle`,
        {
            method: 'POST',
            body: JSON.stringify({ root, disabled }),
        },
    );
    clearEndpointCaches();
    return result;
};

export const saveRootCredential = async (
    root: string,
    apiKey: string,
): Promise<{
    success: boolean;
    root: string;
    has_api_key: boolean;
    masked_api_key: string;
}> => {
    return fetchWithToken(`${BASE_URL}/novacity-endpoints/roots`, {
        method: 'POST',
        body: JSON.stringify({ root, api_key: apiKey }),
    });
};

export const removeRootCredential = async (
    root: string,
): Promise<{ success: boolean; root: string }> => {
    return fetchWithToken(
        `${BASE_URL}/novacity-endpoints/roots/${encodeURIComponent(root)}`,
        { method: 'DELETE' },
    );
};

// ── Per-root query parameter definitions ────────────────────────────────

export type RootParametersInfo = {
    root: string;
    parameters: EndpointParameter[];
};

export const fetchRootParameters = async (): Promise<{
    roots: RootParametersInfo[];
}> => {
    return fetchWithToken(`${BASE_URL}/novacity-endpoints/params`);
};

export const saveRootParameters = async (
    root: string,
    parameters: EndpointParameter[],
): Promise<{
    success: boolean;
    root: string;
    parameters: EndpointParameter[];
}> => {
    clearEndpointCaches();
    return fetchWithToken(`${BASE_URL}/novacity-endpoints/params/roots`, {
        method: 'POST',
        body: JSON.stringify({ root, parameters }),
    });
};

export const removeRootParameter = async (
    root: string,
    name: string,
): Promise<{
    success: boolean;
    root: string;
    parameters: EndpointParameter[];
}> => {
    clearEndpointCaches();
    return fetchWithToken(
        `${BASE_URL}/novacity-endpoints/params/roots/delete`,
        {
            method: 'POST',
            body: JSON.stringify({ root, name }),
        },
    );
};

/**
 * Switch the selected value of a declared query parameter for one endpoint.
 * The stored URL is rewritten (e.g. ?chaine=CH01 → ?chaine=CH02) so the next
 * refresh — single, group or "refresh all" — fetches the new value.
 */
export const setEndpointParameter = async (
    id: string,
    name: string,
    value: string,
): Promise<EndpointSummary> => {
    const result = await fetchWithToken<{
        success: boolean;
        entry: EndpointSummary;
    }>(`${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}/parameter`, {
        method: 'POST',
        body: JSON.stringify({ name, value }),
    });
    clearEndpointCaches();
    return result.entry;
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

/**
 * Toggle the enabled/disabled state of an endpoint. Disabled endpoints are
 * excluded from the dataset registry (endpoint_datasets / builder / schema)
 * and from refresh sweeps until re-enabled.
 */
export const toggleEndpointDisabled = async (
    id: string,
    disabled: boolean,
): Promise<EndpointSummary> => {
    const result = await fetchWithToken<{
        success: boolean;
        entry: EndpointSummary;
    }>(`${BASE_URL}/novacity-endpoints/${encodeURIComponent(id)}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ disabled }),
    });
    clearEndpointCaches();
    return result.entry;
};

export type BulkImportMode = 'csv' | 'json';

export type BulkImportResult = {
    success: boolean;
    created: number;
    skipped: number;
    errors: { row: number; error: string }[];
    entries: EndpointSummary[];
};

/**
 * Bulk import endpoints into the registry from pasted CSV/JSON text. No live
 * network calls happen server-side; entries are registered and can be
 * refreshed afterwards.
 */
export const importEndpoints = async (
    mode: BulkImportMode,
    content: string,
): Promise<BulkImportResult> => {
    const result = await fetchWithToken<BulkImportResult>(
        `${BASE_URL}/novacity-endpoints/import`,
        {
            method: 'POST',
            body: JSON.stringify({ mode, content }),
        },
    );
    clearEndpointCaches();
    return result;
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

export const testEndpoint = async (
    payload: TestEndpointPayload,
    signal?: AbortSignal,
): Promise<TestEndpointResult> => {
    try {
        const response = await fetchWithToken<{
            success: boolean;
            status?: number | null;
            url?: string;
            response?: EndpointResponse;
            error?: string;
        }>(`${BASE_URL}/novacity-endpoints/test`, {
            method: 'POST',
            body: JSON.stringify(payload),
            signal,
        });

        if (response.success) {
            return {
                success: true,
                status: 200,
                url: response.url ?? '',
                response: response.response ?? null,
            };
        }

        return {
            success: false,
            status: response.status ?? null,
            error: response.error || 'Échec du test de l’endpoint',
        };
    } catch (err) {
        if (signal?.aborted) throw err;
        return {
            success: false,
            status: null,
            error:
                err instanceof Error
                    ? err.message
                    : 'Échec du test de l’endpoint',
        };
    }
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
