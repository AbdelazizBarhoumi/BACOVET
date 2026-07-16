<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KpiData extends Model
{
    protected $fillable = [
        'kpi_code',
        'endpoint',
        'variable_key',
        'variable_type',
        'refresh_frequency',
        'response_data',
        'computed_data',
        'last_status',
        'last_error',
        'last_synced_at',
        'last_valid_synced_at',
    ];

    protected $casts = [
        'response_data' => 'array',
        'computed_data' => 'array',
        'last_synced_at' => 'datetime',
        'last_valid_synced_at' => 'datetime',
    ];
}
