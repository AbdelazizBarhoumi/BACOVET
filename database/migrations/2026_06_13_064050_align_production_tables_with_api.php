<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. qte_engagement: Add of, article. Make chaine nullable.
        Schema::table('qte_engagement', function (Blueprint $table) {
            $table->string('of', 50)->nullable()->after('commande');
            $table->string('article', 100)->nullable()->after('of');
            $table->string('chaine', 20)->nullable()->change();
        });

        // 2. qte_produit_individuel_jour: Add quantite. Make minutes_presence, poste nullable.
        Schema::table('qte_produit_individuel_jour', function (Blueprint $table) {
            $table->integer('quantite')->default(0)->after('chaine');
            $table->integer('minutes_presence')->nullable()->change();
            $table->string('poste', 50)->nullable()->change();
        });

        // 3. sortie_coupe: Make article nullable.
        Schema::table('sortie_coupe', function (Blueprint $table) {
            $table->string('article', 100)->nullable()->change();
        });

        // 4. wip_chaine: Add article, sam, effectif, objectif (to support real data in Confection cards)
        Schema::table('wip_chaine', function (Blueprint $table) {
            $table->string('article', 100)->nullable()->after('of_number');
            $table->decimal('sam', 8, 2)->nullable()->after('article');
            $table->integer('effectif')->nullable()->after('sam');
            $table->integer('objectif')->nullable()->after('effectif');
        });
    }

    public function down(): void
    {
        Schema::table('qte_engagement', function (Blueprint $table) {
            $table->dropColumn(['of', 'article']);
        });

        Schema::table('qte_produit_individuel_jour', function (Blueprint $table) {
            $table->dropColumn('quantite');
        });

        Schema::table('wip_chaine', function (Blueprint $table) {
            $table->dropColumn(['article', 'sam', 'effectif', 'objectif']);
        });
    }
};
