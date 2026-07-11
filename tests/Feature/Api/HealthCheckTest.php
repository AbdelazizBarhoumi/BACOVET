<?php

namespace Tests\Feature\Api;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $role = Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        $this->actingAs($this->user);
    }

    /** @test */
    public function health_endpoint_returns_200_when_all_apis_healthy()
    {
        Http::fake([
            '*/api/data/checkpassqte*' => Http::response(['success' => true, 'data' => [['defect_pct' => 2.5]]], 200),
            '*127.0.0.1:3002*' => Http::response(['values' => [['a' => 1]]], 200),
            '*/api/v1/chain-planning*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $response = $this->getJson('/health');

        $response->assertStatus(200);
        $response->assertJson([
            'novacity' => 'healthy',
            'google_drive' => 'healthy',
            'gpro' => 'healthy',
        ]);
    }

    /** @test */
    public function health_endpoint_reports_novacity_unreachable_when_fails()
    {
        Http::fake([
            '*/api/data/*' => Http::response(null, 500),
            '*127.0.0.1:3002*' => Http::response(['values' => []], 200),
            '*/api/v1/*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $response = $this->getJson('/health');

        $response->assertStatus(200);
        $response->assertJson([
            'novacity' => 'unreachable',
            'google_drive' => 'healthy',
            'gpro' => 'healthy',
        ]);
    }

    /** @test */
    public function health_endpoint_reports_all_unreachable_when_all_fail()
    {
        Http::fake(function () {
            return Http::response(null, 500);
        });

        $response = $this->getJson('/health');

        $response->assertStatus(200);
        $response->assertJson([
            'novacity' => 'unreachable',
            'google_drive' => 'unreachable',
            'gpro' => 'unreachable',
        ]);
    }

    /** @test */
    public function health_endpoint_requires_authentication()
    {
        // Logout first
        $this->authGuard()->logout();

        $response = $this->getJson('/health');

        $response->assertRedirect();
    }

    /** @test */
    public function health_endpoint_returns_json_structure()
    {
        Http::fake([
            '*/api/data/checkpassqte*' => Http::response(['success' => true, 'data' => []], 200),
            '*127.0.0.1:3002*' => Http::response(['values' => []], 200),
            '*/api/v1/chain-planning*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $response = $this->getJson('/health');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'novacity',
            'google_drive',
            'gpro',
        ]);
    }

    /** @test */
    public function health_endpoint_values_are_either_healthy_or_unreachable()
    {
        Http::fake([
            '*/api/data/checkpassqte*' => Http::response(['success' => true, 'data' => []], 200),
            '*127.0.0.1:3002*' => Http::response(null, 503),
            '*/api/v1/chain-planning*' => Http::response(null, 0),
        ]);

        $response = $this->getJson('/health');

        $response->assertStatus(200);
        $data = $response->json();
        $this->assertContains($data['novacity'], ['healthy', 'unreachable']);
        $this->assertContains($data['google_drive'], ['healthy', 'unreachable']);
        $this->assertContains($data['gpro'], ['healthy', 'unreachable']);
    }

    /** @test */
    public function health_endpoint_handles_novacity_timeout()
    {
        Http::fake([
            '*/api/data/*' => function () {
                // Simulate timeout by throwing
                throw new \Illuminate\Http\Client\ConnectionException('cURL error 28');
            },
            '*127.0.0.1:3002*' => Http::response(['values' => []], 200),
            '*/api/v1/*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $response = $this->getJson('/health');

        $response->assertStatus(200);
        $response->assertJson([
            'novacity' => 'unreachable',
        ]);
    }

    private function authGuard()
    {
        return auth()->guard();
    }
}
