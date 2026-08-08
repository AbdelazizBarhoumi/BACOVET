<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Validation\ValidationException;

class MaintenanceController extends Controller
{
    public function commands(): JsonResponse
    {
        if (! $this->enabled()) {
            return response()->json(['message' => 'Panneau de maintenance désactivé.'], 403);
        }

        return response()->json(['commands' => config('maintenance.commands', [])]);
    }

    public function start(Request $request): JsonResponse
    {
        if (! $this->enabled()) {
            return response()->json(['message' => 'Panneau de maintenance désactivé.'], 403);
        }

        $validated = $request->validate([
            'command' => 'required|string',
            'token' => 'required|string',
        ]);

        $expectedToken = (string) config('maintenance.token');

        if ($expectedToken === '' || ! hash_equals($expectedToken, (string) $validated['token'])) {
            return response()->json(['message' => 'Token de maintenance invalide.'], 403);
        }

        $command = collect(config('maintenance.commands', []))->firstWhere('id', $validated['command']);

        if (! $command || empty($command['signature'])) {
            throw ValidationException::withMessages([
                'command' => 'Commande inconnue ou non autorisée.',
            ]);
        }

        [$signature, $params] = $this->parseSignature((string) $command['signature']);

        try {
            $exitCode = Artisan::call($signature, $params);
            $output = trim((string) Artisan::output());
        } catch (\Throwable $e) {
            AuditLog::create([
                'user_id' => $request->user()?->id,
                'action_type' => 'SYSTEM',
                'message' => "Commande artisan en échec (exception): {$command['label']} ({$command['signature']}) — {$e->getMessage()}",
                'ip_address' => $request->ip(),
            ]);

            return response()->json([
                'success' => false,
                'command' => $command['signature'],
                'label' => $command['label'],
                'exit_code' => 1,
                'output' => null,
                'error' => $e->getMessage(),
            ]);
        }

        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action_type' => 'SYSTEM',
            'message' => "Commande artisan lancée: {$command['label']} ({$command['signature']}) — code {$exitCode}",
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'success' => $exitCode === 0,
            'command' => $command['signature'],
            'label' => $command['label'],
            'exit_code' => $exitCode,
            'output' => $output,
            'error' => $exitCode === 0 ? null : ($output ?: "La commande a échoué avec le code {$exitCode}."),
        ]);
    }

    private function enabled(): bool
    {
        return (bool) config('maintenance.enabled', false);
    }

    private function parseSignature(string $signature): array
    {
        $parts = preg_split('/\s+/', trim($signature)) ?: [];
        $command = (string) array_shift($parts);
        $params = [];

        foreach ($parts as $part) {
            if ($part === '') {
                continue;
            }

            if (str_starts_with($part, '--')) {
                $arg = substr($part, 2);

                if (str_contains($arg, '=')) {
                    [$key, $value] = explode('=', $arg, 2);
                    $params['--'.$key] = $value;
                } else {
                    $params['--'.$arg] = true;
                }
            }
        }

        return [$command, $params];
    }
}
