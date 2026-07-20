/**
 * BACOVET V2 Production API Service
 * Reads from kpi_data table joined with data_mappings metadata.
 */

function getXsrfToken(): string {
    return decodeURIComponent(
        document.cookie
            .split('; ')
            .find((c) => c.startsWith('XSRF-TOKEN='))
            ?.split('=')[1] ?? '',
    );
}

export type V2KpiItem = {
    kpi_code: string;
    name: string;
    variable: string;
    value: number | string | Record<string, unknown>[] | null;
    status: string;
    synced_at: string | null;
    last_valid_synced_at: string | null;
    formula_readable: string | null;
    target_operator: string | null;
    target_value: number | null;
    target_is_percentage: boolean;
    target_readable: string | null;
    refresh_frequency: string;
    highlight_color: string | null;
    endpoints: string[];
    has_missing_data: boolean;
    graph_types: string[] | null;
    raw_data: Record<string, unknown>[] | null;
    filter_key: string | null;
    filter_options: string[] | null;
    filters: { key: string; options: string[] }[] | null;
};

export type V2KpisResponse = {
    data: V2KpiItem[];
};

export async function fetchV2ProductionKpis(
    module: string,
    filters?: Record<string, string>,
    activeFilters?: Record<string, string>,
): Promise<V2KpisResponse> {
    const url = new URL('/production/v2-kpis', window.location.origin);
    url.searchParams.set('module', module);

    if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
            if (v != null && v !== '') {
                url.searchParams.set(k, v);
            }
        });
    }

    if (activeFilters) {
        Object.entries(activeFilters).forEach(([k, v]) => {
            if (v != null && v !== '' && v !== 'Tous') {
                url.searchParams.set(`filter_${k}`, v);
            }
        });
    }

    const res = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getXsrfToken(),
        },
        signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Non authentifié');
    }
    if (!res.ok) {
        throw new Error(`Erreur API ${res.status}: v2-kpis`);
    }

    return res.json();
}

/**
 * Fetch raw KPI data from backend (no filtering — all computation is frontend-side).
 * Only sends module + global filter params (date range, etc.), never activeFilters.
 */
export async function fetchV2ProductionKpisRaw(
    module: string,
    filters?: Record<string, string>,
): Promise<{ data: Record<string, unknown>[] }> {
    const url = new URL('/production/v2-kpis', window.location.origin);
    url.searchParams.set('module', module);

    if (filters) {
        Object.entries(filters).forEach(([k, v]) => {
            if (v != null && v !== '') {
                url.searchParams.set(k, v);
            }
        });
    }

    const res = await fetch(url.toString(), {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': getXsrfToken(),
        },
        signal: AbortSignal.timeout(15000),
    });

    if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Non authentifié');
    }
    if (!res.ok) {
        throw new Error(`Erreur API ${res.status}: v2-kpis`);
    }

    return res.json();
}
