<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeasureJoin extends Model
{
    protected $table = 'measure_joins';

    protected $fillable = [
        'table_a', 'column_a', 'table_b', 'column_b', 'trim_compare', 'user_id',
    ];

    protected $casts = [
        'trim_compare' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(V5User::class, 'user_id');
    }
}