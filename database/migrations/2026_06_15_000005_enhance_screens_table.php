<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('screens', function (Blueprint $table) {
            $table->string('screen_code', 50)->nullable()->after('name');
            $table->enum('location', [
                'confection', 'coupe', 'serigraphie', 'entrepot',
                'bureau_qualite', 'direction', 'autre',
            ])->nullable()->after('assigned_page');
            $table->string('resolution', 20)->nullable()->after('location');
            $table->text('notes')->nullable()->after('resolution');
            $table->timestamp('last_ping')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('screens', function (Blueprint $table) {
            $table->dropColumn(['screen_code', 'location', 'resolution', 'notes', 'last_ping']);
        });
    }
};
