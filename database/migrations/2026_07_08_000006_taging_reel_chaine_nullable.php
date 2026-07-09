<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('taging_reel', function (Blueprint $table) {
            $table->string('chaine', 20)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('taging_reel', function (Blueprint $table) {
            $table->string('chaine', 20)->nullable(false)->change();
        });
    }
};
