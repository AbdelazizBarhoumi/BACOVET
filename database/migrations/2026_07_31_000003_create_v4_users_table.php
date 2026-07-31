<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('v4_users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('name');
            $table->string('role');
            $table->string('password');
            $table->boolean('has_password')->default(false);
            $table->timestamps();
        });

        DB::table('v4_users')->insert([
            ['email' => 'superadmin@bacovet.com', 'name' => 'Super admin', 'role' => 'it', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            ['email' => 'direction@bacovet.com', 'name' => 'Direction', 'role' => 'direction', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            ['email' => 'resp.production@bacovet.com', 'name' => 'Resp. Production', 'role' => 'resp_production', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            ['email' => 'qualite@bacovet.com', 'name' => 'Qualité', 'role' => 'resp_qualite', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('v4_users');
    }
};
