<?php

namespace App\Console\Commands;

use App\Models\EndpointDataset;
use App\Models\EndpointDatasetVariant;
use App\Services\EndpointDatasetRegistry;
use App\Support\DatasetRows;
use App\Support\ParameterVariants;
use App\Support\RootCredentials;
use App\Support\RootParameters;
use App\Support\RootState;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SyncEndpointData extends Command
{
    protected $signature = 'sync:endpoint-data
        {--timeout=60 : Per-request timeout in seconds}
        {--phase=auto : auto|refresh|datasets|all|retry}
        {--retry=3 : Number of retries per endpoint request (0 = no retry; extra attempts only for 5xx / connection errors)}
        {--batch=15 : Legacy option (kept for compatibility) — all requests are now fired concurrently in a single pool}
        {--dry-run : Fetch live data but do not write data.json}
        {--force : Run even outside the 08:00-21:59 window}
        {--id= : Only refresh the endpoint with this id}
        {--root= : Only refresh endpoints whose stored URL uses this root (scheme://host[:port])}
        {--slug=* : datasets phase only — restrict to these dataset slugs (repeatable)}
        {--wave= : Internal wave id from sync:endpoint-data:dispatch (decrements the in-flight counter on exit)}';

    protected $description = 'Refresh the endpoint registry (data.json) and/or sync live rows into endpoint_datasets from NOVACITY_BASE_URL';

    private const RETRY_KEY = 'endpoints:refresh:retry_pending';

    private const RETRY_IDS_KEY = 'endpoints:refresh:retry_ids';

    private const JWT_KEY = 'endpoints:refresh:jwt';

    private const LOCK_KEY = 'endpoints:refresh:lock';

    private const DAILY_KEY = 'endpoints:refresh:last_daily_run';

    private const LAST_ATTEMPT_KEY = 'endpoints:refresh:last_attempt';

    public function handle(): int
    {
        set_time_limit(0);

        try {
            return $this->executeSync();
        } finally {
            $wave = trim((string) $this->option('wave'));

            if ($wave !== '') {
                $remaining = (int) Cache::decrement(SyncEndpointDataDispatch::INFLIGHT_KEY);
                if ($remaining < 0) {
                    Cache::set(SyncEndpointDataDispatch::INFLIGHT_KEY, 0);
                }
            }
        }
    }

    private function executeSync(): int
    {
        $phase = strtolower((string) $this->option('phase'));

        if (! in_array($phase, ['auto', 'refresh', 'datasets', 'all', 'retry'], true)) {
            $this->error("Unknown phase '{$phase}' (auto|refresh|datasets|all|retry).");

            return self::FAILURE;
        }

        $manual = (bool) $this->option('force') || $this->option('id') !== ''
            || $this->option('root') !== '' || $phase !== 'auto';

        $runRefresh = match ($phase) {
            'refresh', 'all', 'retry' => true,
            'auto' => $manual || $this->refreshDue() !== false,
            default => false,
        };

        $runDatasets = match ($phase) {
            'refresh', 'retry' => false,
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

        $phase = strtolower((string) $this->option('phase'));
        $onlyId = (string) $this->option('id');
        $onlyRoot = rtrim((string) $this->option('root'), '/');

        // Retry-only pass: only endpoints currently flagged as retryable
        // (5xx or connection/timeout failure) are re-fetched.
        $retryOnly = $onlyId === ''
            && $onlyRoot === ''
            && ($phase === 'retry' || ($phase === 'auto' && $this->refreshDue() === 'retry'));

        $pendingIds = $retryOnly ? $this->pendingRetryIds() : [];

        foreach ($items as $i => $item) {
            // Disabled endpoints are intentionally out of the sweep: they must
            // not be re-fetched nor have their status/response rewritten until
            // re-enabled from the endpoints admin page. A disabled root disables
            // every endpoint sharing it.
            if (RootState::isDisabled($item)) {
                continue;
            }

            if ($onlyId !== '') {
                if ((string) ($item['id'] ?? '') === $onlyId) {
                    $indexes[] = $i;
                    break;
                }

                continue;
            }

            if ($onlyRoot !== '') {
                if (strtolower($this->rootOf((string) ($item['endpoint'] ?? ''))) === strtolower($onlyRoot)) {
                    $indexes[] = $i;
                }

                continue;
            }

            if ($retryOnly) {
                if (in_array((string) ($item['id'] ?? ''), $pendingIds, true)) {
                    $indexes[] = $i;
                }

                continue;
            }

            $indexes[] = $i;
        }

        if ($onlyId !== '' && $indexes === []) {
            $this->error("No endpoint found with id {$onlyId}.");

            return self::FAILURE;
        }

        if ($onlyRoot !== '' && $indexes === []) {
            $this->error("No endpoint found with root {$onlyRoot}.");

            return self::FAILURE;
        }

        if ($indexes === []) {
            if ($retryOnly) {
                $this->info('No endpoints pending retry.');

                return self::SUCCESS;
            }

            $this->warn('No endpoints to refresh.');

            return self::SUCCESS;
        }

        return $this->runRefresh($path, $items, $indexes);
    }

    private function runRefresh(string $path, array $items, array $indexes): int
    {
        $baseUrl = rtrim((string) config('novacity.base_url', ''), '/');
        $staticToken = (string) config('novacity.admin_token');
        $timeout = max(1, (int) $this->option('timeout'));
        $connectTimeout = max(1, (int) config('novacity.connect_timeout', 15));
        $retries = max(0, (int) $this->option('retry'));
        $dryRun = (bool) $this->option('dry-run');

        $urlByIndex = [];
        $rootByIndex = [];
        $adminRoots = [];

        foreach ($indexes as $index) {
            $urlByIndex[$index] = $this->buildUrl($baseUrl, (string) ($items[$index]['endpoint'] ?? ''));
            $rootByIndex[$index] = $this->rootOf((string) ($items[$index]['endpoint'] ?? ''), $baseUrl);

            if (str_contains(strtolower((string) ($items[$index]['endpoint'] ?? '')), '/api/admin/')) {
                $adminRoots[$rootByIndex[$index]] = true;
            }
        }

        // Every distinct root in the selection gets its own optional x-api-key
        // so data requests always target the correct credentials. Only roots
        // hosting admin endpoints additionally get a cached JWT.
        $jwtByRoot = [];
        $apiKeyByRoot = [];

        foreach (array_unique($rootByIndex) as $root) {
            if ($root === '') {
                continue;
            }

            $apiKeyByRoot[$root] = RootCredentials::apiKeyFor($root);
        }

        foreach (array_keys($adminRoots) as $root) {
            $jwtByRoot[$root] = $this->obtainJwt($root, $apiKeyByRoot[$root] ?? RootCredentials::apiKeyFor($root), $timeout);
        }

        $start = microtime(true);
        $this->info('Refreshing '.count($indexes).' endpoint(s) from '.$baseUrl.($dryRun ? ' [dry-run]' : '').' ...');

        $retryWhen = function (mixed $exception): bool {
            if ($exception instanceof ConnectionException) {
                return true;
            }

            return $exception instanceof RequestException
                && $exception->response !== null
                && $exception->response->status() >= 500;
        };

        // One pool, every endpoint in parallel. cron ticks can overlap freely:
        // there is no mutex, so a run still launching its requests never blocks
        // the next minute's run from doing the same.
        $responses = Http::pool(function (Pool $pool) use ($items, $indexes, $urlByIndex, $rootByIndex, $jwtByRoot, $apiKeyByRoot, $staticToken, $timeout, $connectTimeout, $retries, $retryWhen) {
            foreach ($indexes as $index) {
                $isAdmin = str_contains(strtolower((string) ($items[$index]['endpoint'] ?? '')), '/api/admin/');
                $jwt = $jwtByRoot[$rootByIndex[$index]] ?? null;
                $auth = $isAdmin && $jwt !== null ? $jwt : ($isAdmin ? $staticToken : null);
                $apiKey = $apiKeyByRoot[$rootByIndex[$index]] ?? (string) config('novacity.api_key');

                $headers = [
                    'x-api-key' => $apiKey,
                    'Accept' => 'application/json',
                ];

                if ($auth !== null && $auth !== '') {
                    $headers['Authorization'] = 'Bearer '.$auth;
                }

                $request = $pool->as((string) $index)
                    ->withHeaders($headers)
                    ->timeout($timeout)
                    ->connectTimeout($connectTimeout)
                    ->retry($retries + 1, 500, $retryWhen);

                if (strtoupper((string) ($items[$index]['method'] ?? 'GET')) === 'POST') {
                    $request->post($urlByIndex[$index]);
                } else {
                    $request->get($urlByIndex[$index]);
                }
            }
        });

        $ok = 0;
        $failed = [];
        $okIndexes = [];
        $now = now()->toIso8601String();

        foreach ($indexes as $index) {
            $result = $this->fetchResult($responses[(string) $index] ?? null);
            $items[$index]['checked_at'] = $now;

            if ($result['ok']) {
                $items[$index]['status'] = 200;
                $items[$index]['response'] = $result['data'];
                $items[$index]['last_ok_at'] = $now;
                $items[$index]['last_error'] = null;
                $items[$index]['consecutive_failures'] = 0;
                $ok++;
                $okIndexes[] = $index;
            } else {
                $status = $result['status'];
                $items[$index]['last_error'] = mb_substr((string) $result['error'], 0, 500);
                $items[$index]['last_error_at'] = $now;
                $items[$index]['status'] = $status ?? 500;
                $items[$index]['consecutive_failures'] = (int) ($items[$index]['consecutive_failures'] ?? 0) + 1;
                $failed[] = [
                    'index' => $index,
                    'id' => (string) ($items[$index]['id'] ?? ''),
                    'name' => (string) ($items[$index]['name'] ?? ''),
                    'endpoint' => $urlByIndex[$index],
                    'error' => $result['error'],
                    'status' => $status,
                ];
            }
        }

        $elapsed = round(microtime(true) - $start, 2);
        $skipped = count($items) - count($indexes);
        $pending = $this->reconcileRetryState($items, $failed, $now);

        if (! $dryRun) {
            $this->persistRetryState($pending);

            $savedData = $this->saveItems($path, $items);
            $savedMeta = $this->saveMeta([
                'last_run_at' => $now,
                'last_run_duration_s' => $elapsed,
                'ok' => $ok,
                'failed' => count($failed),
                'skipped' => $skipped,
                'retry_pending' => $pending !== [],
                'retry_pending_count' => count($pending),
            ]);

            if (! $savedData || ! $savedMeta) {
                $this->error('Failed to write data.json or refresh metadata.');

                return self::FAILURE;
            }

            Cache::put(self::DAILY_KEY, now()->toDateString(), now()->endOfDay());
            Cache::put(self::LAST_ATTEMPT_KEY, time(), now()->addHours(6));

            foreach ($okIndexes as $index) {
                $this->syncDatasetEntry($items[$index]);
            }

            foreach ($failed as $failure) {
                $this->markDatasetError($items[$failure['index']], (string) $failure['error']);
            }

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
            $this->warn('No endpoint succeeded — retryable failures are armed for the next scheduled run.');
        } elseif ($pending !== []) {
            $this->warn(count($pending).' retryable endpoint(s) (5xx/timeout) will be retried on the next scheduled run.');
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

        $endpoints = $registry->eligibleItems();

        if ($endpoints === []) {
            $this->warn('No eligible endpoints found in data.json.');

            return self::SUCCESS;
        }

        $endpoints = array_values(array_map(
            fn (array $item): array => $registry->entryMeta($item) ?? [],
            $endpoints
        ));

        $endpoints = array_values(array_filter(
            $endpoints,
            fn (array $ep): bool => isset($ep['slug']) && $ep['slug'] !== ''
        ));

        $onlySlugs = array_values(array_filter(
            array_map('strval', (array) $this->option('slug')),
            static fn (string $s): bool => $s !== ''
        ));

        if ($onlySlugs !== []) {
            $endpoints = array_values(array_filter(
                $endpoints,
                fn (array $ep): bool => in_array((string) $ep['slug'], $onlySlugs, true)
            ));

            if ($endpoints === []) {
                $this->error('No endpoint found with slug '.implode(', ', $onlySlugs).'.');

                return self::FAILURE;
            }
        }

        $onlyRoot = strtolower(rtrim((string) $this->option('root'), '/'));

        if ($onlyRoot !== '') {
            $endpoints = array_values(array_filter(
                $endpoints,
                fn (array $ep): bool => strtolower($this->rootOf((string) ($ep['endpoint'] ?? ''), $baseUrl)) === $onlyRoot,
            ));

            if ($endpoints === []) {
                $this->error("No endpoint found with root {$onlyRoot}.");

                return self::FAILURE;
            }
        }

        $timeout = max(1, (int) $this->option('timeout'));
        $connectTimeout = max(1, (int) config('novacity.connect_timeout', 15));
        $retries = max(0, (int) $this->option('retry'));

        $urls = [];
        $apiKeys = [];
        $plan = [];

        foreach ($endpoints as $i => $ep) {
            $endpointUrl = (string) ($ep['endpoint'] ?? '');
            $root = $this->rootOf($endpointUrl, $baseUrl);
            $variants = ParameterVariants::expand($endpointUrl, RootParameters::forRoot($root));

            foreach ($variants as $variant) {
                $key = count($urls);
                $urls[$key] = $this->buildUrl($baseUrl, $variant['url']);
                $apiKeys[$key] = RootCredentials::apiKeyFor($root);
                $plan[$key] = ['index' => $i, 'variant' => $variant];
            }
        }

        $start = microtime(true);
        $this->info('Fetching '.count($plan).' request(s) for '.count($endpoints).' endpoint(s) from '.$baseUrl.' ...');

        $retryWhen = function (mixed $exception): bool {
            if ($exception instanceof ConnectionException) {
                return true;
            }

            return $exception instanceof RequestException
                && $exception->response !== null
                && $exception->response->status() >= 500;
        };

        // One pool, every request (endpoint × parameter value) in parallel.
        $responses = Http::pool(function (Pool $pool) use ($urls, $apiKeys, $timeout, $connectTimeout, $retries, $retryWhen) {
            foreach (array_keys($urls) as $key) {
                $pool->as((string) $key)
                    ->withHeaders([
                        'x-api-key' => $apiKeys[$key],
                        'Accept' => 'application/json',
                    ])
                    ->timeout($timeout)
                    ->connectTimeout($connectTimeout)
                    ->retry($retries + 1, 500, $retryWhen)
                    ->get($urls[$key]);
            }
        });

        $syncedAt = now();
        $ok = 0;
        $errors = 0;
        $responsesBySlug = [];

        foreach ($plan as $key => $entry) {
            $endpoint = $endpoints[$entry['index']];
            $variant = $entry['variant'];
            $slug = (string) ($endpoint['slug'] ?? '');
            $result = $this->fetchResult($responses[(string) $key] ?? null);
            $rows = $result['ok'] ? DatasetRows::extractRows($result['data']) : [];
            $columns = array_values(array_map('strval', (array) ($endpoint['columns'] ?? [])));

            // Freshly imported / column-less endpoints become datasets only when
            // the live response carries tabular data to derive columns from
            // (mirrors the registry's columnsFrom so structure and sync agree).
            if ($result['ok'] && $columns === []) {
                $columns = DatasetRows::columnsFrom($result['data']);
            }

            // Even column-less endpoints are registered so the dashboard
            // can show them (with empty data until a proper sync runs).
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
                $payload['columns'] = DatasetRows::buildColumns($columns, $rows);
                $payload['sample_data'] = $rows;
                $payload['row_count'] = count($rows);
            }

            if (($variant['params'] ?? []) === []) {
                // Default variant = the stored URL: keep endpoint_datasets and
                // the data.json patch exactly as before.
                EndpointDataset::upsert(
                    [$this->encodeUpsertJsonColumns(array_merge(['slug' => $slug], $payload), ['columns', 'sample_data'])],
                    ['slug'],
                    array_keys($payload),
                );

                if ($result['ok']) {
                    $responsesBySlug[$slug] = $result['data'];
                    $ok++;
                } else {
                    $errors++;
                    $this->warn(sprintf(
                        '  ✗ %s — %s (%s)',
                        $endpoint['name'],
                        mb_substr((string) $result['error'], 0, 160),
                        $urls[$key]
                    ));
                }
            } else {
                // Parameter variant: one stored snapshot per value so the page
                // builder can switch a dashboard parameter without re-fetching.
                $variantPayload = [
                    'params_hash' => EndpointDatasetVariant::hashParams($variant['params']),
                    'last_status' => $payload['last_status'],
                    'last_error' => $payload['last_error'],
                    'last_synced_at' => $payload['last_synced_at'],
                ];

                if ($result['ok']) {
                    $variantPayload['columns'] = DatasetRows::buildColumns($columns, $rows);
                    $variantPayload['sample_data'] = $rows;
                    $variantPayload['row_count'] = count($rows);
                }

                EndpointDatasetVariant::upsert(
                    [$this->encodeUpsertJsonColumns(array_merge(['slug' => $slug, 'params' => $variant['params']], $variantPayload), ['params', 'columns', 'sample_data'])],
                    ['slug', 'params_hash'],
                    array_keys($variantPayload),
                );

                if ($result['ok']) {
                    $ok++;
                } else {
                    $errors++;
                }
            }
        }

        $updatedJson = $this->patchDataJson($registry, $responsesBySlug);

        $elapsed = round(microtime(true) - $start, 2);
        $this->info("Done: {$ok} ok, {$errors} errors | {$elapsed}s");

        if ($updatedJson > 0) {
            $this->info("data.json refreshed for {$updatedJson} endpoint(s) (HTTP 200 only).");
        }

        return self::SUCCESS;
    }

    /**
     * Apply live dataset responses to data.json under the shared lock so the
     * per-root dataset workers never clobber each other's read-modify-write.
     */
    private function patchDataJson(EndpointDatasetRegistry $registry, array $responsesBySlug): int
    {
        $lock = Cache::lock(self::LOCK_KEY, 120);

        if (! $lock->block(90)) {
            $this->warn('Skipped data.json patch (another sync holds the lock).');

            return 0;
        }

        try {
            return $registry->applyLiveResponses($responsesBySlug);
        } finally {
            $lock->release();
        }
    }

    /**
     * Whether the scheduled registry refresh is due today.
     *
     *  - once per day at/after 08:00 → 'daily'
     *  - hourly retries while retryable endpoints (5xx/timeout) are pending
     *    and > 1h has passed since the last attempt → 'retry'
     *  - otherwise false
     */
    private function refreshDue(): string|false
    {
        if (! $this->withinWindow()) {
            return false;
        }

        if ((string) Cache::get(self::DAILY_KEY, '') !== now()->toDateString()) {
            return 'daily';
        }

        if ($this->pendingRetryIds() !== []
            && (time() - (int) Cache::get(self::LAST_ATTEMPT_KEY, 0)) >= 3600) {
            return 'retry';
        }

        return false;
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
     * Obtain a JWT for the given root, from the login response or the cache.
     */
    private function obtainJwt(string $baseUrl, string $apiKey, int $timeout): ?string
    {
        $cacheKey = self::JWT_KEY.':'.md5($baseUrl);

        $cached = Cache::get($cacheKey);

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

            Cache::put($cacheKey, $decoded['token'], now()->addHours(7));

            return $decoded['token'];
        } catch (\Throwable $e) {
            $this->warn('Novacity login error: '.$e->getMessage().' — admin endpoints will fall back to the static token.');

            return null;
        }
    }

    /**
     * Pending retryable endpoints (5xx or connection/timeout) keyed by id.
     *
     * @return array<int, array{id: string, name: string, status: ?int, attempts: int, last_attempt_at: string}>
     */
    private function pendingRetryState(): array
    {
        $state = Cache::get(self::RETRY_IDS_KEY, []);

        return is_array($state) ? $state : [];
    }

    /**
     * Ids of the endpoints currently pending retry.
     *
     * @return list<string>
     */
    private function pendingRetryIds(): array
    {
        return array_values(array_filter(
            array_map(
                fn ($entry): string => is_array($entry) ? (string) ($entry['id'] ?? '') : '',
                $this->pendingRetryState()
            ),
            static fn (string $id): bool => $id !== ''
        ));
    }

    /**
     * A failure is retryable when it is a connection/timeout error (no HTTP
     * status) or an HTTP 5xx. 4xx errors are permanent — retrying is useless.
     */
    private function isRetryableStatus(?int $status): bool
    {
        return $status === null || $status >= 500;
    }

    /**
     * Reconcile the pending-retry set after a refresh run: failed endpoints
     * that are retryable (5xx / connection error) are kept/added with a
     * bumped attempt count; every endpoint that this run fetched successfully
     * is dropped from the set.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<int, array{index: int, id: string, name: string, endpoint: string, error: string, status: ?int}>  $failed
     * @return array<int, array{id: string, name: string, status: ?int, attempts: int, last_attempt_at: string}>
     */
    private function reconcileRetryState(array $items, array $failed, string $now): array
    {
        $state = [];

        foreach ($this->pendingRetryState() as $entry) {
            if (is_array($entry) && ($entry['id'] ?? '') !== '') {
                $state[(string) $entry['id']] = $entry;
            }
        }

        foreach ($failed as $failure) {
            $id = $failure['id'];

            if ($id === '' || ! $this->isRetryableStatus($failure['status'])) {
                continue;
            }

            $state[$id] = [
                'id' => $id,
                'name' => $failure['name'],
                'status' => $failure['status'],
                'attempts' => (int) ($state[$id]['attempts'] ?? 0) + 1,
                'last_attempt_at' => $now,
            ];
        }

        // Any endpoint this run fetched successfully leaves the retry set.
        $okIds = [];

        foreach ($items as $item) {
            if (is_array($item) && (int) ($item['status'] ?? 0) === 200) {
                $okIds[(string) ($item['id'] ?? '')] = true;
            }
        }

        if ($okIds !== []) {
            $state = array_filter(
                $state,
                static fn (array $entry): bool => ! isset($okIds[$entry['id']])
            );
        }

        return array_values($state);
    }

    /**
     * Persist the pending-retry set (and the legacy all-or-nothing flag).
     */
    private function persistRetryState(array $pending): void
    {
        Cache::put(self::RETRY_IDS_KEY, $pending, now()->endOfDay());
        Cache::put(self::RETRY_KEY, $pending !== [], now()->endOfDay());
    }

    /**
     * Upsert the endpoint_datasets row for a single refreshed item so the
     * builder / measure wizard see fresh rows without waiting for the next
     * dataset-phase sync.
     */
    private function syncDatasetEntry(array $item): void
    {
        $registry = app(EndpointDatasetRegistry::class);
        $slug = $registry->slugOf((string) ($item['endpoint'] ?? ''));

        if ($slug === '') {
            return;
        }

        $entry = $registry->buildEntry($item);

        if ($entry === null) {
            EndpointDataset::where('slug', $slug)->delete();

            return;
        }

        $rows = DatasetRows::extractRows($item['response'] ?? null);

        EndpointDataset::updateOrCreate(
            ['slug' => $slug],
            [
                'name' => (string) $entry['name'],
                'label' => $entry['label'],
                'object' => $entry['object'],
                'object_type' => $entry['object_type'],
                'source' => (string) $entry['source'],
                'method' => 'GET',
                'columns' => DatasetRows::buildColumns((array) $entry['columns'], $rows),
                'sample_data' => $rows,
                'row_count' => count($rows),
                'last_status' => 'ok',
                'last_error' => null,
                'last_synced_at' => now(),
            ],
        );
    }

    /**
     * Mark a failed endpoint's dataset row as errored so the builder sees a
     * fresh failure state on the next sync, while keeping the last-known-good
     * columns/sample_data intact (only the status, error and sync timestamp
     * are rewritten). Rows for endpoints that never became datasets (POST,
     * auth/admin, or columnless) are left untouched.
     */
    private function markDatasetError(array $item, string $error): void
    {
        $registry = app(EndpointDatasetRegistry::class);
        $slug = $registry->slugOf((string) ($item['endpoint'] ?? ''));

        if ($slug === '' || ! $registry->eligible($item)) {
            return;
        }

        EndpointDataset::where('slug', $slug)->update([
            'last_status' => 'error',
            'last_error' => mb_substr($error, 0, 2000),
            'last_synced_at' => now(),
        ]);
    }

    private function dataPath(): string
    {
        return storage_path((string) config('novacity.data_file', 'app/private/data.json'));
    }

    private function metaPath(): string
    {
        return storage_path((string) config('novacity.refresh_meta', 'app/private/endpoints-refresh.json'));
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
            'consecutive_failures' => 0,
        ], $item);
    }

    /**
     * Extract the root (scheme://host[:port]) of a URL, falling back to the
     * given default root when the URL carries no scheme/host.
     */
    private function rootOf(string $url, string $default = ''): string
    {
        $parts = parse_url($url);

        if (isset($parts['scheme'], $parts['host'])) {
            $root = $parts['scheme'].'://'.$parts['host'];

            if (isset($parts['port'])) {
                $root .= ':'.$parts['port'];
            }

            return $root;
        }

        return rtrim($default, '/');
    }

    /**
     * Rebuild the live URL from the base URL + stored path + preserved query.
     *
     * When the stored endpoint is already an absolute URL (it has its own
     * root/host), that host is honored so endpoints on other roots refresh
     * against the right server; otherwise the path is joined to the default.
     */
    private function buildUrl(string $baseUrl, string $endpoint): string
    {
        $parts = parse_url($endpoint);

        if (isset($parts['scheme'], $parts['host'])) {
            return $endpoint;
        }

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

            if ($response instanceof RequestException) {
                $response = $response->response;
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

    /**
     * Model upsert bypasses casts, so JSON-typed columns must be encoded
     * explicitly before binding. Lists the affected column names by table.
     */
    private function encodeUpsertJsonColumns(array $values, array $jsonColumns): array
    {
        foreach ($jsonColumns as $column) {
            if (array_key_exists($column, $values) && is_array($values[$column])) {
                $values[$column] = json_encode($values[$column]);
            }
        }

        return $values;
    }
}
