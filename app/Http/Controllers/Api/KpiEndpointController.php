<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\KpiData;
use App\Services\KpiEndpointService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KpiEndpointController extends Controller
{
    public function __construct(
        private KpiEndpointService $service,
    ) {}

    public function index(): JsonResponse
    {
        $endpoints = config('endpoints', []);
        $rows = [];

        foreach ($endpoints as $endpointPath => $endpointConfig) {
            foreach ($endpointConfig['keys'] ?? [] as $keyConfig) {
                foreach ($keyConfig['kpis'] ?? [] as $kpiCode) {
                    $query = KpiData::where('kpi_code', $kpiCode);
                    if ($keyConfig['variable_key'] === null) {
                        $query->whereNull('variable_key');
                    } else {
                        $query->where('variable_key', $keyConfig['variable_key']);
                    }
                    $dbRow = $query->first();

                    $status = $dbRow?->last_status ?? 'pending';
                    $error = $dbRow?->last_error;
                    $lastSynced = $dbRow?->last_synced_at;
                    $freq = $keyConfig['refresh_frequency'] ?? $endpointConfig['refresh_frequency'] ?? 'instant';

                    // Build diagnostic string
                    $diagnostic = $status;
                    $rowClass = '';
                    if ($status === 'error' && $error) {
                        $diagnostic = mb_substr($error, 0, 120);
                        $rowClass = 'bg-destructive/5';
                    } elseif ($status === 'pending' && ! $lastSynced) {
                        $diagnostic = 'never_synced';
                        $rowClass = 'bg-muted/30';
                    } elseif ($status === 'pending') {
                        $diagnostic = 'pending_retry';
                    } elseif ($status === 'ok' && $lastSynced) {
                        $age = $lastSynced->diffInSeconds(now());
                        $maxAge = match ($freq) {
                            'instant' => 60,
                            'daily' => 172800,
                            'weekly' => 1209600,
                            'monthly' => 5184000,
                            default => 60,
                        };
                        if ($age > $maxAge) {
                            $ageStr = $age >= 60 ? gmdate('i\m', min($age, 3600)) : "{$age}s";
                            $diagnostic = 'stale (' . $ageStr . ')';
                            $rowClass = 'bg-warning/5';
                        }
                    }

                    $extractedValue = $dbRow?->response_data['extracted'] ?? null;
                    if (is_array($extractedValue)) {
                        $extractedValue = count($extractedValue) . ' rows';
                    }

                    $rows[] = [
                        'endpoint' => $endpointPath,
                        'kpi_code' => $kpiCode,
                        'variable_key' => $keyConfig['variable_key'],
                        'variable_type' => $keyConfig['variable_type'] ?? 'Direct',
                        'refresh_frequency' => $freq,
                        'last_status' => $status,
                        'last_synced_at' => $lastSynced?->toISOString(),
                        'last_error' => $error,
                        'response_data' => $dbRow?->response_data,
                        'computed_data' => $dbRow?->computed_data,
                        'extracted_value' => $extractedValue,
                        'diagnostic' => $diagnostic,
                        'row_class' => $rowClass,
                    ];
                }
            }
        }

        return response()->json(['data' => $rows]);
    }

    public function show(string $kpiCode): JsonResponse
    {
        $rows = KpiData::where('kpi_code', $kpiCode)->get();

        if ($rows->isEmpty()) {
            return response()->json(['error' => 'KPI not found'], 404);
        }

        return response()->json(['data' => $rows]);
    }

    public function fire(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string',
            'kpi_code' => 'required|string',
            'variable_key' => 'nullable|string',
        ]);

        $endpoints = config('endpoints', []);
        $endpointPath = $request->input('endpoint');
        $endpointConfig = $endpoints[$endpointPath] ?? null;

        if (! $endpointConfig) {
            return response()->json(['error' => 'Endpoint not found in config'], 404);
        }

        $keyConfig = null;
        $requestKey = $request->input('variable_key');
        foreach ($endpointConfig['keys'] ?? [] as $key) {
            $match = ($key['variable_key'] === null && $requestKey === null)
                || ($key['variable_key'] !== null && $key['variable_key'] === $requestKey);
            if ($match) {
                $keyConfig = $key;
                break;
            }
        }

        if (! $keyConfig) {
            return response()->json(['error' => 'Variable key not found in endpoint config'], 404);
        }

        try {
            $this->service->syncKpiFromEndpoint(
                $endpointPath,
                $endpointConfig,
                $keyConfig,
                $request->input('kpi_code')
            );
            return response()->json(['message' => 'Synced successfully']);
        } catch (\Throwable $e) {
            $this->service->recordError(
                $endpointPath,
                $keyConfig,
                $request->input('kpi_code'),
                $e->getMessage()
            );
            return response()->json(['message' => 'Sync failed', 'error' => $e->getMessage()], 500);
        }
    }

    public function fireAll(Request $request): JsonResponse
    {
        $frequency = $request->input('frequency');

        // For instant: run the concurrent command directly (updates DB immediately)
        if ($frequency === 'instant' || $frequency === null) {
            $output = new \Symfony\Component\Console\Output\BufferedOutput();
            \Artisan::call('sync:instant-endpoints', [], $output);
            $line = $output->fetch();
            // Parse "Done: X ok, Y errors | Zs"
            if (preg_match('/Done:\s+(\d+)\s+ok,\s+(\d+)\s+errors/', $line, $m)) {
                return response()->json(['data' => ['dispatched' => (int) $m[1], 'skipped' => 0, 'errors' => (int) $m[2]]]);
            }
            return response()->json(['data' => ['dispatched' => 0, 'skipped' => 0]]);
        }

        // For other frequencies: dispatch to queue as before
        $results = $this->service->dispatchByFrequency($frequency);
        return response()->json(['data' => $results]);
    }
}
