<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SyncEndpointDataRetryTest extends TestCase
{
    private string $dataFile;

    private string $metaFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dataFile = storage_path('framework/testing/endpoint-retry-data.json');
        $this->metaFile = storage_path('framework/testing/endpoint-retry-meta.json');

        @mkdir(dirname($this->dataFile), 0755, true);

        config([
            'novacity.base_url' => 'https://api.test',
            'novacity.api_key' => 'test-key',
            'novacity.admin_token' => '',
            'novacity.timeout' => 5,
            'novacity.data_file' => 'framework/testing/endpoint-retry-data.json',
            'novacity.refresh_meta' => 'framework/testing/endpoint-retry-meta.json',
        ]);

        Cache::flush();
    }

    protected function tearDown(): void
    {
        @unlink($this->dataFile);
        @unlink($this->metaFile);
        parent::tearDown();
    }

    private function writeData(array $items): void
    {
        file_put_contents($this->dataFile, json_encode($items, JSON_PRETTY_PRINT));
    }

    private function readData(): array
    {
        return json_decode((string) file_get_contents($this->dataFile), true);
    }

    private function item(string $id, string $name): array
    {
        return [
            'id' => $id,
            'name' => $name,
            'method' => 'GET',
            'endpoint' => "https://api.test/api/data/{$name}",
            'status' => 200,
            'response' => new \stdClass,
        ];
    }

    private function retryState(): array
    {
        return Cache::get('endpoints:refresh:retry_ids', []);
    }

    public function test_only_5xx_failures_are_flagged_for_retry(): void
    {
        $this->writeData([
            $this->item('ep-ok', 'v_ok'),
            $this->item('ep-502', 'v_bad'),
            $this->item('ep-404', 'v_missing'),
        ]);

        Http::fake([
            'https://api.test/api/data/v_ok*' => Http::response(['success' => true, 'data' => []], 200),
            'https://api.test/api/data/v_bad*' => Http::response(['success' => false, 'message' => 'boom'], 502),
            'https://api.test/api/data/v_missing*' => Http::response(['success' => false, 'message' => 'nope'], 404),
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'refresh', '--force' => true, '--retry' => 0])
            ->assertSuccessful();

        $data = collect($this->readData())->keyBy('id');

        $this->assertSame(200, $data['ep-ok']['status']);
        $this->assertSame(502, $data['ep-502']['status']);
        $this->assertSame(404, $data['ep-404']['status']);
        $this->assertSame(0, $data['ep-ok']['consecutive_failures']);
        $this->assertSame(1, $data['ep-502']['consecutive_failures']);

        $ids = collect($this->retryState())->pluck('id')->all();
        $this->assertSame(['ep-502'], $ids);
        $this->assertTrue((bool) Cache::get('endpoints:refresh:retry_pending', false));

        $meta = json_decode((string) file_get_contents($this->metaFile), true);
        $this->assertSame(1, $meta['retry_pending_count']);
        $this->assertTrue($meta['retry_pending']);
    }

    public function test_retry_recovers_transient_5xx_into_success(): void
    {
        $this->writeData([$this->item('ep-1', 'v_flaky')]);

        Http::fake([
            'https://api.test/api/data/v_flaky*' => Http::sequence([
                Http::response(['success' => false, 'message' => 'upstream'], 502),
                Http::response(['success' => true, 'data' => [['a' => 1]]], 200),
            ]),
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'refresh', '--force' => true, '--retry' => 1])
            ->assertSuccessful();

        $data = collect($this->readData())->keyBy('id');
        $this->assertSame(200, $data['ep-1']['status']);
        $this->assertSame([], $this->retryState());
    }

    public function test_retry_phase_only_refetches_pending_ids(): void
    {
        $this->writeData([
            $this->item('ep-pending', 'v_pending'),
            $this->item('ep-other', 'v_other'),
        ]);

        Cache::put('endpoints:refresh:retry_ids', [
            [
                'id' => 'ep-pending',
                'name' => 'v_pending',
                'status' => 503,
                'attempts' => 1,
                'last_attempt_at' => now()->toIso8601String(),
            ],
        ], now()->addDay());

        Http::fake([
            'https://api.test/api/data/v_pending*' => Http::response(['success' => true, 'data' => []], 200),
            'https://api.test/api/data/v_other*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $this->artisan('sync:endpoint-data', ['--phase' => 'retry', '--force' => true, '--retry' => 0])
            ->assertSuccessful();

        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'v_other'));

        $data = collect($this->readData())->keyBy('id');
        $this->assertSame(200, $data['ep-pending']['status']);
        $this->assertSame([], $this->retryState());
        $this->assertFalse((bool) Cache::get('endpoints:refresh:retry_pending', false));
    }
}
