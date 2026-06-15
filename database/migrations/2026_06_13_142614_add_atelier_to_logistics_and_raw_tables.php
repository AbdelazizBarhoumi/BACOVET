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
            // Production remaining
            'item_trx_enq',

            // Logistics
            'vue_stock',
            'diva_stock',
            'stock_moyen',
            'articles_sans_mouvement',
            'quantite_totale_stock',
            'capacite_stockage',
            'nombre_rouleaux',
            'nombre_ofs_livres',
            'moyenne_date_transfert',
            'quantite_par_provenance',
            'quantite_par_famille',
            'quantite_par_typologie',
            'expeditions',
            'colis_total_var',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && ! Schema::hasColumn($table, 'atelier')) {
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
            'item_trx_enq',
            'vue_stock',
            'diva_stock',
            'stock_moyen',
            'articles_sans_mouvement',
            'quantite_totale_stock',
            'capacite_stockage',
            'nombre_rouleaux',
            'nombre_ofs_livres',
            'moyenne_date_transfert',
            'quantite_par_provenance',
            'quantite_par_famille',
            'quantite_par_typologie',
            'expeditions',
            'colis_total_var',
        ];

        foreach ($tables as $table) {
            if (Schema::hasTable($table) && Schema::hasColumn($table, 'atelier')) {
                Schema::table($table, function (Blueprint $table) {
                    $table->dropColumn('atelier');
                });
            }
        }
    }
};
