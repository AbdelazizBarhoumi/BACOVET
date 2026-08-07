<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderPageGroup extends Model
{
    use HasFactory;

    protected $table = 'builder_page_groups';

    protected $fillable = ['name', 'slug', 'sort_order'];

    public function pages(): HasMany
    {
        return $this->hasMany(BuilderPage::class, 'group_id');
    }
}
