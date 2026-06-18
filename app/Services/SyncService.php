<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\NovacityJob;
use App\Models\SyncLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

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
            'of' => 'of_number', 'article' => 'article',
        ],
        'item_trx_enq' => [
            'TransactionID' => 'transaction_id', 'SONo' => 'so_no',
            'ItemNo' => 'item_no', 'OpNo' => 'op_no', 'IsSplit' => 'is_split',
        ],
        'etat_avancement' => [
            'of' => 'of', 'avancement_pct' => 'avancement_pct',
            'quantite_prevue' => 'quantite_prevue', 'quantite_realisee' => 'quantite_realisee',
            'statut' => 'statut', 'chaine' => 'chaine',
        ],
        'efficience_chaine' => [
            'chaine' => 'chaine', 'date' => 'date', 'efficience_pct' => 'efficience_pct',
            'heures_prod' => 'heures_prod', 'heures_standards' => 'heures_standards',
        ],
        'qte_produite' => [
            'date' => 'date', 'chaine' => 'chaine', 'shift' => 'shift',
            'quantite' => 'quantite',
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
            'IDOFabrication' => 'idofabrication', 'OFabrication' => 'of_number',
            'DtDebut' => 'dt_debut', 'DtFin' => 'dt_fin',
        ],
        'inline_vs_endline_comparison' => [
            'LOGDATE' => 'log_date', 'ShiftCode' => 'shift_code',
            'SHORTNAME' => 'shortname', 'OPERA' => 'opera',
        ],
        'qte_produit_individuel_jour' => [
            'date' => 'date', 'employe' => 'employee_id', 'chaine' => 'chaine',
            'quantite' => 'quantite', 'minutes_produites' => 'minutes_produites',
            'OpNo' => 'poste', 'OpLib' => 'poste',
        ],
        'qte_depart_chaine_article_of' => [
            'of' => 'of', 'chaine' => 'chaine', 'article' => 'article',
            'quantite' => 'quantite', 'date' => 'date',
        ],
        'minutes_presence' => [
            'employe' => 'employee_id', 'date' => 'date',
            'minutes_presence' => 'minutes_presence', 'chaine' => 'chaine',
        ],
        'minutes_produites' => [
            'employe' => 'employee_id', 'date' => 'date', 'chaine' => 'chaine',
            'minutes_produites' => 'minutes_produites',
        ],
        'temps_operation' => [
            'operation' => 'operation_code', 'temps_standard_s' => 'temps_standard_s',
            'temps_reel_s' => 'temps_reel_s', 'ecart_pct' => 'ecart_pct',
        ],

        // Logistics tables
        'vue_stock' => [
            'idmp' => 'idmp', 'codemp' => 'code_mp', 'designation' => 'designation',
            'Famille' => 'famille', 'Couleur' => 'couleur',
        ],
        'diva_stock' => [
            'IDMvtStock' => 'idmvt_stock', 'IDMP' => 'idmp', 'IDMagasin' => 'idmagasin',
            'Qtte' => 'qtte', 'qtteReserve' => 'qtte_reserve',
        ],
        'colis_total_var' => [
            'Article' => 'article', 'Commande' => 'commande',
            'OF' => 'of', 'TotalColis' => 'total_colis',
            'TotalPieces' => 'total_qte',
            'total_pieces' => 'total_qte',
            'couleur' => 'couleur',
        ],
        'expeditions' => [
            'IDExpedition' => 'idexpedition', 'DateCreation' => 'date_creation',
            'Reference' => 'reference', 'Destination' => 'destination',
            'DateExpedition' => 'date_expedition', 'QteExpedies' => 'qte_expedies',
            'Statut' => 'statut', 'LibExpedition' => 'lib_expedition',
        ],
        'articles_sans_mouvement' => [
            'NbArticles_SansMvt_365j' => 'nb_articles_sans_mvt_365j',
            'Qtte_SansMvt_365j' => 'qtte_sans_mvt_365j',
        ],
        'moyenne_date_transfert' => [
            'MoyenneJours' => 'moyenne_jours',
            'NbOFConsideres' => 'nb_of_consideres',
        ],

        // Google Drive tables (columns already snake_case from Sheets mock)
        'sync_drive_br_print' => [
            'date' => 'date', 'nb_inspections' => 'nb_inspections', 'nb_rejets' => 'nb_rejets',
        ],
        'sync_drive_br_care_label' => [
            'date' => 'date', 'nb_inspections' => 'nb_inspections', 'nb_rejets' => 'nb_rejets',
        ],
        'sync_drive_br_accessoires' => [
            'date' => 'date', 'nb_inspections' => 'nb_inspections', 'nb_rejets' => 'nb_rejets',
        ],
        'sync_drive_br_compo' => [
            'date' => 'date', 'nb_inspections' => 'nb_inspections', 'nb_rejets' => 'nb_rejets',
        ],
        'sync_drive_inspection_commande' => [
            'date' => 'date', 'nb_inspections' => 'nb_inspections', 'nb_rejets' => 'nb_rejets',
        ],
        'sync_drive_dot_hot' => [
            'date' => 'date', 'of' => 'of', 'type' => 'type',
            'qte_commandee' => 'qte_commandee', 'qte_livree_on_time' => 'qte_livree_on_time',
        ],
        'sync_drive_development' => [
            'date' => 'date', 'modele' => 'modele', 'statut_validation' => 'statut_validation',
            'date_livraison_prevue' => 'date_livraison_prevue', 'date_livraison_reelle' => 'date_livraison_reelle',
            'nomenclature_valide' => 'nomenclature_valide', 'est_reclamation' => 'est_reclamation',
        ],
        'sync_drive_gammes' => [
            'article' => 'article', 'nb_gammes_total' => 'nb_gammes_total',
            'nb_gammes_acceptees_v1' => 'nb_gammes_acceptees_v1',
        ],
        'sync_drive_cotation' => [
            'article' => 'article', 'temps_cotation_min' => 'temps_cotation_min',
            'temps_production_min' => 'temps_production_min', 'date' => 'date',
        ],

        // GPRO Consulting tables
        'sync_gpro_chain_planning' => [
            'chaine' => 'chaine', 'of_numero' => 'of_numero', 'qte_of' => 'qte_of',
            'objectif_journalier' => 'objectif_journalier', 'cadence_moyenne' => 'cadence_moyenne',
            'cadence_hebdo' => 'cadence_hebdo',
        ],
        'sync_gpro_article_master' => [
            'code_article' => 'code_article', 'designation' => 'designation',
            'sam_min' => 'sam_min', 'sot_min' => 'sot_min', 'effectif_requis' => 'effectif_requis',
        ],
        'sync_gpro_of_dates' => [
            'of_numero' => 'of_numero', 'chaine' => 'chaine',
            'bpd' => 'bpd', 'epd' => 'epd', 'ehd' => 'ehd',
        ],
        'sync_gpro_suivi_paquets' => [
            'of_numero' => 'of_numero', 'est_solde' => 'est_solde', 'est_archive' => 'est_archive',
        ],
    ];

    /**
     * Tables that should use UPSERT instead of TRUNCATE.
     * Maps table name → unique keys for conflict resolution.
     */
    private const UPSERT_CONFIGS = [
        'efficience_chaine' => ['date', 'chaine'],
        'lost_time' => ['date', 'chaine', 'motif'],
        'qte_produite' => ['date', 'chaine', 'shift_code'],
        'qte_produit_individuel_jour' => ['date', 'employee_id', 'chaine', 'poste'],
        'minutes_presence' => ['date', 'employee_id', 'chaine'],
        'minutes_produites' => ['date', 'employee_id', 'chaine'],
        'temps_operation' => ['date', 'operation_code', 'chaine'],
        'item_trx_enq' => ['transaction_id'],
        'of_fabrication' => ['of_number'],

        // Google Drive tables
        'sync_drive_br_print' => ['date'],
        'sync_drive_br_care_label' => ['date'],
        'sync_drive_br_accessoires' => ['date'],
        'sync_drive_br_compo' => ['date'],
        'sync_drive_inspection_commande' => ['date'],
        'sync_drive_gammes' => ['article'],

        // GPRO Consulting tables
        'sync_gpro_article_master' => ['code_article'],
        'sync_gpro_suivi_paquets' => ['of_numero'],
    ];

    public function __construct(
        private NovacityService $novacity,
        private GoogleDriveService $drive,
        private GproConsultingService $gpro,
        private DataSnapshotService $snapshots,
    ) {}

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
        $this->snapshotQuality();
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
            SyncLog::record('syncBundlingData', 'rejets_inspection_paquet', 2, $status === 'inactive' ? 'skipped' : 'ok', $status === 'inactive' ? 'B-01 queries inactive' : null, (int) ((microtime(true) - $start) * 1000));

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
        $this->syncTable('item_trx_enq', fn () => $this->novacity->fetchEndpoint('item_trx_enq'));
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
        $this->syncTable('minutes_presence', fn () => $this->novacity->fetchQuery('minutes_presence'));
        $this->syncTable('minutes_produites', fn () => $this->novacity->fetchQuery('minutes_produites'));
        $this->syncTable('temps_operation', fn () => $this->novacity->fetchQuery('temps_operation'));
        $this->snapshotProduction();
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
        $this->snapshotLogistics();
    }

    public function syncGoogleDrive(): void
    {
        $this->syncTable('sync_drive_br_print', fn () => $this->drive->fetchSheet('br_print'));
        $this->syncTable('sync_drive_br_care_label', fn () => $this->drive->fetchSheet('br_care_label'));
        $this->syncTable('sync_drive_br_accessoires', fn () => $this->drive->fetchSheet('br_accessoires'));
        $this->syncTable('sync_drive_br_compo', fn () => $this->drive->fetchSheet('br_compo'));
        $this->syncTable('sync_drive_inspection_commande', fn () => $this->drive->fetchSheet('inspection_commande'));
        $this->syncTable('sync_drive_dot_hot', fn () => $this->drive->fetchSheet('dot_hot'));
        $this->syncTable('sync_drive_development', fn () => $this->drive->fetchSheet('development'));
        $this->syncTable('sync_drive_gammes', fn () => $this->drive->fetchSheet('gammes'));
        $this->syncTable('sync_drive_cotation', fn () => $this->drive->fetchSheet('cotation'));
        $this->snapshotGoogleDrive();
    }

    public function syncGproConsulting(): void
    {
        $this->syncTable('sync_gpro_chain_planning', fn () => $this->gpro->fetchData('chain_planning'));
        $this->syncTable('sync_gpro_article_master', fn () => $this->gpro->fetchData('article_master'));
        $this->syncTable('sync_gpro_of_dates', fn () => $this->gpro->fetchData('of_dates'));
        $this->syncTable('sync_gpro_suivi_paquets', fn () => $this->gpro->fetchData('suivi_paquets'));
        $this->snapshotGpro();
    }

    // ── Snapshot Helpers ────────────────────────────────────────────────────

    private function snapshotQuality(): void
    {
        $this->snapshots->snapshotTables([
            'check_pass_qte', 'vw_defects', 'qcm_defect_trx',
            'pieces_ok_jour', 'pieces_produites_jour',
            'pieces_ok_annee', 'pieces_produites_annee',
            'rejets_inspection_paquet',
        ]);
    }

    private function snapshotProduction(): void
    {
        $this->snapshots->snapshotTables([
            'item_trx_enq', 'wip_chaine', 'etat_avancement',
            'efficience_chaine', 'qte_produite', 'lost_time',
            'taging_reel', 'packets_rejetes', 'sortie_coupe',
            'qte_engagement', 'qte_entree_serigraphie', 'sortie_serigraphie',
            'of_fabrication', 'inline_vs_endline_comparison',
            'qte_produit_individuel_jour', 'qte_depart_chaine_article_of',
            'minutes_presence', 'minutes_produites', 'temps_operation',
        ]);
    }

    private function snapshotLogistics(): void
    {
        $this->snapshots->snapshotTables([
            'vue_stock', 'diva_stock', 'stock_moyen',
            'articles_sans_mouvement', 'quantite_totale_stock',
            'capacite_stockage', 'nombre_rouleaux', 'nombre_ofs_livres',
            'moyenne_date_transfert', 'quantite_par_provenance',
            'quantite_par_famille', 'quantite_par_typologie',
            'expeditions', 'colis_total_var', 'detail_colis', 'articles_colis',
        ]);
    }

    private function snapshotGoogleDrive(): void
    {
        $this->snapshots->snapshotTables([
            'sync_drive_br_print', 'sync_drive_br_care_label',
            'sync_drive_br_accessoires', 'sync_drive_br_compo',
            'sync_drive_inspection_commande', 'sync_drive_dot_hot',
            'sync_drive_development', 'sync_drive_gammes', 'sync_drive_cotation',
        ]);
    }

    private function snapshotGpro(): void
    {
        $this->snapshots->snapshotTables([
            'sync_gpro_chain_planning', 'sync_gpro_article_master',
            'sync_gpro_of_dates', 'sync_gpro_suivi_paquets',
        ]);
    }

    private function syncTable(string $table, callable $fetcher): void
    {
        $start = microtime(true);
        try {
            $rows = $fetcher();
            if (! empty($rows)) {
                $fieldMap = self::FIELD_MAPS[$table] ?? [];
                $upsertKeys = self::UPSERT_CONFIGS[$table] ?? null;
                $hasAtelier = Schema::hasColumn($table, 'atelier');

                if ($upsertKeys === null) {
                    DB::table($table)->truncate();
                }

                $chunks = array_chunk($rows, 500);
                $now = now();
                foreach ($chunks as $chunk) {
                    $insert = array_map(function ($r) use ($fieldMap, $now, $table, $hasAtelier) {
                        $needsDate = in_array($table, ['pieces_ok_jour', 'pieces_produites_jour', 'taging_reel', 'qte_engagement']);
                        $needsYear = in_array($table, ['pieces_ok_annee', 'pieces_produites_annee']);
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
                            // Convert ISO datetime to standard MySQL format
                            if (is_string($value) && $value !== '') {
                                if (preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $value)) {
                                    if (in_array($mysqlKey, ['log_date', 'date', 'dt_debut', 'dt_fin', 'date_rejet', 'bpd', 'epd', 'ehd'])) {
                                        $value = substr($value, 0, 10);
                                    } else {
                                        $value = date('Y-m-d H:i:s', strtotime($value));
                                    }
                                }
                            } elseif ($value === '') {
                                $value = null;
                            }
                            $mapped[$mysqlKey] = $value;
                        }
                        if ($needsDate && ! isset($mapped['date'])) {
                            $mapped['date'] = now()->toDateString();
                        }
                        if ($needsYear && ! isset($mapped['year'])) {
                            $mapped['year'] = (int) now()->format('Y');
                        }

                        // Coerce numeric strings for specific tables (APIs return numbers as strings)
                        if (str_starts_with($table, 'sync_drive_br_') || $table === 'sync_drive_inspection_commande') {
                            foreach (['nb_inspections', 'nb_rejets'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (int) $mapped[$numField];
                                }
                            }
                        }
                        if ($table === 'sync_drive_dot_hot') {
                            foreach (['qte_commandee', 'qte_livree_on_time'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (int) $mapped[$numField];
                                }
                            }
                        }
                        if ($table === 'sync_drive_development') {
                            foreach (['nomenclature_valide', 'est_reclamation'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (int) $mapped[$numField];
                                }
                            }
                        }
                        if ($table === 'sync_drive_gammes') {
                            foreach (['nb_gammes_total', 'nb_gammes_acceptees_v1'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (int) $mapped[$numField];
                                }
                            }
                        }
                        if ($table === 'sync_drive_cotation') {
                            foreach (['temps_cotation_min', 'temps_production_min'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (float) $mapped[$numField];
                                }
                            }
                        }
                        if ($table === 'sync_gpro_chain_planning') {
                            foreach (['qte_of', 'objectif_journalier'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (int) $mapped[$numField];
                                }
                            }
                            foreach (['cadence_moyenne', 'cadence_hebdo'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (float) $mapped[$numField];
                                }
                            }
                        }
                        if ($table === 'sync_gpro_article_master') {
                            foreach (['sam_min', 'sot_min'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (float) $mapped[$numField];
                                }
                            }
                            if (isset($mapped['effectif_requis']) && is_string($mapped['effectif_requis'])) {
                                $mapped['effectif_requis'] = (int) $mapped['effectif_requis'];
                            }
                        }
                        if ($table === 'sync_gpro_suivi_paquets') {
                            foreach (['est_solde', 'est_archive'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (int) $mapped[$numField];
                                }
                            }
                        }
                        if ($table === 'moyenne_date_transfert') {
                            if (isset($mapped['moyenne_jours']) && is_string($mapped['moyenne_jours'])) {
                                $mapped['moyenne_jours'] = (float) $mapped['moyenne_jours'];
                            }
                            if (isset($mapped['nb_of_consideres']) && is_string($mapped['nb_of_consideres'])) {
                                $mapped['nb_of_consideres'] = (int) $mapped['nb_of_consideres'];
                            }
                        }
                        if (str_starts_with($table, 'quantite_par_') || $table === 'quantite_totale_stock') {
                            foreach (['quantite', 'nb_articles', 'stock_moyen', 'nb_lignes_stock'] as $numField) {
                                if (isset($mapped[$numField]) && is_string($mapped[$numField])) {
                                    $mapped[$numField] = (float) $mapped[$numField];
                                }
                            }
                        }

                        // Infer atelier if column exists
                        if ($hasAtelier && ! isset($mapped['atelier'])) {
                            if (str_contains($table, 'coupe')) {
                                $mapped['atelier'] = 'coupe';
                            } elseif (str_contains($table, 'serigraphie')) {
                                $mapped['atelier'] = 'serigraphie';
                            } elseif (isset($mapped['chaine']) && is_string($mapped['chaine'])) {
                                $upperChain = strtoupper($mapped['chaine']);
                                if ($upperChain === 'CH3' || str_starts_with($upperChain, 'COU')) {
                                    $mapped['atelier'] = 'coupe';
                                } elseif ($upperChain === 'CH4' || str_starts_with($upperChain, 'SER')) {
                                    $mapped['atelier'] = 'serigraphie';
                                } elseif (str_starts_with($upperChain, 'CH')) {
                                    $mapped['atelier'] = 'confection';
                                } else {
                                    $mapped['atelier'] = 'confection';
                                }
                            } elseif (isset($mapped['shortname']) && is_string($mapped['shortname'])) {
                                $upperShort = strtoupper($mapped['shortname']);
                                if ($upperShort === 'CH3') {
                                    $mapped['atelier'] = 'coupe';
                                } elseif ($upperShort === 'CH4') {
                                    $mapped['atelier'] = 'serigraphie';
                                } else {
                                    $mapped['atelier'] = 'confection';
                                }
                            } else {
                                $mapped['atelier'] = 'confection';
                            }
                        }

                        $mapped['synced_at'] = $now;

                        return $mapped;
                    }, $chunk);

                    if ($upsertKeys !== null) {
                        // Use upsert to preserve history
                        DB::table($table)->upsert($insert, $upsertKeys);
                    } else {
                        DB::table($table)->insert($insert);
                    }
                }
            }
            $this->updateJobStatus($table, 'ok', count($rows), microtime(true) - $start);
            AuditLog::info("Sync {$table} réussie — ".count($rows).' enregistrements');
            SyncLog::record('syncTable', $table, count($rows), 'ok', null, (int) ((microtime(true) - $start) * 1000));
        } catch (\Throwable $e) {
            $this->updateJobStatus($table, 'error', 0, 0, $e->getMessage());
            AuditLog::error("Sync {$table} échouée — {$e->getMessage()}");
            SyncLog::record('syncTable', $table, 0, 'error', $e->getMessage(), (int) ((microtime(true) - $start) * 1000));
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
