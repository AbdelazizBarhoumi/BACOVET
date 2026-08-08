<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->must_change_password) {
            if ($request->is('change-password') || $request->is('auth/logout')) {
                return $next($request);
            }

            if ($request->expectsJson()) {
                return response()->json(['message' => 'Veuillez changer votre mot de passe.', 'redirect' => '/change-password'], 302);
            }

            return redirect()->route('change-password');
        }

        return $next($request);
    }
}
