/**
 * KPI Endpoints API Service
 */

const BASE_URL = '';

function getCsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

const fetchWithToken = async (url: string, options: RequestInit = {}) => {
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

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
};

export type KpiEndpointRow = {
    endpoint: string;
    kpi_code: string;
    variable_key: string | null;
    variable_type: string;
    refresh_frequency: string;
    last_status: 'ok' | 'error' | 'pending';
    last_synced_at: string | null;
    last_error: string | null;
    response_data: unknown;
    computed_data: unknown;
    extracted_value: string | number | null;
    diagnostic: string;
    row_class: string;
};

export const fetchKpiEndpoints = async (): Promise<KpiEndpointRow[]> => {
    const result = await fetchWithToken(`${BASE_URL}/admin/kpi-endpoints?t=${Date.now()}`);
    return result.data || [];
};

export const fetchKpiEndpointDetail = async (
    kpiCode: string,
): Promise<KpiEndpointRow[]> => {
    const result = await fetchWithToken(
        `${BASE_URL}/admin/kpi-endpoints/${encodeURIComponent(kpiCode)}`,
    );
    return result.data || [];
};

export const fireKpiEndpoint = async (
    endpoint: string,
    kpiCode: string,
    variableKey: string | null,
): Promise<void> => {
    await fetchWithToken(`${BASE_URL}/admin/kpi-endpoints/fire`, {
        method: 'POST',
        body: JSON.stringify({
            endpoint,
            kpi_code: kpiCode,
            variable_key: variableKey,
        }),
    });
};

export const fireAllKpiEndpoints = async (
    frequency?: string,
): Promise<{ dispatched: number; skipped: number }> => {
    const result = await fetchWithToken(`${BASE_URL}/admin/kpi-endpoints/fire-all`, {
        method: 'POST',
        body: JSON.stringify({ frequency }),
    });
    return result.data;
};
