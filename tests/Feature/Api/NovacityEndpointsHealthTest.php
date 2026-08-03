<?php

namespace Tests\Feature\Api;

use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NovacityEndpointsHealthTest extends TestCase
{
    use RefreshDatabase;

    private string $testDir;

    private string $dataPath;

    private string $metaPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testDir = storage_path('app/public/_health_tests_'.uniqid());
        mkdir($this->testDir, 0755, true);
        $this->dataPath = $this->testDir.'/data.json';
        $this->metaPath = $this->testDir.'/endpoints-refresh.json';

        config([
            'novacity.base_url' => 'https://novacity.test',
            'novacity.api_key' => 'test-api-key',
            'novacity.admin_token' => '',
            'novacity.data_file' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->dataPath),
            'novacity.data_backup' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->dataPath.'.bak'),
            'novacity.refresh_meta' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->metaPath),
        ]);

        file_put_contents($this->dataPath, json_encode($this->fixture(), JSON_PRETTY_PRINT));

        $role = \App\Models\Role::firstOrCreate(['slug' => 'it'], ['name' => 'IT']);
        $this->user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
        $this->actingAs($this->user);

        Cache::flush();
        NovacityEndpointsController::flushCache();
    }

    protected function tearDown(): void
    {
        NovacityEndpointsController::flushCache();
        if (is_dir($this->testDir)) {
            foreach (glob($this->testDir.'/*') ?: [] as $file) {
                @unlink($file);
            }
            @rmdir($this->testDir);
        }
        parent::tearDown();
    }

    private function fixture(): array
    {
        return [
            [
                'id' => '00000000-0000-0000-0000-000000000001',
                'name' => 'List A',
                'method' => 'GET',
                'endpoint' => 'https://novacity.test/api/data/a',
                'status' => 200,
                'response' => ['success' => true, 'data' => [['x' => 1]]],
            ],
        ];
    }

    /** @test */
    public function health_returns_stats_meta_and_retry_state()
    {
        file_put_contents($this->metaPath, json_encode([
            'last_run_at' => '2026-07-31T08:00:00+00:00',
            'ok' => 1,
            'failed' => 0,
            'skipped' => 0,
            'retry_pending' => false,
        ]));

        $this->getJson('/novacity-endpoints/health')
            ->assertOk()
            ->assertJsonPath('retry_pending', false)
            ->assertJsonPath('meta.ok', 1)
            ->assertJsonPath('meta.skipped', 0)
            ->assertJsonPath('stats.total', 1)
            ->assertJsonPath('stats.by_status.200', 1);
    }

    /** @test */
    public function health_returns_null_meta_when_no_meta_file()
    {
        $this->getJson('/novacity-endpoints/health')
            ->assertOk()
            ->assertJsonPath('meta', null)
            ->assertJsonPath('retry_pending', false);
    }

    /** @test */
    public function health_exposes_pending_retry_flag()
    {
        Cache::put('endpoints:refresh:retry_pending', true, now()->endOfDay());

        $this->getJson('/novacity-endpoints/health')->assertJsonPath('retry_pending', true);
    }

    /** @test */
    public function refresh_runs_command_and_returns_meta()
    {
        Http::fake([
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => ['fresh' => true]], 200),
        ]);

        $this->postJson('/novacity-endpoints/refresh')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('exit_code', 0)
            ->assertJsonPath('meta.ok', 1)
            ->assertJsonPath('meta.failed', 0);

        $items = json_decode(file_get_contents($this->dataPath), true);
        $this->assertSame(['success' => true, 'data' => ['fresh' => true]], $items[0]['response']);
        $this->assertNotNull($items[0]['checked_at']);
        $this->assertNotNull($items[0]['last_ok_at']);
    }

    /** @test */
    public function refresh_reports_command_failure_exit_code()
    {
        config(['novacity.base_url' => '']);

        $this->postJson('/novacity-endpoints/refresh')
            ->assertOk()
            ->assertJsonPath('success', false)
            ->assertJsonPath('exit_code', 1);
    }

    /** @test */
    public function refresh_one_refreshes_only_the_targeted_endpoint()
    {
        file_put_contents($this->dataPath, json_encode([
            [
                'id' => '00000000-0000-0000-0000-000000000001',
                'name' => 'List A',
                'method' => 'GET',
                'endpoint' => 'https://novacity.test/api/data/a',
                'status' => 200,
                'response' => ['success' => true, 'data' => [['x' => 1]]],
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000002',
                'name' => 'List B',
                'method' => 'GET',
                'endpoint' => 'https://novacity.test/api/data/b',
                'status' => 200,
                'response' => ['success' => true, 'data' => [['old' => true]]],
            ],
        ], JSON_PRETTY_PRINT));
        NovacityEndpointsController::flushCache();

        Http::fake([
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => ['fresh' => true]], 200),
        ]);

        $this->postJson('/novacity-endpoints/00000000-0000-0000-0000-000000000002/refresh')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('exit_code', 0)
            ->assertJsonPath('meta.ok', 1)
            ->assertJsonPath('meta.failed', 0)
            ->assertJsonPath('entry.id', '00000000-0000-0000-0000-000000000002');

        $items = json_decode(file_get_contents($this->dataPath), true);
        $this->assertSame(['success' => true, 'data' => [['x' => 1]]], $items[0]['response']);
        $this->assertNull($items[0]['checked_at'] ?? null);
        $this->assertSame(['success' => true, 'data' => ['fresh' => true]], $items[1]['response']);
        $this->assertNotNull($items[1]['checked_at']);
        $this->assertNotNull($items[1]['last_ok_at']);
    }

    /** @test */
    public function refresh_one_returns_404_for_unknown_id()
    {
        Http::fake();

        $this->postJson('/novacity-endpoints/00000000-0000-0000-0000-000000000099/refresh')
            ->assertStatus(404)
            ->assertJsonPath('success', false);

        Http::assertNothingSent();
    }

    /** @test */
    public function unauthenticated_and_non_it_requests_are_rejected()
    {
        auth()->logout();
        $this->getJson('/novacity-endpoints/health')->assertStatus(401);
        $this->postJson('/novacity-endpoints/refresh')->assertStatus(401);

        $direction = \App\Models\Role::firstOrCreate(['slug' => 'direction'], ['name' => 'Direction']);
        $user = User::factory()->create(['role_id' => $direction->id, 'is_active' => true]);
        $this->actingAs($user);
        $this->getJson('/novacity-endpoints/health')->assertStatus(403);
        $this->postJson('/novacity-endpoints/refresh')->assertStatus(403);
    }
}
