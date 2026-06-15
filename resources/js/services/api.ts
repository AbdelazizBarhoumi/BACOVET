/**
 * BACOVET API Service
 *
 * Centralized API service for Novacity API.
 * Handles x-api-key injection, 10s timeouts, and pagination.
 */

const BASE_URL = '/api/novacity';

export class ApiError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function apiFetch<T>(
    endpoint: string,
    limit: number = 100,
    offset: number = 0,
): Promise<T[]> {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new ApiError(
                `HTTP Error: ${response.status}`,
                response.status,
            );
        }

        const result = await response.json();

        if (result.success === false) {
            throw new ApiError(result.error || 'API Error');
        }

        return result.data || [];
    } catch (error: unknown) {
        clearTimeout(timeoutId);
        const err = error as Error;
        if (err.name === 'AbortError') {
            throw new ApiError('Request timeout (10s)', 408);
        }
        if (err instanceof ApiError) {
            throw err;
        }
        throw new ApiError(err.message || 'Unknown network error');
    }
}

// --- Configured Endpoints (22) ---

export const fetchItemTrxEnq = (limit?: number, offset?: number) =>
    apiFetch('/data/itemtrxenq', limit, offset);
export const fetchVwItemTrx = (limit?: number, offset?: number) =>
    apiFetch('/data/vwitemtrx', limit, offset);
export const fetchLostType = (limit?: number, offset?: number) =>
    apiFetch('/data/losttype', limit, offset);
export const fetchLostTimeTrx = (limit?: number, offset?: number) =>
    apiFetch('/data/losttimetrx', limit, offset);
export const fetchRoverEffectiveness = (limit?: number, offset?: number) =>
    apiFetch('/data/rovereffectiveness', limit, offset);
export const fetchProduction = (limit?: number, offset?: number) =>
    apiFetch('/data/production', limit, offset);
export const fetchInlineVsEndlineComparison = (
    limit?: number,
    offset?: number,
) => apiFetch('/data/inlinevsendlinecomparison', limit, offset);
export const fetchEmpDefectEff = (limit?: number, offset?: number) =>
    apiFetch('/data/empdefecteff', limit, offset);
export const fetchVwDefect = (limit?: number, offset?: number) =>
    apiFetch('/data/vwdefect', limit, offset);
export const fetchRejectQte = (limit?: number, offset?: number) =>
    apiFetch('/data/rejectqte', limit, offset);
export const fetchQcmDefectTrx = (limit?: number, offset?: number) =>
    apiFetch('/data/qcmdefecttrx', limit, offset);
export const fetchCheckPassQte = (limit?: number, offset?: number) =>
    apiFetch('/data/checkpassqte', limit, offset);
export const fetchMpFamille = (limit?: number, offset?: number) =>
    apiFetch('/data/mpfamille', limit, offset);
export const fetchMp = (limit?: number, offset?: number) =>
    apiFetch('/data/mp', limit, offset);
export const fetchOfabrication = (limit?: number, offset?: number) =>
    apiFetch('/data/ofabrication', limit, offset);
export const fetchMouvement = (limit?: number, offset?: number) =>
    apiFetch('/data/mouvement', limit, offset);
export const fetchMpConteneur = (limit?: number, offset?: number) =>
    apiFetch('/data/mpconteneur', limit, offset);
export const fetchArticlesColis = (limit?: number, offset?: number) =>
    apiFetch('/data/articlescolis', limit, offset);
export const fetchDetailColis = (limit?: number, offset?: number) =>
    apiFetch('/data/detailcolis', limit, offset);
export const fetchExpeditions = (limit?: number, offset?: number) =>
    apiFetch('/data/expeditions', limit, offset);
export const fetchVueStock = (limit?: number, offset?: number) =>
    apiFetch('/data/vuestock', limit, offset);
export const fetchDivaStock = (limit?: number, offset?: number) =>
    apiFetch('/data/divastock', limit, offset);

// --- Custom SQL Queries (35+ listed) ---

export const fetchColisTotalVar = (limit?: number, offset?: number) =>
    apiFetch('/data/q/colis_total_var', limit, offset);
export const fetchPacketsRejetes = (limit?: number, offset?: number) =>
    apiFetch('/data/q/packets_rejetes', limit, offset);
export const fetchWipChaine = (limit?: number, offset?: number) =>
    apiFetch('/data/q/wip_chaine', limit, offset);
export const fetchTagingReel = (limit?: number, offset?: number) =>
    apiFetch('/data/q/taging_reel', limit, offset);
export const fetchEtatAvancement = (limit?: number, offset?: number) =>
    apiFetch('/data/q/etat_avancement', limit, offset);
export const fetchEfficienceChaine = (limit?: number, offset?: number) =>
    apiFetch('/data/q/efficience_chaine', limit, offset);
export const fetchMinutesPresence = (limit?: number, offset?: number) =>
    apiFetch('/data/q/minutes_presence', limit, offset);
export const fetchMinutesProduites = (limit?: number, offset?: number) =>
    apiFetch('/data/q/minutes_produites', limit, offset);
export const fetchTempsOperation = (limit?: number, offset?: number) =>
    apiFetch('/data/q/temps_operation', limit, offset);
