<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_mapping_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedBigInteger('data_mapping_id')->nullable();
            $table->string('kpi', 50);
            $table->string('action', 20); // created | updated | deleted
            $table->string('field', 50);
            $table->text('old_value')->nullable();
            $table->text('new_value')->nullable();
            $table->timestamps();

            $table->index('kpi');
            $table->index('data_mapping_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('data_mapping_audit_logs');
    }
};
