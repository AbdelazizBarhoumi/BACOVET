<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('builder_page_placements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('page_id')->constrained('builder_pages')->cascadeOnDelete();
            $table->foreignId('group_id')->nullable()->constrained('builder_page_groups')->nullOnDelete();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['user_id', 'page_id']);
        });

        // Backfill: each page owner keeps their current placement so their
        // existing sidebar organisation survives the switch to per-user data.
        DB::table('builder_pages')
            ->whereNotNull('owner_user_id')
            ->orderBy('id')
            ->each(function ($page) {
                DB::table('builder_page_placements')->insert([
                    'user_id' => $page->owner_user_id,
                    'page_id' => $page->id,
                    'group_id' => $page->group_id,
                    'sort_order' => $page->sort_order,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('builder_page_placements');
    }
};
