<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class NovacityEndpointsController extends Controller
{
    /** @var array|null Cached parsed data.json — avoids re-reading 1.1MB file per request. */
    private static ?array $cachedItems = null;

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

            // Try to get fields from columns first, then from first data record
            $fields = $item['response']['columns'] ?? [];

            if (empty($fields) && isset($item['response']['data']) && is_array($item['response']['data']) && count($item['response']['data']) > 0) {
                // Extract fields from the first data record
                $firstRecord = $item['response']['data'][0];
                if (is_array($firstRecord)) {
                    $fields = array_keys($firstRecord);
                }
            }

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

            $fields = $item['response']['columns'] ?? [];
            if (empty($fields) && isset($item['response']['data']) && is_array($item['response']['data']) && count($item['response']['data']) > 0) {
                $firstRecord = $item['response']['data'][0];
                if (is_array($firstRecord)) {
                    $fields = array_keys($firstRecord);
                }
            }

            $records = [];
            if (isset($item['response']['data']) && is_array($item['response']['data'])) {
                $records = $item['response']['data'];
            }

            $result[$slug] = [
                'name' => $item['name'] ?? $slug,
                'method' => strtoupper($item['method'] ?? 'GET'),
                'endpoint' => $item['endpoint'] ?? '',
                'status' => $item['status'] ?? null,
                'fields' => $fields,
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
            $itemSlug = $this->extractSlug($item['endpoint'] ?? '');
            if ($itemSlug === $slug) {
                return response()->json(['data' => $item['response'] ?? null]);
            }
        }

        return response()->json(['data' => null, 'error' => 'No sample data for this endpoint']);
    }

    /**
     * Load and decode data.json.
     */
    private function loadItems(): ?array
    {
        if (self::$cachedItems !== null) {
            return self::$cachedItems;
        }

        $path = storage_path('app/public/data.json');

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

        self::$cachedItems = $json;

        return $json;
    }

    /**
     * Extract the endpoint slug from a full URL.
     * e.g. "http://100.76.6.178:4100/api/data/itemtrxenq?limit=100" → "api/data/itemtrxenq"
     */
    private function extractSlug(string $url): string
    {
        $parsed = parse_url($url);
        if (! $parsed || ! isset($parsed['path'])) {
            return '';
        }

        $path = $parsed['path'];

        // Strip leading slash
        $path = ltrim($path, '/');

        // Only keep api/* paths
        if (! str_starts_with($path, 'api/')) {
            return '';
        }

        return $path;
    }

    /**
     * Return Novacity connection config (base URL, API key, JWT token) from env.
     */
    public function config(): JsonResponse
    {
        return response()->json([
            'base_url' => env('NOVACITY_BASE_URL', ''),
            'api_key'  => env('NOVACITY_API_KEY', ''),
            'token'    => env('NOVACITY_ADMIN_TOKEN', ''),
        ]);
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

        $url = $baseUrl . '/' . ltrim($validated['path'], '/');

        $headers = [
            'x-api-key' => (string) config('novacity.api_key'),
            'Accept' => 'application/json',
        ];

        $token = config('novacity.admin_token');
        if ($token) {
            $headers['Authorization'] = 'Bearer ' . $token;
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
                    'error' => "HTTP {$status}: " . ($httpResponse->reason() ?? 'Unknown error'),
                ]);
            }

            // Save to data.json
            $path = storage_path('app/public/data.json');
            $items = [];

            if (file_exists($path)) {
                $raw = file_get_contents($path);
                if ($raw !== false) {
                    $items = json_decode($raw, true) ?? [];
                }
            }

            if (! is_array($items)) {
                $items = [];
            }

            $entry = [
                'name' => $validated['name'],
                'method' => strtoupper($validated['method']),
                'endpoint' => $url,
                'status' => 200,
                'response' => $body,
            ];

            $items[] = $entry;

            $written = file_put_contents($path, json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), LOCK_EX);
            if ($written === false) {
                return response()->json(['success' => false, 'error' => 'Failed to write data.json'], 500);
            }

            // Reset cache so next read picks up the new entry
            self::$cachedItems = null;

            return response()->json([
                'success' => true,
                'entry' => $entry,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Request failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
