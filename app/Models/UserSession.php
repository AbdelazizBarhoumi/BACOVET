<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserSession extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'token', 'ip_address', 'user_agent',
        'last_activity', 'expires_at',
    ];

    protected $casts = [
        'last_activity' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive($query)
    {
        return $query->where('expires_at', '>', now());
    }
}
