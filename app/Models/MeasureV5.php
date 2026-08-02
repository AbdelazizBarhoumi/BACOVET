<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MeasureV5 extends Model
{
    protected $table = 'measures_v5';

    protected $fillable = ['name', 'expression', 'description', 'category', 'user_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(V5User::class, 'user_id');
    }
}
