<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class ScheduleController extends Controller
{
    public function run(Request $request): JsonResponse
    {
        if (! $this->enabled()) {
            return response()->json(['message' => 'Planificateur webhook désactivé.'], 403);
        }

        $providedToken = $request->header('X-Schedule-Token', (string) $request->query('token'));
        $expectedToken = (string) config('schedule.token');

        if ($expectedToken === '' || ! hash_equals($expectedToken, $providedToken)) {
            return response()->json(['message' => 'Token du planificateur invalide.'], 403);
        }

        try {
            $exitCode = Artisan::call('schedule:run', []);
            $output = trim((string) Artisan::output());
        } catch (\Throwable $e) {
            AuditLog::create([
                'user_id' => null,
                'action_type' => 'SYSTEM',
                'message' => "Planificateur en échec (exception): schedule:run — {$e->getMessage()}",
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'command' => 'schedule:run',
                'exit_code' => 1,
                'output' => null,
                'error' => $e->getMessage(),
            ]);
        }

        AuditLog::create([
            'user_id' => null,
            'action_type' => 'SYSTEM',
            'message' => "Planificateur exécuté via webhook: schedule:run — code {$exitCode}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => $exitCode === 0,
            'command' => 'schedule:run',
            'exit_code' => $exitCode,
            'output' => $output,
            'error' => $exitCode === 0 ? null : ($output ?: "Le planificateur a échoué avec le code {$exitCode}."),
        ]);
    }

    private function enabled(): bool
    {
        return (bool) config('schedule.enabled', false);
    }
}