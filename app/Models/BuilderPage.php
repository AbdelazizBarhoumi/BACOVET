<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuilderPage extends Model
{
    protected $fillable = ['slug', 'name', 'layout'];

    protected $casts = [
        'layout' => 'array',
    ];
}
