<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{AuditLog, SyncSetting, User, NovacityJob, Screen};
use Illuminate\Http\{JsonResponse, Request};
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

class AdminController extends Controller
{
    public function __construct(private \App\Services\NovacityService $novacity) {}

    private function novacityAdminToken(): string
    {
        return (string) config('novacity.admin_token', 'SYSTEM_TOKEN');
    }

    public function listJobs(): JsonResponse
    {
        $jobs = $this->novacity->fetchJobs($this->novacityAdminToken());

        return response()->json([
            'data' => array_map(static function (array $job): array {
                return [
                    'id' => $job['id'] ?? null,
                    'name' => $job['nom'] ?? $job['label'] ?? '',
                    'query_slug' => $job['action_ref'] ?? null,
                    'source' => $job['source'] ?? 'OTHER',
                    'last_status' => $job['last_status'] ?? 'pending',
                    'last_run_at' => $job['last_run'] ?? null,
                    'last_error' => $job['last_message'] ?? null,
                    'is_active' => (bool) ($job['actif'] ?? true),
                ];
            }, $jobs),
        ]);
    }

    public function runJob(Request $request, int $id): JsonResponse
    {
        try {
            $localJob = NovacityJob::where('novacity_job_id', $id)->first();

            if (! $localJob) {
                // Try to find it in the remote list
                $remoteJobs = $this->novacity->fetchJobs($this->novacityAdminToken());
                $remoteJob = collect($remoteJobs)->firstWhere('id', $id);

                if (! $remoteJob) {
                    throw ValidationException::withMessages([
                        'job' => "Job Novacity {$id} introuvable ni localement ni sur Novacity.",
                    ]);
                }

                $localJob = NovacityJob::create([
                    'novacity_job_id' => $id,
                    'name'            => $remoteJob['nom'] ?? $remoteJob['label'] ?? 'Unknown Job',
                    'query_slug'      => $remoteJob['action_ref'] ?? null,
                    'source'          => $remoteJob['source'] ?? 'OTHER',
                    'is_active'       => (bool) ($remoteJob['actif'] ?? true),
                ]);
            }

            if (! $localJob->is_active) {
                throw ValidationException::withMessages([
                    'job' => "Job Novacity {$id} est inactif.",
                ]);
            }

            $result = $this->novacity->runJob($id, $this->novacityAdminToken());
            $data = $result['data'] ?? [];

            $externalStatus = strtolower((string) ($result['status'] ?? 'ok'));
            $localStatus = in_array($externalStatus, ['ok', 'error', 'inactive', 'pending'], true)
                ? $externalStatus
                : 'ok';

            $localJob->update([
                'last_run_at' => $result['ran_at'] ?? now(),
                'last_status' => $localStatus,
                'records_count' => is_array($data) ? count($data) : $localJob->records_count,
                'last_error' => null,
            ]);

            AuditLog::create([
                'user_id'     => $request->user()?->id,
                'action_type' => 'SYSTEM',
                'message'     => "Déclenchement manuel du job Novacity",
                'ip_address'  => $request->ip(),
            ]);

            return response()->json([
                'message' => "Job lancé avec succès sur Novacity.",
                'data' => $result
            ]);
        } catch (\Exception $e) {
            if ($e instanceof ValidationException) {
                throw $e;
            }

            $localJob = NovacityJob::where('novacity_job_id', $id)->first();
            if ($localJob) {
                $localJob->update([
                    'last_status' => 'error',
                    'last_error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'message' => "Erreur lors du lancement du job: " . $e->getMessage()
            ], 500);
        }
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

        if (!empty($validated['password'])) {
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
        $user->is_active = !$user->is_active;
        $user->save();
        return response()->json(['message' => 'User status toggled.', 'is_active' => $user->is_active]);
    }

    public function listScreens(): JsonResponse
    {
        return response()->json(Screen::all());
    }

    public function updateScreen(Request $request, int $id): JsonResponse
    {
        $screen = Screen::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'status' => 'sometimes|in:online,offline',
            'assigned_page' => 'sometimes|string',
        ]);

        $screen->update($validated);

        return response()->json(['message' => 'Screen updated successfully.', 'screen' => $screen]);
    }

    public function auditLogs(): JsonResponse
    {
        return response()->json(AuditLog::with('user')->orderBy('created_at', 'desc')->paginate(50));
    }

    public function clearAuditLogs(): JsonResponse
    {
        AuditLog::truncate();
        return response()->json(['message' => 'Audit logs cleared.']);
    }

    public function getSyncConfig(): JsonResponse
    {
        return response()->json(SyncSetting::all(['key', 'value', 'description', 'updated_at']));
    }

    public function updateSyncConfig(Request $request, string $key): JsonResponse
    {
        $request->validate([
            'value' => 'required|integer|min:60|max:3600', // 60s–1h range
        ]);

        $setting = SyncSetting::where('key', $key)->firstOrFail();
        $setting->update([
            'value'      => $request->value,
            'updated_by' => $request->user()->id,
        ]);

        // Bust the cache so scheduler picks it up within 30s
        Cache::forget("sync_setting:{$key}");

        AuditLog::create([
            'user_id'     => $request->user()->id,
            'action_type' => 'SYSTEM',
            'message'     => "Intervalle sync mis à jour: {$key} = {$request->value}s",
            'ip_address'  => $request->ip(),
        ]);

        return response()->json(['message' => 'Configuration mise à jour.', 'setting' => $setting->fresh()]);
    }

    public function updateKpiValue(Request $request, string $key): JsonResponse
    {
        // Placeholder for manual KPI value update
        return response()->json(['message' => 'KPI value updated (mock).']);
    }
}
