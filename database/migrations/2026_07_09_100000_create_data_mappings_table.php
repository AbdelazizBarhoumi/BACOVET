<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_mappings', function (Blueprint $table) {
            $table->id();
            $table->string('kpi');
            $table->string('name')->default('');
            $table->string('variable')->default('');
            $table->string('endpoint')->nullable();
            $table->string('variable_type')->default('Direct');
            $table->string('variable_key')->default('');
            $table->boolean('is_filtered')->default(false);
            $table->string('filter_key')->default('');
            $table->string('filter_value')->default('');
            $table->boolean('has_function')->default(false);
            $table->string('fn')->default('Latest');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_mappings');
    }
};
