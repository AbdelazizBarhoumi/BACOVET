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
        Schema::table('pieces_ok_jour', function (Blueprint $table) {
            $table->dropUnique('pieces_ok_jour_date_unique');
            $table->unique(['date', 'atelier'], 'unique_ok_jour_atelier');
        });

        Schema::table('pieces_produites_jour', function (Blueprint $table) {
            $table->dropUnique('pieces_produites_jour_date_unique');
            $table->unique(['date', 'atelier'], 'unique_prod_jour_atelier');
        });

        Schema::table('pieces_ok_annee', function (Blueprint $table) {
            $table->dropUnique('pieces_ok_annee_year_unique');
            $table->unique(['year', 'atelier'], 'unique_ok_annee_atelier');
        });

        Schema::table('pieces_produites_annee', function (Blueprint $table) {
            $table->dropUnique('pieces_produites_annee_year_unique');
            $table->unique(['year', 'atelier'], 'unique_prod_annee_atelier');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pieces_ok_jour', function (Blueprint $table) {
            $table->dropUnique('unique_ok_jour_atelier');
            $table->unique('date');
        });

        Schema::table('pieces_produites_jour', function (Blueprint $table) {
            $table->dropUnique('unique_prod_jour_atelier');
            $table->unique('date');
        });

        Schema::table('pieces_ok_annee', function (Blueprint $table) {
            $table->dropUnique('unique_ok_annee_atelier');
            $table->unique('year');
        });

        Schema::table('pieces_produites_annee', function (Blueprint $table) {
            $table->dropUnique('unique_prod_annee_atelier');
            $table->unique('year');
        });
    }
};
