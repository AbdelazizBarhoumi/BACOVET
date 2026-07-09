<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DataMapping extends Model
{
    protected $fillable = [
        'kpi',
        'name',
        'variable',
        'endpoint',
        'variable_type',
        'variable_key',
        'is_filtered',
        'filter_key',
        'filter_value',
        'has_function',
        'fn',
        'modules',
        'user_id',
    ];

    protected $casts = [
        'is_filtered' => 'boolean',
        'has_function' => 'boolean',
        'modules' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
