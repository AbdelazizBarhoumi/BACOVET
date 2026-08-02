<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuilderPage extends Model
{
    use HasFactory;

    protected $fillable = ['slug', 'name', 'layout', 'group_id', 'sort_order'];

    protected $casts = [
        'layout' => 'array',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(BuilderPageGroup::class);
    }
}
