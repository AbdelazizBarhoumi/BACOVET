<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MeasureLibraryV6 extends Model
{
    protected $table = 'measures_library_v6';

    protected $fillable = ['name', 'expression', 'description', 'category'];
}
