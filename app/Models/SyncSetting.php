<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class SyncSetting extends Model
{
    protected $fillable = ['key', 'value', 'updated_by'];

    public static function get(string $key, int $default = 60): int
    {
        return (int) Cache::remember("sync_setting:{$key}", 30, fn () => static::where('key', $key)->value('value') ?? $default
        );
    }
}
