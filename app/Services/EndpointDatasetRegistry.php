<?php

namespace App\Services;

use App\Support\DatasetRows;
use App\Support\RootState;
use Illuminate\Support\Facades\Cache;

class EndpointDatasetRegistry
{
    private const CACHE_KEY = 'endpoint-datasets:registry:v2';

    public function path(): string
    {
        return storage_path((string) config('novacity.data_file', 'app/private/data.json'));
    }

    /**
     * Eligible, tabular, non-auth/admin GET endpoints from data.json.
     *
     * Each entry:
     *  - slug        : URL path (any non-empty path)
     *  - endpoint    : full stored URL (path + optional query)
     *  - name        : display name
     *  - label       : response.label or null
     *  - object      : response.object or null
     *  - object_type : response.object_type or null
     *  - source      : detected source (SDT/QCM/DIVATEX/OTHER)
     *  - method      : "GET"
     *  - columns     : list of column names (response.columns, else derived
     *                  from response.data rows or a single object's keys)
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
     * Last-known-good rows from data.json keyed by dataset slug (`response.data`).
     *
     * Used as a fallback by the datasets API so registered endpoints stay
     * usable in the builder / measure wizard even when the live sync has
     * never stored rows (fresh DB or unreachable API).
     *
     * @return array<string, list<array<string, mixed>>>
     */
    public function rowsBySlug(): array
    {
        $items = $this->readItems();

        if ($items === null) {
            return [];
        }

        $rowsBySlug = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            if (RootState::isDisabled($item)) {
                continue;
            }

            $slug = $this->slugOf((string) ($item['endpoint'] ?? ''));

            if ($slug === '') {
                continue;
            }

            $rows = DatasetRows::extractRows($item['response'] ?? null);

            if ($rows !== []) {
                $rowsBySlug[$slug] = $rows;
            }
        }

        return $rowsBySlug;
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

            if (RootState::isDisabled($item)) {
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
        $json = $this->readItems();

        if ($json === null) {
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
     * Decode the raw data.json payload, or null when missing / unreadable /
     * not an object array.
     *
     * @return array<int, array<string, mixed>>|null
     */
    private function readItems(): ?array
    {
        $path = $this->path();

        if (! file_exists($path)) {
            return null;
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            return null;
        }

        $json = json_decode($raw, true);

        return is_array($json) ? $json : null;
    }

    /**
     * Build a dataset entry for a raw data.json item, or null when not eligible.
     *
     * Unlike entryMeta(), this requires non-empty columns: endpoints whose
     * stored response has no columns (and no derivable data rows) are not
     * datasets yet.
     */
    public function buildEntry(array $item): ?array
    {
        $entry = $this->entryMeta($item);

        if ($entry === null || empty($entry['columns'])) {
            return null;
        }

        return $entry;
    }

    /**
     * Build a dataset entry for a raw data.json item without the columns gate:
     * eligible by URL/method but possibly column-less (e.g. freshly imported
     * endpoints waiting for a live fetch). Used by the datasets sync phase so
     * imported endpoints can be turned into datasets by fetching live rows.
     */
    public function entryMeta(array $item): ?array
    {
        if (RootState::isDisabled($item)) {
            return null;
        }

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

        return [
            'slug' => $slug,
            'endpoint' => $url,
            'name' => (string) ($item['name'] ?? $slug),
            'label' => $this->nullableString($response['label'] ?? null),
            'object' => $this->nullableString($response['object'] ?? null),
            'object_type' => $this->nullableString($response['object_type'] ?? null),
            'source' => $this->detectSource($item),
            'method' => 'GET',
            'columns' => $this->extractColumns($item),
        ];
    }

    /**
     * Eligible-by-URL raw items (api/ slug, GET, non-auth/admin, non-disabled)
     * regardless of whether columns are present. Suitable for the datasets sync
     * phase which can derive columns from live rows.
     *
     * @return array<int, array<string, mixed>>
     */
    public function eligibleItems(): array
    {
        $items = $this->readItems();

        if ($items === null) {
            return [];
        }

        return array_values(array_filter(
            $items,
            fn (array $item): bool => $this->eligible($item)
        ));
    }

    /**
     * Dataset slug for a raw endpoint URL (its path, '' when unparsable).
     */
    public function slugOf(string $url): string
    {
        return $this->extractSlug($url);
    }

    /**
     * Whether a raw data.json item is eligible for a dataset row: it has a
     * usable path slug, is a GET and is not an auth/admin endpoint.
     */
    public function eligible(array $item): bool
    {
        if (RootState::isDisabled($item)) {
            return false;
        }

        $method = strtoupper((string) ($item['method'] ?? 'GET'));
        $slug = $this->slugOf((string) ($item['endpoint'] ?? ''));

        return $slug !== ''
            && $method === 'GET'
            && ! str_starts_with($slug, 'api/auth/')
            && ! str_starts_with($slug, 'api/admin/');
    }

    private function extractSlug(string $url): string
    {
        $parsed = parse_url($url);

        if (! $parsed || ! isset($parsed['path'])) {
            return '';
        }

        return ltrim($parsed['path'], '/');
    }

    /**
     * Column names from response.columns, else inferred from the data rows.
     *
     * @return list<string>
     */
    private function extractColumns(array $item): array
    {
        return DatasetRows::columnsFrom($item['response'] ?? null);
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
