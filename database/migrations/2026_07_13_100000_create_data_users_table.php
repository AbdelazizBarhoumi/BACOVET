<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('data_users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('name');
            $table->string('role');
            $table->string('password');
            $table->boolean('has_password')->default(false);
            $table->timestamps();
        });

        DB::table('data_users')->insert([
            ['email' => 'superadmin@bacovet.com', 'name' => 'Super admin', 'role' => 'it', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            // Admin users
            ['email' => 'm.chrifa@novationcity.com', 'name' => 'M. Chrifa', 'role' => 'direction', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            ['email' => 'benhadjmbareknourhene@gmail.com', 'name' => 'Ben Hadj Mbarek Nourhene', 'role' => 'direction', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            // Normal users
            ['email' => 'intissar@bacovet.com', 'name' => 'Intissar', 'role' => 'resp_qualite', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            ['email' => 'azer.boughrara@bacovet.com', 'name' => 'Azer Boughrara', 'role' => 'resp_qualite', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            ['email' => 'amira@bacovet.com', 'name' => 'Amira', 'role' => 'resp_qualite', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            ['email' => 'qualite@bacovet.com', 'name' => 'Qualite', 'role' => 'resp_qualite', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
            ['email' => 'saadia@bacovet.com', 'name' => 'Saadia', 'role' => 'resp_qualite', 'password' => '', 'has_password' => false, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('data_users');
    }
};
