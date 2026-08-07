<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('endpoint_datasets', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('label')->nullable();
            $table->string('object')->nullable();
            $table->string('object_type')->nullable();
            $table->string('source')->nullable();
            $table->string('method')->default('GET');
            $table->json('columns')->nullable();
            $table->json('sample_data')->nullable();
            $table->unsignedInteger('row_count')->default(0);
            $table->string('last_status')->default('pending');
            $table->text('last_error')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamps();

            $table->index('method');
            $table->index('last_status');
            $table->index('source');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('endpoint_datasets');
    }
};