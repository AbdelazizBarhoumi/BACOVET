<?php

use App\Models\BuilderPageV5;
use App\Models\V5User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('builder_pages_v5', function (Blueprint $table) {
            $table->unsignedBigInteger('owner_user_id')->nullable()->after('name');

            $table->foreign('owner_user_id')
                ->references('id')
                ->on('v5_users')
                ->nullOnDelete();
        });

        // Backfill existing pages to the Super admin so legacy content stays
        // manageable and the new owner is able to re-share them.
        $adminId = V5User::where('role', 'it')->value('id');
        if ($adminId) {
            BuilderPageV5::whereNull('owner_user_id')->update(['owner_user_id' => $adminId]);
        }
    }

    public function down(): void
    {
        Schema::table('builder_pages_v5', function (Blueprint $table) {
            $table->dropForeign(['owner_user_id']);
            $table->dropColumn('owner_user_id');
        });
    }
};
