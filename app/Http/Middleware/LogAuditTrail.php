<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogAuditTrail
{
    private const LOG_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (in_array($request->method(), self::LOG_METHODS)) {
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action_type' => 'USER',
                'message' => "{$request->method()} {$request->path()} — HTTP {$response->getStatusCode()}",
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        }

        return $response;
    }
}
