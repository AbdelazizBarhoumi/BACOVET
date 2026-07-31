<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureV5Authenticated
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::guard('v5_users')->check()) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Non authentifié.'], 401);
            }

            return redirect()->route('v5.login');
        }

        return $next($request);
    }
}
