<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderPageGroupV5 extends Model
{
    use HasFactory;

    protected $table = 'builder_page_groups_v5';

    protected $fillable = ['name', 'slug', 'sort_order'];

    public function pages(): HasMany
    {
        return $this->hasMany(BuilderPageV5::class, 'group_id');
    }
}
