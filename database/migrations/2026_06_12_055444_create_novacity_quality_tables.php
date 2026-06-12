<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // M-008 — efficience_chaine
        Schema::create('efficience_chaine', function (Blueprint $table) {
            $table->id();
            $table->string('chaine', 20);
            $table->date('date');
            $table->decimal('efficience_pct', 6, 2);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['chaine', 'date']);
            $table->index('date');
        });

        // M-009 — wip_chaine
        Schema::create('wip_chaine', function (Blueprint $table) {
            $table->id();
            $table->string('chaine', 20);
            $table->string('of_number', 50)->nullable();
            $table->integer('en_cours')->default(0);
            $table->integer('entree_jour')->default(0);
            $table->integer('sortie_jour')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index('chaine');
        });

        // M-010 — check_pass_qte
        Schema::create('check_pass_qte', function (Blueprint $table) {
            $table->id();
            $table->date('log_date');
            $table->string('shortname', 50);    // chain name
            $table->string('shift_code', 10)->nullable();
            $table->decimal('defect_pct', 6, 2);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['shortname', 'log_date']);
            $table->index('log_date');
        });

        // M-011 — vw_defects
        Schema::create('vw_defects', function (Blueprint $table) {
            $table->id();
            $table->date('log_date');
            $table->string('shift_code', 10)->nullable();
            $table->string('prod_group', 50)->nullable();
            $table->string('op_no', 50);
            $table->integer('qty')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['log_date', 'op_no']);
            $table->index('log_date');
        });

        // M-012 — qcm_defect_trx
        Schema::create('qcm_defect_trx', function (Blueprint $table) {
            $table->id();
            $table->date('log_date');
            $table->string('item_id', 100);
            $table->string('shift_code', 10)->nullable();
            $table->integer('occurrence_count')->default(1);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['log_date', 'item_id']);
        });

        // M-013 — reject_qte
        Schema::create('reject_qte', function (Blueprint $table) {
            $table->id();
            $table->date('log_date');
            $table->string('chaine', 20)->nullable();
            $table->string('shift_code', 10)->nullable();
            $table->integer('qty')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index('log_date');
        });

        // M-014 — pieces_ok_jour
        Schema::create('pieces_ok_jour', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->integer('first_pass_today')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('date');
        });

        // M-015 — pieces_produites_jour
        Schema::create('pieces_produites_jour', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->integer('produced_today')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('date');
        });

        // M-016 — pieces_ok_annee
        Schema::create('pieces_ok_annee', function (Blueprint $table) {
            $table->id();
            $table->year('year');
            $table->bigInteger('first_pass_year')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('year');
        });

        // M-017 — pieces_produites_annee
        Schema::create('pieces_produites_annee', function (Blueprint $table) {
            $table->id();
            $table->year('year');
            $table->bigInteger('produced_year')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('year');
        });

        // M-018 — rejets_inspection_paquet
        Schema::create('rejets_inspection_paquet', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->enum('period', ['jour', 'annee']);
            $table->integer('bundle_reject')->default(0);
            $table->integer('bundle_inspected')->default(0);
            $table->boolean('is_active')->default(false); // B-01 inactive
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['date', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rejets_inspection_paquet');
        Schema::dropIfExists('pieces_produites_annee');
        Schema::dropIfExists('pieces_ok_annee');
        Schema::dropIfExists('pieces_produites_jour');
        Schema::dropIfExists('pieces_ok_jour');
        Schema::dropIfExists('reject_qte');
        Schema::dropIfExists('qcm_defect_trx');
        Schema::dropIfExists('vw_defects');
        Schema::dropIfExists('check_pass_qte');
        Schema::dropIfExists('wip_chaine');
        Schema::dropIfExists('efficience_chaine');
    }
};
