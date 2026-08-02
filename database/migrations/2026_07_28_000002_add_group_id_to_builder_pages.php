<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('builder_pages', function (Blueprint $table) {
            $table->foreignId('group_id')
                ->nullable()
                ->constrained('builder_page_groups')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('builder_pages', function (Blueprint $table) {
            $table->dropForeign(['group_id']);
            $table->dropColumn('group_id');
        });
    }
};
