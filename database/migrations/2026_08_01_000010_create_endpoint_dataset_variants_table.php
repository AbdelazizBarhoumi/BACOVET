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
            $table->json('columns')->nullable();
            $table->json('sample_data')->nullable();
            $table->unsignedInteger('row_count')->default(0);
            $table->string('last_status')->default('pending');
            $table->text('last_error')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->unique(['slug', 'params']);
            $table->index('last_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('endpoint_dataset_variants');
    }
};
