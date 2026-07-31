<?php

namespace Tests\Feature\Auth;

use App\Models\V5User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class V5AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_check_returns_has_password_for_existing_email(): void
    {
        $user = V5User::create([
            'email' => 'test@bacovet.com',
            'name' => 'Test',
            'role' => 'it',
            'password' => bcrypt('secret'),
            'has_password' => true,
        ]);

        $response = $this->postJson('/api/v5-auth/check', ['email' => $user->email]);

        $response->assertStatus(200);
        $this->assertTrue($response['has_password']);
        $this->assertEquals('Test', $response['name']);
    }

    public function test_check_returns_404_for_unknown_email(): void
    {
        $response = $this->postJson('/api/v5-auth/check', ['email' => 'nobody@test.com']);

        $response->assertStatus(404);
    }

    public function test_login_succeeds_with_valid_credentials(): void
    {
        $user = V5User::create([
            'email' => 'test@bacovet.com',
            'name' => 'Test',
            'role' => 'it',
            'password' => bcrypt('secret'),
            'has_password' => true,
        ]);

        $response = $this->postJson('/api/v5-auth/login', [
            'email' => $user->email,
            'password' => 'secret',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Test', $response['user']['name']);
        $this->assertAuthenticatedAs($user, 'v5_users');
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = V5User::create([
            'email' => 'test@bacovet.com',
            'name' => 'Test',
            'role' => 'it',
            'password' => bcrypt('secret'),
            'has_password' => true,
        ]);

        $response = $this->postJson('/api/v5-auth/login', [
            'email' => $user->email,
            'password' => 'wrong',
        ]);

        $response->assertStatus(401);
    }

    public function test_set_password_logs_in_user(): void
    {
        $user = V5User::create([
            'email' => 'new@bacovet.com',
            'name' => 'New',
            'role' => 'it',
            'password' => '',
            'has_password' => false,
        ]);

        $response = $this->postJson('/api/v5-auth/set-password', [
            'email' => $user->email,
            'password' => 'secret',
        ]);

        $response->assertStatus(200);
        $this->assertAuthenticatedAs($user, 'v5_users');
        $this->assertTrue($user->fresh()->has_password);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = V5User::create([
            'email' => 'test@bacovet.com',
            'name' => 'Test',
            'role' => 'it',
            'password' => '',
            'has_password' => false,
        ]);

        $this->actingAs($user, 'v5_users');

        $response = $this->getJson('/api/v5-auth/me');

        $response->assertStatus(200);
        $this->assertEquals('Test', $response['name']);
    }

    public function test_logout_clears_session(): void
    {
        $user = V5User::create([
            'email' => 'test@bacovet.com',
            'name' => 'Test',
            'role' => 'it',
            'password' => '',
            'has_password' => false,
        ]);

        $this->actingAs($user, 'v5_users');

        $this->postJson('/api/v5-auth/logout')->assertStatus(200);
        $this->getJson('/api/v5-auth/me')->assertStatus(401);
    }
}
