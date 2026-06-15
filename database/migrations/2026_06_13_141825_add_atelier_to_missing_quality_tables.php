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
            'pieces_ok_jour',
            'pieces_produites_jour',
            'pieces_ok_annee',
            'pieces_produites_annee',
            'vw_defects',
            'qcm_defect_trx',
            'reject_qte',
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
            'pieces_ok_jour',
            'pieces_produites_jour',
            'pieces_ok_annee',
            'pieces_produites_annee',
            'vw_defects',
            'qcm_defect_trx',
            'reject_qte',
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
