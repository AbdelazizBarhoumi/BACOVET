<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DataUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DataAuthController extends Controller
{
    public function check(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => 'required|email']);

        $user = DataUser::where('email', $validated['email'])->first();
        if (! $user) {
            return response()->json(['message' => 'Email inconnu.'], 404);
        }

        return response()->json([
            'email' => $user->email,
            'name' => $user->name,
            'has_password' => $user->has_password,
        ]);
    }

    public function setPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string|min:4|max:100',
        ]);

        $user = DataUser::where('email', $validated['email'])->first();
        if (! $user) {
            return response()->json(['message' => 'Email inconnu.'], 404);
        }

        $user->update([
            'password' => bcrypt($validated['password']),
            'has_password' => true,
        ]);

        Auth::guard('data_users')->login($user);

        return response()->json([
            'user' => [
                'name' => $user->name,
                'role' => $user->role,
                'email' => $user->email,
            ],
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = DataUser::where('email', $validated['email'])->first();
        if (! $user) {
            return response()->json(['message' => 'Email inconnu.'], 401);
        }

        if (! $user->has_password || ! password_verify($validated['password'], $user->password)) {
            return response()->json(['message' => 'Mot de passe incorrect.'], 401);
        }

        Auth::guard('data_users')->login($user);

        return response()->json([
            'user' => [
                'name' => $user->name,
                'role' => $user->role,
                'email' => $user->email,
            ],
        ]);
    }

    public function logout(): JsonResponse
    {
        Auth::guard('data_users')->logout();
        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = Auth::guard('data_users')->user();
        if (! $user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        return response()->json([
            'name' => $user->name,
            'role' => $user->role,
            'email' => $user->email,
        ]);
    }
}
