<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // M-019 — qte_produite
        Schema::create('qte_produite', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('chaine', 20)->nullable();
            $table->string('shift_code', 10)->nullable();
            $table->integer('quantite')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['date', 'chaine']);
            $table->index('date');
        });

        // M-020 — lost_time
        Schema::create('lost_time', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('chaine', 20)->nullable();
            $table->string('motif', 100)->nullable(); // MAINT, MATIERE, QUALITE
            $table->integer('minutes_perdues')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['date', 'chaine']);
            $table->index('date');
        });

        // M-021 — etat_avancement
        Schema::create('etat_avancement', function (Blueprint $table) {
            $table->id();
            $table->string('of', 50);
            $table->string('chaine', 20)->nullable();
            $table->decimal('avancement_pct', 5, 2)->default(0);
            $table->integer('quantite_prevue')->default(0);
            $table->integer('quantite_realisee')->default(0);
            $table->enum('statut', ['en_cours', 'termine', 'planifie', 'en_attente'])
                  ->default('en_cours');
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['of', 'statut']);
            $table->index('statut');
        });

        // M-022 — taging_reel
        Schema::create('taging_reel', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('chaine', 20);
            $table->string('shift', 10)->nullable();
            $table->integer('tag_theorique')->default(0);
            $table->integer('tag_reel')->default(0);
            $table->decimal('ecart_pct', 6, 2)->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['chaine', 'date']);
            $table->index('date');
        });

        // M-023 — qte_produit_individuel_jour
        Schema::create('qte_produit_individuel_jour', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('employee_id', 50);
            $table->string('chaine', 20)->nullable();
            $table->string('poste', 50)->nullable();
            $table->integer('minutes_produites')->default(0);
            $table->integer('minutes_presence')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['date', 'chaine']);
            $table->index('date');
        });

        // M-024 — minutes_presence
        Schema::create('minutes_presence', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('chaine', 20)->nullable();
            $table->string('shift_code', 10)->nullable();
            $table->integer('minutes_presence')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['date', 'chaine']);
        });

        // M-025 — minutes_produites
        Schema::create('minutes_produites', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('chaine', 20)->nullable();
            $table->string('shift_code', 10)->nullable();
            $table->integer('minutes_produites')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['date', 'chaine']);
        });

        // M-026 — of_fabrication
        Schema::create('of_fabrication', function (Blueprint $table) {
            $table->id();
            $table->string('of_number', 50)->unique();
            $table->string('article', 100)->nullable();
            $table->string('designation', 200)->nullable();
            $table->integer('quantite')->default(0);
            $table->date('dt_debut')->nullable();
            $table->date('dt_fin')->nullable();      // null = active
            $table->string('statut', 50)->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->timestamps();
            $table->index('dt_fin');
            $table->index('statut');
        });

        // M-027 — sortie_coupe
        Schema::create('sortie_coupe', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('commande', 50);
            $table->string('article', 100)->nullable();
            $table->integer('quantite_coupee')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['commande', 'date']);
            $table->index('date');
        });

        // M-028 — qte_engagement
        Schema::create('qte_engagement', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('commande', 50);
            $table->string('chaine', 20)->nullable();
            $table->integer('quantite_engagee')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['commande', 'date']);
            $table->index(['chaine', 'date']);
        });

        // M-029 — qte_depart_chaine_article_of
        Schema::create('qte_depart_chaine_article_of', function (Blueprint $table) {
            $table->id();
            $table->string('of', 50);
            $table->string('chaine', 20)->nullable();
            $table->string('article', 100)->nullable();
            $table->integer('quantite')->default(0);
            $table->date('date')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['of', 'chaine']);
        });

        // M-030 — packets_rejetes
        Schema::create('packets_rejetes', function (Blueprint $table) {
            $table->id();
            $table->string('id_colis', 100);
            $table->string('reference', 100)->nullable();
            $table->string('motif', 200)->nullable();
            $table->integer('qtte')->default(0);
            $table->timestamp('date_rejet')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index('date_rejet');
        });

        // M-031 — qte_entree_serigraphie
        Schema::create('qte_entree_serigraphie', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('article', 100);
            $table->string('couleur', 50)->nullable();
            $table->integer('quantite')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['date', 'article']);
        });

        // M-032 — sortie_serigraphie
        Schema::create('sortie_serigraphie', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->string('article', 100);
            $table->string('couleur', 50)->nullable();
            $table->integer('quantite')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['date', 'article']);
        });

        // M-033 — inline_vs_endline_comparison
        Schema::create('inline_vs_endline_comparison', function (Blueprint $table) {
            $table->id();
            $table->date('log_date');
            $table->string('shift_code', 10)->nullable();
            $table->string('shortname', 50);  // chain
            $table->string('opera', 50);      // operation type: inline / endline
            $table->integer('count')->default(1);
            $table->timestamp('synced_at')->useCurrent();
            $table->index(['log_date', 'shortname']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inline_vs_endline_comparison');
        Schema::dropIfExists('sortie_serigraphie');
        Schema::dropIfExists('qte_entree_serigraphie');
        Schema::dropIfExists('packets_rejetes');
        Schema::dropIfExists('qte_depart_chaine_article_of');
        Schema::dropIfExists('qte_engagement');
        Schema::dropIfExists('sortie_coupe');
        Schema::dropIfExists('of_fabrication');
        Schema::dropIfExists('minutes_produites');
        Schema::dropIfExists('minutes_presence');
        Schema::dropIfExists('qte_produit_individuel_jour');
        Schema::dropIfExists('taging_reel');
        Schema::dropIfExists('etat_avancement');
        Schema::dropIfExists('lost_time');
        Schema::dropIfExists('qte_produite');
    }
};
