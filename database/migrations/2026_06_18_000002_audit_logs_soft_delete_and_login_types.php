<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table) {
            $table->softDeletes();
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE audit_logs MODIFY COLUMN action_type ENUM('INFO','USER','WARN','ERROR','SYSTEM','LOGIN','LOGIN_FAILED','LOGOUT') NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE audit_logs MODIFY COLUMN action_type ENUM('INFO','USER','WARN','ERROR','SYSTEM') NOT NULL");
        }

        Schema::table('audit_logs', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
