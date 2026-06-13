<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class NovacityService
{
    private string $baseUrl;

    private string $apiKey;

    private string $adminToken;

    private int $timeout;

    // Maps internal alias → actual Novacity query slug
    // The aliases are short names used in SyncService; the values are the full Novacity slugs
    private const QUERY_SLUGS = [
        'wip_chaine' => 'wip_chaine',
        'etat_avancement' => 'etat_avancement',
        'efficience_chaine' => 'efficience_chaine',
        'minutes_presence' => 'minutes_presence',
        'minutes_produites' => 'minutes_produites',
        'lost_time' => 'lost_time',
        'qte_produite' => 'qte_produite',
        'qte_produit_indiv_jour' => 'qte_produit_indiv_jour',
        'pieces_ok_jour' => 'pieces_ok_de_premier_coup_jour_en_cours',
        'pieces_produites_jour' => 'pieces_produites_jour_en_cours',
        'pieces_ok_annee' => 'pieces_ok_de_premier_coup_annee_en_cours',
        'pieces_produites_annee' => 'pieces_produites_annee_en_cours',
        'rejets_paquet_jour' => 'rejets_suite_inspection_paquet_jour_en_cours',
        'inspections_paquet_jour' => 'inspections_paquet_jour_en_cours',
        'rejets_paquet_annee' => 'rejets_suite_inspection_paquet_annee_en_cours',
        'inspections_paquet_annee' => 'inspections_paquet_annee_en_cours',
        'stock_moyen' => 'stock_moyen',
        'articles_sans_mouvement' => 'articles_sans_mouvement',
        'quantite_totale_stock' => 'quantite_totale_stock',
        'capacite_stockage' => 'capacite_stockage',
        'nombre_rouleaux' => 'nombre_rouleaux',
        'nombre_ofs_livres' => 'nombre_ofs_livres',
        'moyenne_date_transfert' => 'moyenne_date_transfert',
        'quantite_par_provenance' => 'quantite_par_provenance',
        'quantite_par_famille' => 'quantite_par_famille',
        'quantite_par_typologie' => 'quantite_par_typologie',
        'colis_total_var' => 'colis_total_3var',
        'packets_rejetes' => 'packets_rejetes',
        'sortie_coupe' => 'sortie_coupe',
        'qte_engagement' => 'qte_engagement',
        'qte_depart_chaine' => 'qte_depart_chaine_article_of',
        'qte_entree_serigraphie' => 'qte_entree_serigraphie',
        'sortie_serigraphie' => 'sortie_serigraphie',
        'taging_reel' => 'taging_reel',
    ];

    private const ENDPOINT_PATHS = [
        'check_pass_qte' => '/api/data/checkpassqte',
        'vw_defect' => '/api/data/vwdefect',
        'qcm_defect_trx' => '/api/data/qcmdefecttrx',
        'reject_qte' => '/api/data/rejectqte',
        'of_fabrication' => '/api/data/ofabrication',
        'vue_stock' => '/api/data/vuestock',
        'diva_stock' => '/api/data/divastock',
        'expeditions' => '/api/data/expeditions',
        'articles_colis' => '/api/data/articlescolis',
        'detail_colis' => '/api/data/detailcolis',
        'inline_vs_endline_comparison' => '/api/data/inlinevsendlinecomparison',
    ];

    public function __construct()
    {
        $this->baseUrl = (string) config('novacity.base_url');
        $this->apiKey = (string) config('novacity.api_key');
        $this->adminToken = (string) config('novacity.admin_token', 'SYSTEM_TOKEN');
        $this->timeout = (int) config('novacity.timeout', 10);
    }

    public function fetchEndpoint(string $key, int $limit = 1000, int $offset = 0): array
    {
        $path = self::ENDPOINT_PATHS[$key] ?? throw new \InvalidArgumentException("Unknown endpoint: $key");
        $response = $this->get($path, compact('limit', 'offset'));

        return $response['data'] ?? [];
    }

    public function fetchQuery(string $key, int $limit = 1000, int $offset = 0): array
    {
        $slug = self::QUERY_SLUGS[$key] ?? throw new \InvalidArgumentException("Unknown query: $key");
        $response = $this->get("/api/data/q/{$slug}", compact('limit', 'offset'));

        return $response['data'] ?? [];
    }

    /**
     * Fetch admin jobs list
     */
    public function fetchJobs(?string $bearerToken = null): array
    {
        $response = $this->get('/api/admin/jobs', [], $bearerToken ?? $this->adminToken);

        return $response['data'] ?? [];
    }

    /**
     * Trigger a job manually
     */
    public function runJob(int $jobId, ?string $bearerToken = null): array
    {
        return $this->get("/api/admin/jobs/{$jobId}/run", [], $bearerToken ?? $this->adminToken);
    }

    private function get(string $path, array $query = [], ?string $bearerToken = null): array
    {
        $headers = ['x-api-key' => $this->apiKey];
        if ($bearerToken) {
            $headers['Authorization'] = "Bearer {$bearerToken}";
        }

        $response = Http::withHeaders($headers)
            ->timeout($this->timeout)
            ->get($this->baseUrl.$path, $query);

        if ($response->failed()) {
            throw new \RuntimeException("Novacity API error [{$path}]: HTTP {$response->status()}");
        }

        $body = $response->json();

        if (isset($body['success']) && ! $body['success']) {
            throw new \RuntimeException("Novacity returned success:false for [{$path}]");
        }

        return $body;
    }
}
