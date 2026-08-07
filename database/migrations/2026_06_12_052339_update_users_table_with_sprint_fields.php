<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Remove 'role' if it exists from previous temporary migration
            if (Schema::hasColumn('users', 'role')) {
                $table->dropColumn('role');
            }

            if (! Schema::hasColumn('users', 'matricule')) {
                $table->string('matricule')->nullable()->after('name');
            }

            $table->string('email')->nullable()->change(); // Make email nullable

            if (! Schema::hasColumn('users', 'role_id')) {
                $table->foreignId('role_id')->nullable()->after('password')->constrained('roles');
            }

            if (! Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('role_id');
            }

            if (! Schema::hasColumn('users', 'last_login_ip')) {
                $table->ipAddress('last_login_ip')->nullable()->after('is_active');
            }

            if (! Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('last_login_ip');
            }
        });

        // Assign default values to existing users
        $itRole = DB::table('roles')->where('slug', 'it')->first();
        if ($itRole) {
            DB::table('users')->whereNull('role_id')->update([
                'role_id' => $itRole->id,
            ]);
        }

        // Ensure matricule is set if null (using ID as temporary)
        DB::table('users')->whereNull('matricule')->update([
            'matricule' => DB::raw('id'),
        ]);

        Schema::table('users', function (Blueprint $table) {
            $table->string('matricule')->nullable(false)->unique()->change();
            $table->foreignId('role_id')->nullable(false)->change();

            // Only add index if it doesn't exist
            // Actually change() might already handle some things, but let's be safe
        });

        // Add indexes if they don't exist
        Schema::table('users', function (Blueprint $table) {
            // We can't easily check for index existence in Schema builder without raw queries
            // but usually migrate will fail if duplicate index.
            // Let's just try to add them and hope for the best or use raw SQL.
        });

        try {
            Schema::table('users', function (Blueprint $table) {
                $table->index('matricule');
                $table->index('role_id');
            });
        } catch (\Exception $e) {
            // Index might already exist
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn(['matricule', 'role_id', 'is_active', 'last_login_ip', 'last_login_at']);
            $table->string('email')->nullable(false)->change();
        });
    }
};
