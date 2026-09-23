<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\DetachedProcess;
use App\Support\SyncRunner;
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

            // Preferred path: detached schedule:run, non-blocking like before.
            // Fallback path: this host cannot spawn subprocesses at all
            // (jailed php-fpm) — run the datasets phase synchronously
            // in-request instead of reporting a success that never happens.
            $preflight = DetachedProcess::preflight();

            if ($preflight['ok']) {
                if (! DetachedProcess::mark($log, 'webhook schedule:run (php: '.$preflight['php_binary'].')')) {
                    throw new \RuntimeException('Impossible d’écrire dans '.$log);
                }

                DetachedProcess::spawn($log, ['schedule:run']);

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
                    'mode' => 'detached',
                    'message' => 'schedule:run lancé en arrière-plan — la requête ne bloque plus.',
                    'spawn' => $preflight,
                ]);
            }

            $result = SyncRunner::runDatasetsSynchronously();
            $output = trim($result['output']) !== ''
                ? $result['output']
                : 'Synchronisation terminée.';

            AuditLog::create([
                'user_id' => null,
                'action_type' => 'SYSTEM',
                'message' => 'Planificateur webhook: datasets synchronisés en direct (exit '.$result['exit_code'].')',
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => $result['exit_code'] === 0,
                'queued' => false,
                'command' => 'sync:endpoint-data --phase=datasets',
                'mode' => 'sync',
                'exit_code' => $result['exit_code'],
                'output' => mb_substr($output, 0, 4000),
                'spawn' => $preflight,
            ], $result['exit_code'] === 0 ? 200 : 500);
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
    }

    private function enabled(): bool
    {
        return (bool) config('schedule.enabled', false);
    }
}
