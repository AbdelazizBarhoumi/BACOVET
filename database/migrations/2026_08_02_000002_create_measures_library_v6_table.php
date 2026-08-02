<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('measures_library_v6', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('expression');
            $table->text('description')->nullable();
            $table->string('category')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('measures_library_v6');
    }
};
