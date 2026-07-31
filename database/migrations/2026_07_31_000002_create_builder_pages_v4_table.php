<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('builder_pages_v4', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->json('layout')->nullable();
            $table->unsignedBigInteger('group_id')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('group_id')
                ->references('id')
                ->on('builder_page_groups_v4')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('builder_pages_v4');
    }
};
