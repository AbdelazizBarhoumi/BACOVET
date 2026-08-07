<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            ['name' => 'IT / Administrateur',    'slug' => 'it'],
            ['name' => 'Direction',              'slug' => 'direction'],
            ['name' => 'Responsable Production', 'slug' => 'resp_production'],
            ['name' => 'Chef d\'Atelier',        'slug' => 'chef_atelier'],
            ['name' => 'Responsable Qualité',    'slug' => 'resp_qualite'],
            ['name' => 'Méthodes / Planning',    'slug' => 'methodes'],
            ['name' => 'Planning / Coupe',        'slug' => 'planning_coupe'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['slug' => $role['slug']], $role);
        }
    }
}
