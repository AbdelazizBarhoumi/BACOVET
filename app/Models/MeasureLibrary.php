<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeasureLibrary extends Model
{
    protected $table = 'measures_library';

    protected $fillable = ['name', 'expression', 'description', 'category'];
}
