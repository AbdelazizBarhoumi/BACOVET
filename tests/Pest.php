<?php
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class)->in('Feature', 'Unit');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeUser(string $roleSlug = 'it', bool $active = true): \App\Models\User
{
    $role = \App\Models\Role::factory()->create(['slug' => $roleSlug]);
    return \App\Models\User::factory()->create([
        'role_id'   => $role->id,
        'is_active' => $active,
    ]);
}

// Uses the web guard (session) — no Sanctum
function actingAsRole(string $roleSlug): \App\Models\User
{
    $user = makeUser($roleSlug);
    test()->actingAs($user); // defaults to 'web' guard
    return $user;
}

function seedRoles(): void
{
    $roles = [
        'it' => 'IT', 'direction' => 'Direction', 'resp_production' => 'Responsable Production',
        'chef_atelier' => 'Chef Atelier', 'resp_qualite' => 'Responsable Qualite', 'methodes' => 'Methodes', 'coupe' => 'Coupe',
    ];
    foreach ($roles as $slug => $name) {
        \App\Models\Role::factory()->create(['slug' => $slug, 'name' => $name]);
    }
}
