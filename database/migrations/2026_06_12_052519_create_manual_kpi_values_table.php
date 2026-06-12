<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manual_kpi_values', function (Blueprint $table) {
            $table->id();
            $table->string('kpi_key')->unique(); // e.g. "f_req_218", "dev_rft"
            $table->string('kpi_label');
            $table->decimal('numerator', 15, 4)->nullable();
            $table->decimal('denominator', 15, 4)->nullable();
            $table->decimal('value', 8, 4)->nullable();  // precomputed %
            $table->string('note', 500)->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('manual_kpi_values');
    }
};
