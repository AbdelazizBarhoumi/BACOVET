<?php

namespace Tests\Feature;

use App\Console\Commands\RunEndpointSync;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SyncEndpointDataRootTest extends TestCase
{
    use RefreshDatabase;

    private string $dataFile;

    private string $metaFile;

    private string $rootsFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-root-data.json');
        $this->metaFile = storage_path('framework/testing/endpoint-root-meta.json');
        $this->rootsFile = storage_path('framework/testing/endpoint-root-roots.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.base_url' => 'https://api.primary.test',
            'novacity.api_key' => 'global-key',
            'novacity.admin_token' => '',
            'novacity.timeout' => 5,
            'novacity.data_file' => 'framework/testing/endpoint-root-data.json',
            'novacity.refresh_meta' => 'framework/testing/endpoint-root-meta.json',
            'novacity.roots_file' => 'framework/testing/endpoint-root-roots.json',
        ]);

        Cache::flush();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink($this->metaFile);
        @unlink($this->rootsFile);
        parent::tearDown();
    }

    private function writeRootCredentials(array $credentials): void
    {
        file_put_contents($this->rootsFile, json_encode($credentials, JSON_PRETTY_PRINT));
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    public function test_refresh_respects_each_endpoints_own_root(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => new \stdClass],
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 200, 'response' => new \stdClass],
            ['id' => 'ep-3', 'name' => 'v_relative', 'method' => 'GET', 'endpoint' => 'api/data/v_relative', 'status' => 200, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.primary.test/api/data/v_primary*' => Http::response(['success' => true, 'data' => [['a' => 1]]], 200),
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => [['b' => 2]]], 200),
            'https://api.primary.test/api/data/v_relative*' => Http::response(['success' => true, 'data' => [['c' => 3]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'refresh', '--force' => true, '--retry' => 0])
            ->assertSuccessful();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test/api/data/v_primary'));
        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.custom.test/api/data/v_custom'));
        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test/api/data/v_relative'));

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame(200, $data['ep-1']['status']);
        $this->assertSame(200, $data['ep-2']['status']);
        $this->assertSame(200, $data['ep-3']['status']);
    }

    public function test_root_option_only_refreshes_matching_root(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 502, 'response' => new \stdClass],
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 502, 'response' => new \stdClass],
        ]);

        Cache::put('endpoints:refresh:retry_pending', true, now()->addDay());

        Http::fake([
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => []], 200),
            'https://api.primary.test/api/data/v_primary*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'refresh', '--force' => true, '--retry' => 0, '--root' => 'https://api.custom.test'])
            ->assertSuccessful();

        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test'));

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame(200, $data['ep-2']['status']);
        $this->assertSame(502, $data['ep-1']['status']);
    }

    public function test_root_option_errors_when_no_match(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => new \stdClass],
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'refresh', '--force' => true, '--root' => 'https://api.missing.test'])
            ->assertFailed()
            ->expectsOutputToContain('No endpoint found with root https://api.missing.test');
    }

    public function test_id_option_refresh_uses_per_root_key_for_data_root(): void
    {
        $this->writeRootCredentials([
            'https://api.custom.test' => ['api_key' => 'custom-root-key'],
        ]);

        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 502, 'response' => new \stdClass],
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 502, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => [['b' => 2]]], 200),
            'https://api.primary.test/api/data/v_primary*' => Http::response(['success' => true, 'data' => [['a' => 1]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--retry' => 0,
            '--id' => 'ep-2',
        ])->assertSuccessful();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.custom.test/api/data/v_custom')
            && $request->header('x-api-key') === ['custom-root-key']);

        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test'));

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame(200, $data['ep-2']['status']);
        $this->assertSame(502, $data['ep-1']['status']);
    }

    public function test_root_option_refresh_uses_per_root_key_for_root_with_no_admin_endpoints(): void
    {
        $this->writeRootCredentials([
            'https://api.custom.test' => ['api_key' => 'custom-root-key'],
        ]);

        $this->writeData([
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 502, 'response' => new \stdClass],
        ]);

        Http::fake([
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => [['b' => 2]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--retry' => 0,
            '--root' => 'https://api.custom.test',
        ])->assertSuccessful();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://api.custom.test/api/data/v_custom')
            && $request->header('x-api-key') === ['custom-root-key']);

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame(200, $data['ep-2']['status']);
    }

    public function test_endpoint_sync_run_publishes_and_clears_running_flag(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => ['data' => [['a' => 1]], 'label' => 'V', 'object' => 'O', 'object_type' => 'T']],
        ]);

        Http::fake([
            'https://api.primary.test/api/data/v_primary*' => Http::response(['success' => true, 'data' => [['a' => 2]]], 200),
        ]);

        $this->assertFalse(Cache::has(RunEndpointSync::RUNNING_KEY));

        $this->artisan('endpoint-sync:run', ['--timeout' => 5])
            ->assertSuccessful();

        $this->assertFalse(Cache::has(RunEndpointSync::RUNNING_KEY));

        $this->assertDatabaseHas('endpoint_datasets', [
            'slug' => 'api/data/v_primary',
            'last_status' => 'ok',
        ]);
    }

    public function test_datasets_root_option_only_syncs_matching_root(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => ['data' => [['a' => 1], ['a' => 2]], 'label' => 'P', 'object' => 'O', 'object_type' => 'T']],
            ['id' => 'ep-2', 'name' => 'v_custom', 'method' => 'GET', 'endpoint' => 'https://api.custom.test/api/data/v_custom', 'status' => 200, 'response' => ['data' => [['b' => 3]], 'label' => 'C', 'object' => 'O2', 'object_type' => 'T2']],
        ]);

        Http::fake([
            'https://api.custom.test/api/data/v_custom*' => Http::response(['success' => true, 'data' => [['b' => 9]]], 200),
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--batch' => 5,
            '--root' => 'https://api.custom.test',
        ])->assertSuccessful();

        Http::assertNotSent(fn ($request) => str_starts_with($request->url(), 'https://api.primary.test'));

        $this->assertDatabaseHas('endpoint_datasets', ['slug' => 'api/data/v_custom', 'last_status' => 'ok', 'row_count' => 1]);
        $this->assertDatabaseMissing('endpoint_datasets', ['slug' => 'api/data/v_primary']);

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame([['b' => 9]], $data['ep-2']['response']['data']);
        $this->assertSame([['a' => 1], ['a' => 2]], $data['ep-1']['response']['data']);
    }

    public function test_datasets_root_option_errors_when_no_match(): void
    {
        $this->writeData([
            ['id' => 'ep-1', 'name' => 'v_primary', 'method' => 'GET', 'endpoint' => 'https://api.primary.test/api/data/v_primary', 'status' => 200, 'response' => ['data' => [['a' => 1]]]],
        ]);

        $this->artisan('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--retry' => 0,
            '--root' => 'https://api.missing.test',
        ])->assertFailed()
            ->expectsOutputToContain('No endpoint found with root https://api.missing.test');
    }

    private function readData(): array
    {
        return json_decode((string) file_get_contents($this->dataFile), true);
    }
}
