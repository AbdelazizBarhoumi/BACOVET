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
        Schema::table('qcm_defect_trx', function (Blueprint $table) {
            if (! Schema::hasColumn('qcm_defect_trx', 'group_id')) {
                $table->string('group_id', 50)->nullable()->after('item_id');
            }
            if (! Schema::hasColumn('qcm_defect_trx', 'ticket_id')) {
                $table->string('ticket_id', 50)->nullable()->after('group_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('qcm_defect_trx', function (Blueprint $table) {
            $table->dropColumn(['group_id', 'ticket_id']);
        });
    }
};
