<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;

class EndpointDatasetRegistry
{
    private const CACHE_KEY = 'endpoint-datasets:registry:v1';

    public function path(): string
    {
        return storage_path((string) config('novacity.data_file', 'app/public/data.json'));
    }

    /**
     * Eligible, tabular, non-auth/admin GET endpoints from data.json.
     *
     * Each entry:
     *  - slug        : api/... path
     *  - endpoint    : full stored URL (path + optional query)
     *  - name        : display name
     *  - label       : response.label or null
     *  - object      : response.object or null
     *  - object_type : response.object_type or null
     *  - source      : detected source (SDT/QCM/DIVATEX/OTHER)
     *  - method      : "GET"
     *  - columns     : list of column names (response.columns, else first data row keys)
     *
     * @return array<int, array<string, mixed>>
     */
    public function endpoints(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addMinutes(5), function () {
            return $this->readFromFile();
        });
    }

    /**
     * Forget the cached structure so the next call re-reads data.json.
     */
    public function forgetCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    private function readFromFile(): array
    {
        $path = storage_path((string) config('novacity.data_file', 'app/public/data.json'));

        if (! file_exists($path)) {
            return [];
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            return [];
        }

        $json = json_decode($raw, true);

        if (! is_array($json)) {
            return [];
        }

        $endpoints = [];

        foreach ($json as $item) {
            if (! is_array($item)) {
                continue;
            }

            $endpoint = $this->buildEntry($item);

            if ($endpoint !== null) {
                $endpoints[] = $endpoint;
            }
        }

        return $endpoints;
    }

    private function buildEntry(array $item): ?array
    {
        $method = strtoupper((string) ($item['method'] ?? 'GET'));
        $url = (string) ($item['endpoint'] ?? '');
        $slug = $this->extractSlug($url);

        if ($slug === '' || $method !== 'GET'
            || str_starts_with($slug, 'api/auth/')
            || str_starts_with($slug, 'api/admin/')
        ) {
            return null;
        }

        $response = $item['response'] ?? [];
        $columns = $this->extractColumns($item);

        if (empty($columns)) {
            return null;
        }

        return [
            'slug' => $slug,
            'endpoint' => $url,
            'name' => (string) ($item['name'] ?? $slug),
            'label' => $this->nullableString($response['label'] ?? null),
            'object' => $this->nullableString($response['object'] ?? null),
            'object_type' => $this->nullableString($response['object_type'] ?? null),
            'source' => $this->detectSource($item),
            'method' => 'GET',
            'columns' => $columns,
        ];
    }

    private function extractSlug(string $url): string
    {
        $parsed = parse_url($url);

        if (! $parsed || ! isset($parsed['path'])) {
            return '';
        }

        $path = ltrim($parsed['path'], '/');

        return str_starts_with($path, 'api/') ? $path : '';
    }

    /**
     * Column names from response.columns, else inferred from the first data row.
     *
     * @return list<string>
     */
    private function extractColumns(array $item): array
    {
        $response = $item['response'] ?? [];
        $columns = $response['columns'] ?? [];

        if (empty($columns)) {
            $data = $response['data'] ?? null;

            if (is_array($data) && is_array($data[0] ?? null)) {
                $columns = array_keys($data[0]);
            }
        }

        return array_values(array_filter(
            array_map('strval', (array) $columns),
            static fn (string $c): bool => $c !== ''
        ));
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (string) $value;
    }

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
}
