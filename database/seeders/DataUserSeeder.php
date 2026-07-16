<?php

namespace Database\Seeders;

use App\Models\DataUser;
use Illuminate\Database\Seeder;

class DataUserSeeder extends Seeder
{
    public function run(): void
    {
        // Remove the old fake users
        DataUser::whereIn('email', [
            'admin@bacovet.com',
            'user@bacovet.com',
        ])->delete();

        // New admin users (replacing the old fake admin)
        $admins = [
            ['email' => 'm.chrifa@novationcity.com', 'name' => 'M. Chrifa', 'role' => 'direction'],
            ['email' => 'benhadjmbareknourhene@gmail.com', 'name' => 'Ben Hadj Mbarek Nourhene', 'role' => 'direction'],
        ];

        // New normal users (replacing the old normal user)
        $normalUsers = [
            ['email' => 'intissar@bacovet.com', 'name' => 'Intissar', 'role' => 'resp_qualite'],
            ['email' => 'azer.boughrara@bacovet.com', 'name' => 'Azer Boughrara', 'role' => 'resp_qualite'],
            ['email' => 'amira@bacovet.com', 'name' => 'Amira', 'role' => 'resp_qualite'],
            ['email' => 'qualite@bacovet.com', 'name' => 'Qualite', 'role' => 'resp_qualite'],
            ['email' => 'saadia@bacovet.com', 'name' => 'Saadia', 'role' => 'resp_qualite'],
        ];

        foreach (array_merge($admins, $normalUsers) as $user) {
            DataUser::updateOrCreate(
                ['email' => $user['email']],
                array_merge($user, [
                    'password' => '',
                    'has_password' => false,
                ])
            );
        }
    }
}
