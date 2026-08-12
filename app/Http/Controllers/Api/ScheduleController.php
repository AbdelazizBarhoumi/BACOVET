<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\DetachedProcess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            $log = storage_path('logs/schedule-run.log');

            DetachedProcess::spawn($log, ['schedule:run']);
        } catch (\Throwable $e) {
            AuditLog::create([
                'user_id' => null,
                'action_type' => 'SYSTEM',
                'message' => "Planificateur en échec (exception): schedule:run — {$e->getMessage()}",
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'queued' => false,
                'command' => 'schedule:run',
                'error' => $e->getMessage(),
            ]);
        }

        AuditLog::create([
            'user_id' => null,
            'action_type' => 'SYSTEM',
            'message' => 'Planificateur déclenché via webhook (détaché): schedule:run',
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => true,
            'queued' => true,
            'command' => 'schedule:run',
            'message' => 'schedule:run lancé en arrière-plan — la requête ne bloque plus.',
        ]);
    }

    private function enabled(): bool
    {
        return (bool) config('schedule.enabled', false);
    }
}
