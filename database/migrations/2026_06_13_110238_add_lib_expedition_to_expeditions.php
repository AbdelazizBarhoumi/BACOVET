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
        if (! Schema::hasColumn('expeditions', 'lib_expedition')) {
            Schema::table('expeditions', function (Blueprint $table) {
                $table->string('lib_expedition', 200)->nullable()->after('statut');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('expeditions', 'lib_expedition')) {
            Schema::table('expeditions', function (Blueprint $table) {
                $table->dropColumn('lib_expedition');
            });
        }
    }
};
