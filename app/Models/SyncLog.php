<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SyncLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'job_class', 'table_name', 'rows_synced', 'status',
        'message', 'duration_ms', 'executed_at',
    ];

    protected $casts = [
        'executed_at' => 'datetime',
    ];

    public static function record(
        string $jobClass,
        ?string $tableName,
        int $rowsSynced,
        string $status,
        ?string $message = null,
        int $durationMs = 0
    ): static {
        return static::create([
            'job_class' => $jobClass,
            'table_name' => $tableName,
            'rows_synced' => $rowsSynced,
            'status' => $status,
            'message' => $message,
            'duration_ms' => $durationMs,
            'executed_at' => now(),
        ]);
    }
}
