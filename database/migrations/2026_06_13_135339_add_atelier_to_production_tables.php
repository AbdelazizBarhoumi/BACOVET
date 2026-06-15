<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $tables = [
            'efficience_chaine',
            'wip_chaine',
            'lost_time',
            'check_pass_qte',
            'qte_produit_individuel_jour',
            'etat_avancement',
            'qte_produite',
            'taging_reel',
            'qte_engagement',
            'sortie_coupe',
            'qte_entree_serigraphie',
            'sortie_serigraphie',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $table) {
                    $table->string('atelier', 50)->nullable()->index()->after('id');
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = [
            'efficience_chaine',
            'wip_chaine',
            'lost_time',
            'check_pass_qte',
            'qte_produit_individuel_jour',
            'etat_avancement',
            'qte_produite',
            'taging_reel',
            'qte_engagement',
            'sortie_coupe',
            'qte_entree_serigraphie',
            'sortie_serigraphie',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropColumn('atelier');
                });
            }
        }
    }
};
