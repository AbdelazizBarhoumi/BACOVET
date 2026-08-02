<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuilderPageV5 extends Model
{
    use HasFactory;

    protected $table = 'builder_pages_v5';

    protected $fillable = ['slug', 'name', 'layout', 'layout_draft', 'group_id', 'sort_order'];

    protected $casts = [
        'layout' => 'array',
        'layout_draft' => 'array',
        'layout_draft_updated_at' => 'datetime',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(BuilderPageGroupV5::class, 'group_id');
    }
}
