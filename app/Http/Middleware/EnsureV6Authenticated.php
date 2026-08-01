<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureV6Authenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::guard('v6_users')->check()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Non authentifié.'], 401);
            }

            return redirect()->route('v6.login');
        }

        return $next($request);
    }
}
