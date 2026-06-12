<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id', 'action_type', 'message', 'ip_address', 'user_agent',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function log(string $type, string $message, ?Request $request = null): void
    {
        static::create([
            'user_id' => auth()->id(),
            'action_type' => $type,
            'message' => $message,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }

    public static function info(string $message): void
    {
        static::create(['action_type' => 'INFO', 'message' => $message]);
    }

    public static function error(string $message): void
    {
        static::create(['action_type' => 'ERROR', 'message' => $message]);
    }
}
