<?php

namespace App\Http\Middleware;

use App\Models\AuditLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user || !$user->is_active) {
            return response()->json(['message' => 'Non authentifié ou compte désactivé.'], 401);
        }

        if (!empty($roles) && !in_array($user->role->slug, $roles)) {
            AuditLog::log('WARN', "Accès refusé à {$request->path()} — Rôle: {$user->role?->slug}", $request);
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        return $next($request);
    }
}
