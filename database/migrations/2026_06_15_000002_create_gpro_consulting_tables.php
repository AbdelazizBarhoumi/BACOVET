<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // sync_gpro_chain_planning
        Schema::create('sync_gpro_chain_planning', function (Blueprint $table) {
            $table->id();
            $table->string('chaine', 20);
            $table->string('of_numero', 50);
            $table->integer('qte_of')->default(0);
            $table->integer('objectif_journalier')->default(0);
            $table->decimal('cadence_moyenne', 8, 2)->default(0);
            $table->decimal('cadence_hebdo', 8, 2)->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['chaine', 'of_numero']);
        });

        // sync_gpro_article_master
        Schema::create('sync_gpro_article_master', function (Blueprint $table) {
            $table->id();
            $table->string('code_article', 50);
            $table->string('designation', 200)->nullable();
            $table->decimal('sam_min', 8, 3)->default(0);
            $table->decimal('sot_min', 8, 3)->default(0);
            $table->integer('effectif_requis')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('code_article');
        });

        // sync_gpro_of_dates
        Schema::create('sync_gpro_of_dates', function (Blueprint $table) {
            $table->id();
            $table->string('of_numero', 50);
            $table->string('chaine', 20);
            $table->date('bpd')->nullable();
            $table->date('epd')->nullable();
            $table->date('ehd')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['of_numero', 'chaine']);
        });

        // sync_gpro_suivi_paquets
        Schema::create('sync_gpro_suivi_paquets', function (Blueprint $table) {
            $table->id();
            $table->string('of_numero', 50);
            $table->boolean('est_solde')->default(false);
            $table->boolean('est_archive')->default(false);
            $table->timestamp('synced_at')->useCurrent();
            $table->unique('of_numero');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_gpro_suivi_paquets');
        Schema::dropIfExists('sync_gpro_of_dates');
        Schema::dropIfExists('sync_gpro_article_master');
        Schema::dropIfExists('sync_gpro_chain_planning');
    }
};
