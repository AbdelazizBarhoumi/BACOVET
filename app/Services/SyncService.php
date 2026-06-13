<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\NovacityJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncService
{
    // Novacity PascalCase → MySQL snake_case field mappings
    private const FIELD_MAPS = [
        // Quality tables
        'check_pass_qte' => [
            'LOGDATE' => 'log_date', 'SHORTNAME' => 'shortname',
            'ShiftCode' => 'shift_code', 'DefectPct' => 'defect_pct',
        ],
        'vw_defects' => [
            'LOGDATE' => 'log_date', 'ShiftCode' => 'shift_code',
            'ProdGroup' => 'prod_group', 'OpNo' => 'op_no', 'Qty' => 'qty',
        ],
        'qcm_defect_trx' => [
            'LOGDATE' => 'log_date', 'ShiftCode' => 'shift_code',
            'GROUPID' => 'group_id', 'TicketID' => 'ticket_id', 'ITEMID' => 'item_id',
        ],
        'pieces_ok_jour' => ['FirstPassToday' => 'first_pass_today'],
        'pieces_produites_jour' => ['ProducedToday' => 'produced_today'],
        'pieces_ok_annee' => ['FirstPassYear' => 'first_pass_year'],
        'pieces_produites_annee' => ['ProducedYear' => 'produced_year'],

        // Production tables
        'wip_chaine' => [
            'chaine' => 'chaine', 'en_cours' => 'en_cours',
            'entree_jour' => 'entree_jour', 'sortie_jour' => 'sortie_jour',
        ],
        'etat_avancement' => [
            'of' => 'of', 'avancement_pct' => 'avancement_pct',
            'quantite_prevue' => 'quantite_prevue', 'quantite_realisee' => 'quantite_realisee',
            'statut' => 'statut',
        ],
        'efficience_chaine' => [
            'chaine' => 'chaine', 'date' => 'date', 'efficience_pct' => 'efficience_pct',
            'heures_prod' => 'heures_prod', 'heures_standards' => 'heures_standards',
        ],
        'qte_produite' => [
            'date' => 'date', 'chaine' => 'chaine', 'shift' => 'shift',
            'shift_code' => 'shift_code', 'quantite' => 'quantite',
        ],
        'lost_time' => [
            'date' => 'date', 'chaine' => 'chaine', 'motif' => 'motif',
            'minutes_perdues' => 'minutes_perdues',
        ],
        'taging_reel' => [
            'chaine' => 'chaine', 'shift' => 'shift',
            'tag_theorique' => 'tag_theorique', 'tag_reel' => 'tag_reel',
            'ecart_pct' => 'ecart_pct',
        ],
        'packets_rejetes' => [
            'IDColis' => 'id_colis', 'reference' => 'reference',
            'motif' => 'motif', 'qtte' => 'qtte', 'date_rejet' => 'date_rejet',
        ],
        'sortie_coupe' => [
            'commande' => 'commande', 'date' => 'date', 'quantite_coupee' => 'quantite_coupee',
        ],
        'qte_engagement' => [
            'commande' => 'commande', 'of' => 'of', 'article' => 'article',
            'quantite_engagee' => 'quantite_engagee',
        ],
        'qte_entree_serigraphie' => [
            'date' => 'date', 'article' => 'article', 'couleur' => 'couleur',
            'quantite' => 'quantite',
        ],
        'sortie_serigraphie' => [
            'date' => 'date', 'article' => 'article', 'couleur' => 'couleur',
            'quantite' => 'quantite',
        ],
        'of_fabrication' => [
            'IDOFabrication' => 'idofabrication', 'OFabrication' => 'ofabrication',
            'DtDebut' => 'dt_debut', 'DtFin' => 'dt_fin',
        ],
        'inline_vs_endline_comparison' => [
            'LOGDATE' => 'log_date', 'ShiftCode' => 'shift_code',
            'SHORTNAME' => 'shortname', 'OPERA' => 'opera',
        ],
        'qte_produit_individuel_jour' => [
            'date' => 'date', 'employe' => 'employee_id', 'chaine' => 'chaine',
            'quantite' => 'quantite', 'minutes_produites' => 'minutes_produites',
        ],
        'qte_depart_chaine_article_of' => [
            'of' => 'of', 'chaine' => 'chaine', 'article' => 'article',
            'quantite' => 'quantite',
        ],

        // Logistics tables (partial — add as needed)
        'vue_stock' => [
            'idmp' => 'idmp', 'codemp' => 'code_mp', 'designation' => 'designation',
            'Famille' => 'famille', 'Couleur' => 'couleur',
        ],
        'diva_stock' => [
            'IDMP' => 'idmp', 'Qtte' => 'qtte', 'qtteReserve' => 'qtte_reserve',
        ],
    ];

    public function __construct(private NovacityService $novacity) {}

    public function syncQuality(): void
    {
        $this->syncTable('check_pass_qte', fn () => $this->novacity->fetchEndpoint('check_pass_qte'));
        $this->syncTable('vw_defects', fn () => $this->novacity->fetchEndpoint('vw_defect'));
        $this->syncTable('qcm_defect_trx', fn () => $this->novacity->fetchEndpoint('qcm_defect_trx'));
        $this->syncTable('pieces_ok_jour', fn () => $this->novacity->fetchQuery('pieces_ok_jour'));
        $this->syncTable('pieces_produites_jour', fn () => $this->novacity->fetchQuery('pieces_produites_jour'));
        $this->syncTable('pieces_ok_annee', fn () => $this->novacity->fetchQuery('pieces_ok_annee'));
        $this->syncTable('pieces_produites_annee', fn () => $this->novacity->fetchQuery('pieces_produites_annee'));
        $this->syncBundlingData();
    }

    /**
     * Sync BR Bundling data by merging reject + inspection queries into rejets_inspection_paquet.
     * Two separate Novacity queries must be combined into one row per date/period.
     * Handles inactive queries (B-01) by inserting placeholder with null values.
     */
    private function syncBundlingData(): void
    {
        $start = microtime(true);
        try {
            $today = now()->toDateString();

            // Fetch both jour queries — may fail if B-01 inactive
            $rejectsJour = $this->safeFetchQuery('rejets_paquet_jour');
            $inspectionsJour = $this->safeFetchQuery('inspections_paquet_jour');
            $rejectsAnnee = $this->safeFetchQuery('rejets_paquet_annee');
            $inspectionsAnnee = $this->safeFetchQuery('inspections_paquet_annee');

            $jourActive = $rejectsJour !== null && $inspectionsJour !== null;
            $anneeActive = $rejectsAnnee !== null && $inspectionsAnnee !== null;

            DB::table('rejets_inspection_paquet')->truncate();

            // Jour row
            DB::table('rejets_inspection_paquet')->insert([
                'date' => $today,
                'period' => 'jour',
                'bundle_reject' => $jourActive ? (int) data_get($rejectsJour, '0.BundleRejectToday', 0) : null,
                'bundle_inspected' => $jourActive ? (int) data_get($inspectionsJour, '0.BundleInspectedToday', 0) : null,
                'is_active' => $jourActive,
                'synced_at' => now(),
            ]);

            // Année row
            DB::table('rejets_inspection_paquet')->insert([
                'date' => $today,
                'period' => 'annee',
                'bundle_reject' => $anneeActive ? (int) data_get($rejectsAnnee, '0.BundleRejectYear', 0) : null,
                'bundle_inspected' => $anneeActive ? (int) data_get($inspectionsAnnee, '0.BundleInspectedYear', 0) : null,
                'is_active' => $anneeActive,
                'synced_at' => now(),
            ]);

            $status = $jourActive || $anneeActive ? 'ok' : 'inactive';
            $this->updateJobStatus('rejets_inspection_paquet', $status, 2, microtime(true) - $start);

            if (! $jourActive && ! $anneeActive) {
                AuditLog::warn('Sync rejets_inspection_paquet — queries INACTIVE (B-01), placeholders inserted');
            } else {
                AuditLog::info('Sync rejets_inspection_paquet réussie — 2 enregistrements');
            }
        } catch (\Throwable $e) {
            $this->updateJobStatus('rejets_inspection_paquet', 'error', 0, 0, $e->getMessage());
            AuditLog::error("Sync rejets_inspection_paquet échouée — {$e->getMessage()}");
            Log::error("SyncService [rejets_inspection_paquet]: {$e->getMessage()}");
        }
    }

    /**
     * Safely fetch a query — returns null if inactive or failed (for B-01 handling)
     */
    private function safeFetchQuery(string $key): ?array
    {
        try {
            $data = $this->novacity->fetchQuery($key);
            return empty($data) ? null : $data;
        } catch (\Throwable) {
            return null;
        }
    }

    public function syncProduction(): void
    {
        $this->syncTable('wip_chaine', fn () => $this->novacity->fetchQuery('wip_chaine'));
        $this->syncTable('etat_avancement', fn () => $this->novacity->fetchQuery('etat_avancement'));
        $this->syncTable('efficience_chaine', fn () => $this->novacity->fetchQuery('efficience_chaine'));
        $this->syncTable('qte_produite', fn () => $this->novacity->fetchQuery('qte_produite'));
        $this->syncTable('lost_time', fn () => $this->novacity->fetchQuery('lost_time'));
        $this->syncTable('taging_reel', fn () => $this->novacity->fetchQuery('taging_reel'));
        $this->syncTable('packets_rejetes', fn () => $this->novacity->fetchQuery('packets_rejetes'));
        $this->syncTable('sortie_coupe', fn () => $this->novacity->fetchQuery('sortie_coupe'));
        $this->syncTable('qte_engagement', fn () => $this->novacity->fetchQuery('qte_engagement'));
        $this->syncTable('qte_entree_serigraphie', fn () => $this->novacity->fetchQuery('qte_entree_serigraphie'));
        $this->syncTable('sortie_serigraphie', fn () => $this->novacity->fetchQuery('sortie_serigraphie'));
        $this->syncTable('of_fabrication', fn () => $this->novacity->fetchEndpoint('of_fabrication'));
        $this->syncTable('inline_vs_endline_comparison', fn () => $this->novacity->fetchEndpoint('inline_vs_endline_comparison'));
        $this->syncTable('qte_produit_individuel_jour', fn () => $this->novacity->fetchQuery('qte_produit_indiv_jour'));
        $this->syncTable('qte_depart_chaine_article_of', fn () => $this->novacity->fetchQuery('qte_depart_chaine'));
    }

    public function syncLogistics(): void
    {
        $this->syncTable('vue_stock', fn () => $this->novacity->fetchEndpoint('vue_stock'));
        $this->syncTable('diva_stock', fn () => $this->novacity->fetchEndpoint('diva_stock'));
        $this->syncTable('stock_moyen', fn () => $this->novacity->fetchQuery('stock_moyen'));
        $this->syncTable('articles_sans_mouvement', fn () => $this->novacity->fetchQuery('articles_sans_mouvement'));
        $this->syncTable('quantite_totale_stock', fn () => $this->novacity->fetchQuery('quantite_totale_stock'));
        $this->syncTable('capacite_stockage', fn () => $this->novacity->fetchQuery('capacite_stockage'));
        $this->syncTable('nombre_rouleaux', fn () => $this->novacity->fetchQuery('nombre_rouleaux'));
        $this->syncTable('nombre_ofs_livres', fn () => $this->novacity->fetchQuery('nombre_ofs_livres'));
        $this->syncTable('moyenne_date_transfert', fn () => $this->novacity->fetchQuery('moyenne_date_transfert'));
        $this->syncTable('quantite_par_provenance', fn () => $this->novacity->fetchQuery('quantite_par_provenance'));
        $this->syncTable('quantite_par_famille', fn () => $this->novacity->fetchQuery('quantite_par_famille'));
        $this->syncTable('quantite_par_typologie', fn () => $this->novacity->fetchQuery('quantite_par_typologie'));
        $this->syncTable('expeditions', fn () => $this->novacity->fetchEndpoint('expeditions'));
        $this->syncTable('colis_total_var', fn () => $this->novacity->fetchQuery('colis_total_var'));
    }

    private function syncTable(string $table, callable $fetcher): void
    {
        $start = microtime(true);
        try {
            $rows = $fetcher();
            if (! empty($rows)) {
                $fieldMap = self::FIELD_MAPS[$table] ?? [];
                $needsDate = in_array($table, ['pieces_ok_jour', 'pieces_produites_jour']);
                $needsYear = in_array($table, ['pieces_ok_annee', 'pieces_produites_annee']);
                DB::table($table)->truncate();
                $chunks = array_chunk($rows, 500);
                $now = now();
                foreach ($chunks as $chunk) {
                    $insert = array_map(function ($r) use ($fieldMap, $now, $needsDate, $needsYear) {
                        $mapped = [];
                        foreach ((array) $r as $key => $value) {
                            // Try exact match first, then case-insensitive
                            $mysqlKey = $fieldMap[$key] ?? null;
                            if ($mysqlKey === null) {
                                // Try lowercase match
                                $lowerKey = strtolower($key);
                                $mysqlKey = $fieldMap[$lowerKey] ?? null;
                            }
                            if ($mysqlKey === null) {
                                // Try PascalCase to snake_case conversion
                                $snakeKey = strtolower(preg_replace('/([a-z0-9])([A-Z])/', '$1_$2', $key));
                                $mysqlKey = $fieldMap[$snakeKey] ?? $snakeKey;
                            }
                            // Convert ISO datetime to date-only for DATE columns
                            if (in_array($mysqlKey, ['log_date', 'date', 'dt_debut', 'dt_fin', 'date_rejet']) && is_string($value)) {
                                $value = substr($value, 0, 10);
                            }
                            $mapped[$mysqlKey] = $value;
                        }
                        if ($needsDate && ! isset($mapped['date'])) {
                            $mapped['date'] = now()->toDateString();
                        }
                        if ($needsYear && ! isset($mapped['year'])) {
                            $mapped['year'] = (int) now()->format('Y');
                        }
                        $mapped['synced_at'] = $now;
                        return $mapped;
                    }, $chunk);
                    DB::table($table)->insert($insert);
                }
            }
            $this->updateJobStatus($table, 'ok', count($rows), microtime(true) - $start);
            AuditLog::info("Sync {$table} réussie — ".count($rows).' enregistrements');
        } catch (\Throwable $e) {
            $this->updateJobStatus($table, 'error', 0, 0, $e->getMessage());
            AuditLog::error("Sync {$table} échouée — {$e->getMessage()}");
            Log::error("SyncService [{$table}]: {$e->getMessage()}");
        }
    }

    private function syncTableIfActive(string $table, callable $fetcher): void
    {
        $job = NovacityJob::where('query_slug', 'LIKE', "%{$table}%")->first();
        if ($job && ! $job->is_active) {
            return; // Silently skip inactive jobs (B-01)
        }
        $this->syncTable($table, $fetcher);
    }

    private function updateJobStatus(string $table, string $status, int $count, float $elapsed, ?string $error = null): void
    {
        NovacityJob::where('query_slug', 'LIKE', "%{$table}%")->update([
            'last_status' => $status,
            'records_count' => $count,
            'response_time_ms' => (int) ($elapsed * 1000),
            'last_run_at' => now(),
            'last_error' => $error,
        ]);
    }
}
