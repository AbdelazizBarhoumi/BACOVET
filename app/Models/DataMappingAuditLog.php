<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataMappingAuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'data_mapping_id',
        'kpi',
        'action',
        'field',
        'old_value',
        'new_value',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
