<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderPageGroup extends Model
{
    use HasFactory;

    protected $table = 'builder_page_groups';

    protected $fillable = ['name', 'slug', 'sort_order', 'owner_user_id'];

    public function pages(): HasMany
    {
        return $this->hasMany(BuilderPage::class, 'group_id');
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }
}
