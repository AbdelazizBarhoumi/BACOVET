<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BuilderActivityLog extends Model
{
    public const UPDATED_AT = null;

    protected $table = 'builder_activity_logs';

    protected $fillable = [
        'user_id',
        'page_id',
        'page_slug',
        'page_name',
        'group_id',
        'widget_id',
        'widget_type',
        'kpi_code',
        'action',
        'detail',
        'ip_address',
        'user_agent',
        'created_at',
    ];

    protected $casts = [
        'detail' => 'array',
        'created_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(BuilderPage::class);
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(BuilderPageGroup::class);
    }
}
