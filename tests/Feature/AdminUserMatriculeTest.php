<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserMatriculeTest extends TestCase
{
    use RefreshDatabase;

    private function itUser(): User
    {
        $role = Role::updateOrCreate(['slug' => 'it'], ['name' => 'IT', 'slug' => 'it']);
        Role::updateOrCreate(['slug' => 'resp_production'], ['name' => 'Resp Prod', 'slug' => 'resp_production']);

        return User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
    }

    public function test_create_user_without_matricule(): void
    {
        $me = $this->itUser();

        $res = $this->actingAs($me)->postJson('/admin/users', [
            'name' => 'Sans Matricule',
            'matricule' => null,
            'email' => 'sans.matricule@test.com',
            'role' => 'resp_production',
            'password' => 'secret123',
        ]);

        $res->assertOk();
        $this->assertDatabaseHas('users', ['email' => 'sans.matricule@test.com', 'matricule' => null]);
    }

    public function test_create_user_with_admin_alias_role(): void
    {
        $me = $this->itUser();

        $res = $this->actingAs($me)->postJson('/admin/users', [
            'name' => 'Admin Alias',
            'matricule' => null,
            'email' => 'admin.alias@test.com',
            'role' => 'admin',
            'password' => 'secret123',
        ]);

        $res->assertOk();
        $itRole = Role::where('slug', 'it')->firstOrFail();
        $this->assertDatabaseHas('users', ['email' => 'admin.alias@test.com', 'role_id' => $itRole->id]);
    }

    public function test_update_user_clears_matricule(): void
    {
        $me = $this->itUser();

        $res = $this->actingAs($me)->putJson("/admin/users/{$me->id}", [
            'matricule' => null,
        ]);

        $res->assertOk();
        $this->assertDatabaseHas('users', ['id' => $me->id, 'matricule' => null]);
    }

    public function test_update_user_with_empty_string_matricule(): void
    {
        $me = $this->itUser();

        $res = $this->actingAs($me)->putJson("/admin/users/{$me->id}", [
            'matricule' => '',
        ]);

        $res->assertOk();
        $this->assertDatabaseHas('users', ['id' => $me->id, 'matricule' => null]);
    }
}
