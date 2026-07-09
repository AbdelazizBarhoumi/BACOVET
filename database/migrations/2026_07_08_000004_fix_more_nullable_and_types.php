<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // sortie_serigraphie — article is NOT NULL but API doesn't send it
        Schema::table('sortie_serigraphie', function (Blueprint $table) {
            $table->string('article', 100)->nullable()->change();
        });

        // qte_produit_individuel_jour — employee_id is NOT NULL but API doesn't send it
        Schema::table('qte_produit_individuel_jour', function (Blueprint $table) {
            $table->string('employee_id', 50)->nullable()->change();
        });

        // inline_vs_endline_comparison — mono is int but API sends large numbers with trailing spaces
        if (Schema::hasColumn('inline_vs_endline_comparison', 'mono')) {
            Schema::table('inline_vs_endline_comparison', function (Blueprint $table) {
                $table->string('mono', 50)->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        Schema::table('sortie_serigraphie', function (Blueprint $table) {
            $table->string('article', 100)->nullable(false)->change();
        });
        Schema::table('qte_produit_individuel_jour', function (Blueprint $table) {
            $table->string('employee_id', 50)->nullable(false)->change();
        });
        if (Schema::hasColumn('inline_vs_endline_comparison', 'mono')) {
            Schema::table('inline_vs_endline_comparison', function (Blueprint $table) {
                $table->string('mono', 50)->nullable(false)->change();
            });
        }
    }
};
