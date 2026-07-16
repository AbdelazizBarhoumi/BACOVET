<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->dropColumn([
                'description', 'thresholds', 'source_system', 'source_status',
                'breakdown_type', 'mini_viz_type', 'export_fields',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->text('description')->nullable()->after('name');
            $table->json('thresholds')->nullable()->after('highlight_color');
            $table->string('source_system')->nullable()->after('thresholds');
            $table->string('source_status')->default('pending')->after('source_system');
            $table->string('breakdown_type')->default('none')->after('source_status');
            $table->string('mini_viz_type')->default('none')->after('breakdown_type');
            $table->json('export_fields')->nullable()->after('mini_viz_type');
        });
    }
};
