<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('builder_pages_v5', function (Blueprint $table) {
            $table->json('layout_draft')->nullable()->after('layout');
            $table->timestamp('layout_draft_updated_at')->nullable()->after('layout_draft');
        });
    }

    public function down(): void
    {
        Schema::table('builder_pages_v5', function (Blueprint $table) {
            $table->dropColumn(['layout_draft', 'layout_draft_updated_at']);
        });
    }
};
