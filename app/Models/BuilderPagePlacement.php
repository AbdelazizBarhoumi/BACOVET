<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuilderPagePlacement extends Model
{
    use HasFactory;

    protected $table = 'builder_page_placements';

    protected $fillable = ['user_id', 'page_id', 'group_id', 'sort_order'];

    protected $casts = ['sort_order' => 'integer'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(BuilderPage::class, 'page_id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(BuilderPageGroup::class, 'group_id');
    }
}
