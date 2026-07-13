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
        $itRole = Role::where('slug', 'it')->first();
        $prodRole = Role::where('slug', 'resp_production')->first();
        $qualRole = Role::where('slug', 'resp_qualite')->first();
        $chefRole = Role::where('slug', 'chef_atelier')->first();
        $methRole = Role::where('slug', 'methodes')->first();
        $coupeRole = Role::where('slug', 'planning_coupe')->first();
        $dirRole = Role::where('slug', 'direction')->first();

        $users = [
            [
                'name' => 'Super admin',
                'matricule' => 'P-1042',
                'email' => 'a.belhaj@bacovet.com',
                'password' => Hash::make('demo'),
                'role_id' => $prodRole->id,
                'is_active' => true,
            ],
            [
                'name' => 'Sonia Karoui',
                'matricule' => 'Q-0210',
                'email' => 's.karoui@bacovet.com',
                'password' => Hash::make('demo'),
                'role_id' => $qualRole->id,
                'is_active' => true,
            ],
            [
                'name' => 'Mehdi Trabelsi',
                'matricule' => 'P-2017',
                'email' => 'm.trabelsi@bacovet.com',
                'password' => Hash::make('demo'),
                'role_id' => $chefRole->id,
                'is_active' => true,
            ],
            [
                'name' => 'Nadia Saidi',
                'matricule' => 'L-3308',
                'email' => 'n.saidi@bacovet.com',
                'password' => Hash::make('demo'),
                'role_id' => $methRole->id,
                'is_active' => false,
            ],
            [
                'name' => 'IT Admin',
                'matricule' => 'ADMIN-001',
                'email' => 'it@bacovet.com',
                'password' => Hash::make('demo'),
                'role_id' => $itRole->id,
                'is_active' => true,
            ],
            [
                'name' => 'M. Director',
                'matricule' => 'DIR-001',
                'email' => 'direction@bacovet.com',
                'password' => Hash::make('demo'),
                'role_id' => $dirRole->id,
                'is_active' => true,
            ],
            [
                'name' => 'K. Hammami',
                'matricule' => 'C-4421',
                'email' => 'k.hammami@bacovet.com',
                'password' => Hash::make('demo'),
                'role_id' => $coupeRole->id,
                'is_active' => true,
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(['email' => $user['email']], $user);
        }
    }
}
