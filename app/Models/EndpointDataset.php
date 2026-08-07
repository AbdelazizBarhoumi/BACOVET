<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EndpointDataset extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'label',
        'object',
        'object_type',
        'source',
        'method',
        'columns',
        'sample_data',
        'row_count',
        'last_status',
        'last_error',
        'last_synced_at',
    ];

    protected $casts = [
        'columns' => 'array',
        'sample_data' => 'array',
        'row_count' => 'integer',
        'last_synced_at' => 'datetime',
    ];
}
