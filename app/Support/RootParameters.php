<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Per-root query parameter definitions (name + available values).
 *
 * Stored as a root => list of {name, values} map in endpoint-params.json.
 * The currently selected value for a given endpoint is NOT stored here — it
 * lives in the endpoint's own URL (data.json), which is the single source of
 * truth used by the refresh pipeline.
 */
class RootParameters
{
    /**
     * Path to the JSON file holding per-root parameter definitions.
     */
    public static function path(): string
    {
        return storage_path((string) config('novacity.params_file', 'app/private/endpoint-params.json'));
    }

    /**
     * Decode the params file into a root => parameter definitions map.
     *
     * @return array<string, array<int, array{name: string, values: list<string>}>>
     */
    public static function load(): array
    {
        $path = self::path();

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

        $result = [];

        foreach ($json as $root => $definitions) {
            if (! is_string($root) || ! is_array($definitions)) {
                continue;
            }

            $params = [];

            foreach ($definitions as $definition) {
                $name = trim((string) ($definition['name'] ?? ''));

                if ($name === '') {
                    continue;
                }

                $values = [];

                foreach ((array) ($definition['values'] ?? []) as $value) {
                    $value = trim((string) $value);
                    if ($value !== '') {
                        $values[] = $value;
                    }
                }

                if ($values === []) {
                    continue;
                }

                $params[] = ['name' => $name, 'values' => array_values(array_unique($values))];
            }

            if ($params !== []) {
                $result[$root] = $params;
            }
        }

        return $result;
    }

    /**
     * Persist the whole map atomically (temp file + rename).
     */
    public static function saveAll(array $definitions): bool
    {
        $json = json_encode($definitions, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            return false;
        }

        $path = self::path();

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

        Cache::forget('root-parameters');

        return true;
    }

    /**
     * Parameter definitions for a single root (normalized).
     *
     * @return array<int, array{name: string, values: list<string>}>
     */
    public static function forRoot(string $root): array
    {
        return self::load()[$root] ?? [];
    }

    /**
     * Upsert the full parameter list for a root.
     *
     * @param  array<int, array{name?: string, values?: array<int, mixed>}>  $params
     */
    public static function save(string $root, array $params): bool
    {
        $root = rtrim(trim($root), '/');

        if ($root === '') {
            return false;
        }

        $all = self::load();
        $normalized = [];

        foreach ($params as $definition) {
            if (! is_array($definition)) {
                continue;
            }

            $name = trim((string) ($definition['name'] ?? ''));

            if ($name === '') {
                continue;
            }

            $values = [];

            foreach ((array) ($definition['values'] ?? []) as $value) {
                $value = trim((string) $value);
                if ($value !== '') {
                    $values[] = $value;
                }
            }

            if ($values === []) {
                continue;
            }

            $normalized[] = ['name' => $name, 'values' => array_values(array_unique($values))];
        }

        $all[$root] = $normalized;

        return self::saveAll($all);
    }

    /**
     * Remove a single parameter definition from a root.
     */
    public static function forget(string $root, string $name): bool
    {
        $root = rtrim(trim($root), '/');
        $name = trim($name);

        if ($root === '' || $name === '') {
            return false;
        }

        $all = self::load();

        if (! isset($all[$root])) {
            return true;
        }

        $all[$root] = array_values(array_filter(
            $all[$root],
            static fn (array $definition): bool => trim((string) ($definition['name'] ?? '')) !== $name
        ));

        if ($all[$root] === []) {
            unset($all[$root]);
        }

        return self::saveAll($all);
    }
}
