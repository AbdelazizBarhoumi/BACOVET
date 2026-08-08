<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'updated_by'];

    /**
     * Read a setting by key, cached for 30s so the scheduler and API don't hit
     * the DB on every tick.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember(
            "setting:{$key}",
            30,
            fn () => static::where('key', $key)->value('value') ?? $default,
        );
    }

    /**
     * Upsert a setting and invalidate its cache immediately.
     */
    public static function set(string $key, mixed $value, ?int $updatedBy = null): void
    {
        static::updateOrCreate(
            ['key' => $key],
            ['value' => $value === null ? null : (string) $value, 'updated_by' => $updatedBy],
        );

        Cache::forget("setting:{$key}");
    }
}
