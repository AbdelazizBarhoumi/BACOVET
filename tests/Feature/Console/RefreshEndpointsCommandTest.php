<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RefreshEndpointsCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $testDir;

    private string $dataPath;

    private string $backupPath;

    private string $metaPath;

    protected function setUp(): void
    {
        parent::setUp();

        $this->testDir = storage_path('app/public/_endpoints_refresh_tests_'.uniqid());
        mkdir($this->testDir, 0755, true);
        $this->dataPath = $this->testDir.'/data.json';
        $this->backupPath = $this->testDir.'/data.json.bak';
        $this->metaPath = $this->testDir.'/endpoints-refresh.json';

        config([
            'novacity.base_url' => 'https://novacity.test',
            'novacity.api_key' => 'test-api-key',
            'novacity.admin_token' => '',
            'novacity.data_file' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->dataPath),
            'novacity.data_backup' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->backupPath),
            'novacity.refresh_meta' => str_replace(storage_path().DIRECTORY_SEPARATOR, '', $this->metaPath),
        ]);

        file_put_contents($this->dataPath, json_encode($this->fixture(), JSON_PRETTY_PRINT));

        Cache::flush();
    }

    protected function tearDown(): void
    {
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
                'endpoint' => 'https://old-host/api/data/a?limit=100&offset=0',
                'status' => 200,
                'response' => ['old' => true],
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000002',
                'name' => 'List B',
                'method' => 'GET',
                'endpoint' => 'https://old-host/api/data/b',
                'status' => 200,
                'response' => ['old' => true],
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000003',
                'name' => 'Create',
                'method' => 'POST',
                'endpoint' => 'https://old-host/api/data/post',
                'status' => 200,
                'response' => ['old' => true],
            ],
            [
                'id' => '00000000-0000-0000-0000-000000000004',
                'name' => 'Broken',
                'method' => 'GET',
                'endpoint' => 'https://old-host/api/data/bad',
                'status' => 500,
                'response' => ['old' => true],
            ],
        ];
    }

    private function withAdminEntry(): void
    {
        $items = json_decode(file_get_contents($this->dataPath), true);
        $items[] = [
            'id' => '00000000-0000-0000-0000-000000000005',
            'name' => 'Admin jobs',
            'method' => 'GET',
            'endpoint' => 'https://old-host/api/admin/jobs',
            'status' => 200,
            'response' => ['old' => true],
        ];
        file_put_contents($this->dataPath, json_encode($items, JSON_PRETTY_PRINT));
    }

    public function test_refresh_updates_ok_entries_and_writes_backup(): void
    {
        Http::fake([
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => ['fresh' => true]], 200),
        ]);

        $this->artisan('endpoints:refresh', ['--force' => true])->assertSuccessful();

        $items = json_decode(file_get_contents($this->dataPath), true);

        $this->assertSame(200, $items[0]['status']);
        $this->assertSame(['success' => true, 'data' => ['fresh' => true]], $items[0]['response']);
        $this->assertSame('https://old-host/api/data/a?limit=100&offset=0', $items[0]['endpoint']);
        $this->assertSame(['success' => true, 'data' => ['fresh' => true]], $items[1]['response']);
        $this->assertSame(['success' => true, 'data' => ['fresh' => true]], $items[2]['response']);
        $this->assertSame(500, $items[3]['status']);
        $this->assertSame(['old' => true], $items[3]['response']);

        $this->assertNotNull($items[0]['checked_at']);
        $this->assertNotNull($items[0]['last_ok_at']);
        $this->assertNull($items[0]['last_error']);

        $this->assertFileExists($this->backupPath);

        $this->assertFalse(Cache::has('endpoints:refresh:retry_pending'));

        $meta = json_decode(file_get_contents($this->metaPath), true);
        $this->assertSame(3, $meta['ok']);
        $this->assertSame(0, $meta['failed']);
        $this->assertSame(1, $meta['skipped']);
        $this->assertFalse($meta['retry_pending']);
        $this->assertNotNull($meta['last_run_at']);
    }

    public function test_requests_use_base_url_preserved_query_and_headers(): void
    {
        Http::fake([
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $this->artisan('endpoints:refresh', ['--force' => true])->assertSuccessful();

        Http::assertSent(function ($request) {
            return $request->url() === 'https://novacity.test/api/data/a?limit=100&offset=0'
                && $request->hasHeader('x-api-key', 'test-api-key')
                && $request->hasHeader('Accept', 'application/json');
        });

        Http::assertSent(function ($request) {
            return $request->url() === 'https://novacity.test/api/data/post'
                && $request->method() === 'POST';
        });

        Http::assertNotSent(function ($request) {
            return $request->url() === 'https://novacity.test/api/data/bad';
        });
    }

    public function test_all_failures_keep_data_and_set_retry_marker(): void
    {
        Http::fake([
            'https://novacity.test/*' => Http::response(['success' => false, 'error' => 'boom'], 500),
        ]);

        $this->artisan('endpoints:refresh', ['--force' => true])->assertSuccessful();

        $items = json_decode(file_get_contents($this->dataPath), true);

        $this->assertSame(['old' => true], $items[0]['response']);
        $this->assertNotNull($items[0]['checked_at']);
        $this->assertStringContainsString('boom', (string) $items[0]['last_error']);
        $this->assertTrue(Cache::has('endpoints:refresh:retry_pending'));

        $meta = json_decode(file_get_contents($this->metaPath), true);
        $this->assertSame(0, $meta['ok']);
        $this->assertSame(3, $meta['failed']);
        $this->assertTrue($meta['retry_pending']);
    }

    public function test_success_clears_retry_marker(): void
    {
        Cache::put('endpoints:refresh:retry_pending', true, now()->addDay());

        Http::fake([
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => []], 200),
        ]);

        $this->artisan('endpoints:refresh', ['--force' => true])->assertSuccessful();

        $this->assertFalse(Cache::has('endpoints:refresh:retry_pending'));
    }

    public function test_dry_run_fetches_but_does_not_write(): void
    {
        Http::fake([
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => ['fresh' => true]], 200),
        ]);

        $this->artisan('endpoints:refresh', ['--dry-run' => true, '--force' => true])->assertSuccessful();

        $items = json_decode(file_get_contents($this->dataPath), true);

        $this->assertSame(['old' => true], $items[0]['response']);
        $this->assertFileDoesNotExist($this->backupPath);
        $this->assertFileDoesNotExist($this->metaPath);

        Http::assertSent(function ($request) {
            return str_starts_with($request->url(), 'https://novacity.test/api/data');
        });
    }

    public function test_window_guard_skips_outside_hours(): void
    {
        $this->travelTo(now()->setTime(7, 0));

        Http::fake();

        $this->artisan('endpoints:refresh')->assertSuccessful();

        Http::assertNothingSent();

        $items = json_decode(file_get_contents($this->dataPath), true);
        $this->assertSame(['old' => true], $items[0]['response']);

        $this->travelBack();
    }

    public function test_force_runs_outside_window(): void
    {
        $this->travelTo(now()->setTime(7, 0));

        Http::fake([
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => ['fresh' => true]], 200),
        ]);

        $this->artisan('endpoints:refresh', ['--force' => true])->assertSuccessful();

        $items = json_decode(file_get_contents($this->dataPath), true);
        $this->assertSame(['fresh' => true], $items[0]['response']['data']);

        $this->travelBack();
    }

    public function test_missing_base_url_fails(): void
    {
        config(['novacity.base_url' => '']);

        Http::fake();

        $this->artisan('endpoints:refresh', ['--force' => true])->assertExitCode(1);

        Http::assertNothingSent();
    }

    public function test_admin_endpoints_use_jwt_from_login_response(): void
    {
        $this->withAdminEntry();

        Http::fake([
            'https://novacity.test/api/auth/prestataire/login' => Http::response(['success' => true, 'token' => 'jwt-abc', 'expiresIn' => '8h'], 200),
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => ['fresh' => true]], 200),
        ]);

        $this->artisan('endpoints:refresh', ['--force' => true])->assertSuccessful();

        Http::assertSent(fn ($request) => $request->url() === 'https://novacity.test/api/auth/prestataire/login'
            && $request->method() === 'POST');

        Http::assertSent(fn ($request) => $request->url() === 'https://novacity.test/api/admin/jobs'
            && $request->hasHeader('Authorization', 'Bearer jwt-abc'));

        Http::assertSent(fn ($request) => $request->url() === 'https://novacity.test/api/data/a?limit=100&offset=0'
            && ! $request->hasHeader('Authorization'));

        $this->assertSame('jwt-abc', Cache::get('endpoints:refresh:jwt'));
    }

    public function test_login_skipped_when_jwt_cached(): void
    {
        $this->withAdminEntry();
        Cache::put('endpoints:refresh:jwt', 'cached-jwt', now()->addHours(7));

        Http::fake([
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => ['fresh' => true]], 200),
        ]);

        $this->artisan('endpoints:refresh', ['--force' => true])->assertSuccessful();

        Http::assertNotSent(fn ($request) => str_contains($request->url(), '/login'));

        Http::assertSent(fn ($request) => $request->url() === 'https://novacity.test/api/admin/jobs'
            && $request->hasHeader('Authorization', 'Bearer cached-jwt'));
    }

    public function test_login_failure_falls_back_to_static_admin_token(): void
    {
        $this->withAdminEntry();
        config(['novacity.admin_token' => 'static-token']);

        Http::fake([
            'https://novacity.test/api/auth/prestataire/login' => Http::response(['success' => false, 'error' => 'unauthorized'], 401),
            'https://novacity.test/*' => Http::response(['success' => true, 'data' => ['fresh' => true]], 200),
        ]);

        $this->artisan('endpoints:refresh', ['--force' => true])->assertSuccessful();

        Http::assertSent(fn ($request) => $request->url() === 'https://novacity.test/api/admin/jobs'
            && $request->hasHeader('Authorization', 'Bearer static-token'));

        Http::assertSent(fn ($request) => $request->url() === 'https://novacity.test/api/data/a?limit=100&offset=0'
            && ! $request->hasHeader('Authorization'));

        $this->assertFalse(Cache::has('endpoints:refresh:jwt'));
    }
}
