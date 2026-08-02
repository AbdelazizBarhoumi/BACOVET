<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\EndpointSchemaAnalyzer;
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

        return response()->json([
            'stats' => $this->summaries($items),
            'meta' => $meta,
            'retry_pending' => (bool) Cache::get('endpoints:refresh:retry_pending', false),
        ]);
    }

    /**
     * Run endpoints:refresh synchronously and return its summary.
     */
    public function refresh(): JsonResponse
    {
        $exitCode = Artisan::call('endpoints:refresh', ['--force' => true]);
        $output = Artisan::output();

        return response()->json([
            'success' => $exitCode === 0,
            'exit_code' => $exitCode,
            'output' => $output,
            'meta' => $this->loadRefreshMeta(),
        ]);
    }

    /**
     * Read the last-run metadata file (endpoints-refresh.json), or null when absent.
     */
    private function loadRefreshMeta(): ?array
    {
        $path = storage_path(config('novacity.refresh_meta', 'app/public/endpoints-refresh.json'));

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

        $filtered = array_values(array_filter($items, function ($item) use ($search, $method, $status, $statusGroup, $source) {
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
        ]);

        $items[] = $entry;

        if (! $this->persistItems($items)) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
        }

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

        foreach (['name', 'method', 'endpoint', 'status'] as $key) {
            if (array_key_exists($key, $validated)) {
                $entry[$key] = $key === 'status' ? (int) $validated[$key] : $validated[$key];
            }
        }

        if ($request->exists('response')) {
            $entry['response'] = $request->input('response');
        }

        $entry['method'] = strtoupper($entry['method'] ?? 'GET');

        $items[$index] = $entry;

        if (! $this->persistItems($items)) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
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

        unset($items[$index]);

        if (! $this->persistItems(array_values($items))) {
            return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
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

        return response()->json(['success' => true, 'entry' => $copy]);
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
            'x-api-key' => (string) config('novacity.api_key'),
            'Accept' => 'application/json',
        ];

        $token = config('novacity.admin_token');
        if ($token) {
            $headers['Authorization'] = 'Bearer '.$token;
        }

        try {
            $method = strtolower($validated['method']);
            $httpResponse = $method === 'post'
                ? Http::withHeaders($headers)->timeout((int) config('novacity.timeout', 30))->post($url)
                : Http::withHeaders($headers)->timeout((int) config('novacity.timeout', 30))->get($url);

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
            'x-api-key' => (string) config('novacity.api_key'),
            'Accept' => 'application/json',
        ];

        $token = config('novacity.admin_token');
        if ($token) {
            $headers['Authorization'] = 'Bearer '.$token;
        }

        try {
            $method = strtolower($validated['method']);
            $httpResponse = $method === 'post'
                ? Http::withHeaders($headers)->timeout((int) config('novacity.timeout', 30))->post($url)
                : Http::withHeaders($headers)->timeout((int) config('novacity.timeout', 30))->get($url);

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
        return storage_path(config('novacity.data_file', 'app/public/data.json'));
    }

    /**
     * Absolute path of the backup written before each mutation.
     */
    private function backupPath(): string
    {
        return storage_path(config('novacity.data_backup', 'app/public/data.json.bak'));
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

        self::$cachedItems = $normalized;
        self::$cachedSchema = null;

        return true;
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
     * Extract column names from response.columns or the first data row.
     */
    private function extractFields(array $item): array
    {
        $columns = $item['response']['columns'] ?? [];

        if (empty($columns) && isset($item['response']['data']) && is_array($item['response']['data']) && count($item['response']['data']) > 0) {
            $firstRecord = $item['response']['data'][0];
            if (is_array($firstRecord)) {
                $columns = array_keys($firstRecord);
            }
        }

        return array_values(array_map('strval', (array) $columns));
    }

    /**
     * Lightweight list representation (no response rows).
     */
    private function summarizeItem(array $item): array
    {
        $data = $item['response']['data'] ?? [];

        return [
            'id' => $item['id'] ?? '',
            'name' => $item['name'] ?? '',
            'method' => strtoupper($item['method'] ?? 'GET'),
            'endpoint' => $item['endpoint'] ?? '',
            'slug' => $this->extractSlug($item['endpoint'] ?? ''),
            'status' => $item['status'] ?? null,
            'source' => $this->detectSource($item),
            'object_type' => $item['response']['object_type'] ?? null,
            'row_count' => is_array($data) ? count($data) : 0,
            'has_data' => is_array($data) && count($data) > 0,
            'columns' => $this->extractFields($item),
            'checked_at' => $item['checked_at'] ?? null,
            'last_ok_at' => $item['last_ok_at'] ?? null,
            'last_error' => $item['last_error'] ?? null,
        ];
    }

    /**
     * Aggregate totals used by the stat cards.
     */
    private function summaries(array $items): array
    {
        $byMethod = [];
        $bySource = [];
        $byStatus = [];

        foreach ($items as $item) {
            $method = strtoupper($item['method'] ?? 'GET');
            $source = $this->detectSource($item);
            $status = (int) ($item['status'] ?? 0);

            $byMethod[$method] = ($byMethod[$method] ?? 0) + 1;
            $bySource[$source] = ($bySource[$source] ?? 0) + 1;
            $byStatus[$status] = ($byStatus[$status] ?? 0) + 1;
        }

        return [
            'total' => count($items),
            'by_method' => $byMethod,
            'by_source' => $bySource,
            'by_status' => $byStatus,
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
     * Extract the endpoint slug from a full URL.
     * e.g. "https://api.example.com/api/data/itemtrxenq?limit=100" → "api/data/itemtrxenq"
     */
    private function extractSlug(string $url): string
    {
        $parsed = parse_url($url);
        if (! $parsed || ! isset($parsed['path'])) {
            return '';
        }

        $path = ltrim($parsed['path'], '/');

        if (! str_starts_with($path, 'api/')) {
            return '';
        }

        return $path;
    }
}
