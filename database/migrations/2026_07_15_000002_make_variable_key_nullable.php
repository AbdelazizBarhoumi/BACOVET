<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kpi_data', function (Blueprint $table) {
            $table->string('variable_key')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('kpi_data', function (Blueprint $table) {
            $table->string('variable_key')->nullable(false)->change();
        });
    }
};
