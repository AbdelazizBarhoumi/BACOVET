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

async function apiGet<T>(path: string): Promise<T> {
    const url = new URL(`/developpement${path}`, window.location.origin);

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
    synced_at?: string;
    is_stale?: boolean;
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

export type ScatterItem = {
    mois: string;
    modele: string;
    valeur: number;
    reclamations: number;
    total: number;
};

// ─── API Functions ──────────────────────────────────────────────────────────

export const fetchDevelopmentKpis = () =>
    apiGet<DevelopmentKpisResponse>('/kpis');

export const fetchDevelopmentTrend = () =>
    apiGet<{ data: TrendItem[] }>('/trend');

export const fetchReclamationsScatter = () =>
    apiGet<{ data: ScatterItem[] }>('/reclamations-scatter');
