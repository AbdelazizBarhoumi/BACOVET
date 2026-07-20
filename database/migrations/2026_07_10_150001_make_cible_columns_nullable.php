<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->string('cible_operator')->nullable()->default('=')->change();
            $table->boolean('cible_is_percentage')->nullable()->default(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->string('cible_operator')->default('=')->change();
            $table->boolean('cible_is_percentage')->default(false)->change();
        });
    }
};
