/**
 * BACOVET Development API Service
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
    const url = new URL(`/development${path}`, window.location.origin);
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

export type KpiStatus = 'green' | 'orange' | 'red' | 'grey';

export type DevelopmentKpi = {
    value: number | null;
    numerator?: number;
    denominator?: number;
    target: number;
    target_kind: 'min' | 'max';
    frequency: string;
    status: KpiStatus;
    source?: string;
    updated_at?: string;
};

export type DevelopmentKpisResponse = {
    kpis: {
        dev_rft: DevelopmentKpi;
        dev_livraison: DevelopmentKpi;
        dev_nomenclature: DevelopmentKpi;
        dev_reclamations: DevelopmentKpi;
    };
    synced_at: string | null;
};

export type TrendItem = {
    mois: string;
    valeur: number;
};

// ─── API Functions ──────────────────────────────────────────────────────────

export const fetchDevelopmentKpis = (filters?: Record<string, string>) =>
    apiGet<DevelopmentKpisResponse>('/kpis', filters);

export const fetchDevelopmentTrend = (filters?: Record<string, string>) =>
    apiGet<{ data: TrendItem[] }>('/trend', filters);

export type LeadTimeDevResponse = {
    value: number | null;
    target: number;
    status: KpiStatus;
    unit: string;
    target_kind: string;
    frequency: string;
    source?: string;
};

export const fetchLeadTimeDev = (filters?: Record<string, string>) =>
    apiGet<LeadTimeDevResponse>('/lead-time', filters);

export const fetchDevelopmentTrendRft = (filters?: Record<string, string>) =>
    apiGet<{ data: TrendItem[] }>('/trend-rft', filters);

export const fetchDevelopmentTrendLivraison = (filters?: Record<string, string>) =>
    apiGet<{ data: TrendItem[] }>('/trend-livraison', filters);
