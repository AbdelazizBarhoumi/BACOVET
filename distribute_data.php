<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$tables = [
    'efficience_chaine', 'wip_chaine', 'lost_time', 'check_pass_qte',
    'qte_produit_individuel_jour', 'etat_avancement', 'qte_produite',
    'taging_reel', 'qte_engagement', 'sortie_coupe',
    'qte_entree_serigraphie', 'sortie_serigraphie',
    'qte_depart_chaine_article_of', 'of_fabrication',
    'inline_vs_endline_comparison', 'packets_rejetes',
    'minutes_presence', 'temps_operation', 'rejets_inspection_paquet',
    'pieces_ok_jour', 'pieces_produites_jour', 'pieces_ok_annee',
    'pieces_produites_annee', 'vw_defects', 'qcm_defect_trx', 'reject_qte',
];

foreach ($tables as $table) {
    if (! Schema::hasTable($table)) {
        continue;
    }

    // Distribute CH1-4 chains
    if (Schema::hasColumn($table, 'chaine')) {
        DB::table($table)->where('chaine', 'CH3')->update(['atelier' => 'coupe']);
        DB::table($table)->where('chaine', 'CH4')->update(['atelier' => 'serigraphie']);
        DB::table($table)->whereIn('chaine', ['CH1', 'CH2'])->update(['atelier' => 'confection']);
    }
    if (Schema::hasColumn($table, 'shortname')) {
        DB::table($table)->where('shortname', 'CH3')->update(['atelier' => 'coupe']);
        DB::table($table)->where('shortname', 'CH4')->update(['atelier' => 'serigraphie']);
        DB::table($table)->whereIn('shortname', ['CH1', 'CH2'])->update(['atelier' => 'confection']);
    }

    // Handle pieces tables (ensure at least one row per workshop for demo)
    if (in_array($table, ['pieces_ok_jour', 'pieces_produites_jour'])) {
        $today = date('Y-m-d');
        $row = DB::table($table)->where('date', $today)->first();
        if ($row) {
            foreach (['confection', 'coupe', 'serigraphie'] as $at) {
                $data = (array) $row;
                unset($data['id']);
                $data['atelier'] = $at;
                DB::table($table)->updateOrInsert(['date' => $today, 'atelier' => $at], $data);
            }
        }
    }
}
echo "Distributed data for demo purposes.\n";
