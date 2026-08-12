<?php

namespace Tests\Feature;

use App\Console\Commands\SyncEndpointDataDispatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Tests\TestCase;

class SyncEndpointDataDispatchTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-dispatch-data.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.base_url' => 'https://api.primary.test',
            'novacity.api_key' => 'global-key',
            'novacity.admin_token' => '',
            'novacity.timeout' => 5,
            'novacity.data_file' => 'framework/testing/endpoint-dispatch-data.json',
        ]);

        Cache::flush();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        parent::tearDown();
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    public function test_dispatch_launches_detached_worker_per_root_and_does_not_block(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'a', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/a', 'status' => 200, 'response' => new \stdClass],
            ['id' => 'ep-2', 'name' => 'b', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/b', 'status' => 200, 'response' => new \stdClass],
        ]);

        Process::fake();

        $this->artisan('sync:endpoint-data:dispatch')
            ->assertSuccessful();

        // One detached worker per distinct root, each carrying --root.
        Process::assertRanTimes(fn (PendingProcess $process) => str_contains((string) $process->command ?? '', 'sync:endpoint-data'), 2);

        Process::assertRan(fn (PendingProcess $process) => str_contains((string) $process->command ?? '', '--root=https://api.primary.test'));
        Process::assertRan(fn (PendingProcess $process) => str_contains((string) $process->command ?? '', '--root=https://api.custom.test'));

        // Each child contributes to the in-flight counter, so the wave is now marked active.
        $this->assertSame(2, (int) Cache::get(SyncEndpointDataDispatch::INFLIGHT_KEY));
    }

    public function test_dispatch_skips_when_a_wave_is_in_flight(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'a', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/a', 'status' => 200, 'response' => new \stdClass],
        ]);

        Cache::set(SyncEndpointDataDispatch::INFLIGHT_KEY, 1);
        Cache::set('endpoints:dispatch:started_at', time());

        Process::fake();

        $this->artisan('sync:endpoint-data:dispatch')
            ->assertSuccessful()
            ->expectsOutputToContain('already in flight');

        Process::assertRanTimes(fn () => true, 0);
    }

    public function test_sync_endpoint_data_decrements_inflight_counter_on_wave(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'a', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/a', 'status' => 200, 'response' => ['data' => [['x' => 1]]]],
        ]);

        Http::fake([
            'https://api.primary.test/api/data/a*' => Http::response(['success' => true, 'data' => [['x' => 2]]], 200),
        ]);

        Cache::set(SyncEndpointDataDispatch::INFLIGHT_KEY, 1);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--wave' => 'wave-123',
            '--root' => 'https://api.primary.test',
        ])->assertSuccessful();

        $this->assertSame(0, (int) Cache::get(SyncEndpointDataDispatch::INFLIGHT_KEY));
    }
}
