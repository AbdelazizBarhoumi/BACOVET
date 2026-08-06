<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('builder_page_v5_access', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('page_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('mode', ['view', 'edit']);
            $table->timestamps();

            $table->foreign('page_id')
                ->references('id')
                ->on('builder_pages_v5')
                ->cascadeOnDelete();

            $table->foreign('user_id')
                ->references('id')
                ->on('v5_users')
                ->cascadeOnDelete();

            $table->unique(['page_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('builder_page_v5_access');
    }
};
