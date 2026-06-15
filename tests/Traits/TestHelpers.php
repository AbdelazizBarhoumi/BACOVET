<?php

namespace Tests\Traits;

use App\Models\Role;
use App\Models\User;

trait TestHelpers
{
    protected function makeUser(string $roleSlug = 'it', bool $active = true): User
    {
        $role = Role::firstOrCreate(['slug' => $roleSlug], ['name' => ucfirst($roleSlug)]);

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => $active,
        ]);
    }

    protected function actingAsRole(string $roleSlug): User
    {
        $user = $this->makeUser($roleSlug);
        $this->actingAs($user);

        return $user;
    }

    protected function seedRoles(): void
    {
        $roles = [
            'it' => 'IT', 'direction' => 'Direction', 'resp_production' => 'Responsable Production',
            'chef_atelier' => 'Chef Atelier', 'resp_qualite' => 'Responsable Qualite', 'methodes' => 'Methodes', 'coupe' => 'Coupe',
        ];
        foreach ($roles as $slug => $name) {
            Role::firstOrCreate(['slug' => $slug], ['name' => $name]);
        }
    }
}
