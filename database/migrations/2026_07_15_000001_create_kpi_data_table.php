<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kpi_data', function (Blueprint $table) {
            $table->id();
            $table->string('kpi_code');
            $table->string('endpoint');
            $table->string('variable_key');
            $table->string('variable_type')->default('Direct');
            $table->string('refresh_frequency')->default('instant');
            $table->json('response_data')->nullable();
            $table->json('computed_data')->nullable();
            $table->string('last_status')->default('pending');
            $table->text('last_error')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->index('kpi_code');
            $table->index('endpoint');
            $table->index('refresh_frequency');
            $table->unique(['kpi_code', 'variable_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kpi_data');
    }
};
