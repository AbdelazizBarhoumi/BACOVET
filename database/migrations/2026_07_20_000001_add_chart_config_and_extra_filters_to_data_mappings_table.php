<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->json('chart_config')->nullable()->after('graph_types');
            $table->json('extra_filters')->nullable()->after('chart_config');
        });
    }

    public function down(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->dropColumn(['chart_config', 'extra_filters']);
        });
    }
};
