/**
 * BACOVET Logistics API Service
 *
 * Calls Laravel backend endpoints for logistics dashboard data.
 * Frontend NEVER calls Novacity directly.
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
    const url = new URL(`/logistics${path}`, window.location.origin);
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

export type KpiStatus =
    | 'green'
    | 'orange'
    | 'red'
    | 'grey'
    | 'pending'
    | 'inactive';

export type KpiCard = {
    value: number | null;
    status: KpiStatus;
    unit?: string;
    source?: string;
    blocker?: string | null;
    raw?: Record<string, unknown>;
};

export type LogisticsKpis = {
    dot: KpiCard;
    hot: KpiCard;
    respect_plan: KpiCard;
    lead_time: KpiCard;
    next_export: string;
    synced_at: string | null;
};

export type StockKpis = {
    rotation: {
        stock_moyen: number;
        nb_lignes: number;
        note: string;
    };
    stock_mort: {
        value: number | null;
        status: KpiStatus;
        nb_articles_sans_mvt: number;
        qtte_sans_mvt: number;
        qtte_totale: number;
    };
    occupation: {
        value: number | null;
        status: KpiStatus;
        nb_rouleaux: number;
        conteneurs_actifs: number;
        total_conteneurs: number;
    };
    synced_at: string | null;
};

export type StockCompositionItem = {
    name: string;
    value: number;
    nb_articles?: number;
};

export type StockComposition = {
    provenance: StockCompositionItem[];
    famille: StockCompositionItem[];
    typologie: StockCompositionItem[];
    synced_at: string | null;
};

export type ColisDetail = {
    article: string;
    total_colis: number;
    total_qte: number;
};

export type OfItem = {
    of: string;
    avancement_pct: number;
    quantite_prevue: number;
    quantite_realisee: number;
    statut: string;
    colis: ColisDetail[];
    epd: string | null;
};

export type LivraisonData = {
    value: number | null;
    status: KpiStatus;
    total_ofs: number;
    transfert_total: number;
};

export type DelaiMoyen = {
    value: number | null;
    status: KpiStatus;
    nb_ofs: number;
};

export type LogisticsOfs = {
    ofs: OfItem[];
    livraison: LivraisonData;
    delai_moyen: DelaiMoyen;
    synced_at: string | null;
};

export type LivraisonResult = {
    livraison: LivraisonData;
    delai_moyen: DelaiMoyen;
    synced_at: string | null;
};

export type CoverageItem = {
    name: string;
    jours: number;
};

export type LogisticsCoverage = {
    chaine: CoverageItem[];
    coupe: CoverageItem[];
    serigraphie: CoverageItem[];
    synced_at: string | null;
};

export type StockSearchItem = {
    code_mp: string;
    designation: string;
    famille: string;
    couleur: string;
    idmagasin: string | null;
    qtte: number;
    qtte_reserve: number;
    qtte_disponible: number;
};

export type StockSearchResult = {
    data: StockSearchItem[];
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
    stock_total: number;
    synced_at: string | null;
};

export type ReliabilityCategory = {
    value: number | null;
    status: KpiStatus;
    target?: number;
    note?: string;
    blocker?: string;
};

export type StockReliability = {
    accessoires: ReliabilityCategory;
    tissu: ReliabilityCategory;
    fg: ReliabilityCategory;
    synced_at: string | null;
};

// ─── API Functions ──────────────────────────────────────────────────────────

export const fetchLogisticsKpis = () => apiGet<LogisticsKpis>('/kpis');
export const fetchLogisticsStockKpis = () =>
    apiGet<StockKpis>('/stock-kpis');
export const fetchLogisticsStockComposition = () =>
    apiGet<StockComposition>('/stock-composition');
export const fetchLogisticsOfs = () => apiGet<LogisticsOfs>('/ofs');
export const fetchLogisticsLivraison = () =>
    apiGet<LivraisonResult>('/livraison');
export const fetchLogisticsCoverage = () =>
    apiGet<LogisticsCoverage>('/coverage');
export const fetchLogisticsStockSearch = (params?: Record<string, string>) =>
    apiGet<StockSearchResult>('/stock-search', params);
export const fetchLogisticsStockReliability = () =>
    apiGet<StockReliability>('/stock-reliability');
