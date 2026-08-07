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

    /**
     * Apply fresh live responses (HTTP 200 only) to data.json entries.
     *
     * Entries whose slug is present are patched with status 200, the full
     * response body and refreshed timestamps; everything else keeps its
     * last-known-good snapshot. One read + one atomic write.
     *
     * @param  array<string, array<string, mixed>>  $responsesBySlug  slug => full response body
     */
    public function applyLiveResponses(array $responsesBySlug): int
    {
        if ($responsesBySlug === []) {
            return 0;
        }

        $path = $this->path();

        if (! file_exists($path)) {
            return 0;
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            return 0;
        }

        $items = json_decode($raw, true);

        if (! is_array($items)) {
            return 0;
        }

        $now = now()->toIso8601String();
        $updated = 0;

        foreach ($items as $i => $item) {
            if (! is_array($item)) {
                continue;
            }

            $slug = $this->slugOf((string) ($item['endpoint'] ?? ''));

            if ($slug === '' || ! array_key_exists($slug, $responsesBySlug)) {
                continue;
            }

            $items[$i]['status'] = 200;
            $items[$i]['response'] = $responsesBySlug[$slug];
            $items[$i]['checked_at'] = $now;
            $items[$i]['last_ok_at'] = $now;
            $items[$i]['last_error'] = null;
            $updated++;
        }

        if ($updated === 0) {
            return 0;
        }

        if (! $this->persistItems($path, $items)) {
            return 0;
        }

        $this->forgetCache();

        return $updated;
    }

    /**
     * Persist entries atomically (temp file + rename), with a backup first.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function persistItems(string $path, array $items): bool
    {
        $json = json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            return false;
        }

        @copy($path, storage_path((string) config('novacity.data_backup', 'app/public/data.json.bak')));

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

    /**
     * Build a dataset entry for a raw data.json item, or null when not eligible.
     */
    public function buildEntry(array $item): ?array
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

    /**
     * Dataset slug for a raw endpoint URL ('' when not api/-prefixed).
     */
    public function slugOf(string $url): string
    {
        return $this->extractSlug($url);
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
