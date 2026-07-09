<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // packets_rejetes — id_colis is NOT NULL but API doesn't send it
        Schema::table('packets_rejetes', function (Blueprint $table) {
            $table->string('id_colis', 100)->nullable()->change();
        });

        // inline_vs_endline_comparison — opera is NOT NULL but API doesn't send it
        Schema::table('inline_vs_endline_comparison', function (Blueprint $table) {
            $table->string('opera', 50)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('packets_rejetes', function (Blueprint $table) {
            $table->string('id_colis', 100)->nullable(false)->change();
        });
        Schema::table('inline_vs_endline_comparison', function (Blueprint $table) {
            $table->string('opera', 50)->nullable(false)->change();
        });
    }
};
