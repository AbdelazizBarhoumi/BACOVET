<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BuilderPageV6 extends Model
{
    protected $table = 'builder_pages_v6';

    protected $fillable = ['slug', 'name', 'layout'];

    protected $casts = ['layout' => 'array'];
}
