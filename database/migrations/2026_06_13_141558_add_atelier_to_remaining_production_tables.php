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
            'qte_depart_chaine_article_of',
            'of_fabrication',
            'inline_vs_endline_comparison',
            'packets_rejetes',
            'minutes_presence',
            'temps_operation',
            'rejets_inspection_paquet',
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
            'qte_depart_chaine_article_of',
            'of_fabrication',
            'inline_vs_endline_comparison',
            'packets_rejetes',
            'minutes_presence',
            'temps_operation',
            'rejets_inspection_paquet',
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
