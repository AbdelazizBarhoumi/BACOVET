<?php

namespace App\Support;

/**
 * Persistent, per-root disable state for the endpoint registry.
 *
 * A disabled root acts as a master switch: every endpoint sharing that root
 * is effectively disabled (excluded from the dataset registry, schema and
 * refresh sweeps) regardless of its own `disabled` flag, until the root is
 * re-enabled. The state lives in a small JSON file next to data.json so a
 * disabled root survives cache flushes and process restarts.
 */
class RootState
{
    /** @var array<string, true>|null Root => true map, memoized per request. */
    private static ?array $disabledRoots = null;

    /**
     * Path of the disabled-roots file, kept beside the data file it governs
     * so tests (which point novacity.data_file at a temp file) are isolated.
     */
    public static function path(): string
    {
        $dataFile = storage_path((string) config('novacity.data_file', 'app/private/data.json'));

        return dirname($dataFile).'/endpoint-disabled-roots.json';
    }

    /**
     * Root => true map of every disabled root.
     *
     * @return array<string, true>
     */
    public static function disabledRoots(): array
    {
        if (self::$disabledRoots !== null) {
            return self::$disabledRoots;
        }

        $path = self::path();

        if (! file_exists($path)) {
            return self::$disabledRoots = [];
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            return self::$disabledRoots = [];
        }

        $decoded = json_decode($raw, true);

        if (! is_array($decoded)) {
            return self::$disabledRoots = [];
        }

        $roots = [];

        foreach ($decoded as $value) {
            if (is_string($value) && $value !== '') {
                $roots[rtrim($value, '/')] = true;
            }
        }

        return self::$disabledRoots = $roots;
    }

    /**
     * Whether a root (scheme://host[:port]) is currently disabled.
     */
    public static function isRootDisabled(string $root): bool
    {
        return $root !== '' && isset(self::disabledRoots()[rtrim($root, '/')]);
    }

    /**
     * Whether a data.json item is effectively disabled: its own flag, or its
     * root is disabled.
     *
     * @param  array<string, mixed>  $item
     */
    public static function isDisabled(array $item): bool
    {
        if (! empty($item['disabled'])) {
            return true;
        }

        return self::isRootDisabled(self::rootOf((string) ($item['endpoint'] ?? '')));
    }

    /**
     * Replace the whole disabled-roots set atomically (temp file + rename).
     *
     * @param  array<int, string>  $roots
     */
    public static function save(array $roots): bool
    {
        $normalized = [];

        foreach ($roots as $root) {
            if (is_string($root) && $root !== '') {
                $normalized[rtrim($root, '/')] = true;
            }
        }

        $path = self::path();

        @mkdir(dirname($path), 0755, true);

        $json = json_encode(array_keys($normalized), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

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

        self::$disabledRoots = $normalized;

        return true;
    }

    /**
     * Forget the memoized set (after writes / in tests).
     */
    public static function flushCache(): void
    {
        self::$disabledRoots = null;
    }

    /**
     * Extract the root (scheme://host[:port]) of a URL, '' when unparsable.
     */
    public static function rootOf(string $url): string
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
}
