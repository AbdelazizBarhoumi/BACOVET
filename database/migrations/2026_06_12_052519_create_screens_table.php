<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('screens', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('status', ['online', 'offline'])->default('offline');
            $table->enum('assigned_page', [
                'quality', 'production_confection', 'production_coupe',
                'production_serigraphie', 'logistics', 'methodes',
                'development', 'admin'
            ])->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('screens');
    }
};
