<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderPage extends Model
{
    use HasFactory;

    protected $table = 'builder_pages';

    protected $fillable = ['slug', 'name', 'layout', 'layout_draft', 'group_id', 'sort_order', 'owner_user_id', 'published'];

    protected $casts = [
        'layout' => 'array',
        'layout_draft' => 'array',
        'layout_draft_updated_at' => 'datetime',
        'owner_user_id' => 'integer',
        'published' => 'boolean',
    ];

    public function group(): BelongsTo
    {
        return $this->belongsTo(BuilderPageGroup::class, 'group_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function accessRows(): HasMany
    {
        return $this->hasMany(BuilderPageAccess::class, 'page_id');
    }
}
