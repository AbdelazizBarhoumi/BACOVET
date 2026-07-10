<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class NovacityEndpointsController extends Controller
{
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

            $fields = $item['response']['columns'] ?? [];

            $endpoints[$slug] = [
                'name' => $item['name'] ?? $slug,
                'method' => strtoupper($item['method'] ?? 'GET'),
                'fields' => $fields,
            ];
        }

        return response()->json(['endpoints' => $endpoints]);
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
}
