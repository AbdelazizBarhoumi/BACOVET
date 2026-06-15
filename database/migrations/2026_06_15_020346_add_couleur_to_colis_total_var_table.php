<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('colis_total_var', function (Blueprint $table) {
            if (! Schema::hasColumn('colis_total_var', 'couleur')) {
                $table->string('couleur', 50)->nullable()->after('article');
            }
        });
    }

    public function down(): void
    {
        Schema::table('colis_total_var', function (Blueprint $table) {
            $table->dropColumn('couleur');
        });
    }
};
