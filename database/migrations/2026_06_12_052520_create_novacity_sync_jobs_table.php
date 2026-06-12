<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('novacity_sync_jobs', function (Blueprint $table) {
            $table->id();
            $table->integer('novacity_job_id')->unique();
            $table->string('name');
            $table->string('query_slug')->nullable();
            $table->enum('source', ['DIVA', 'GPRO', 'GPRO_CONSULTING', 'GOOGLE_DRIVE', 'OTHER'])
                ->default('OTHER');
            $table->enum('last_status', ['ok', 'error', 'inactive', 'pending'])->default('pending');
            $table->integer('records_count')->nullable();
            $table->integer('response_time_ms')->nullable();
            $table->timestamp('last_run_at')->nullable();
            $table->text('last_error')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('source');
            $table->index('last_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('novacity_sync_jobs');
    }
};
