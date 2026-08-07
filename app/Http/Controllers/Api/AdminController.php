<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    public function __construct(private \App\Services\NovacityService $novacity) {}

    private function novacityAdminToken(): string
    {
        return (string) config('novacity.admin_token', 'SYSTEM_TOKEN');
    }

    public function listUsers(): JsonResponse
    {
        return response()->json(User::with('role')->get());
    }

    public function createUser(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'matricule' => 'required|string|max:50|unique:users,matricule',
            'email' => 'required|email|max:255|unique:users,email',
            'role' => 'required|string|exists:roles,slug',
            'password' => 'required|string|min:4',
            'active' => 'boolean',
        ]);

        $role = \App\Models\Role::where('slug', $validated['role'])->firstOrFail();

        $user = User::create([
            'name' => $validated['name'],
            'matricule' => $validated['matricule'],
            'email' => $validated['email'],
            'password' => \Illuminate\Support\Facades\Hash::make($validated['password']),
            'role_id' => $role->id,
            'is_active' => $validated['active'] ?? true,
        ]);

        return response()->json(['message' => 'User created successfully.', 'user' => $user->load('role')]);
    }

    public function updateUser(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'matricule' => "sometimes|string|max:50|unique:users,matricule,{$id}",
            'email' => "sometimes|email|max:255|unique:users,email,{$id}",
            'role' => 'sometimes|string|exists:roles,slug',
            'password' => 'nullable|string|min:4',
            'active' => 'boolean',
        ]);

        if (isset($validated['role'])) {
            $role = \App\Models\Role::where('slug', $validated['role'])->firstOrFail();
            $user->role_id = $role->id;
        }

        if (! empty($validated['password'])) {
            $user->password = \Illuminate\Support\Facades\Hash::make($validated['password']);
        }

        $user->update(collect($validated)->except(['role', 'password', 'active'])->toArray());

        if (isset($validated['active'])) {
            $user->is_active = $validated['active'];
        }

        $user->save();

        return response()->json(['message' => 'User updated successfully.', 'user' => $user->load('role')]);
    }

    public function toggleUser(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->is_active = ! $user->is_active;
        $user->save();

        return response()->json(['message' => 'User status toggled.', 'is_active' => $user->is_active]);
    }

    public function deleteUser(Request $request, int $id): JsonResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === $request->user()?->id) {
            throw ValidationException::withMessages([
                'user' => 'Vous ne pouvez pas supprimer votre propre compte.',
            ]);
        }

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action_type' => 'USER',
            'message' => "Utilisateur supprimé: {$user->name} ({$user->email})",
            'ip_address' => $request->ip(),
        ]);

        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    public function auditLogs(): JsonResponse
    {
        return response()->json(AuditLog::with('user')->orderBy('created_at', 'desc')->paginate(50));
    }

    public function createAuditLog(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'action_type' => 'required|string|max:50',
            'message' => 'required|string|max:1000',
        ]);

        $log = AuditLog::create([
            'user_id' => $request->user()?->id,
            'action_type' => $validated['action_type'],
            'message' => $validated['message'],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json(['message' => 'Audit entry created.', 'log' => $log]);
    }
}
