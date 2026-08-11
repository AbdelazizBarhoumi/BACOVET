<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class RootCredentials
{
    /**
     * Path to the JSON file holding per-root credentials.
     */
    public static function path(): string
    {
        return storage_path((string) config('novacity.roots_file', 'app/private/endpoint-roots.json'));
    }

    /**
     * Decode the credentials file into a root => credentials map.
     *
     * @return array<string, array<string, mixed>>
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

        foreach ($json as $root => $credentials) {
            if (is_string($root) && is_array($credentials)) {
                $result[$root] = $credentials;
            }
        }

        return $result;
    }

    /**
     * Persist the whole map atomically (temp file + rename).
     */
    public static function saveAll(array $credentials): bool
    {
        $json = json_encode($credentials, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

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

        Cache::forget('root-credentials');

        return true;
    }

    /**
     * Upsert credentials for a root.
     */
    public static function save(string $root, array $credentials): bool
    {
        $all = self::load();
        $all[$root] = $credentials;

        return self::saveAll($all);
    }

    /**
     * Remove credentials for a root.
     */
    public static function forget(string $root): bool
    {
        $all = self::load();

        if (! isset($all[$root])) {
            return true;
        }

        unset($all[$root]);

        return self::saveAll($all);
    }

    /**
     * Resolve the x-api-key for a root: stored value first, global config fallback.
     */
    public static function apiKeyFor(string $root): string
    {
        $credentials = self::load()[$root] ?? [];

        if (is_string($credentials['api_key'] ?? null) && $credentials['api_key'] !== '') {
            return $credentials['api_key'];
        }

        return (string) config('novacity.api_key', '');
    }

    /**
     * Mask a secret so only the first 3 and last 2 characters are visible.
     */
    public static function mask(string $value): string
    {
        $value = trim($value);

        if ($value === '') {
            return '';
        }

        if (mb_strlen($value) <= 5) {
            return str_repeat('•', mb_strlen($value));
        }

        return mb_substr($value, 0, 3).'…'.mb_substr($value, -2);
    }
}