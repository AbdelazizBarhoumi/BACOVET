<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manual_kpi_history', function (Blueprint $table) {
            $table->id();
            $table->string('kpi_key');
            $table->integer('year');
            $table->integer('month');
            $table->decimal('value', 8, 4)->nullable();
            $table->decimal('numerator', 15, 4)->nullable();
            $table->decimal('denominator', 15, 4)->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['kpi_key', 'year', 'month']);
            $table->index('kpi_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manual_kpi_history');
    }
};
