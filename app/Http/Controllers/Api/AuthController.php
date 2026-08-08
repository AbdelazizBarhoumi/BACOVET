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
                'action_type' => 'LOGIN_FAILED',
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
            'action_type' => 'LOGIN',
            'message' => 'Connexion utilisateur: '.($user->matricule ?? $user->email)." depuis {$request->ip()}",
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'Authentification réussie.',
                'redirect' => $user->must_change_password
                    ? '/change-password'
                    : (User::DEFAULT_REDIRECT[$user->role->slug] ?? '/'),
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'matricule' => $user->matricule,
                    'role' => $user->role->slug,
                    'must_change_password' => $user->must_change_password,
                ],
            ]);
        }

        if ($user->must_change_password) {
            return redirect()->route('change-password');
        }

        return redirect()->intended(User::DEFAULT_REDIRECT[$user->role->slug] ?? '/');
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $sessionDuration = null;
        if ($user && $user->last_login_at) {
            $sessionDuration = $user->last_login_at->diffInSeconds(now());
        }

        AuditLog::create([
            'user_id' => $user?->id,
            'action_type' => 'LOGOUT',
            'message' => sprintf(
                'Déconnexion: %s (durée session: %ds)',
                $user?->matricule ?? 'unknown',
                $sessionDuration ?? 0,
            ),
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
            'must_change_password' => $user->must_change_password,
            'default_redirect' => User::DEFAULT_REDIRECT[$user->role->slug] ?? '/',
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:4|confirmed',
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => 'Le mot de passe actuel est incorrect.',
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
        ]);

        AuditLog::create([
            'user_id' => $user->id,
            'action_type' => 'INFO',
            'message' => 'Mot de passe modifié pour: '.($user->matricule ?? $user->email),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'Mot de passe modifié avec succès.',
            'redirect' => User::DEFAULT_REDIRECT[$user->role->slug] ?? '/',
        ]);
    }
}
