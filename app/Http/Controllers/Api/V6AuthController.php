<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\V6User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class V6AuthController extends Controller
{
    public function check(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => 'required|email']);
        $user = V6User::where('email', $validated['email'])->first();
        if (! $user) {
            return response()->json(['message' => 'Email inconnu.'], 404);
        }

        return response()->json(['email' => $user->email, 'name' => $user->name, 'has_password' => $user->has_password]);
    }

    public function setPassword(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => 'required|email', 'password' => 'required|string|min:4|max:100']);
        $user = V6User::where('email', $validated['email'])->first();
        if (! $user) {
            return response()->json(['message' => 'Email inconnu.'], 404);
        }
        $user->update(['password' => bcrypt($validated['password']), 'has_password' => true]);
        Auth::guard('v6_users')->login($user);

        return response()->json(['user' => $this->userData($user)]);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $user = V6User::where('email', $validated['email'])->first();
        if (! $user || ! $user->has_password || ! password_verify($validated['password'], (string) $user->password)) {
            return response()->json(['message' => 'Identifiants incorrects.'], 401);
        }
        Auth::guard('v6_users')->login($user);

        return response()->json(['user' => $this->userData($user)]);
    }

    public function logout(): JsonResponse
    {
        Auth::guard('v6_users')->logout();

        return response()->json(['message' => 'Déconnecté.']);
    }

    public function me(): JsonResponse
    {
        $user = Auth::guard('v6_users')->user();
        if (! $user) {
            return response()->json(['message' => 'Non authentifié.'], 401);
        }

        return response()->json($this->userData($user));
    }

    private function userData($user): array
    {
        return ['name' => $user->name, 'role' => $user->role, 'email' => $user->email];
    }
}
