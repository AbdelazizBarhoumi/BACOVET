<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('endpoint_dataset_variants', function (Blueprint $table) {
            $table->id();
            $table->string('slug');
            $table->json('params')->nullable();
            $table->string('params_hash', 32)->nullable();
            $table->json('columns')->nullable();
            $table->json('sample_data')->nullable();
            $table->unsignedInteger('row_count')->default(0);
            $table->string('last_status')->default('pending');
            $table->text('last_error')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            // MySQL cannot index a JSON column directly (error 3152), so the
            // unique key covers a canonical md5 of the params instead.
            $table->unique(['slug', 'params_hash']);
            $table->index('last_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('endpoint_dataset_variants');
    }
};
