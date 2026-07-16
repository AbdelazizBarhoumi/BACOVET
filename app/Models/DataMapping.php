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
        'formula',
        'highlight_color',
        'cible_operator',
        'cible_value',
        'cible_is_percentage',
        'refresh_frequency',
        'graph_types',
        'user_id',
    ];

    protected $attributes = [
        'modules' => '[]',
    ];

    protected $casts = [
        'is_filtered' => 'boolean',
        'has_function' => 'boolean',
        'cible_is_percentage' => 'boolean',
        'modules' => 'array',
        'formula' => 'array',
        'graph_types' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
