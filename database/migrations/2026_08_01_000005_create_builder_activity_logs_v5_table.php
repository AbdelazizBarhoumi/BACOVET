<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('builder_activity_logs_v5', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('v5_users')->nullOnDelete();
            $table->foreignId('page_id')->nullable()->constrained('builder_pages_v5')->nullOnDelete();
            $table->string('page_slug')->nullable();
            $table->string('page_name')->nullable();
            $table->foreignId('group_id')->nullable()->constrained('builder_page_groups_v5')->nullOnDelete();
            $table->string('widget_id')->nullable();
            $table->string('widget_type')->nullable();
            $table->string('kpi_code')->nullable();
            $table->string('action')->index();
            $table->json('detail')->nullable();
            $table->string('ip_address')->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['page_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('builder_activity_logs_v5');
    }
};