export const fetchLostTime = (limit?: number, offset?: number) =>
    apiFetch('/data/q/lost_time', limit, offset);
export const fetchQteProduite = (limit?: number, offset?: number) =>
    apiFetch('/data/q/qte_produite', limit, offset);
export const fetchQteEntreeSerigraphie = (limit?: number, offset?: number) =>
    apiFetch('/data/q/qte_entree_serigraphie', limit, offset);
export const fetchQteDepartChaineArticleOf = (
    limit?: number,
    offset?: number,
) => apiFetch('/data/q/qte_depart_chaine_article_of', limit, offset);
export const fetchSortieSerigraphie = (limit?: number, offset?: number) =>
    apiFetch('/data/q/sortie_serigraphie', limit, offset);
export const fetchQteEngagement = (limit?: number, offset?: number) =>
    apiFetch('/data/q/qte_engagement', limit, offset);
export const fetchSortieCoupe = (limit?: number, offset?: number) =>
    apiFetch('/data/q/sortie_coupe', limit, offset);
export const fetchQteProduitIndivJour = (limit?: number, offset?: number) =>
    apiFetch('/data/q/qte_produit_indiv_jour', limit, offset);
export const fetchPiecesOkJourEnCours = (limit?: number, offset?: number) =>
    apiFetch('/data/q/pieces_ok_jour_en_cours', limit, offset);
export const fetchPiecesProduiteJourEnCours = (
    limit?: number,
    offset?: number,
) => apiFetch('/data/q/pieces_produite_jour_en_cours', limit, offset);
export const fetchRejetsInspectionPaquetJour = (
    limit?: number,
    offset?: number,
) => apiFetch('/data/q/rejets_inspection_paquet_jour', limit, offset);
export const fetchInspectionsPaquetJour = (limit?: number, offset?: number) =>
    apiFetch('/data/q/inspections_paquet_jour', limit, offset);
export const fetchPiecesOkAnneeEnCours = (limit?: number, offset?: number) =>
    apiFetch('/data/q/pieces_ok_annee_en_cours', limit, offset);
export const fetchPiecesProduiteAnneeEnCours = (
    limit?: number,
    offset?: number,
) => apiFetch('/data/q/pieces_produite_annee_en_cours', limit, offset);
export const fetchRejetsInspectionPaquetAnnee = (
    limit?: number,
    offset?: number,
) => apiFetch('/data/q/rejets_inspection_paquet_annee', limit, offset);
export const fetchInspectionsPaquetAnnee = (limit?: number, offset?: number) =>
    apiFetch('/data/q/inspections_paquet_annee', limit, offset);
export const fetchStockMoyen = (limit?: number, offset?: number) =>
    apiFetch('/data/q/stock_moyen', limit, offset);
export const fetchArticlesSansMouvement = (limit?: number, offset?: number) =>
    apiFetch('/data/q/articles_sans_mouvement', limit, offset);
export const fetchQuantiteTotaleStock = (limit?: number, offset?: number) =>
    apiFetch('/data/q/quantite_totale_stock', limit, offset);

export const fetchCapaciteStockage = async (
    limit?: number,
    offset?: number,
) => {
    const data = (await apiFetch(
        '/data/q/capacite_de_stockage_en_nombre_de_conteneurs',
        limit,
        offset,
    )) as Record<string, string>[];
    return data.map((item) => ({
        ...item,
        Conteneurs_Actifs: parseInt(item.Conteneurs_Actifs, 10),
        Conteneurs_Consommes: parseInt(item.Conteneurs_Consommes, 10),
        Conteneurs_Supprimes: parseInt(item.Conteneurs_Supprimes, 10),
    }));
};

export const fetchNombreRouleaux = (limit?: number, offset?: number) =>
    apiFetch('/data/q/nombre_rouleaux', limit, offset);
export const fetchNombreOFsLivres = (limit?: number, offset?: number) =>
    apiFetch('/data/q/nombre_ofs_livres', limit, offset);

export const fetchMoyenneDateTransfert = async (
    limit?: number,
    offset?: number,
) => {
    const data = (await apiFetch(
        '/data/q/moyenne_date_de_transfert_date_de_reservation',
        limit,
        offset,
    )) as Record<string, string>[];
    return data.map((item) => ({
        ...item,
        MoyenneJours: parseFloat(item.MoyenneJours),
    }));
};

export const fetchQuantiteParProvenance = (limit?: number, offset?: number) =>
    apiFetch('/data/q/quantite_par_provenance', limit, offset);
export const fetchQuantiteParFamille = (limit?: number, offset?: number) =>
    apiFetch('/data/q/quantite_par_famille', limit, offset);
export const fetchQuantiteParTypologie = (limit?: number, offset?: number) =>
    apiFetch('/data/q/quantite_par_typologie', limit, offset);

// --- Pending / Blocked (from B-02) ---
export const fetchBrGtdJourEnCours = (limit?: number, offset?: number) =>
    apiFetch('/data/q/br_gtd_jour_en_cours', limit, offset);
export const fetchBrGtdDda = (limit?: number, offset?: number) =>
    apiFetch('/data/q/br_gtd_dda', limit, offset);
export const fetchBrAnnuel = (limit?: number, offset?: number) =>
    apiFetch('/data/q/br_annuel', limit, offset);
