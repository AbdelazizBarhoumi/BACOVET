<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class EndpointRetryTest extends TestCase
{
    use RefreshDatabase;

    private function userWithRole(string $slug): User
    {
        $role = Role::updateOrCreate(
            ['slug' => $slug],
            ['name' => $slug, 'slug' => $slug],
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    public function test_retry_failed_requires_it_role(): void
    {
        $this->actingAs($this->userWithRole('resp_production'))
            ->postJson('/novacity-endpoints/retry-failed')
            ->assertForbidden();
    }

    public function test_retry_failed_runs_retry_phase_when_pending(): void
    {
        config(['novacity.web_timeout' => 60]);

        Cache::put('endpoints:refresh:retry_ids', [
            [
                'id' => 'ep-1',
                'name' => 'v_br_mensuel',
                'status' => 502,
                'attempts' => 1,
                'last_attempt_at' => now()->toIso8601String(),
            ],
        ], now()->addDay());

        Artisan::spy()
            ->shouldReceive('call')
            ->once()
            ->with('sync:endpoint-data', [
                '--phase' => 'retry',
                '--force' => true,
                '--timeout' => 60,
            ])
            ->andReturn(0);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/retry-failed')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['meta', 'retry_pending_count', 'retry_ids']);
    }

    public function test_retry_failed_noops_when_nothing_pending(): void
    {
        Artisan::shouldReceive('call')->never();

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/retry-failed')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('retry_pending_count', 0)
            ->assertJsonPath('retry_ids', []);
    }

    public function test_health_reports_pending_retry_state(): void
    {
        Cache::put('endpoints:refresh:retry_pending', true, now()->addDay());
        Cache::put('endpoints:refresh:retry_ids', [
            [
                'id' => 'ep-1',
                'name' => 'v_br_mensuel',
                'status' => 502,
                'attempts' => 2,
                'last_attempt_at' => now()->toIso8601String(),
            ],
        ], now()->addDay());

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/health')
            ->assertOk()
            ->assertJsonPath('retry_pending', true)
            ->assertJsonPath('retry_pending_count', 1)
            ->assertJsonStructure([
                'retry_ids' => [['id', 'name', 'status', 'attempts', 'last_attempt_at']],
            ]);
    }
}
