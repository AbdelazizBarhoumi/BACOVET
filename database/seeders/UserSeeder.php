<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->delete();

        $roleIdBySlug = Role::pluck('id', 'slug');

        $defaultPassword = Hash::make(env('DEFAULT_PASSWORD', 'password'));

        $users = [
            [
                'name' => 'Super admin',
                'email' => 'superadmin@novationcity.com',
                'role' => 'it',
            ],
            [
                'name' => 'M. Chrifa',
                'email' => 'm.chrifa@novationcity.com',
                'role' => 'direction',
            ],
            [
                'name' => 'Ben Hadj Mbarek Nourhene',
                'email' => 'benhadjmbareknourhene@gmail.com',
                'role' => 'direction',
            ],
            [
                'name' => 'Samar Lafi',
                'email' => 's.lafi@novationcity.com',
                'role' => 'direction',
            ],
            [
                'name' => 'Qualite',
                'email' => 'qualite@bacovet.com',
                'role' => 'resp_qualite',
            ],
            [
                'name' => 'Intissar',
                'email' => 'intissar@bacovet.com',
                'role' => 'resp_qualite',
            ],
            [
                'name' => 'Azer Boughrara',
                'email' => 'azer.boughrara@bacovet.com',
                'role' => 'resp_qualite',
            ],
            [
                'name' => 'Amira',
                'email' => 'amira@bacovet.com',
                'role' => 'resp_qualite',
            ],
            [
                'name' => 'Saadia',
                'email' => 'saadia@bacovet.com',
                'role' => 'resp_qualite',
            ],
            [
                'name' => 'Wassim',
                'email' => 'wassim@bacovet.com',
                'role' => 'resp_qualite',
            ],
            [
                'name' => 'IT Admin',
                'email' => 'it@bacovet.com',
                'role' => 'it',
            ],
        ];

        foreach ($users as $user) {
            User::create([
                'name' => $user['name'],
                'matricule' => null,
                'email' => $user['email'],
                'password' => $defaultPassword,
                'role_id' => $roleIdBySlug[$user['role']] ?? null,
                'is_active' => true,
                'must_change_password' => true,
            ]);
        }
    }
}
