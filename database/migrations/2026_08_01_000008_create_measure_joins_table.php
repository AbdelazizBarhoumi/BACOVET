<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('measure_joins', function (Blueprint $table) {
            $table->id();
            $table->string('table_a', 191);
            $table->string('column_a', 191);
            $table->string('table_b', 191);
            $table->string('column_b', 191);
            $table->boolean('trim_compare')->default(true);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['table_a', 'column_a', 'table_b', 'column_b']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('measure_joins');
    }
};