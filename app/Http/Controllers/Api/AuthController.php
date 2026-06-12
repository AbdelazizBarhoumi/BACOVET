<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'matricule' => 'required|string',
            'password' => 'required|string',
        ]);

        $key = 'login:'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            throw ValidationException::withMessages([
                'matricule' => "Trop de tentatives. Réessayez dans {$seconds} secondes.",
            ]);
        }

        $user = User::with('role')
            ->where('matricule', $request->matricule)
            ->orWhere('email', $request->matricule)
            ->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key);
            AuditLog::create([
                'user_id' => null,
                'action_type' => 'WARN',
                'message' => "Échec connexion — Matricule: {$request->matricule}",
                'ip_address' => $request->ip(),
            ]);

            throw ValidationException::withMessages([
                'matricule' => 'Matricule ou mot de passe incorrect.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'matricule' => 'Ce compte est actuellement désactivé.',
            ]);
        }

        RateLimiter::clear($key);

        Auth::login($user);
        $request->session()->regenerate();

        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action_type' => 'USER',
            'message' => "Connexion utilisateur: {$user->matricule} depuis {$request->ip()}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Authentification réussie.',
                'redirect' => User::DEFAULT_REDIRECT[$user->role->slug] ?? '/quality',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'matricule' => $user->matricule,
                    'role' => $user->role->slug,
                ],
            ]);
        }

        return redirect()->intended(User::DEFAULT_REDIRECT[$user->role->slug] ?? '/quality');
    }

    public function logout(Request $request)
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action_type' => 'USER',
            'message' => "Déconnexion: {$request->user()?->matricule}",
            'ip_address' => $request->ip(),
        ]);

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('role');

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'matricule' => $user->matricule,
            'role' => $user->role->slug,
            'role_label' => $user->role->name,
            'default_redirect' => User::DEFAULT_REDIRECT[$user->role->slug] ?? '/quality',
        ]);
    }
}
