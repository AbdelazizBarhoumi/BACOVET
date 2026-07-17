/**
 * Data Mapping API Service
 *
 * CRUD for KPI ↔ Endpoint mapping rows.
 */

const BASE_URL = '/data-mappings';

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

async function fetchWithToken(url: string, options: RequestInit = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(isStateChanging ? { 'X-XSRF-TOKEN': getCsrfToken() } : {}),
        },
    });

    if (response.status === 401) {
        sessionStorage.setItem('v1_returnTo', window.location.pathname);
        window.location.href = '/login';
        throw new Error('Non authentifié');
    }
    if (response.status === 403) {
        window.location.href = '/unauthorized';
        throw new Error('Accès refusé');
    }
    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export interface DataMappingRow {
    id: number;
    kpi: string;
    name: string;
    variable: string;
    endpoint: string | null;
    variable_type: string;
    variable_key: string;
    is_filtered: boolean;
    filter_key: string;
    filter_value: string;
    has_function: boolean;
    fn: string;
    modules: string[];
    formula: FormulaDef | null;
    highlight_color: string | null;
    cible_operator: string;
    cible_value: number | null;
    cible_is_percentage: boolean;
    refresh_frequency: string;
    graph_types: string[] | null;
    user_id: number | null;
    created_at: string;
    updated_at: string;
}

export type DataMappingPayload = Partial<Omit<DataMappingRow, 'id' | 'created_at' | 'updated_at'>>;

export interface FormulaItem {
    type: 'variable' | 'operator' | 'number';
    ref?: number;   // row id for variable
    label?: string; // display label for variable
    op?: string;    // +, -, *, /
    value?: number; // for number type
}

export interface FormulaDef {
    items: FormulaItem[];
}

export const fetchMappings = async (): Promise<DataMappingRow[]> => {
    const result = await fetchWithToken(BASE_URL);
    return Array.isArray(result) ? result : result.data ?? [];
};

export const createMapping = async (data: DataMappingPayload): Promise<DataMappingRow> => {
    const result = await fetchWithToken(BASE_URL, {
        method: 'POST',
        body: JSON.stringify(data),
    });
    return result.mapping;
};

export const updateMapping = async (id: number, data: DataMappingPayload): Promise<DataMappingRow> => {
    const result = await fetchWithToken(`${BASE_URL}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
    return result.mapping;
};

export const deleteMapping = async (id: number): Promise<void> => {
    await fetchWithToken(`${BASE_URL}/${id}`, { method: 'DELETE' });
};

export const batchUpdateMappings = async (mappings: DataMappingPayload[]): Promise<void> => {
    await fetchWithToken(`${BASE_URL}/batch`, {
        method: 'POST',
        body: JSON.stringify({ mappings }),
    });
};

export const seedMappings = async (): Promise<{ count: number }> => {
    return fetchWithToken(`${BASE_URL}/seed`, { method: 'POST' });
};

export const fetchSampleData = async (slug: string, signal?: AbortSignal): Promise<unknown> => {
    const res = await fetch(`/novacity-endpoints/sample/${slug}`, {
        headers: { Accept: 'application/json' },
        signal,
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
};

export interface AllEndpointRecord {
    name: string;
    method: string;
    endpoint: string;
    status: number | null;
    fields: string[];
    response: Record<string, unknown>[];
}

export const fetchAllSamples = async (): Promise<Record<string, AllEndpointRecord>> => {
    const res = await fetch('/novacity-endpoints/all', {
        headers: { Accept: 'application/json' },
    });
    if (!res.ok) return {};
    const json = await res.json();
    return json.endpoints ?? {};
};

// ── Audit Log ──────────────────────────────────────────────────────────────

export interface AuditLogEntry {
    id: number;
    user_id: number | null;
    data_mapping_id: number | null;
    kpi: string;
    action: 'created' | 'updated' | 'deleted';
    field: string;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
    user: { id: number; name: string } | null;
}

export interface PaginatedAuditLogs {
    data: AuditLogEntry[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export const fetchAuditLogs = async (params: {
    page?: number;
    per_page?: number;
    kpi?: string;
    action?: string;
}): Promise<PaginatedAuditLogs> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.per_page) qs.set('per_page', String(params.per_page));
    if (params.kpi) qs.set('kpi', params.kpi);
    if (params.action) qs.set('action', params.action);
    return fetchWithToken(`${BASE_URL}/audit-logs?${qs}`);
};

export interface SyncSqlResult {
    message: string;
    sql_length: number;
    commands: {
        'export:mappings': { exit: number; output: string };
        'export:endpoints': { exit: number; output: string };
        'optimize:clear': { exit: number; output: string };
    };
}

export const syncDataFromSql = async (): Promise<SyncSqlResult> => {
    return fetchWithToken(`${BASE_URL}/sync-sql`, { method: 'POST' });
};

export const exportSql = async (): Promise<void> => {
    const response = await fetch(`${BASE_URL}/export-sql`);
    if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_mappings_export.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};
