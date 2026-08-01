<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('v6_users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('name');
            $table->string('role')->default('viewer');
            $table->string('password')->nullable();
            $table->boolean('has_password')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('builder_pages_v6', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->json('layout')->nullable();
            $table->timestamps();
        });

        if (Schema::hasTable('v4_users')) {
            foreach (DB::table('v4_users')->get() as $user) {
                DB::table('v6_users')->insertOrIgnore([
                    'email' => $user->email,
                    'name' => $user->name,
                    'role' => $user->role ?? 'viewer',
                    'password' => $user->password,
                    'has_password' => (bool) ($user->has_password ?? false),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        DB::table('builder_pages_v6')->insert([
            'slug' => 'dashboard',
            'name' => 'V6 Dashboard',
            'layout' => json_encode(['version' => 1, 'widgets' => []]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('builder_pages_v6');
        Schema::dropIfExists('v6_users');
    }
};
