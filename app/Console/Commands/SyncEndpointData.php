<?php

namespace App\Console\Commands;

use App\Models\EndpointDataset;
use App\Services\EndpointDatasetRegistry;
use App\Support\DatasetRows;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SyncEndpointData extends Command
{
    protected $signature = 'sync:endpoint-data
        {--timeout=60 : Per-request timeout in seconds}
        {--phase=auto : auto|refresh|datasets|all}
        {--dry-run : Fetch live data but do not write data.json}
        {--force : Run even outside the 08:00-21:59 window}
        {--id= : Only refresh the endpoint with this id}';

    protected $description = 'Refresh the endpoint registry (data.json) and/or sync live rows into endpoint_datasets from NOVACITY_BASE_URL';

    private const RETRY_KEY = 'endpoints:refresh:retry_pending';

    private const JWT_KEY = 'endpoints:refresh:jwt';

    private const LOCK_KEY = 'endpoints:refresh:lock';

    private const DAILY_KEY = 'endpoints:refresh:last_daily_run';

    private const LAST_ATTEMPT_KEY = 'endpoints:refresh:last_attempt';

    public function handle(): int
    {
        set_time_limit(0);

        $phase = strtolower((string) $this->option('phase'));

        if (! in_array($phase, ['auto', 'refresh', 'datasets', 'all'], true)) {
            $this->error("Unknown phase '{$phase}' (auto|refresh|datasets|all).");

            return self::FAILURE;
        }

        $manual = (bool) $this->option('force') || $this->option('id') !== '';

        $runRefresh = match ($phase) {
            'refresh', 'all' => true,
            default => $manual || $this->refreshDue(),
        };

        $runDatasets = match ($phase) {
            'refresh' => false,
            default => ! ($phase === 'auto' && $manual),
        };

        $exit = self::SUCCESS;

        if ($runRefresh) {
            $exit = max($exit, $this->refreshRegistry());
        }

        if ($runDatasets) {
            $exit = max($exit, $this->syncDatasets());
        }

        return $exit;
    }

    /**
     * Registry refresh: fetch every endpoint in data.json in parallel and
     * persist status/response/error, plus the last-run metadata file.
     *
     * Mirrors the former `endpoints:refresh` command.
     */
    private function refreshRegistry(): int
    {
        if (! $this->option('force') && ! $this->withinWindow()) {
            $this->info('Registry refresh only runs between 08:00 and 21:59 — use --force to override.');

            return self::SUCCESS;
        }

        $baseUrl = rtrim((string) config('novacity.base_url', ''), '/');

        if ($baseUrl === '') {
            $this->error('NOVACITY_BASE_URL is not configured (config novacity.base_url).');

            return self::FAILURE;
        }

        $path = $this->dataPath();

        if (! file_exists($path)) {
            $this->error("data.json not found at {$path}.");

            return self::FAILURE;
        }

        $items = $this->loadItems($path);

        if ($items === null) {
            $this->error("data.json is invalid or empty at {$path}.");

            return self::FAILURE;
        }

        $indexes = [];

        $onlyId = (string) $this->option('id');

        foreach ($items as $i => $item) {
            if ($onlyId !== '') {
                if ((string) ($item['id'] ?? '') === $onlyId) {
                    $indexes[] = $i;
                    break;
                }

                continue;
            }

            $indexes[] = $i;
        }

        if ($onlyId !== '' && $indexes === []) {
            $this->error("No endpoint found with id {$onlyId}.");

            return self::FAILURE;
        }

        if ($indexes === []) {
            $this->warn('No endpoints to refresh.');

            return self::SUCCESS;
        }

        $lock = Cache::lock(self::LOCK_KEY, 120);

        if (! $lock->get()) {
            $this->warn('Another registry refresh run is already in progress — skipping.');

            return self::SUCCESS;
        }

        try {
            $exit = $this->runRefresh($path, $items, $indexes);
        } finally {
            $lock->release();
        }

        return $exit;
    }

    private function runRefresh(string $path, array $items, array $indexes): int
    {
        $baseUrl = rtrim((string) config('novacity.base_url', ''), '/');
        $apiKey = (string) config('novacity.api_key');
        $staticToken = (string) config('novacity.admin_token');
        $timeout = max(1, (int) $this->option('timeout'));
        $dryRun = (bool) $this->option('dry-run');

        $urls = array_map(
            fn ($i) => $this->buildUrl($baseUrl, (string) ($items[$i]['endpoint'] ?? '')),
            $indexes
        );

        $hasAdmin = false;

        foreach ($indexes as $index) {
            if (str_contains(strtolower((string) ($items[$index]['endpoint'] ?? '')), '/api/admin/')) {
                $hasAdmin = true;

                break;
            }
        }

        $jwt = $hasAdmin ? $this->obtainJwt($baseUrl, $apiKey, $timeout) : null;

        $start = microtime(true);
        $this->info('Refreshing '.count($indexes).' endpoint(s) from '.$baseUrl.($dryRun ? ' [dry-run]' : '').' ...');

        $responses = Http::pool(function (Pool $pool) use ($items, $indexes, $urls, $apiKey, $jwt, $staticToken, $timeout) {
            foreach ($indexes as $pos => $index) {
                $isAdmin = str_contains(strtolower((string) ($items[$index]['endpoint'] ?? '')), '/api/admin/');
                $auth = $isAdmin && $jwt !== null ? $jwt : ($isAdmin ? $staticToken : null);

                $headers = [
                    'x-api-key' => $apiKey,
                    'Accept' => 'application/json',
                ];

                if ($auth !== null && $auth !== '') {
                    $headers['Authorization'] = 'Bearer '.$auth;
                }

                $request = $pool->as((string) $index)
                    ->withHeaders($headers)
                    ->timeout($timeout);

                if (strtoupper((string) ($items[$index]['method'] ?? 'GET')) === 'POST') {
                    $request->post($urls[$pos]);
                } else {
                    $request->get($urls[$pos]);
                }
            }
        });

        $ok = 0;
        $failed = [];
        $now = now()->toIso8601String();

        foreach ($indexes as $pos => $index) {
            $result = $this->fetchResult($responses[(string) $index] ?? null);
            $items[$index]['checked_at'] = $now;

            if ($result['ok']) {
                $items[$index]['status'] = 200;
                $items[$index]['response'] = $result['data'];
                $items[$index]['last_ok_at'] = $now;
                $items[$index]['last_error'] = null;
                $ok++;
            } else {
                $items[$index]['last_error'] = mb_substr((string) $result['error'], 0, 500);
                $items[$index]['status'] = $result['status'] ?? 500;
                $failed[] = [
                    'name' => (string) ($items[$index]['name'] ?? ''),
                    'endpoint' => $urls[$pos],
                    'error' => $result['error'],
                ];
            }
        }

        $elapsed = round(microtime(true) - $start, 2);
        $skipped = count($items) - count($indexes);

        if (! $dryRun) {
            if ($ok === 0) {
                Cache::put(self::RETRY_KEY, true, now()->endOfDay());
            } else {
                Cache::forget(self::RETRY_KEY);
            }

            $savedData = $this->saveItems($path, $items);
            $savedMeta = $this->saveMeta([
                'last_run_at' => $now,
                'last_run_duration_s' => $elapsed,
                'ok' => $ok,
                'failed' => count($failed),
                'skipped' => $skipped,
                'retry_pending' => (bool) Cache::get(self::RETRY_KEY, false),
            ]);

            if (! $savedData || ! $savedMeta) {
                $this->error('Failed to write data.json or refresh metadata.');

                return self::FAILURE;
            }

            Cache::put(self::DAILY_KEY, now()->toDateString(), now()->endOfDay());
            Cache::put(self::LAST_ATTEMPT_KEY, time(), now()->addHours(6));

            app(EndpointDatasetRegistry::class)->forgetCache();
        }

        foreach ($failed as $failure) {
            $this->warn(sprintf(
                '  ✗ %s — %s (%s)',
                $failure['name'],
                mb_substr($failure['error'], 0, 160),
                $failure['endpoint']
            ));
        }

        $this->info(sprintf(
            'Done: %d ok, %d failed, %d skipped | %.1fs',
            $ok,
            count($failed),
            $skipped,
            $elapsed
        ));

        if ($ok === 0) {
            $this->warn('No endpoint succeeded — hourly retries are armed until a run succeeds or the day ends.');
        }

        return self::SUCCESS;
    }

    /**
     * Dataset snapshot sync: fetch every eligible GET endpoint in parallel and
     * upsert endpoint_datasets rows, then apply HTTP 200 responses to data.json.
     *
     * Mirrors the former `sync:endpoint-datasets` command.
     */
    private function syncDatasets(): int
    {
        $baseUrl = rtrim((string) config('novacity.base_url', ''), '/');

        if ($baseUrl === '') {
            $this->error('NOVACITY_BASE_URL is not configured (config novacity.base_url).');

            return self::FAILURE;
        }

        $registry = app(EndpointDatasetRegistry::class);
        $path = $registry->path();

        if (! file_exists($path)) {
            $this->error("data.json not found at {$path}.");

            return self::FAILURE;
        }

        $endpoints = $registry->endpoints();

        if ($endpoints === []) {
            $this->warn('No eligible endpoints found in data.json.');

            return self::SUCCESS;
        }

        $apiKey = (string) config('novacity.api_key');
        $timeout = max(1, (int) $this->option('timeout'));

        $urls = array_map(
            fn (array $ep): string => $this->buildUrl($baseUrl, (string) $ep['endpoint']),
            $endpoints
        );

        $start = microtime(true);
        $this->info('Fetching '.count($endpoints).' endpoint(s) from '.$baseUrl.' ...');

        $responses = Http::pool(function (Pool $pool) use ($endpoints, $urls, $apiKey, $timeout) {
            foreach ($endpoints as $i => $endpoint) {
                $pool->as((string) $i)
                    ->withHeaders([
                        'x-api-key' => $apiKey,
                        'Accept' => 'application/json',
                    ])
                    ->timeout($timeout)
                    ->get($urls[$i]);
            }
        });

        $syncedAt = now();
        $ok = 0;
        $errors = 0;
        $responsesBySlug = [];

        foreach ($endpoints as $i => $endpoint) {
            $result = $this->fetchResult($responses[(string) $i] ?? null);
            $rows = $result['ok'] ? DatasetRows::extractRows($result['data']) : [];

            $payload = [
                'name' => (string) $endpoint['name'],
                'label' => $endpoint['label'],
                'object' => $endpoint['object'],
                'object_type' => $endpoint['object_type'],
                'source' => (string) $endpoint['source'],
                'method' => 'GET',
                'last_status' => $result['ok'] ? 'ok' : 'error',
                'last_error' => $result['ok'] ? null : mb_substr((string) $result['error'], 0, 2000),
                'last_synced_at' => $syncedAt,
            ];

            // Keep the last-known-good snapshot (columns/rows) when a fetch
            // fails so registered endpoints stay usable in the builder.
            if ($result['ok']) {
                $payload['columns'] = DatasetRows::buildColumns((array) $endpoint['columns'], $rows);
                $payload['sample_data'] = $rows;
                $payload['row_count'] = count($rows);
            }

            EndpointDataset::updateOrCreate(
                ['slug' => (string) $endpoint['slug']],
                $payload,
            );

            if ($result['ok']) {
                $responsesBySlug[(string) $endpoint['slug']] = $result['data'];
                $ok++;
            } else {
                $errors++;
                $this->warn(sprintf(
                    '  ✗ %s — %s (%s)',
                    $endpoint['name'],
                    mb_substr((string) $result['error'], 0, 160),
                    $urls[$i]
                ));
            }
        }

        $updatedJson = $registry->applyLiveResponses($responsesBySlug);

        $elapsed = round(microtime(true) - $start, 2);
        $this->info("Done: {$ok} ok, {$errors} errors | {$elapsed}s");

        if ($updatedJson > 0) {
            $this->info("data.json refreshed for {$updatedJson} endpoint(s) (HTTP 200 only).");
        }

        return self::SUCCESS;
    }

    /**
     * Whether the scheduled registry refresh is due today.
     *
     * Replaces the former dailyAt(08:30) + hourly retry schedule entries:
     *  - once per day at/after 08:00
     *  - hourly retries while retry_pending is armed and > 1h since the last attempt
     */
    private function refreshDue(): bool
    {
        if (! $this->withinWindow()) {
            return false;
        }

        $lastDaily = (string) Cache::get(self::DAILY_KEY, '');

        if ($lastDaily !== now()->toDateString()) {
            return true;
        }

        if (! (bool) Cache::get(self::RETRY_KEY, false)) {
            return false;
        }

        return (time() - (int) Cache::get(self::LAST_ATTEMPT_KEY, 0)) >= 3600;
    }

    /**
     * Whether the current time (app timezone) is within 08:00-21:59.
     */
    private function withinWindow(): bool
    {
        $hour = (int) now()->format('G');

        return $hour >= 8 && $hour <= 21;
    }

    /**
     * Obtain a JWT for admin endpoints, from the login response or the cache.
     */
    private function obtainJwt(string $baseUrl, string $apiKey, int $timeout): ?string
    {
        $cached = Cache::get(self::JWT_KEY);

        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        $path = ltrim((string) config('novacity.login_path', '/api/auth/prestataire/login'), '/');
        $url = $path !== '' ? $baseUrl.'/'.$path : $baseUrl;

        try {
            $request = Http::withHeaders([
                'x-api-key' => $apiKey,
                'Accept' => 'application/json',
            ])->timeout($timeout);

            $payload = json_decode((string) config('novacity.login_payload', ''), true);

            $response = is_array($payload)
                ? $request->post($url, $payload)
                : $request->post($url);

            if (! $response->successful()) {
                $this->warn('Novacity login failed (HTTP '.$response->status().') — admin endpoints will fall back to the static token.');

                return null;
            }

            $decoded = $response->json();

            if (! is_array($decoded) || ! is_string($decoded['token'] ?? null) || $decoded['token'] === '') {
                $this->warn('Novacity login responded without a token — admin endpoints will fall back to the static token.');

                return null;
            }

            Cache::put(self::JWT_KEY, $decoded['token'], now()->addHours(7));

            return $decoded['token'];
        } catch (\Throwable $e) {
            $this->warn('Novacity login error: '.$e->getMessage().' — admin endpoints will fall back to the static token.');

            return null;
        }
    }

    private function dataPath(): string
    {
        return storage_path((string) config('novacity.data_file', 'app/private/data.json'));
    }

    private function backupPath(): string
    {
        return storage_path((string) config('novacity.data_backup', 'app/private/data.json.bak'));
    }

    private function metaPath(): string
    {
        return storage_path((string) config('novacity.refresh_meta', 'app/public/endpoints-refresh.json'));
    }

    /**
     * Load and decode data.json, normalizing entries (guaranteed id).
     */
    private function loadItems(string $path): ?array
    {
        $raw = file_get_contents($path);

        if ($raw === false) {
            return null;
        }

        $json = json_decode($raw, true);

        if (! is_array($json)) {
            return null;
        }

        $items = [];

        foreach ($json as $item) {
            if (is_array($item)) {
                $items[] = $this->normalizeItem($item);
            }
        }

        return $items;
    }

    private function normalizeItem(array $item): array
    {
        return array_merge([
            'id' => (string) Str::uuid(),
            'name' => '',
            'method' => 'GET',
            'endpoint' => '',
            'status' => 200,
            'response' => new \stdClass,
        ], $item);
    }

    /**
     * Rebuild the live URL from the base URL + stored path + preserved query.
     */
    private function buildUrl(string $baseUrl, string $endpoint): string
    {
        $parts = parse_url($endpoint);
        $path = isset($parts['path']) ? ltrim($parts['path'], '/') : '';
        $url = $path !== '' ? $baseUrl.'/'.$path : $baseUrl;

        if (isset($parts['query']) && $parts['query'] !== '') {
            $url .= '?'.$parts['query'];
        }

        return $url;
    }

    /**
     * Inspect a pool response: true on HTTP 200 + API success, else error message.
     *
     * @return array{ok: bool, data: mixed, error: ?string, status: ?int}
     */
    private function fetchResult(mixed $response): array
    {
        try {
            if ($response instanceof ConnectionException) {
                return ['ok' => false, 'data' => null, 'error' => $response->getMessage(), 'status' => null];
            }

            if (! $response instanceof Response) {
                return ['ok' => false, 'data' => null, 'error' => 'No response returned for this endpoint', 'status' => null];
            }

            if ($response->failed()) {
                $status = $response->status();
                $body = '';

                try {
                    $decoded = $response->json();
                    $body = is_array($decoded) ? json_encode($decoded) : (string) $decoded;
                } catch (\Throwable) {
                    $body = $response->body();
                }

                return [
                    'ok' => false,
                    'data' => null,
                    'status' => $status,
                    'error' => "HTTP {$status}".($body !== '' ? ': '.mb_substr($body, 0, 500) : ''),
                ];
            }

            $decoded = $response->json();

            if (is_array($decoded) && ($decoded['success'] ?? true) === false) {
                $detail = is_array($decoded['error'] ?? null)
                    ? json_encode($decoded['error'])
                    : ($decoded['error'] ?? $decoded['message'] ?? 'unknown');

                return [
                    'ok' => false,
                    'data' => null,
                    'status' => $response->status(),
                    'error' => 'API success:false'.($detail ? ": {$detail}" : ''),
                ];
            }

            return ['ok' => true, 'data' => $decoded ?? $response->body(), 'error' => null, 'status' => $response->status()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'data' => null, 'error' => $e->getMessage(), 'status' => null];
        }
    }

    /**
     * Persist entries atomically (temp file + rename), with a backup first.
     */
    private function saveItems(string $path, array $items): bool
    {
        $normalized = [];

        foreach (array_values($items) as $item) {
            if (is_array($item)) {
                $normalized[] = $this->normalizeItem($item);
            }
        }

        $json = json_encode($normalized, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            return false;
        }

        @copy($path, $this->backupPath());

        $tmp = $path.'.tmp.'.getmypid();

        if (file_put_contents($tmp, $json, LOCK_EX) === false) {
            @unlink($tmp);

            return false;
        }

        // rename() overwrites on Unix but may fail on Windows when the target exists.
        if (! @rename($tmp, $path)) {
            @unlink($path);
            if (! @rename($tmp, $path)) {
                @unlink($tmp);

                return false;
            }
        }

        return true;
    }

    /**
     * Persist the last-run summary atomically (temp file + rename).
     */
    private function saveMeta(array $meta): bool
    {
        $json = json_encode($meta, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            return false;
        }

        $path = $this->metaPath();

        @mkdir(dirname($path), 0755, true);

        $tmp = $path.'.tmp.'.getmypid();

        if (file_put_contents($tmp, $json, LOCK_EX) === false) {
            @unlink($tmp);

            return false;
        }

        if (! @rename($tmp, $path)) {
            @unlink($path);
            if (! @rename($tmp, $path)) {
                @unlink($tmp);

                return false;
            }
        }

        return true;
    }
}
