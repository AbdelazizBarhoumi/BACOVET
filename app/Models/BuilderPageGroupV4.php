<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderPageGroupV4 extends Model
{
    use HasFactory;

    protected $table = 'builder_page_groups_v4';

    protected $fillable = ['name', 'slug', 'sort_order'];

    public function pages(): HasMany
    {
        return $this->hasMany(BuilderPageV4::class, 'group_id');
    }
}
