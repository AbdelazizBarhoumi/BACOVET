<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // M-034 — vue_stock
        Schema::create('vue_stock', function (Blueprint $table) {
            $table->id();
            $table->string('idmp', 100)->index();
            $table->string('code_mp', 100)->nullable();
            $table->string('designation', 300)->nullable();
            $table->string('famille', 100)->nullable();
            $table->string('couleur', 100)->nullable();
            $table->decimal('qtte', 15, 4)->default(0);
            $table->decimal('qtte_reserve', 15, 4)->default(0);
            $table->string('unite', 20)->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index('famille');
            $table->index('code_mp');

            if (Schema::getConnection()->getDriverName() !== 'sqlite') {
                $table->fullText(['code_mp', 'designation', 'famille']);
            }
        });

        // M-035 — diva_stock
        Schema::create('diva_stock', function (Blueprint $table) {
            $table->id();
            $table->string('idmp', 100)->index();
            $table->decimal('qtte_diva', 15, 4)->default(0);
            $table->string('statut', 50)->nullable();
            $table->json('extra_data')->nullable();  // any additional DIVA fields
            $table->timestamp('synced_at')->useCurrent();
        });

        // M-036 — stock_moyen
        Schema::create('stock_moyen', function (Blueprint $table) {
            $table->id();
            $table->decimal('stock_moyen', 20, 4)->default(0);
            $table->integer('nb_lignes_stock')->default(0);
            $table->timestamp('synced_at')->useCurrent();
        });

        // M-037 — articles_sans_mouvement
        Schema::create('articles_sans_mouvement', function (Blueprint $table) {
            $table->id();
            $table->integer('nb_articles_sans_mvt_365j')->default(0);
            $table->decimal('qtte_sans_mvt_365j', 15, 4)->default(0);
            $table->timestamp('synced_at')->useCurrent();
        });

        // M-038 — quantite_totale_stock
        Schema::create('quantite_totale_stock', function (Blueprint $table) {
            $table->id();
            $table->decimal('quantite_totale_stock', 20, 4)->default(0);
            $table->timestamp('synced_at')->useCurrent();
        });

        // M-039 — capacite_stockage
        Schema::create('capacite_stockage', function (Blueprint $table) {
            $table->id();
            $table->integer('total_conteneurs')->default(0);
            $table->integer('conteneurs_actifs')->default(0);   // stored as INT (was string in API)
            $table->integer('conteneurs_consommes')->default(0);
            $table->integer('conteneurs_supprimes')->default(0);
            $table->timestamp('synced_at')->useCurrent();
        });

        // M-040 — nombre_rouleaux
        Schema::create('nombre_rouleaux', function (Blueprint $table) {
            $table->id();
            $table->integer('nb_rouleaux')->default(0);
            $table->timestamp('synced_at')->useCurrent();
        });

        // M-041 — nombre_ofs_livres
        Schema::create('nombre_ofs_livres', function (Blueprint $table) {
            $table->id();
            $table->integer('nb_of_livres_total')->default(0);
            $table->integer('of_avec_transfert_coupe')->default(0);
            $table->integer('of_avec_transfert_coupe_jemmel')->default(0);
            $table->integer('of_avec_transfert_coupe_total')->default(0);
            $table->timestamp('synced_at')->useCurrent();
        });

        // M-042 — moyenne_date_transfert
        Schema::create('moyenne_date_transfert', function (Blueprint $table) {
            $table->id();
            $table->decimal('moyenne_jours', 8, 4)->default(0); // stored as float (was string in API)
            $table->integer('nb_of_consideres')->default(0);
            $table->timestamp('synced_at')->useCurrent();
        });

        // M-043 — quantite_par_provenance
        Schema::create('quantite_par_provenance', function (Blueprint $table) {
            $table->id();
            $table->string('provenance', 100)->nullable();
            $table->decimal('quantite', 15, 4)->default(0);
            $table->integer('nb_articles')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index('provenance');
        });

        // M-044 — quantite_par_famille
        Schema::create('quantite_par_famille', function (Blueprint $table) {
            $table->id();
            $table->string('famille_fg', 100)->nullable();
            $table->decimal('quantite', 15, 4)->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index('famille_fg');
        });

        // M-045 — quantite_par_typologie
        Schema::create('quantite_par_typologie', function (Blueprint $table) {
            $table->id();
            $table->string('typologie', 100)->nullable();
            $table->decimal('quantite', 15, 4)->default(0);
            $table->integer('nb_articles')->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index('typologie');
        });

        // M-046 — colis_total_var
        Schema::create('colis_total_var', function (Blueprint $table) {
            $table->id();
            $table->string('commande', 50)->nullable();
            $table->string('of', 50)->nullable();
            $table->integer('total_colis')->default(0);
            $table->integer('total_qte')->default(0);
            $table->json('extra_data')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index('commande');
            $table->index('of');
        });

        // M-047 — detail_colis
        Schema::create('detail_colis', function (Blueprint $table) {
            $table->id();
            $table->string('id_colis', 100)->nullable();
            $table->string('commande', 50)->nullable();
            $table->string('article', 100)->nullable();
            $table->integer('qte')->default(0);
            $table->string('statut', 50)->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index('commande');
            $table->index('id_colis');
        });

        // M-048 — articles_colis
        Schema::create('articles_colis', function (Blueprint $table) {
            $table->id();
            $table->string('article', 100);
            $table->string('id_colis', 100)->nullable();
            $table->integer('qte')->default(0);
            $table->json('extra_data')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index('article');
        });

        // M-049 — expeditions
        Schema::create('expeditions', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 100)->nullable();
            $table->string('destination', 200)->nullable();
            $table->date('date_expedition')->nullable();
            $table->integer('qte_expedies')->default(0);
            $table->string('statut', 50)->nullable();
            $table->json('extra_data')->nullable();
            $table->timestamp('synced_at')->useCurrent();
            $table->index('date_expedition');
        });

        // M-050 — emp_defect_eff
        Schema::create('emp_defect_eff', function (Blueprint $table) {
            $table->id();
            $table->date('log_date');
            $table->string('employee_id', 50)->nullable();
            $table->string('shortname', 50)->nullable();
            $table->decimal('defect_rate', 6, 2)->default(0);
            $table->decimal('efficiency_pct', 6, 2)->default(0);
            $table->timestamp('synced_at')->useCurrent();
            $table->index('log_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('emp_defect_eff');
        Schema::dropIfExists('expeditions');
        Schema::dropIfExists('articles_colis');
        Schema::dropIfExists('detail_colis');
        Schema::dropIfExists('colis_total_var');
        Schema::dropIfExists('quantite_par_typologie');
        Schema::dropIfExists('quantite_par_famille');
        Schema::dropIfExists('quantite_par_provenance');
        Schema::dropIfExists('moyenne_date_transfert');
        Schema::dropIfExists('nombre_ofs_livres');
        Schema::dropIfExists('nombre_rouleaux');
        Schema::dropIfExists('capacite_stockage');
        Schema::dropIfExists('quantite_totale_stock');
        Schema::dropIfExists('articles_sans_mouvement');
        Schema::dropIfExists('stock_moyen');
        Schema::dropIfExists('diva_stock');
        Schema::dropIfExists('vue_stock');
    }
};
