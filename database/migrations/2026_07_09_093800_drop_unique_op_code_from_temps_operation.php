<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temps_operation', function (Blueprint $table) {
            $table->dropUnique('unique_op_code');
        });
    }

    public function down(): void
    {
        Schema::table('temps_operation', function (Blueprint $table) {
            $table->unique(['operation_code'], 'unique_op_code');
        });
    }
};
