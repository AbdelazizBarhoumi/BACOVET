<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('job_class', 100);
            $table->string('table_name', 100)->nullable();
            $table->integer('rows_synced')->default(0);
            $table->enum('status', ['ok', 'error', 'skipped']);
            $table->text('message')->nullable();
            $table->integer('duration_ms')->default(0);
            $table->timestamp('executed_at')->useCurrent();
            $table->index(['job_class', 'executed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
    }
};
