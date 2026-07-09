<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('efficience_chaine', function (Blueprint $table) {
            if (!Schema::hasColumn('efficience_chaine', 'heures_prod')) {
                $table->decimal('heures_prod', 10, 2)->nullable()->after('efficience_pct');
            }
            if (!Schema::hasColumn('efficience_chaine', 'heures_standards')) {
                $table->decimal('heures_standards', 10, 2)->nullable()->after('heures_prod');
            }
        });

        Schema::table('sortie_coupe', function (Blueprint $table) {
            if (!Schema::hasColumn('sortie_coupe', 'quantite_coupee')) {
                $table->integer('quantite_coupee')->default(0)->after('article');
            }
        });

        Schema::table('qte_engagement', function (Blueprint $table) {
            if (!Schema::hasColumn('qte_engagement', 'quantite_engagee')) {
                $table->integer('quantite_engagee')->default(0)->after('article');
            }
        });

        Schema::table('qte_depart_chaine_article_of', function (Blueprint $table) {
            if (!Schema::hasColumn('qte_depart_chaine_article_of', 'quantite')) {
                $table->integer('quantite')->default(0)->after('article');
            }
            if (!Schema::hasColumn('qte_depart_chaine_article_of', 'date')) {
                $table->date('date')->nullable()->after('quantite');
            }
        });

        Schema::table('packets_rejetes', function (Blueprint $table) {
            if (!Schema::hasColumn('packets_rejetes', 'date_rejet')) {
                $table->date('date_rejet')->nullable()->after('id');
            }
        });

        Schema::table('qte_entree_serigraphie', function (Blueprint $table) {
            if (!Schema::hasColumn('qte_entree_serigraphie', 'quantite')) {
                $table->integer('quantite')->default(0)->after('article');
            }
            if (!Schema::hasColumn('qte_entree_serigraphie', 'couleur')) {
                $table->string('couleur', 100)->nullable()->after('article');
            }
        });

        Schema::table('sortie_serigraphie', function (Blueprint $table) {
            if (!Schema::hasColumn('sortie_serigraphie', 'quantite')) {
                $table->integer('quantite')->default(0)->after('article');
            }
            if (!Schema::hasColumn('sortie_serigraphie', 'article')) {
                $table->string('article', 100)->nullable()->after('commande');
            }
            if (!Schema::hasColumn('sortie_serigraphie', 'couleur')) {
                $table->string('couleur', 100)->nullable()->after('article');
            }
        });
    }

    public function down(): void
    {
        Schema::table('efficience_chaine', function (Blueprint $table) {
            $table->dropColumn(['heures_prod', 'heures_standards']);
        });
    }
};
