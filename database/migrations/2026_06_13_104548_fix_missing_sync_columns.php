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
        Schema::table('colis_total_var', function (Blueprint $table) {
            $table->string('couleur', 50)->nullable()->after('article');
        });

        Schema::table('moyenne_date_transfert', function (Blueprint $table) {
            $table->renameColumn('nb_of_consideres', 'nb_ofconsideres');
        });

        Schema::table('expeditions', function (Blueprint $table) {
            $table->string('idexpedition', 100)->nullable()->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('colis_total_var', function (Blueprint $table) {
            $table->dropColumn('couleur');
        });

        Schema::table('moyenne_date_transfert', function (Blueprint $table) {
            $table->renameColumn('nb_ofconsideres', 'nb_of_consideres');
        });

        Schema::table('expeditions', function (Blueprint $table) {
            $table->dropColumn('idexpedition');
        });
    }
};
