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
    f_req_217: MethodsKpi;
    f_req_218: MethodsKpi;
    f_req_219: MethodsKpi;
    synced_at: string | null;
};

// ─── API Functions ──────────────────────────────────────────────────────────

export const fetchMethodesKpis = (filters?: Record<string, string>) =>
    apiGet<MethodsKpisResponse>('/kpis', filters);

// ── Detail Endpoints ─────────────────────────────────────────────────────────

export type ArchivageDetailItem = {
    of_numero: string;
    est_solde: boolean;
    est_archive: boolean;
};

export type RespectTempsDetailItem = {
    article: string;
    temps_cotation: number;
    temps_production: number;
    difference: number;
    est_respecte: boolean;
};

export type TempsAcceptesDetailItem = {
    article: string;
    nb_gammes_total: number;
    nb_acceptees_v1: number;
    taux_pct: number | null;
};

export const fetchArchivageDetail = () =>
    apiGet<{ data: ArchivageDetailItem[] }>('/archivage-detail');

export const fetchRespectTempsDetail = () =>
    apiGet<{ data: RespectTempsDetailItem[] }>('/respect-temps-detail');

export const fetchTempsAcceptesDetail = () =>
    apiGet<{ data: TempsAcceptesDetailItem[] }>('/temps-acceptes-detail');

export type FiabiliteDetailItem = {
    chaine: string;
    shift: string;
    tag_reel: number;
    sortie_jour: number;
    ecart_pct: number;
    ecart_abs: number;
    status: KpiStatus;
};

export const fetchFiabiliteDetail = (filters?: Record<string, string>) =>
    apiGet<{ data: FiabiliteDetailItem[] }>('/fiabilite-detail', filters);
