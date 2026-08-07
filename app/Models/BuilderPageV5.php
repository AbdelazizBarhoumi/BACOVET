<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderPageV5 extends Model
{
    use HasFactory;

    protected $table = 'builder_pages_v5';

    protected $fillable = ['slug', 'name', 'layout', 'layout_draft', 'group_id', 'sort_order', 'owner_user_id'];

    protected $casts = [
        'layout' => 'array',
        'layout_draft' => 'array',
        'layout_draft_updated_at' => 'datetime',
        'owner_user_id' => 'integer',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(BuilderPageGroupV5::class, 'group_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(V5User::class, 'owner_user_id');
    }

    public function accessRows(): HasMany
    {
        return $this->hasMany(BuilderPageV5Access::class, 'page_id');
    }
}
