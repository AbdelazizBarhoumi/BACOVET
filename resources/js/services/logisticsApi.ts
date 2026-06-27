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
    note?: string;
    target?: number;
    is_fallback?: boolean;
    blocker?: string | null;
    raw?: Record<string, unknown>;
};

export type LogisticsKpis = {
    dot: KpiCard;
    hot: KpiCard;
    respect_plan: KpiCard;
    lead_time: KpiCard;
    archivage: KpiCard;
    synced_at: string | null;
};

export type CategoryStockKpi = {
    value: number | null;
    status: KpiStatus;
    stock_moyen?: number;
    nb_lignes?: number;
    note?: string;
    nb_articles_sans_mvt?: number;
    qtte_sans_mvt?: number;
    qtte_totale?: number;
    nb_rouleaux?: number;
    conteneurs_actifs?: number;
    total_conteneurs?: number;
};

export type ArchivageKpi = {
    value: number | null;
    status: KpiStatus;
    total_ofs: number;
    archived_ofs: number;
    note: string | null;
};

export type StockKpis = {
    rotation: {
        accessoires: CategoryStockKpi;
        tissu: CategoryStockKpi;
        fg: CategoryStockKpi;
    };
    stock_mort: {
        accessoires: CategoryStockKpi;
        tissu: CategoryStockKpi;
        fg: CategoryStockKpi;
    };
    occupation: {
        accessoires: CategoryStockKpi;
        tissu: CategoryStockKpi;
        fg: CategoryStockKpi;
    };
    archivage: ArchivageKpi;
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
    bpd: string | null;
    ehd: string | null;
    epd: string | null;
};

export type LivraisonCategory = {
    value: number | null;
    status: KpiStatus;
    total_ofs: number;
    transfert_total: number;
};

export type DelaiMoyenCategory = {
    value: number | null;
    status: KpiStatus;
    nb_ofs: number;
};

export type LogisticsOfs = {
    ofs: OfItem[];
    livraison: {
        accessoires: LivraisonCategory;
        tissu: LivraisonCategory;
        fg: LivraisonCategory;
    };
    delai_moyen: {
        accessoires: DelaiMoyenCategory;
        tissu: DelaiMoyenCategory;
        fg: DelaiMoyenCategory;
    };
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
    global: ReliabilityCategory;
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
export const fetchLogisticsStockReliability = () =>
    apiGet<StockReliability>('/stock-reliability');
