<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->string('endpoint')->nullable()->change();
            $table->string('variable_key')->nullable()->change();
            $table->string('filter_key')->nullable()->change();
            $table->string('filter_value')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('data_mappings', function (Blueprint $table) {
            $table->string('endpoint')->nullable(false)->change();
            $table->string('variable_key')->nullable(false)->change();
            $table->string('filter_key')->nullable(false)->change();
            $table->string('filter_value')->nullable(false)->change();
        });
    }
};
