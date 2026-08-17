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
}
