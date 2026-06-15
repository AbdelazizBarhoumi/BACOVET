<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Update minutes_presence: add employee_id and add unique constraint
        Schema::table('minutes_presence', function (Blueprint $table) {
            if (! Schema::hasColumn('minutes_presence', 'employee_id')) {
                $table->string('employee_id', 50)->nullable()->after('date');
            }

            // Add new unique one with employee_id (v2)
            $table->unique(['date', 'employee_id', 'chaine'], 'unique_presence_v2');
        });

        // 2. Update temps_operation: add missing columns from api.md and unique constraint
        Schema::table('temps_operation', function (Blueprint $table) {
            if (! Schema::hasColumn('temps_operation', 'temps_standard_s')) {
                $table->decimal('temps_standard_s', 8, 3)->nullable()->after('operation_code');
            }
            if (! Schema::hasColumn('temps_operation', 'temps_reel_s')) {
                $table->decimal('temps_reel_s', 8, 3)->nullable()->after('temps_standard_s');
            }
            if (! Schema::hasColumn('temps_operation', 'ecart_pct')) {
                $table->decimal('ecart_pct', 8, 2)->nullable()->after('temps_reel_s');
            }

            // Add unique constraint for upsert
            $table->unique(['operation_code'], 'unique_op_code');
        });
    }

    public function down(): void
    {
        Schema::table('minutes_presence', function (Blueprint $table) {
            $table->dropUnique('unique_presence_v2');
            $table->dropColumn('employee_id');
        });

        Schema::table('temps_operation', function (Blueprint $table) {
            $table->dropUnique('unique_op_code');
            $table->dropColumn(['temps_standard_s', 'temps_reel_s', 'ecart_pct']);
        });
    }
};
