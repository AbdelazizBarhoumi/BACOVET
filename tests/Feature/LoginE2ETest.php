<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginE2ETest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // RoleSeeder is already called in TestCase::setUp() as I added it there earlier
    }

    /** @test */
    public function user_can_login_with_matricule_and_redirects_to_dashboard()
    {
        $role = Role::where('slug', 'it')->first();
        $user = User::create([
            'name' => 'IT Admin',
            'matricule' => 'IT-001',
            'email' => 'it@bacovet.com',
            'password' => bcrypt('demo'),
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $response = $this->post('/auth/login', [
            'matricule' => 'IT-001',
            'password' => 'demo',
        ]);

        $response->assertRedirect('/admin');
        $this->assertAuthenticatedAs($user);
    }

    /** @test */
    public function user_can_login_with_email_as_identifier()
    {
        $role = Role::where('slug', 'it')->first();
        $user = User::create([
            'name' => 'IT Admin',
            'matricule' => 'IT-001',
            'email' => 'it@bacovet.com',
            'password' => bcrypt('demo'),
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $response = $this->post('/auth/login', [
            'matricule' => 'it@bacovet.com',
            'password' => 'demo',
        ]);

        $response->assertRedirect('/admin');
        $this->assertAuthenticatedAs($user);
    }

    /** @test */
    public function inactive_user_cannot_login()
    {
        $role = Role::where('slug', 'it')->first();
        User::create([
            'name' => 'Inactive User',
            'matricule' => 'IN-001',
            'email' => 'inactive@bacovet.com',
            'password' => bcrypt('demo'),
            'role_id' => $role->id,
            'is_active' => false,
        ]);

        $response = $this->post('/auth/login', [
            'matricule' => 'IN-001',
            'password' => 'demo',
        ]);

        $response->assertSessionHasErrors([
            'matricule' => 'Ce compte est actuellement désactivé.',
        ]);
        $this->assertGuest();
    }

    /** @test */
    public function invalid_credentials_fails_login()
    {
        $role = Role::where('slug', 'it')->first();
        User::create([
            'name' => 'IT Admin',
            'matricule' => 'IT-001',
            'email' => 'it@bacovet.com',
            'password' => bcrypt('demo'),
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        $response = $this->post('/auth/login', [
            'matricule' => 'IT-001',
            'password' => 'wrong-password',
        ]);

        $response->assertSessionHasErrors([
            'matricule' => 'Matricule ou mot de passe incorrect.',
        ]);
        $this->assertGuest();
    }
}
