<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('builder_pages', function (Blueprint $table) {
            $table->integer('sort_order')->default(0)->after('group_id');
        });

        DB::statement('UPDATE builder_pages SET sort_order = id');
    }

    public function down(): void
    {
        Schema::table('builder_pages', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};