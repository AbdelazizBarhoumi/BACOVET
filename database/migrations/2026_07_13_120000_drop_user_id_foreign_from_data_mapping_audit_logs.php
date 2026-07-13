<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('data_mapping_audit_logs', function (Blueprint $table) {
            $table->dropForeign('data_mapping_audit_logs_user_id_foreign');
        });
    }

    public function down(): void
    {
        Schema::table('data_mapping_audit_logs', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });
    }
};
