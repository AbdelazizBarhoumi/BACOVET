<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('minutes_produites', function (Blueprint $table) {
            if (! Schema::hasColumn('minutes_produites', 'employee_id')) {
                $table->string('employee_id', 50)->nullable()->after('date');
            }
            
            // Add unique constraint for upsert consistency with minutes_presence
            $table->unique(['date', 'employee_id', 'chaine'], 'unique_min_prod_v2');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('minutes_produites', function (Blueprint $table) {
            $table->dropUnique('unique_min_prod_v2');
            $table->dropColumn('employee_id');
        });
    }
};
