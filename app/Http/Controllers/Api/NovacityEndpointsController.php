<?php

namespace App\Http\Controllers\Api;

use App\Console\Commands\RunEndpointSync;
use App\Http\Controllers\Controller;
use App\Models\EndpointDataset;
use App\Services\EndpointDatasetRegistry;
use App\Support\DatasetRows;
use App\Support\DetachedProcess;
use App\Support\EndpointSchemaAnalyzer;
use App\Support\RootCredentials;
use App\Support\RootParameters;
use App\Support\RootState;
use App\Support\SyncStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class NovacityEndpointsController extends Controller
{
    /** @var array|null Cached parsed data.json — avoids re-reading 2.2MB file per request. */
    private static ?array $cachedItems = null;

    /** @var array|null Cached schema analysis (invalidated alongside items). */
    private static ?array $cachedSchema = null;

    /**
     * Invalidate the in-memory cache (used by tests and after file changes).
     */
    public static function flushCache(): void
    {
        self::$cachedItems = null;
        self::$cachedSchema = null;
        RootState::flushCache();
    }

    /**
     * Parse data.json (flat array format) and return endpoint map.
     */
    public function __invoke(): JsonResponse
    {
        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['endpoints' => [], 'error' => 'data.json not found or invalid'], 404);
        }

        $endpoints = [];

        foreach ($items as $item) {
            $slug = $this->extractSlug($item['endpoint'] ?? '');
            if ($slug === '') {
                continue;
            }

            $fields = $this->extractFields($item);

            $endpoints[$slug] = [
                'name' => $item['name'] ?? $slug,
                'method' => strtoupper($item['method'] ?? 'GET'),
                'fields' => $fields,
            ];
        }

        return response()->json(['endpoints' => $endpoints]);
    }

    /**
     * Return all endpoint records (slug + metadata + response) in one call.
     */
    public function allSamples(): JsonResponse
    {
        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['endpoints' => [], 'error' => 'data.json not found or invalid'], 404);
        }

        $result = [];

        foreach ($items as $item) {
            $slug = $this->extractSlug($item['endpoint'] ?? '');
            if ($slug === '') {
                continue;
            }

            $records = is_array($item['response']['data'] ?? null) ? $item['response']['data'] : [];

            $result[$slug] = [
                'name' => $item['name'] ?? $slug,
                'method' => strtoupper($item['method'] ?? 'GET'),
                'endpoint' => $item['endpoint'] ?? '',
                'status' => $item['status'] ?? null,
                'fields' => $this->extractFields($item),
                'response' => $records,
            ];
        }

        return response()->json(['endpoints' => $result]);
    }

    /**
     * Return sample response data for a given endpoint slug.
     */
    public function sample(string $slug): JsonResponse
    {
        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['data' => null, 'error' => 'data.json not found or invalid'], 404);
        }

        foreach ($items as $item) {
            if ($this->extractSlug($item['endpoint'] ?? '') === $slug) {
                return response()->json(['data' => $item['response'] ?? null]);
            }
        }

        return response()->json(['data' => null, 'error' => 'No sample data for this endpoint']);
    }

    /**
     * Health snapshot for the endpoint registry: stats, last-run metadata, retry state.
     */
    public function health(): JsonResponse
    {
        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['success' => false, 'error' => 'data.json not found or invalid'], 404);
        }

        $meta = $this->loadRefreshMeta();
        $retryState = $this->loadRefreshRetry();

        return response()->json([
            'stats' => $this->summaries($items),
            'meta' => $meta,
            'retry_pending' => (bool) Cache::get('endpoints:refresh:retry_pending', false),
            'retry_pending_count' => count($retryState),
            'retry_ids' => array_values(array_slice($retryState, 0, 200)),
            'running' => RunEndpointSync::isActuallyRunning(),
            'running_since' => Cache::get(RunEndpointSync::RUNNING_KEY),
            'sync' => SyncStatus::payload(),
        ]);
    }

    /**
     * Launch the full registry + dataset sync in a detached background
     * process and return immediately. The web request never blocks on the
     * 200-endpoint sweep (which exceeds the 60s browser/client timeout), so
     * the UI polls /health via the `endpoints:refresh:running` flag. A stale
     * flag (dead worker PID) is self-healed instead of blocking the button.
     */
    public function refresh(): JsonResponse
    {
        if (RunEndpointSync::isActuallyRunning()) {
            return response()->json([
                'success' => true,
                'queued' => false,
                'running' => true,
                'reason' => 'already_running',
            ]);
        }

        $log = storage_path('logs/endpoint-sync-manual.log');

        // Clear any stale flag BEFORE spawning: doing it after would race with
        // the worker publishing its own PID and wipe it, wedging isActuallyRunning().
        RunEndpointSync::clearStale();

        DetachedProcess::spawn($log, ['endpoint-sync:run']);

        Cache::put(
            RunEndpointSync::RUNNING_KEY,
            now()->toIso8601String(),
            now()->addHours(2),
        );

        return response()->json([
            'success' => true,
            'queued' => true,
            'running' => true,
        ]);
    }

    /**
     * Run the registry refresh phase of sync:endpoint-data for a single
     * endpoint (by id) and return its summary.
     */
    public function refreshOne(string $id): JsonResponse
    {
        if ($this->findById($id) === null) {
            return response()->json([
                'success' => false,
                'error' => "No endpoint found with id {$id}",
            ], 404);
        }

        $exitCode = Artisan::call('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--timeout' => (int) config('novacity.web_timeout', 20),
            '--id' => $id,
        ]);

        self::flushCache();

        return response()->json([
            'success' => $exitCode === 0,
            'exit_code' => $exitCode,
            'output' => Artisan::output(),
            'meta' => $this->loadRefreshMeta(),
            'entry' => $this->summarizeItem($this->findById($id) ?? []),
        ]);
    }

    /**
     * Run the registry refresh phase of sync:endpoint-data for every endpoint
     * sharing a root and return the refreshed summary.
     */
    public function refreshGroup(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'root' => 'required|string|url|max:1000',
        ]);

        $root = rtrim($validated['root'], '/');

        if (RootState::isRootDisabled($root)) {
            return response()->json([
                'success' => false,
                'exit_code' => 1,
                'error' => 'Racine désactivée — réactivez-la pour rafraîchir',
            ], 400);
        }

        $exitCode = Artisan::call('sync:endpoint-data', [
            '--phase' => 'refresh',
            '--force' => true,
            '--timeout' => (int) config('novacity.web_timeout', 20),
            '--root' => $root,
        ]);

        self::flushCache();

        $retryState = $this->loadRefreshRetry();

        return response()->json([
            'success' => $exitCode === 0,
            'exit_code' => $exitCode,
            'output' => Artisan::output(),
            'meta' => $this->loadRefreshMeta(),
            'retry_pending_count' => count($retryState),
            'retry_ids' => array_values(array_slice($retryState, 0, 200)),
        ]);
    }

    /**
     * Re-fetch only the endpoints currently flagged as retryable (5xx /
     * connection errors) via the sync command's retry phase, then return the
     * refreshed summary.
     */
    public function retryFailed(): JsonResponse
    {
        $pending = $this->loadRefreshRetry();

        if ($pending === []) {
            return response()->json([
                'success' => true,
                'exit_code' => 0,
                'output' => 'No endpoints pending retry.',
                'meta' => $this->loadRefreshMeta(),
                'retry_pending_count' => 0,
                'retry_ids' => [],
            ]);
        }

        $exitCode = Artisan::call('sync:endpoint-data', [
            '--phase' => 'retry',
            '--force' => true,
            '--timeout' => (int) config('novacity.web_timeout', 20),
        ]);

        self::flushCache();

        $remaining = $this->loadRefreshRetry();

        return response()->json([
            'success' => $exitCode === 0,
            'exit_code' => $exitCode,
            'output' => Artisan::output(),
            'meta' => $this->loadRefreshMeta(),
            'retry_pending_count' => count($remaining),
            'retry_ids' => array_values(array_slice($remaining, 0, 200)),
        ]);
    }

    /**
     * Rewrite every endpoint that uses the given (old) root so it points at the
     * new root. Endpoints with a custom/different root are left untouched.
     */
    public function rewriteRoot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'old_root' => 'required|string|max:1000',
            'new_root' => 'required|string|max:1000',
        ]);

        $normalized = static fn (string $value): string => rtrim(trim($value), '/');
        $oldRoot = $normalized($validated['old_root']);
        $newRoot = $normalized($validated['new_root']);

        if ($oldRoot === '' || $newRoot === '' || $oldRoot === $newRoot) {
            return response()->json(['success' => true, 'changed' => 0]);
        }

        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['success' => false, 'error' => 'data.json not found or invalid'], 404);
        }

        $changed = 0;

        foreach ($items as $index => $item) {
            $endpoint = (string) ($item['endpoint'] ?? '');
            $normalizedEndpoint = rtrim($endpoint, '/');

            $matches = $normalizedEndpoint === $oldRoot || str_starts_with($normalizedEndpoint, $oldRoot.'/');

            if (! $matches) {
                continue;
            }

            $suffix = substr($endpoint, strlen($oldRoot));
            $items[$index]['endpoint'] = $newRoot.$suffix;
            $changed++;
        }

        if ($changed > 0 && ! $this->persistItems($items)) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
        }

        // Migrate any stored per-root API key so the rename keeps credentials.
        $credentials = RootCredentials::load();

        if (isset($credentials[$oldRoot])) {
            $entry = $credentials[$oldRoot];
            unset($credentials[$oldRoot]);
            $credentials[$newRoot] = $entry;
            RootCredentials::saveAll($credentials);
        }

        $this->invalidateDatasetCaches();

        return response()->json(['success' => true, 'changed' => $changed]);
    }

    /**
     * Read the pending-retry set from cache (id/name/status/attempts records).
     */
    private function loadRefreshRetry(): array
    {
        $state = Cache::get('endpoints:refresh:retry_ids', []);

        return is_array($state) ? $state : [];
    }

    /**
     * Read the last-run metadata file (endpoints-refresh.json), or null when absent.
     */
    private function loadRefreshMeta(): ?array
    {
        $path = storage_path(config('novacity.refresh_meta', 'app/private/endpoints-refresh.json'));

        if (! file_exists($path)) {
            return null;
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            return null;
        }

        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Paginated, filtered list of lightweight endpoint summaries (no response rows).
     */
    public function index(Request $request): JsonResponse
    {
        $items = $this->loadItems();

        if ($items === null) {
            return response()->json([
                'items' => [], 'total' => 0, 'page' => 1, 'per_page' => 50,
                'stats' => $this->summaries([]), 'error' => 'data.json not found or invalid',
            ], 404);
        }

        $search = strtolower(trim((string) $request->query('search', '')));
        $method = strtoupper(trim((string) $request->query('method', '')));
        $status = $request->query('status');
        $statusGroup = strtolower(trim((string) $request->query('status_group', '')));
        $source = strtolower(trim((string) $request->query('source', '')));
        $root = rtrim(trim((string) $request->query('root', '')), '/');
        $enabled = strtolower(trim((string) $request->query('enabled', '1')));

        $filtered = array_values(array_filter($items, function ($item) use ($search, $method, $status, $statusGroup, $source, $root, $enabled) {
            if ($enabled === '1' && RootState::isDisabled($item)) {
                return false;
            }
            if ($enabled === '0' && ! RootState::isDisabled($item)) {
                return false;
            }
            if ($search !== '') {
                $haystack = strtolower(
                    ($item['name'] ?? '').' '.($item['endpoint'] ?? '').' '.$this->detectSource($item)
                );
                if (! str_contains($haystack, $search)) {
                    return false;
                }
            }
            if ($method !== '' && strtoupper($item['method'] ?? 'GET') !== $method) {
                return false;
            }
            if ($root !== '' && strtolower($this->rootOf($item['endpoint'] ?? '')) !== strtolower($root)) {
                return false;
            }
            $itemStatus = (int) ($item['status'] ?? -1);
            if ($status !== null && $status !== '' && $itemStatus !== (int) $status) {
                return false;
            }
            if ($statusGroup !== '') {
                $inGroup = match ($statusGroup) {
                    'ok' => $itemStatus >= 200 && $itemStatus < 300,
                    'warn' => $itemStatus >= 300 && $itemStatus < 500,
                    'error' => $itemStatus >= 500,
                    default => true,
                };
                if (! $inGroup) {
                    return false;
                }
            }
            if ($source !== '' && strtolower($this->detectSource($item)) !== $source) {
                return false;
            }

            return true;
        }));

        $total = count($filtered);
        $perPage = max(1, min(500, (int) $request->query('per_page', 50)));
        $page = max(1, (int) $request->query('page', 1));
        $offset = ($page - 1) * $perPage;

        $paginated = array_map(
            fn ($item) => $this->summarizeItem($item),
            array_slice($filtered, $offset, $perPage)
        );

        return response()->json([
            'items' => $paginated,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'stats' => $this->summaries($items),
        ]);
    }

    /**
     * Get a single full entry (metadata + response) by id.
     */
    public function show(string $id): JsonResponse
    {
        $item = $this->findById($id);

        if ($item === null) {
            return response()->json(['success' => false, 'error' => 'Entry not found'], 404);
        }

        return response()->json(['entry' => $item]);
    }

    /**
     * Create a new entry and persist it.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'method' => 'required|string|in:GET,POST',
            'endpoint' => 'required|string|url|max:1000',
            'status' => 'required|integer|between:100,599',
            'response' => 'present',
            'disabled' => 'sometimes|boolean',
        ]);

        $items = $this->loadItems();

        if ($items === null) {
            $items = [];
        }

        $entry = $this->normalizeItem([
            'name' => $validated['name'],
            'method' => strtoupper($validated['method']),
            'endpoint' => $validated['endpoint'],
            'status' => (int) $validated['status'],
            'response' => $request->input('response'),
            'disabled' => $request->boolean('disabled', false),
        ]);

        $items[] = $entry;

        if (! $this->persistItems($items)) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
        }

        $this->syncDatasetEntry($entry);

        return response()->json(['success' => true, 'entry' => $entry], 201);
    }

    /**
     * Update an existing entry (partial or full).
     */
    public function update(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'method' => 'sometimes|required|string|in:GET,POST',
            'endpoint' => 'sometimes|required|string|url|max:1000',
            'status' => 'sometimes|required|integer|between:100,599',
            'response' => 'sometimes',
            'disabled' => 'sometimes|boolean',
        ]);

        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['success' => false, 'error' => 'data.json not found or invalid'], 404);
        }

        $index = $this->findIndexById($items, $id);

        if ($index === null) {
            return response()->json(['success' => false, 'error' => 'Entry not found'], 404);
        }

        $entry = $items[$index];
        $oldSlug = app(EndpointDatasetRegistry::class)->slugOf((string) ($entry['endpoint'] ?? ''));

        foreach (['name', 'method', 'endpoint', 'status'] as $key) {
            if (array_key_exists($key, $validated)) {
                $entry[$key] = $key === 'status' ? (int) $validated[$key] : $validated[$key];
            }
        }

        if ($request->exists('disabled')) {
            $entry['disabled'] = $request->boolean('disabled');
        }

        if ($request->exists('response')) {
            $entry['response'] = $request->input('response');
        }

        $entry['method'] = strtoupper($entry['method'] ?? 'GET');

        $items[$index] = $entry;

        if (! $this->persistItems($items)) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
        }

        $this->syncDatasetEntry($entry);

        $newSlug = app(EndpointDatasetRegistry::class)->slugOf((string) ($entry['endpoint'] ?? ''));
        if ($oldSlug !== '' && $oldSlug !== $newSlug) {
            EndpointDataset::where('slug', $oldSlug)->delete();
        }

        return response()->json(['success' => true, 'entry' => $entry]);
    }

    /**
     * Delete an entry by id.
     */
    public function destroy(string $id): JsonResponse
    {
        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['success' => false, 'error' => 'data.json not found or invalid'], 404);
        }

        $index = $this->findIndexById($items, $id);

        if ($index === null) {
            return response()->json(['success' => false, 'error' => 'Entry not found'], 404);
        }

        $slug = app(EndpointDatasetRegistry::class)->slugOf((string) ($items[$index]['endpoint'] ?? ''));

        unset($items[$index]);

        if (! $this->persistItems(array_values($items))) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
        }

        $this->invalidateDatasetCaches();

        if ($slug !== '') {
            EndpointDataset::where('slug', $slug)->delete();
        }

        return response()->json(['success' => true]);
    }

    /**
     * Duplicate an entry (new id, placed right after the original).
     */
    public function duplicate(string $id): JsonResponse
    {
        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['success' => false, 'error' => 'data.json not found or invalid'], 404);
        }

        $index = $this->findIndexById($items, $id);

        if ($index === null) {
            return response()->json(['success' => false, 'error' => 'Entry not found'], 404);
        }

        $copy = $this->normalizeItem($items[$index]);
        $copy['id'] = (string) Str::uuid();
        $copy['name'] = trim(($copy['name'] ?? '')).' (copy)';

        array_splice($items, $index + 1, 0, [$copy]);

        if (! $this->persistItems($items)) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
        }

        $this->syncDatasetEntry($copy);

        return response()->json(['success' => true, 'entry' => $copy]);
    }

    /**
     * Toggle the enabled/disabled state of an entry. A disabled endpoint is
     * excluded from the dataset registry (endpoint_datasets / builder /
     * schema) and from the refresh sweep, while its data.json entry is kept
     * so it can be re-enabled later.
     */
    public function toggle(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'disabled' => 'required|boolean',
        ]);

        $disabled = (bool) $validated['disabled'];

        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['success' => false, 'error' => 'data.json not found or invalid'], 404);
        }

        $index = $this->findIndexById($items, $id);

        if ($index === null) {
            return response()->json(['success' => false, 'error' => 'Entry not found'], 404);
        }

        $items[$index]['disabled'] = $disabled;

        if (! $this->persistItems($items)) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
        }

        // Disabling drops the endpoint_datasets row; enabling (re)creates it
        // from the stored snapshot via syncDatasetEntry → buildEntry.
        $this->syncDatasetEntry($items[$index]);

        return response()->json([
            'success' => true,
            'entry' => $this->summarizeItem($items[$index]),
        ]);
    }

    /**
     * Toggle the enabled/disabled state of a whole root (scheme://host[:port]).
     *
     * A disabled root acts as a master switch: every endpoint sharing it is
     * effectively disabled (dropped from the dataset registry, schema and the
     * refresh sweep) until the root is re-enabled, regardless of each
     * endpoint's own flag.
     */
    public function toggleRoot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'root' => 'required|string|url|max:1000',
            'disabled' => 'required|boolean',
        ]);

        $root = rtrim(trim($validated['root']), '/');
        $disabled = (bool) $validated['disabled'];

        if ($root === '') {
            return response()->json(['success' => false, 'error' => 'Le root est obligatoire'], 422);
        }

        $roots = array_keys(RootState::disabledRoots());

        if ($disabled && ! in_array($root, $roots, true)) {
            $roots[] = $root;
        }

        if (! $disabled) {
            $roots = array_values(array_filter($roots, static fn (string $item): bool => $item !== $root));
        }

        if (! RootState::save($roots)) {
            return response()->json(['success' => false, 'error' => 'Échec de l’écriture des racines désactivées'], 500);
        }

        // Sync dataset rows for every endpoint sharing the root: disabling
        // drops them, re-enabling recreates them from the stored snapshots.
        $items = $this->loadItems() ?? [];
        $affected = 0;

        foreach ($items as $item) {
            if ($this->rootOf((string) ($item['endpoint'] ?? '')) !== $root) {
                continue;
            }

            $this->syncDatasetEntry($item);
            $affected++;
        }

        $this->invalidateDatasetCaches();

        return response()->json([
            'success' => true,
            'root' => $root,
            'disabled' => $disabled,
            'count' => $affected,
        ]);
    }

    /**
     * Bulk import endpoints into data.json from pasted text (CSV or JSON) or
     * an uploaded CSV file. No live network calls are made: entries are
     * registered with the submitted metadata (status defaults to 200) and can
     * be refreshed from the UI afterwards. Each row is validated; invalid rows
     * are reported individually while the valid ones are still imported.
     */
    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mode' => 'required|string|in:csv,json',
            'content' => 'required|string|max:5000000',
        ]);

        $mode = strtolower($validated['mode']);
        $content = trim($validated['content']);

        $rows = $mode === 'csv'
            ? $this->parseCsvRows($content)
            : $this->parseJsonRows($content);

        $items = $this->loadItems() ?? [];

        $existingUrls = [];

        foreach ($items as $item) {
            $existingUrls[strtolower(rtrim((string) ($item['endpoint'] ?? ''), '/'))] = true;
        }

        $created = [];
        $skipped = 0;
        $errors = [];

        foreach ($rows as $row) {
            $index = $row['index'] ?? null;

            try {
                $name = trim((string) ($row['data']['name'] ?? ''));
                $method = strtoupper((string) ($row['data']['method'] ?? 'GET'));
                $endpoint = trim((string) ($row['data']['endpoint'] ?? ''));
                $status = isset($row['data']['status']) && $row['data']['status'] !== ''
                    ? (int) $row['data']['status']
                    : 200;
                $response = $row['data']['response'] ?? new \stdClass;

                if ($name === '') {
                    throw new \InvalidArgumentException('name est obligatoire');
                }

                if (! in_array($method, ['GET', 'POST'], true)) {
                    throw new \InvalidArgumentException("method doit être GET ou POST (reçu {$method})");
                }

                if ($endpoint === '' || ! filter_var($endpoint, FILTER_VALIDATE_URL)) {
                    throw new \InvalidArgumentException('endpoint doit être une URL valide');
                }

                if ($status < 100 || $status > 599) {
                    throw new \InvalidArgumentException("status doit être entre 100 et 599 (reçu {$status})");
                }

                if (isset($existingUrls[strtolower(rtrim($endpoint, '/'))])) {
                    $skipped++;

                    continue;
                }

                if (! is_array($response)) {
                    $response = ['data' => is_string($response) && $response !== '' ? json_decode($response, true) ?? $response : $response];
                }

                $entry = $this->normalizeItem([
                    'name' => $name,
                    'method' => $method,
                    'endpoint' => $endpoint,
                    'status' => $status,
                    'response' => $response,
                    'disabled' => false,
                ]);

                $items[] = $entry;
                $existingUrls[strtolower(rtrim($endpoint, '/'))] = true;
                $created[] = $entry;
            } catch (\Throwable $e) {
                $errors[] = [
                    'row' => $index ?? count($created) + count($errors) + $skipped + 1,
                    'error' => $e->getMessage(),
                ];
            }
        }

        if ($created !== [] || $skipped > 0) {
            if (! $this->persistItems($items)) {
                return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
            }
        }

        $this->invalidateDatasetCaches();

        // Imported endpoints go straight to the dataset table: run the datasets
        // sync scoped to the newly created api/ slugs (fetches live rows, then
        // derives columns for column-less entries).
        if ($created !== []) {
            $slugs = array_values(array_filter(array_map(
                fn (array $item): string => app(EndpointDatasetRegistry::class)->slugOf((string) ($item['endpoint'] ?? '')),
                $created
            ), static fn (string $slug): bool => $slug !== ''));

            if ($slugs !== []) {
                Artisan::call('sync:endpoint-data', [
                    '--phase' => 'datasets',
                    '--force' => true,
                    '--timeout' => (int) config('novacity.web_timeout', 20),
                    '--slug' => $slugs,
                ]);
            }
        }

        return response()->json([
            'success' => $errors === [] || $created !== [],
            'created' => count($created),
            'skipped' => $skipped,
            'errors' => $errors,
            'entries' => array_map(fn (array $item) => $this->summarizeItem($item), $created),
        ]);
    }

    /**
     * Parse CSV text into rows with 1-based line numbers. Header names are
     * normalized (name, method, endpoint, status, response).
     *
     * @return array<int, array{index: int, data: array<string, mixed>}>
     */
    private function parseCsvRows(string $content): array
    {
        $lines = preg_split('/\r\n|\r|\n/', $content) ?: [];

        if ($lines === []) {
            return [];
        }

        $header = str_getcsv(array_shift($lines) ?? '');
        $header = array_map('strtolower', array_map('trim', $header ?: []));

        $rows = [];

        foreach ($lines as $i => $line) {
            if (trim($line) === '') {
                continue;
            }

            $fields = str_getcsv($line);

            $data = [];

            foreach ($header as $pos => $col) {
                if ($col !== '' && array_key_exists($pos, $fields)) {
                    $data[$col] = $fields[$pos];
                }
            }

            $rows[] = ['index' => $i + 2, 'data' => $data];
        }

        return $rows;
    }

    /**
     * Parse a JSON payload (array of endpoint objects, or {endpoints: [...]}).
     *
     * @return array<int, array{index: int, data: array<string, mixed>}>
     */
    private function parseJsonRows(string $content): array
    {
        $decoded = json_decode($content, true);

        if (! is_array($decoded)) {
            throw new \InvalidArgumentException('JSON invalide : un tableau d’objets endpoint est attendu');
        }

        if (array_keys($decoded) === ['endpoints'] && is_array($decoded['endpoints'])) {
            $decoded = $decoded['endpoints'];
        }

        $rows = [];

        foreach (array_values($decoded) as $i => $item) {
            if (is_array($item)) {
                $rows[] = ['index' => $i + 1, 'data' => $item];
            }
        }

        return $rows;
    }

    /**
     * Reorder all entries according to the provided id sequence.
     */
    public function reorder(Request $request): JsonResponse
    {
        $ids = $request->input('ids');

        if (! is_array($ids) || count($ids) === 0) {
            return response()->json(['success' => false, 'error' => 'ids array is required'], 422);
        }

        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['success' => false, 'error' => 'data.json not found or invalid'], 404);
        }

        $items = array_values($items);

        if (count($ids) !== count($items)) {
            return response()->json(['success' => false, 'error' => 'ids must cover every entry exactly once'], 422);
        }

        $byId = [];
        foreach ($items as $item) {
            $byId[(string) $item['id']] = $item;
        }

        $seen = [];
        $newItems = [];

        foreach ($ids as $rawId) {
            $key = (string) $rawId;
            if (! isset($byId[$key]) || isset($seen[$key])) {
                return response()->json(['success' => false, 'error' => 'ids contain unknown or duplicate ids'], 422);
            }
            $seen[$key] = true;
            $newItems[] = $byId[$key];
        }

        if (! $this->persistItems($newItems)) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
        }

        $this->invalidateDatasetCaches();

        return response()->json([
            'success' => true,
            'items' => array_map(fn ($item) => $this->summarizeItem($item), $newItems),
        ]);
    }

    /**
     * Derive structure (columns + inferred types) for every entry.
     */
    public function structure(): JsonResponse
    {
        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['structure' => [], 'error' => 'data.json not found or invalid'], 404);
        }

        $result = [];

        foreach ($items as $item) {
            $result[] = $this->structureForItem($item);
        }

        return response()->json(['structure' => $result]);
    }

    /**
     * Analyze primary keys, foreign-key candidates and shared join columns.
     */
    public function schema(Request $request): JsonResponse
    {
        $result = $this->schemaData((string) $request->query('column', ''));

        if ($result === null) {
            return response()->json(['error' => 'data.json not found or invalid'], 404);
        }

        return response()->json($result);
    }

    /**
     * Run the schema analysis over the endpoint registry.
     *
     * Shared with the V5 builder (via the v5.auth-protected /api/v5/schema
     * route) so cross-table joins work without the main IT/web guard.
     *
     * @return array{entries: array<int, array<string, mixed>>, columns: array<int, array<string, mixed>>, foreign_keys: array<int, array<string, mixed>>, generated_at: string}|null
     */
    public function schemaData(?string $column = null): ?array
    {
        $items = $this->loadItems();

        if ($items === null) {
            return null;
        }

        if (self::$cachedSchema === null) {
            self::$cachedSchema = (new EndpointSchemaAnalyzer)->analyze($items);
        }

        $result = self::$cachedSchema;

        if ($column !== null && $column !== '') {
            $result['columns'] = array_values(array_filter(
                $result['columns'],
                fn ($shared) => strcasecmp((string) $shared['name'], $column) === 0
            ));
        }

        return $result;
    }

    /**
     * Return Novacity connection config (base URL, API key, JWT token) from env.
     */
    public function config(): JsonResponse
    {
        return response()->json([
            'base_url' => env('NOVACITY_BASE_URL', ''),
            'api_key' => env('NOVACITY_API_KEY', ''),
            'token' => env('NOVACITY_ADMIN_TOKEN', ''),
        ]);
    }

    /**
     * List every known root (from data.json) merged with any configured
     * per-root credentials. Each entry exposes only the masked api key.
     */
    public function roots(): JsonResponse
    {
        $items = $this->loadItems() ?? [];
        $credentials = RootCredentials::load();
        $disabledRoots = RootState::disabledRoots();

        $byRoot = [];
        $disabledByRoot = [];

        foreach ($items as $item) {
            $root = $this->rootOf($item['endpoint'] ?? '');
            if ($root !== '') {
                $byRoot[$root] = ($byRoot[$root] ?? 0) + 1;
                if (! empty($item['disabled'])) {
                    $disabledByRoot[$root] = ($disabledByRoot[$root] ?? 0) + 1;
                }
            }
        }

        foreach ($credentials as $root => $config) {
            $byRoot[$root] ??= 0;
        }

        $roots = [];

        foreach ($byRoot as $root => $count) {
            $stored = $credentials[$root] ?? [];
            $apiKey = is_string($stored['api_key'] ?? null) ? $stored['api_key'] : '';
            $roots[] = [
                'root' => $root,
                'count' => $count,
                'disabled' => isset($disabledRoots[$root]),
                'disabled_count' => $disabledByRoot[$root] ?? 0,
                'has_api_key' => $apiKey !== '',
                'masked_api_key' => RootCredentials::mask($apiKey),
            ];
        }

        usort($roots, static fn (array $a, array $b): int => strcmp($a['root'], $b['root']));

        return response()->json(['roots' => $roots]);
    }

    /**
     * Upsert the x-api-key for a root.
     */
    public function storeRoot(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'root' => 'required|string|url|max:1000',
            'api_key' => 'present|string|max:1000',
        ]);

        $root = rtrim(trim($validated['root']), '/');
        $apiKey = trim((string) $validated['api_key']);

        if ($root === '') {
            return response()->json(['success' => false, 'error' => 'Le root est obligatoire'], 422);
        }

        $all = RootCredentials::load();
        $all[$root] = array_merge($all[$root] ?? [], ['api_key' => $apiKey]);

        if (! RootCredentials::saveAll($all)) {
            return response()->json(['success' => false, 'error' => 'Échec de l’écriture du fichier de racines'], 500);
        }

        return response()->json([
            'success' => true,
            'root' => $root,
            'has_api_key' => $apiKey !== '',
            'masked_api_key' => RootCredentials::mask($apiKey),
        ]);
    }

    /**
     * Remove per-root credentials (fallback to the global config key).
     */
    public function destroyRoot(string $root): JsonResponse
    {
        $root = rtrim(trim($root), '/');

        RootCredentials::forget($root);

        return response()->json(['success' => true, 'root' => $root]);
    }

    /**
     * List every known root (from data.json) merged with its declared query
     * parameter lists. Only roots with at least one definition are returned.
     */
    public function parameterLists(): JsonResponse
    {
        $items = $this->loadItems() ?? [];
        $definitions = RootParameters::load();

        $byRoot = [];

        foreach ($items as $item) {
            $root = $this->rootOf($item['endpoint'] ?? '');
            if ($root !== '') {
                $byRoot[$root] = true;
            }
        }

        foreach (array_keys($definitions) as $root) {
            $byRoot[$root] = true;
        }

        $roots = [];

        foreach (array_keys($byRoot) as $root) {
            $parameters = RootParameters::forRoot($root);
            if ($parameters === []) {
                continue;
            }
            $roots[] = [
                'root' => $root,
                'parameters' => $parameters,
            ];
        }

        usort($roots, static fn (array $a, array $b): int => strcmp($a['root'], $b['root']));

        return response()->json(['roots' => $roots]);
    }

    /**
     * Upsert the full query-parameter list for a root.
     */
    public function storeRootParameters(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'root' => 'required|string|url|max:1000',
            'parameters' => 'required|array',
            'parameters.*.name' => 'required|string|max:100',
            'parameters.*.values' => 'required|array|min:1',
            'parameters.*.values.*' => 'required|string|max:255',
        ]);

        $root = rtrim(trim($validated['root']), '/');

        if ($root === '') {
            return response()->json(['success' => false, 'error' => 'Le root est obligatoire'], 422);
        }

        if (! RootParameters::save($root, $validated['parameters'])) {
            return response()->json(['success' => false, 'error' => 'Échec de l’écriture des paramètres de racine'], 500);
        }

        return response()->json([
            'success' => true,
            'root' => $root,
            'parameters' => RootParameters::forRoot($root),
        ]);
    }

    /**
     * Remove a single query-parameter definition from a root.
     */
    public function deleteRootParameter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'root' => 'required|string|url|max:1000',
            'name' => 'required|string|max:100',
        ]);

        $root = rtrim(trim($validated['root']), '/');
        $name = trim($validated['name']);

        if ($root === '' || $name === '') {
            return response()->json(['success' => false, 'error' => 'Le root et le nom du paramètre sont obligatoires'], 422);
        }

        RootParameters::forget($root, $name);

        return response()->json([
            'success' => true,
            'root' => $root,
            'parameters' => RootParameters::forRoot($root),
        ]);
    }

    /**
     * Switch the selected value of a declared query parameter for one endpoint.
     *
     * The endpoint's stored URL is rewritten in place (e.g. ?chaine=CH01 →
     * ?chaine=CH02) so every later refresh — single, group, "refresh all" or
     * the scheduled sync — naturally fetches the newly selected value. Other
     * query parameters (limit, offset, …) are preserved.
     */
    public function setParameter(string $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'value' => 'required|string|max:255',
        ]);

        $items = $this->loadItems();

        if ($items === null) {
            return response()->json(['success' => false, 'error' => 'data.json not found or invalid'], 404);
        }

        $index = $this->findIndexById($items, $id);

        if ($index === null) {
            return response()->json(['success' => false, 'error' => 'Entry not found'], 404);
        }

        $name = trim($validated['name']);
        $value = trim($validated['value']);

        if ($name === '' || $value === '') {
            return response()->json(['success' => false, 'error' => 'Le nom et la valeur du paramètre sont obligatoires'], 422);
        }

        $items[$index]['endpoint'] = $this->setQueryParam((string) ($items[$index]['endpoint'] ?? ''), $name, $value);

        if (! $this->persistItems($items)) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
        }

        return response()->json([
            'success' => true,
            'entry' => $this->summarizeItem($items[$index]),
        ]);
    }

    /**
     * Build the dropdown payload for an item: every query parameter declared
     * for its root that is actually present in its URL.
     *
     * @return array<int, array{name: string, values: list<string>, selected: string}>
     */
    private function parametersForItem(array $item): array
    {
        $root = $this->rootOf((string) ($item['endpoint'] ?? ''));

        if ($root === '') {
            return [];
        }

        $query = [];

        $parsed = parse_url((string) ($item['endpoint'] ?? ''));

        if (isset($parsed['query']) && $parsed['query'] !== '') {
            parse_str($parsed['query'], $query);
        }

        $parameters = [];

        foreach (RootParameters::forRoot($root) as $definition) {
            $name = (string) ($definition['name'] ?? '');
            $values = array_values(array_map('strval', (array) ($definition['values'] ?? [])));

            if ($name === '' || $values === [] || ! array_key_exists($name, $query)) {
                continue;
            }

            $parameters[] = [
                'name' => $name,
                'values' => $values,
                'selected' => (string) $query[$name],
            ];
        }

        return $parameters;
    }

    /**
     * Set (or add) a single query parameter in a URL, preserving the rest.
     */
    private function setQueryParam(string $url, string $name, string $value): string
    {
        $parsed = parse_url($url);

        if (! $parsed || ! isset($parsed['scheme'], $parsed['host'])) {
            return $url;
        }

        $query = [];

        if (isset($parsed['query']) && $parsed['query'] !== '') {
            parse_str($parsed['query'], $query);
        }

        $query[$name] = $value;

        $rebuilt = $parsed['scheme'].'://'.$parsed['host'];

        if (isset($parsed['port'])) {
            $rebuilt .= ':'.$parsed['port'];
        }

        $rebuilt .= isset($parsed['path']) ? $parsed['path'] : '';

        $queryString = http_build_query($query, '', '&', PHP_QUERY_RFC3986);

        if ($queryString !== '') {
            $rebuilt .= '?'.$queryString;
        }

        return $rebuilt;
    }

    /**
     * Fetch a live endpoint and return its body without persisting anything.
     * The base URL comes from the submitted root API, falling back to the
     * .env configured NOVACITY_BASE_URL. Success requires HTTP 200 and a
     * valid JSON body.
     */
    public function test(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'method' => 'required|string|in:GET,POST',
            'path' => 'required|string|max:1000',
            'baseUrl' => 'nullable|string|max:500',
        ]);

        $baseUrl = rtrim($validated['baseUrl'] ?? config('novacity.base_url', ''), '/');
        if (empty($baseUrl)) {
            return response()->json([
                'success' => false,
                'status' => null,
                'error' => 'Novacity base URL not configured',
            ], 400);
        }

        $url = $baseUrl.'/'.ltrim($validated['path'], '/');

        $headers = [
            'x-api-key' => RootCredentials::apiKeyFor($this->rootOf($baseUrl)),
            'Accept' => 'application/json',
        ];

        $token = config('novacity.admin_token');
        if ($token) {
            $headers['Authorization'] = 'Bearer '.$token;
        }

        try {
            $method = strtolower($validated['method']);
            $httpResponse = $method === 'post'
                ? Http::withHeaders($headers)->timeout((int) config('novacity.timeout', 60))->post($url)
                : Http::withHeaders($headers)->timeout((int) config('novacity.timeout', 60))->get($url);

            $status = $httpResponse->status();
            $body = $httpResponse->json();

            if ($status !== 200) {
                return response()->json([
                    'success' => false,
                    'status' => $status,
                    'error' => "HTTP {$status}: ".($httpResponse->reason() ?? 'Unknown error'),
                ]);
            }

            if (! is_array($body)) {
                return response()->json([
                    'success' => false,
                    'status' => $status,
                    'error' => 'Response is not a valid JSON object or array',
                ]);
            }

            return response()->json([
                'success' => true,
                'status' => $status,
                'url' => $url,
                'response' => $body,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'status' => null,
                'error' => 'Request failed: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Test a live endpoint by path and save to data.json on 200.
     */
    public function testAndSave(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'method' => 'required|string|in:GET,POST',
            'path' => 'required|string|max:1000',
            'baseUrl' => 'nullable|string|max:500',
        ]);

        $baseUrl = rtrim($validated['baseUrl'] ?? config('novacity.base_url', ''), '/');
        if (empty($baseUrl)) {
            return response()->json(['success' => false, 'error' => 'Novacity base URL not configured'], 400);
        }

        $url = $baseUrl.'/'.ltrim($validated['path'], '/');

        $headers = [
            'x-api-key' => RootCredentials::apiKeyFor($this->rootOf($baseUrl)),
            'Accept' => 'application/json',
        ];

        $token = config('novacity.admin_token');
        if ($token) {
            $headers['Authorization'] = 'Bearer '.$token;
        }

        try {
            $method = strtolower($validated['method']);
            $httpResponse = $method === 'post'
                ? Http::withHeaders($headers)->timeout((int) config('novacity.timeout', 60))->post($url)
                : Http::withHeaders($headers)->timeout((int) config('novacity.timeout', 60))->get($url);

            $status = $httpResponse->status();
            $body = $httpResponse->json() ?? $httpResponse->body();

            if ($status !== 200) {
                return response()->json([
                    'success' => false,
                    'status' => $status,
                    'error' => "HTTP {$status}: ".($httpResponse->reason() ?? 'Unknown error'),
                ]);
            }

            $items = $this->loadItems();

            if ($items === null) {
                $items = [];
            }

            $entry = $this->normalizeItem([
                'name' => $validated['name'],
                'method' => strtoupper($validated['method']),
                'endpoint' => $url,
                'status' => 200,
                'response' => $body,
            ]);

            $items[] = $entry;

            if (! $this->persistItems($items)) {
                return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
            }

            $this->syncDatasetEntry($entry);

            return response()->json([
                'success' => true,
                'entry' => $entry,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Request failed: '.$e->getMessage(),
            ], 500);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    /**
     * Absolute path of the data file (configurable for tests).
     */
    private function path(): string
    {
        return storage_path(config('novacity.data_file', 'app/private/data.json'));
    }

    /**
     * Load and decode data.json, normalizing entries (guaranteed id/method/status/response).
     */
    private function loadItems(): ?array
    {
        if (self::$cachedItems !== null) {
            return self::$cachedItems;
        }

        $path = $this->path();

        if (! file_exists($path)) {
            return null;
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            return null;
        }

        $json = json_decode($raw, true);

        if (! is_array($json)) {
            return null;
        }

        $normalized = [];
        $changed = false;

        foreach ($json as $item) {
            if (is_array($item)) {
                $entry = $this->normalizeItem($item);
                if (($item['id'] ?? null) !== $entry['id']) {
                    $changed = true;
                }
                $normalized[] = $entry;
            }
        }

        self::$cachedItems = $normalized;

        // Persist once so ids become stable on disk (legacy entries lack them).
        if ($changed) {
            $this->persistItems($normalized);
        }

        return $normalized;
    }

    /**
     * Ensure every entry has stable identity + required keys.
     */
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
            'disabled' => false,
        ], $item);
    }

    /**
     * Persist entries atomically (temp file + rename), with a backup first.
     */
    private function persistItems(array $items): bool
    {
        $path = $this->path();

        if (! file_exists($path)) {
            return false;
        }

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

        self::$cachedItems = $normalized;
        self::$cachedSchema = null;

        return true;
    }

    /**
     * Forget the V5/V6 registry cache so the next read re-parses data.json.
     */
    private function invalidateDatasetCaches(): void
    {
        app(EndpointDatasetRegistry::class)->forgetCache();
        self::flushCache();
    }

    /**
     * Immediately upsert (or remove) the endpoint_datasets row for one item so
     * the V5 builder sees create/update/delete without waiting for a sync.
     */
    private function syncDatasetEntry(array $item): void
    {
        $this->invalidateDatasetCaches();

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
     * Find an entry by id.
     */
    private function findById(string $id): ?array
    {
        foreach ($this->loadItems() ?? [] as $item) {
            if ((string) ($item['id'] ?? '') === $id) {
                return $item;
            }
        }

        return null;
    }

    /**
     * Find the array index of an entry by id (null when missing).
     */
    private function findIndexById(array $items, string $id): ?int
    {
        foreach ($items as $index => $item) {
            if ((string) ($item['id'] ?? '') === $id) {
                return $index;
            }
        }

        return null;
    }

    /**
     * Extract column names from response.columns or the data rows.
     */
    private function extractFields(array $item): array
    {
        return DatasetRows::columnsFrom($item['response'] ?? null);
    }

    /**
     * Lightweight list representation (no response rows).
     */
    private function summarizeItem(array $item): array
    {
        $data = $item['response']['data'] ?? [];
        $status = $item['status'] ?? null;
        $root = $this->rootOf($item['endpoint'] ?? '');

        return [
            'id' => $item['id'] ?? '',
            'name' => $item['name'] ?? '',
            'method' => strtoupper($item['method'] ?? 'GET'),
            'endpoint' => $item['endpoint'] ?? '',
            'slug' => $this->extractSlug($item['endpoint'] ?? ''),
            'root' => $root,
            'status' => $status,
            'source' => $this->detectSource($item),
            'object_type' => $item['response']['object_type'] ?? null,
            'row_count' => is_array($data) ? count($data) : 0,
            'has_data' => is_array($data) && count($data) > 0,
            'columns' => $this->extractFields($item),
            'checked_at' => $item['checked_at'] ?? null,
            'last_ok_at' => $item['last_ok_at'] ?? null,
            'last_error_at' => $item['last_error_at'] ?? $item['checked_at'] ?? null,
            'last_error' => $item['last_error'] ?? null,
            'consecutive_failures' => (int) ($item['consecutive_failures'] ?? 0),
            'disabled' => RootState::isDisabled($item),
            'root_disabled' => RootState::isRootDisabled($root),
            'retry_pending' => $this->isRetryableStatus($status),
            'parameters' => $this->parametersForItem($item),
        ];
    }

    /**
     * Whether a recorded status is retryable (5xx or unknown/connection error).
     */
    private function isRetryableStatus(?int $status): bool
    {
        return $status === null || $status >= 500;
    }

    /**
     * Aggregate totals used by the stat cards.
     */
    private function summaries(array $items): array
    {
        $byMethod = [];
        $bySource = [];
        $byStatus = [];
        $byRoot = [];
        $enabled = 0;

        foreach ($items as $item) {
            if (RootState::isDisabled($item)) {
                continue;
            }

            $enabled++;

            $method = strtoupper($item['method'] ?? 'GET');
            $source = $this->detectSource($item);
            $status = (int) ($item['status'] ?? 0);
            $root = $this->rootOf((string) ($item['endpoint'] ?? ''));

            $byMethod[$method] = ($byMethod[$method] ?? 0) + 1;
            $bySource[$source] = ($bySource[$source] ?? 0) + 1;
            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;
            $byRoot[$root] = ($byRoot[$root] ?? 0) + 1;
        }

        return [
            'total' => $enabled,
            'by_method' => $byMethod,
            'by_source' => $bySource,
            'by_status' => $byStatus,
            'by_root' => $byRoot,
        ];
    }

    /**
     * Infer the structure of a single entry.
     */
    private function structureForItem(array $item): array
    {
        $summary = $this->summarizeItem($item);
        $data = $item['response']['data'] ?? [];
        $rows = [];

        if (is_array($data)) {
            foreach ($data as $row) {
                if (is_array($row)) {
                    $rows[] = $row;
                }
            }
        }

        $columns = [];

        foreach ($summary['columns'] as $field) {
            $samples = [];
            $nullable = false;

            foreach (array_slice($rows, 0, 50) as $row) {
                if (! array_key_exists($field, $row)) {
                    continue;
                }
                $value = $row[$field];
                if ($value === null) {
                    $nullable = true;

                    continue;
                }
                if (count($samples) < 20) {
                    $samples[] = $value;
                }
            }

            $columns[] = [
                'name' => $field,
                'type' => $this->inferType($samples),
                'sample' => $samples[0] ?? null,
                'nullable' => $nullable,
            ];
        }

        return [
            'id' => $summary['id'],
            'name' => $summary['name'],
            'method' => $summary['method'],
            'endpoint' => $summary['endpoint'],
            'slug' => $summary['slug'],
            'status' => $summary['status'],
            'source' => $summary['source'],
            'object_type' => $summary['object_type'],
            'row_count' => $summary['row_count'],
            'has_data' => $summary['has_data'],
            'columns' => $columns,
        ];
    }

    /**
     * Infer a column type from sampled values.
     */
    private function inferType(array $samples): string
    {
        $types = [];

        foreach (array_slice($samples, 0, 20) as $value) {
            if (is_bool($value)) {
                $types['boolean'] = true;
            } elseif (is_int($value)) {
                $types['integer'] = true;
            } elseif (is_float($value)) {
                $types['number'] = true;
            } elseif (is_string($value)) {
                $types[$this->isDateString($value) ? 'date' : 'string'] = true;
            } else {
                $types['mixed'] = true;
            }
        }

        if (count($types) === 0) {
            return 'null';
        }

        return count($types) === 1 ? array_key_first($types) : 'mixed';
    }

    /**
     * Whether a string looks like an ISO-8601 date/datetime.
     */
    private function isDateString(string $value): bool
    {
        $trimmed = trim($value);

        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}([T ].*)?$/', $trimmed)
            && strtotime(substr($trimmed, 0, 10)) !== false;
    }

    /**
     * Detect the source system of an entry (SDT / QCM / DIVATEX / OTHER).
     */
    private function detectSource(array $item): string
    {
        $name = (string) ($item['name'] ?? '');
        if (preg_match('/\((SDT|QCM|DIVATEX)\)/', $name, $matches)) {
            return strtoupper($matches[1]);
        }

        $source = $item['response']['source'] ?? '';
        if (is_string($source) && $source !== '') {
            return strtoupper($source);
        }

        return 'OTHER';
    }

    /**
     * Extract the root (scheme://host[:port]) of a URL, '' when unparsable.
     */
    private function rootOf(string $url): string
    {
        $parsed = parse_url($url);

        if (! $parsed || ! isset($parsed['scheme'], $parsed['host'])) {
            return '';
        }

        $root = $parsed['scheme'].'://'.$parsed['host'];

        if (isset($parsed['port'])) {
            $root .= ':'.$parsed['port'];
        }

        return $root;
    }

    /**
     * Extract the endpoint slug from a full URL (its path).
     * e.g. "https://api.example.com/api/data/itemtrxenq?limit=100" → "api/data/itemtrxenq"
     */
    private function extractSlug(string $url): string
    {
        $parsed = parse_url($url);
        if (! $parsed || ! isset($parsed['path'])) {
            return '';
        }

        return ltrim($parsed['path'], '/');
    }
}
