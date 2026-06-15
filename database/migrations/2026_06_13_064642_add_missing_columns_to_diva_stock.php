<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('diva_stock', function (Blueprint $table) {
            $table->string('idmagasin', 50)->nullable()->after('idmp');
            $table->string('idmvt_stock', 100)->nullable()->after('idmagasin');
            $table->decimal('qtte', 15, 4)->default(0)->after('idmvt_stock');
            $table->decimal('qtte_reserve', 15, 4)->default(0)->after('qtte');
        });
    }

    public function down(): void
    {
        Schema::table('diva_stock', function (Blueprint $table) {
            $table->dropColumn(['idmagasin', 'idmvt_stock', 'qtte', 'qtte_reserve']);
        });
    }
};
