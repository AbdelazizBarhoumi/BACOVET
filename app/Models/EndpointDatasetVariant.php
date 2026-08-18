<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One stored snapshot per parameter-value combination of a dataset slug.
 *
 * A single logical endpoint (slug) is synced once per declared parameter
 * value (e.g. ?chaine=CH01, ?chaine=CH02, …). Each variant stores its own
 * columns/rows so the page builder can switch a dashboard parameter without
 * re-fetching — it just reads the already-stored variant.
 */
class EndpointDatasetVariant extends Model
{
    protected $fillable = [
        'slug',
        'params',
        'params_hash',
        'columns',
        'sample_data',
        'row_count',
        'last_status',
        'last_error',
        'last_synced_at',
    ];

    protected $casts = [
        'params' => 'array',
        'columns' => 'array',
        'sample_data' => 'array',
        'row_count' => 'integer',
        'last_synced_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $model) {
            $model->params_hash = self::hashParams($model->params);
        });
    }

    /**
     * Canonical md5 of the params so a unique index can be applied on MySQL
     * (JSON columns cannot be indexed directly).
     */
    public static function hashParams(?array $params): ?string
    {
        if ($params === null) {
            return null;
        }

        $canonical = $params;
        self::sortRecursively($canonical);

        return md5(json_encode($canonical));
    }

    private static function sortRecursively(array &$value): void
    {
        ksort($value);

        foreach ($value as &$child) {
            if (is_array($child)) {
                self::sortRecursively($child);
            }
        }
    }
}
