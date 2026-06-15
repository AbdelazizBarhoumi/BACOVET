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
        Schema::table('item_trx_enq', function (Blueprint $table) {
            $table->string('transaction_id', 100)->nullable()->after('id');
            $table->string('so_no', 50)->nullable()->after('transaction_id');
            $table->string('item_no', 100)->nullable()->after('so_no');
            $table->string('op_no', 50)->nullable()->after('item_no');
            $table->boolean('is_split')->default(false)->after('op_no');
        });
        Schema::table('expeditions', function (Blueprint $table) {
            $table->timestamp('date_creation')->nullable()->after('id');
        });
        Schema::table('colis_total_var', function (Blueprint $table) {
            $table->string('article', 100)->nullable()->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('item_trx_enq', function (Blueprint $table) {
            $table->dropColumn(['transaction_id', 'so_no', 'item_no', 'op_no', 'is_split']);
        });
        Schema::table('expeditions', function (Blueprint $table) {
            $table->dropColumn('date_creation');
        });
        Schema::table('colis_total_var', function (Blueprint $table) {
            $table->dropColumn('article');
        });
    }
};
