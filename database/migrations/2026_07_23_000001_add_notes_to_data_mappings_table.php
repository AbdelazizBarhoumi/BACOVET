<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->text('notes')->nullable()->after('extra_filters');
        });
    }

    public function down(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->dropColumn('notes');
        });
    }
};
