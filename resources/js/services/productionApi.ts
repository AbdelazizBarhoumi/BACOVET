/**
 * BACOVET Production API Service
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
    const url = new URL(`/production${path}`, window.location.origin);
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

export type DataResponse<T> = { data: T[] };

export type ApiMetadata = {
    missing_fields?: string[];
};

export type ProductionKpis = {
    avg_efficience: { value: number | null; status: string; target: string };
    avg_owe: { value: number | null; status: string; target: string };
    rft_production?: {
        value: number | null;
        status: string;
        target: string;
        source?: string;
    };
    total_wip: { value: number | null; status: string; target: string };
    total_lost_time: { value: number | null; status: string; target: string };
    br_gtd?: { value: number | null; status: string; target: string };
    br_bundling?: { value: number | null; status: string; target: string };
    br_print?: { value: number | null; status: string; target: string };
    synced_at: string | null;
    metadata?: ApiMetadata;
};

export type ChainInfo = {
    id: string;
    of: string;
    article: string;
    sam: number | string;
    sot?: number | string;
    effectif: number | string;
    objectif: number | string;
    eff: number;
    hp?: number;
    hs?: number;
    wip: number;
    status: string;
    br_gtd: number | null;
    bpd?: string;
    epd?: string;
    ehd?: string;
    designation?: string;
};

export type GaugeItem = {
    chaine: string;
    efficience_pct?: number;
    wip?: number;
};

export type StoppageItem = {
    chaine: string;
    motif: string;
    duration: number;
    start: number;
};

export type OfDonutItem = {
    of: string;
    pct: number;
    statut: string;
};

export type TrendItem = {
    jour: string;
    eff: number;
};

export type TopOpItem = {
    nom: string;
    eff: number;
    min_std?: number;
    min_pres?: number;
};

export type WipAreaItem = {
    date: string;
    sortie: number;
    engagement: number;
};

// ─── API Functions ──────────────────────────────────────────────────────────

export const fetchProductionChainInfo = (filters?: Record<string, string>) =>
    apiGet<{ data: ChainInfo[]; metadata: ApiMetadata }>(
        '/chain-info',
        filters,
    );

export const fetchProductionKpis = (filters?: Record<string, string>) =>
    apiGet<ProductionKpis>('/kpis', filters);

export const fetchProductionGauges = (filters?: Record<string, string>) =>
    apiGet<{ data: GaugeItem[] }>('/efficience-gauges', filters);

export const fetchProductionWipGauges = (filters?: Record<string, string>) =>
    apiGet<{ data: GaugeItem[] }>('/wip-gauges', filters);

export const fetchProductionStoppages = (filters?: Record<string, string>) =>
    apiGet<{ data: StoppageItem[] }>('/stoppage-timeline', filters);

export const fetchProductionOfDonuts = (filters?: Record<string, string>) =>
    apiGet<{ data: OfDonutItem[] }>('/of-donuts', filters);

export const fetchProductionTrend = (filters?: Record<string, string>) =>
    apiGet<{ data: TrendItem[] }>('/efficience-trend', filters);

export const fetchProductionTopOps = (filters?: Record<string, string>) =>
    apiGet<{ data: TopOpItem[] }>('/top-operators', filters);

export const fetchProductionWip = (filters?: Record<string, string>) =>
    apiGet<{ data: WipAreaItem[] }>('/wip', filters);

import type { BreakdownData, BreakdownRow } from '../types/production';
// ...
export const fetchProductionSoProgress = (filters?: Record<string, string>) =>
    apiGet<{ data: BreakdownRow[] }>('/so-progress', filters);

// ...
export const fetchDepartage = (
    poste: string,
    filters?: Record<string, string>,
) => apiGet<{ data: BreakdownRow[] }>(`/coupe/departage?poste=${poste}`, filters);

export const fetchProductionBreakdown = (
    kpiKey: string,
    filters?: Record<string, string>,
) =>
    apiGet<BreakdownData>(`/breakdown/${kpiKey}`, filters);

// ... existing exports
export const fetchProductionAlerts = () => apiGet<{ alerts: BreakdownRow[] }>('/alerts');

export const fetchCoupeCoverage = (filters?: Record<string, string>) =>
    apiGet<{ value: number | null; status: string; unit?: string; delta_pcs?: number }>('/coupe/coverage', filters);

export const fetchCoupeChainCoverage = (filters?: Record<string, string>) =>
    apiGet<{
        value: number;
        unit: string;
        breakdown: BreakdownRow[];
    }>('/coupe/chain-coverage', filters);

export const fetchSerigraphieCoverage = (filters?: Record<string, string>) =>
    apiGet<{ value: number; status: string; target: string }>(
        '/serigraphie/coverage',
        filters,
    );

export const fetchCoupeTagging = (filters?: Record<string, string>) =>
    apiGet<DataResponse<Record<string, unknown>>>('/coupe/tagging', filters);

export const fetchCoupeOfs = (filters?: Record<string, string>) =>
    apiGet<DataResponse<Record<string, unknown>>>('/coupe/ofs', filters);

export const fetchCoupeQteDepartage = (filters?: Record<string, string>) =>
    apiGet<DataResponse<Record<string, unknown>>>('/coupe/qte-departage', filters);

export const fetchSerigraphieFlux = (filters?: Record<string, string>) =>
    apiGet<DataResponse<Record<string, unknown>>>('/serigraphie/flux', filters);

export const fetchSerigraphieRejets = (filters?: Record<string, string>) =>
    apiGet<{ data: Record<string, unknown>[]; metadata?: Record<string, unknown> }>(
        '/serigraphie/rejets',
        filters,
    );

export const fetchInlineEndline = (filters?: Record<string, string>) =>
    apiGet<DataResponse<Record<string, unknown>>>('/inline-endline', filters);

// ── Methods KPIs (F-REQ-216, 218, 219) ─────────────────────────────────────

export type MethodsKpiResponse = {
    value: number | null;
    target: number;
    total: number;
    status: string;
};

export const fetchTauxArchivage = () =>
    apiGet<MethodsKpiResponse & { archived: number }>('/taux-archivage');

export const fetchRespectTempsEstime = () =>
    apiGet<MethodsKpiResponse & { respected: number }>('/respect-temps-estime');

export const fetchTauxTempsAcceptes = () =>
    apiGet<MethodsKpiResponse & { accepted: number }>('/taux-temps-acceptes');

