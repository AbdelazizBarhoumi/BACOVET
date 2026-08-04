<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kanban_boards', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('kanban_columns', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('board_id');
            $table->string('name');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('board_id')
                ->references('id')
                ->on('kanban_boards')
                ->cascadeOnDelete();
        });

        Schema::create('kanban_cards', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('column_id');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image_path')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('column_id')
                ->references('id')
                ->on('kanban_columns')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kanban_cards');
        Schema::dropIfExists('kanban_columns');
        Schema::dropIfExists('kanban_boards');
    }
};
