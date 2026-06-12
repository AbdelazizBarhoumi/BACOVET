<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NovacityJob extends Model
{
    protected $table = 'novacity_sync_jobs';

    protected $fillable = [
        'novacity_job_id', 'name', 'query_slug', 'source', 'last_status',
        'records_count', 'response_time_ms', 'last_run_at', 'last_error', 'is_active'
    ];

    protected $casts = [
        'last_run_at' => 'datetime',
        'is_active'   => 'boolean',
    ];
}
