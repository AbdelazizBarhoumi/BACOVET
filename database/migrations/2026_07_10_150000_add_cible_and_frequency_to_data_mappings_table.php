<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->string('cible_operator')->nullable()->default('=');
            $table->decimal('cible_value', 10, 2)->nullable();
            $table->boolean('cible_is_percentage')->nullable()->default(false);
            $table->string('refresh_frequency')->default('instant');
        });
    }

    public function down(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->dropColumn([
                'cible_operator',
                'cible_value',
                'cible_is_percentage',
                'refresh_frequency',
            ]);
        });
    }
};
