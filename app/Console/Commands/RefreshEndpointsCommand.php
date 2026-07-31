<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class RefreshEndpointsCommand extends Command
{
    protected $signature = 'endpoints:refresh
        {--timeout=10 : Per-request timeout in seconds}
        {--dry-run : Fetch live data but do not write data.json}
        {--force : Run even outside the 08:00-21:59 window}';

    protected $description = 'Refresh status-200 endpoints in data.json in parallel from NOVACITY_BASE_URL';

    private const RETRY_KEY = 'endpoints:refresh:retry_pending';

    private const JWT_KEY = 'endpoints:refresh:jwt';

    private const LOCK_KEY = 'endpoints:refresh:lock';

    public function handle(): int
    {
        if (! $this->option('force') && ! $this->withinWindow()) {
            $this->info('Refresh only runs between 08:00 and 21:59 — use --force to override.');

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

        foreach ($items as $i => $item) {
            if ((int) ($item['status'] ?? -1) === 200) {
                $indexes[] = $i;
            }
        }

        if ($indexes === []) {
            $this->warn('No status-200 endpoints to refresh.');

            return self::SUCCESS;
        }

        $lock = Cache::lock(self::LOCK_KEY, 120);

        if (! $lock->get()) {
            $this->warn('Another endpoints:refresh run is already in progress — skipping.');

            return self::SUCCESS;
        }

        try {
            return $this->runRefresh($path, $items, $indexes);
        } finally {
            $lock->release();
        }
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
        return storage_path(config('novacity.data_file', 'app/public/data.json'));
    }

    private function backupPath(): string
    {
        return storage_path(config('novacity.data_backup', 'app/public/data.json.bak'));
    }

    private function metaPath(): string
    {
        return storage_path(config('novacity.refresh_meta', 'app/public/endpoints-refresh.json'));
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
     * @return array{ok: bool, data: mixed, error: ?string}
     */
    private function fetchResult(mixed $response): array
    {
        try {
            if ($response instanceof ConnectionException) {
                return ['ok' => false, 'data' => null, 'error' => $response->getMessage()];
            }

            if (! $response instanceof Response) {
                return ['ok' => false, 'data' => null, 'error' => 'No response returned for this endpoint'];
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
                    'error' => 'API success:false'.($detail ? ": {$detail}" : ''),
                ];
            }

            return ['ok' => true, 'data' => $decoded ?? $response->body(), 'error' => null];
        } catch (\Throwable $e) {
            return ['ok' => false, 'data' => null, 'error' => $e->getMessage()];
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
