<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // inline_vs_endline_comparison — opera is NOT NULL but API doesn't send it
        Schema::table('inline_vs_endline_comparison', function (Blueprint $table) {
            $table->string('opera', 50)->nullable()->change();
        });

        // qte_depart_chaine_article_of — of is NOT NULL but API doesn't send it
        Schema::table('qte_depart_chaine_article_of', function (Blueprint $table) {
            $table->string('of', 50)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('inline_vs_endline_comparison', function (Blueprint $table) {
            $table->string('opera', 50)->nullable(false)->change();
        });
        Schema::table('qte_depart_chaine_article_of', function (Blueprint $table) {
            $table->string('of', 50)->nullable(false)->change();
        });
    }
};
