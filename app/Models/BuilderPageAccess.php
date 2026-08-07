<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuilderPageAccess extends Model
{
    use HasFactory;

    protected $table = 'builder_page_access';

    protected $fillable = ['page_id', 'user_id', 'mode'];

    protected $casts = ['mode' => 'string'];

    public function page(): BelongsTo
    {
        return $this->belongsTo(BuilderPage::class, 'page_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
