/**
 * BACOVET Methods API Service
 */

function getXsrfToken(): string {
    return decodeURIComponent(
        document.cookie
            .split('; ')
            .find((c) => c.startsWith('XSRF-TOKEN='))
            ?.split('=')[1] ?? '',
    );
}

async function apiGet<T>(
    path: string,
    params?: Record<string, string>,
): Promise<T> {
    const url = new URL(`/methods${path}`, window.location.origin);
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v != null && v !== '') url.searchParams.set(k, v);
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
    if (res.status === 403) {
        window.location.href = '/unauthorized';
        throw new Error('Accès refusé');
    }
    if (!res.ok) {
        throw new Error(`Erreur API ${res.status}: ${path}`);
    }

    return res.json();
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type KpiStatus = 'green' | 'orange' | 'red' | 'grey' | 'pending' | 'inactive';

export type MethodsKpi = {
    value: number | null;
    status?: KpiStatus;
    blocker?: string;
    target: number;
    frequency: string;
    numerator?: number;
    denominator?: number;
    updated_at?: string;
    raw?: Record<string, unknown>;
};

export type MethodsKpisResponse = {
    f_req_216: MethodsKpi;
    f_req_217: MethodsKpi & { is_proxy?: boolean; proxy_note?: string };
    f_req_218: MethodsKpi;
    f_req_219: MethodsKpi;
    synced_at: string | null;
};

export type TaggingChartItem = {
    chaine: string;
    shift: string;
    tag_theorique: number;
    tag_reel: number;
    ecart_pct: number;
    status: KpiStatus;
};

export type DetailTableItem = {
    id: string;
    indicateur: string;
    valeur: string | null;
    cible: string;
    frequence: string;
    status?: KpiStatus;
    blocker?: string;
};

// ─── API Functions ──────────────────────────────────────────────────────────

export const fetchMethodesKpis = (filters?: Record<string, string>) =>
    apiGet<MethodsKpisResponse>('/kpis', filters);

export const fetchMethodesTaggingChart = (filters?: Record<string, string>) =>
    apiGet<{ data: TaggingChartItem[] }>('/tagging-chart', filters);

export const fetchMethodesDetailTable = () =>
    apiGet<{ data: DetailTableItem[] }>('/detail-table');
