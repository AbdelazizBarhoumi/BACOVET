<?php

namespace Tests\Feature;

use App\Console\Commands\RunEndpointSync;
use App\Http\Controllers\Api\NovacityEndpointsController;
use App\Models\EndpointDataset;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

class EndpointRefreshRootTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-refresh-root-data.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.data_file' => 'framework/testing/endpoint-refresh-root-data.json',
            'novacity.refresh_meta' => 'framework/testing/endpoint-refresh-root-meta.json',
            'novacity.base_url' => 'https://api.primary.test',
            'novacity.api_key' => 'test-key',
            'novacity.admin_token' => '',
            'novacity.web_timeout' => 60,
        ]);

        Cache::flush();

        NovacityEndpointsController::flushCache();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink(storage_path('framework/testing/endpoint-refresh-root-meta.json'));
        parent::tearDown();
    }

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

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    private function item(string $id, string $name, string $endpoint): array
    {
        return [
            'id' => $id,
            'name' => $name,
            'method' => 'GET',
            'endpoint' => $endpoint,
            'status' => 200,
            'response' => ['success' => true, 'data' => []],
        ];
    }

    public function test_refresh_launches_background_process_and_publishes_running_flag(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
        ]);

        Process::fake();

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/refresh')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('queued', true)
            ->assertJsonPath('running', true);

        $this->assertTrue(Cache::has(RunEndpointSync::RUNNING_KEY));

        Process::assertRan(fn (PendingProcess $process) => str_contains((string) $process->command ?? '', 'endpoint-sync:run'));
    }

    public function test_refresh_is_idempotent_while_already_running(): void
    {
        RunEndpointSync::clearStale();
        Cache::put(RunEndpointSync::RUNNING_KEY, now()->toIso8601String(), now()->addHours(2));
        Cache::put('endpoints:refresh:running_pid', (int) getmypid(), now()->addHours(2));

        Process::fake();

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/refresh')
            ->assertOk()
            ->assertJsonPath('queued', false)
            ->assertJsonPath('running', true)
            ->assertJsonPath('reason', 'already_running');

        Process::assertRanTimes(fn () => true, 0);
    }

    public function test_refresh_stale_flag_is_self_healed(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
        ]);

        // A stale flag: set 10 minutes ago with a dead PID (999999).
        Cache::put(RunEndpointSync::RUNNING_KEY, now()->subMinutes(10)->toIso8601String(), now()->addHours(2));
        Cache::put('endpoints:refresh:running_pid', 999999, now()->addHours(2));

        Process::fake();

        // Health must republish a dead PID as "not running".
        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/health')
            ->assertOk()
            ->assertJsonPath('running', false);

        $this->assertFalse(Cache::has(RunEndpointSync::RUNNING_KEY));

        // And the button must be able to launch a fresh run right away.
        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/refresh')
            ->assertOk()
            ->assertJsonPath('queued', true);

        Process::assertRan(fn (PendingProcess $process) => str_contains((string) $process->command ?? '', 'endpoint-sync:run'));
    }

    public function test_health_reports_running_flag(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
        ]);

        Cache::put(RunEndpointSync::RUNNING_KEY, now()->toIso8601String(), now()->addHours(2));
        Cache::put('endpoints:refresh:running_pid', (int) getmypid(), now()->addHours(2));

        $this->actingAs($this->userWithRole('it'))
            ->getJson('/novacity-endpoints/health')
            ->assertOk()
            ->assertJsonPath('running', true);
    }

    public function test_refresh_one_targets_endpoints_own_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.custom.test/api/data/b'),
        ]);

        Artisan::spy()
            ->shouldReceive('call')
            ->once()
            ->with('sync:endpoint-data', [
                '--phase' => 'refresh',
                '--force' => true,
                '--timeout' => 60,
                '--id' => 'ep-2',
            ])
            ->andReturn(0);

        $this->actingAs($this->userWithRole('it'))
            ->postJson('/novacity-endpoints/'.urlencode('ep-2').'/refresh')
            ->assertOk()
            ->assertJsonPath('success', true);
    }

    public function test_command_refresh_one_hits_custom_root(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.custom.test/api/data/b'),
        ]);

        Http::fake([
            'https://api.primary.test/api/data/a*' => Http::response(['success' => true, 'data' => []], 200),
            'https://api.custom.test/api/data/b*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--retry' => 0,
            '--id' => 'ep-2',
        ])->assertSuccessful();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.custom.test/api/data/b'));
        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test'));
    }

    public function test_command_refresh_one_updates_dataset_row(): void
    {
        $this->writeData([
            $this->item('ep-1', 'a', 'https://api.primary.test/api/data/a'),
            $this->item('ep-2', 'b', 'https://api.custom.test/api/data/b'),
        ]);

        Http::fake([
            'https://api.custom.test/api/data/b*' => Http::response([
                'success' => true,
                'data' => [
                    ['id' => 1, 'label' => 'LIVE'],
                    ['id' => 2, 'label' => 'FRESH'],
                ],
            ], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--retry' => 0,
            '--id' => 'ep-2',
        ])->assertSuccessful();

        $dataset = EndpointDataset::where('slug', 'api/data/b')->first();

        $this->assertNotNull($dataset);
        $this->assertSame(2, $dataset->row_count);
        $this->assertSame('ok', $dataset->last_status);
        $this->assertSame('LIVE', $dataset->sample_data[0]['label'] ?? null);
    }

    public function test_refresh_marks_failed_endpoint_as_dataset_error_keeping_good_rows(): void
    {
        $this->writeData([
            $this->item('ep-1', 'v_primary', 'https://api.primary.test/api/data/v_primary'),
        ]);

        EndpointDataset::create([
            'slug' => 'api/data/v_primary',
            'name' => 'v_primary',
            'method' => 'GET',
            'columns' => [['name' => 'a', 'type' => 'number']],
            'sample_data' => [['a' => 1], ['a' => 2]],
            'row_count' => 2,
            'last_status' => 'ok',
            'last_synced_at' => now(),
        ]);

        Http::fake([
            'https://api.primary.test/api/data/v_primary*' => Http::response('boom', 500),
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'refresh', '--force' => true, '--retry' => 0])
            ->assertSuccessful();

        $dataset = EndpointDataset::where('slug', 'api/data/v_primary')->first();

        $this->assertNotNull($dataset);
        $this->assertSame('error', $dataset->last_status);
        $this->assertStringContainsString('HTTP 500', (string) $dataset->last_error);
        $this->assertSame([['a' => 1], ['a' => 2]], $dataset->sample_data);
        $this->assertSame(2, $dataset->row_count);
    }
}
