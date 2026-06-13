<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // efficience_chaine — add heures_prod, heures_standards
        Schema::table('efficience_chaine', function (Blueprint $table) {
            $table->decimal('heures_prod', 8, 2)->nullable()->after('efficience_pct');
            $table->decimal('heures_standards', 8, 2)->nullable()->after('heures_prod');
        });

        // qcm_defect_trx — add group_id, ticket_id
        Schema::table('qcm_defect_trx', function (Blueprint $table) {
            $table->string('group_id', 50)->nullable()->after('shift_code');
            $table->string('ticket_id', 50)->nullable()->after('group_id');
        });

        // qte_produite — add shift (Novacity returns 'shift' not 'shift_code')
        Schema::table('qte_produite', function (Blueprint $table) {
            $table->string('shift', 10)->nullable()->after('chaine');
        });

        // of_fabrication — add idofabrication, ofabrication (Novacity raw fields)
        Schema::table('of_fabrication', function (Blueprint $table) {
            $table->integer('idofabrication')->nullable()->after('id');
            $table->string('ofabrication', 50)->nullable()->after('idofabrication');
        });
    }

    public function down(): void
    {
        Schema::table('efficience_chaine', function (Blueprint $table) {
            $table->dropColumn(['heures_prod', 'heures_standards']);
        });

        Schema::table('qcm_defect_trx', function (Blueprint $table) {
            $table->dropColumn(['group_id', 'ticket_id']);
        });

        Schema::table('qte_produite', function (Blueprint $table) {
            $table->dropColumn('shift');
        });

        Schema::table('of_fabrication', function (Blueprint $table) {
            $table->dropColumn(['idofabrication', 'ofabrication']);
        });
    }
};
