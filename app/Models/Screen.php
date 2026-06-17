<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Screen extends Model
{
    protected $fillable = [
        'name', 'screen_code', 'status', 'assigned_page',
        'location', 'resolution', 'notes', 'last_ping',
    ];

    protected $casts = [
        'last_ping' => 'datetime',
    ];
}
