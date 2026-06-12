<?php

namespace App\Services;

use App\Models\{NovacityJob, AuditLog};
use Illuminate\Support\Facades\{DB, Log};

class SyncService
{
    public function __construct(private NovacityService $novacity) {}

    public function syncQuality(): void
    {
        $this->syncTable('check_pass_qte',       fn() => $this->novacity->fetchEndpoint('check_pass_qte'));
        $this->syncTable('vw_defects',           fn() => $this->novacity->fetchEndpoint('vw_defect'));
        $this->syncTable('qcm_defect_trx',       fn() => $this->novacity->fetchEndpoint('qcm_defect_trx'));
        $this->syncTable('pieces_ok_jour',       fn() => $this->novacity->fetchQuery('pieces_ok_jour'));
        $this->syncTable('pieces_produites_jour',fn() => $this->novacity->fetchQuery('pieces_produites_jour'));
        $this->syncTable('pieces_ok_annee',      fn() => $this->novacity->fetchQuery('pieces_ok_annee'));
        $this->syncTable('pieces_produites_annee',fn()=> $this->novacity->fetchQuery('pieces_produites_annee'));
        $this->syncTableIfActive('rejets_inspection_paquet', fn() => $this->novacity->fetchQuery('rejets_paquet_jour'));
    }

    public function syncProduction(): void
    {
        $this->syncTable('wip_chaine',          fn() => $this->novacity->fetchQuery('wip_chaine'));
        $this->syncTable('etat_avancement',     fn() => $this->novacity->fetchQuery('etat_avancement'));
        $this->syncTable('efficience_chaine',   fn() => $this->novacity->fetchQuery('efficience_chaine'));
        $this->syncTable('qte_produite',        fn() => $this->novacity->fetchQuery('qte_produite'));
        $this->syncTable('lost_time',           fn() => $this->novacity->fetchQuery('lost_time'));
        $this->syncTable('taging_reel',         fn() => $this->novacity->fetchQuery('taging_reel'));
        $this->syncTable('packets_rejetes',     fn() => $this->novacity->fetchQuery('packets_rejetes'));
        $this->syncTable('sortie_coupe',        fn() => $this->novacity->fetchQuery('sortie_coupe'));
        $this->syncTable('qte_engagement',      fn() => $this->novacity->fetchQuery('qte_engagement'));
        $this->syncTable('qte_entree_serigraphie', fn()=> $this->novacity->fetchQuery('qte_entree_serigraphie'));
        $this->syncTable('sortie_serigraphie',  fn() => $this->novacity->fetchQuery('sortie_serigraphie'));
        $this->syncTable('of_fabrication',      fn() => $this->novacity->fetchEndpoint('of_fabrication'));
        $this->syncTable('inline_vs_endline_comparison', fn() => $this->novacity->fetchEndpoint('inline_vs_endline_comparison'));
        $this->syncTable('qte_produit_individuel_jour',  fn() => $this->novacity->fetchQuery('qte_produit_indiv'));
        $this->syncTable('qte_depart_chaine_article_of', fn() => $this->novacity->fetchQuery('qte_depart_chaine'));
    }

    public function syncLogistics(): void
    {
        $this->syncTable('vue_stock',             fn() => $this->novacity->fetchEndpoint('vue_stock'));
        $this->syncTable('diva_stock',            fn() => $this->novacity->fetchEndpoint('diva_stock'));
        $this->syncTable('stock_moyen',           fn() => $this->novacity->fetchQuery('stock_moyen'));
        $this->syncTable('articles_sans_mouvement', fn() => $this->novacity->fetchQuery('articles_sans_mouvement'));
        $this->syncTable('quantite_totale_stock', fn() => $this->novacity->fetchQuery('quantite_totale_stock'));
        $this->syncTable('capacite_stockage',     fn() => $this->novacity->fetchQuery('capacite_stockage'));
        $this->syncTable('nombre_rouleaux',       fn() => $this->novacity->fetchQuery('nombre_rouleaux'));
        $this->syncTable('nombre_ofs_livres',     fn() => $this->novacity->fetchQuery('nombre_ofs_livres'));
        $this->syncTable('moyenne_date_transfert',fn() => $this->novacity->fetchQuery('moyenne_date_transfert'));
        $this->syncTable('quantite_par_provenance',fn()=> $this->novacity->fetchQuery('quantite_par_provenance'));
        $this->syncTable('quantite_par_famille',  fn() => $this->novacity->fetchQuery('quantite_par_famille'));
        $this->syncTable('quantite_par_typologie',fn() => $this->novacity->fetchQuery('quantite_par_typologie'));
        $this->syncTable('expeditions',           fn() => $this->novacity->fetchEndpoint('expeditions'));
        $this->syncTable('colis_total_var',       fn() => $this->novacity->fetchQuery('colis_total_var'));
    }

    private function syncTable(string $table, callable $fetcher): void
    {
        $start = microtime(true);
        try {
            $rows = $fetcher();
            if (!empty($rows)) {
                DB::table($table)->truncate();
                $chunks = array_chunk($rows, 500);
                $now    = now();
                foreach ($chunks as $chunk) {
                    $insert = array_map(fn($r) => array_merge((array)$r, ['synced_at' => $now]), $chunk);
                    DB::table($table)->insert($insert);
                }
            }
            $this->updateJobStatus($table, 'ok', count($rows), microtime(true) - $start);
            AuditLog::info("Sync {$table} réussie — " . count($rows) . " enregistrements");
        } catch (\Throwable $e) {
            $this->updateJobStatus($table, 'error', 0, 0, $e->getMessage());
            AuditLog::error("Sync {$table} échouée — {$e->getMessage()}");
            Log::error("SyncService [{$table}]: {$e->getMessage()}");
        }
    }

    private function syncTableIfActive(string $table, callable $fetcher): void
    {
        $job = NovacityJob::where('query_slug', 'LIKE', "%{$table}%")->first();
        if ($job && !$job->is_active) {
            return; // Silently skip inactive jobs (B-01)
        }
        $this->syncTable($table, $fetcher);
    }

    private function updateJobStatus(string $table, string $status, int $count, float $elapsed, ?string $error = null): void
    {
        NovacityJob::where('query_slug', 'LIKE', "%{$table}%")->update([
            'last_status'      => $status,
            'records_count'    => $count,
            'response_time_ms' => (int)($elapsed * 1000),
            'last_run_at'      => now(),
            'last_error'       => $error,
        ]);
    }
}
