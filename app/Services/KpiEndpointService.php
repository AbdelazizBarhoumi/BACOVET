<?php

namespace App\Services;

use App\Jobs\SyncKpiEndpointJob;
use App\Models\KpiData;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KpiEndpointService
{
    private string $baseUrl;
    private string $apiKey;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = (string) config('novacity.base_url');
        $this->apiKey = (string) config('novacity.api_key');
        $this->timeout = (int) config('novacity.timeout', 30);
    }

    /**
     * Sync all endpoints for a given frequency (or all if null).
     */
    public function syncByFrequency(?string $frequency = null): array
    {
        $results = ['ok' => 0, 'error' => 0, 'skipped' => 0];
        $endpoints = config('endpoints', []);

        foreach ($endpoints as $endpointPath => $endpointConfig) {
            $endpointFreq = $endpointConfig['refresh_frequency'] ?? 'instant';

            if ($frequency !== null && $endpointFreq !== $frequency) {
                $results['skipped']++;
                continue;
            }

            foreach ($endpointConfig['keys'] ?? [] as $keyConfig) {
                $keyFreq = $keyConfig['refresh_frequency'] ?? $endpointFreq;
                if ($frequency !== null && $keyFreq !== $frequency) {
                    $results['skipped']++;
                    continue;
                }

                foreach ($keyConfig['kpis'] ?? [] as $kpiCode) {
                    try {
                        $this->syncKpiFromEndpoint(
                            $endpointPath,
                            $endpointConfig,
                            $keyConfig,
                            $kpiCode
                        );
                        $results['ok']++;
                    } catch (\Throwable $e) {
                        Log::error("KpiEndpointService [{$kpiCode}]: {$e->getMessage()}");
                        $this->recordError($endpointPath, $keyConfig, $kpiCode, $e->getMessage());
                        $results['error']++;
                    }
                }
            }
        }

        // Pre-compute KPI results after sync
        $computer = new KpiResultComputer();
        $modules = array_unique(array_map(fn($ep) => $ep['module'] ?? 'production', array_values(config('endpoints', []))));
        foreach ($modules as $module) {
            $computer->computeModule($module);
        }

        return $results;
    }

    /**
     * Dispatch all matching endpoints to the queue for parallel execution.
     */
    public function dispatchByFrequency(?string $frequency = null): array
    {
        $dispatched = 0;
        $skipped = 0;
        $endpoints = config('endpoints', []);

        foreach ($endpoints as $endpointPath => $endpointConfig) {
            $endpointFreq = $endpointConfig['refresh_frequency'] ?? 'instant';

            if ($frequency !== null && $endpointFreq !== $frequency) {
                $skipped++;
                continue;
            }

            foreach ($endpointConfig['keys'] ?? [] as $keyConfig) {
                $keyFreq = $keyConfig['refresh_frequency'] ?? $endpointFreq;
                if ($frequency !== null && $keyFreq !== $frequency) {
                    $skipped++;
                    continue;
                }

                foreach ($keyConfig['kpis'] ?? [] as $kpiCode) {
                    SyncKpiEndpointJob::dispatch(
                        $endpointPath,
                        $endpointConfig,
                        $keyConfig,
                        $kpiCode
                    );
                    $dispatched++;
                }
            }
        }

        return ['dispatched' => $dispatched, 'skipped' => $skipped];
    }

    public function syncKpiFromEndpoint(
        string $endpointPath,
        array $endpointConfig,
        array $keyConfig,
        string $kpiCode,
    ): void {
        $responseData = $this->fetchEndpointData($endpointPath);

        $variableKey = $keyConfig['variable_key'] ?? null;
        $extractedValue = $this->extractKeyValue($responseData, $variableKey, $keyConfig);

        // Validate: if a variable key was configured, it must be found in the response
        if ($variableKey !== null && empty($responseData)) {
            throw new \RuntimeException(
                "Empty response data for {$endpointPath} (expected key: {$variableKey})"
            );
        }

        if ($variableKey !== null
            && ($keyConfig['variable_type'] ?? 'Direct') !== 'Complex'
            && isset($extractedValue['count'])
            && $extractedValue['count'] === 0
        ) {
            throw new \RuntimeException(
                "Key '{$variableKey}' not found in response from {$endpointPath}"
            );
        }

        if ($variableKey !== null
            && ($keyConfig['variable_type'] ?? 'Direct') === 'Complex'
            && array_key_exists('extracted', $extractedValue)
            && $extractedValue['extracted'] === null
        ) {
            throw new \RuntimeException(
                "Key '{$variableKey}' not found in response from {$endpointPath}"
            );
        }

        $computedData = $this->computeKpi($variableKey, $extractedValue, $keyConfig);

        // Build query to find existing row (handle null variable_key)
        $query = KpiData::where('kpi_code', $kpiCode);
        if ($variableKey === null) {
            $query->whereNull('variable_key');
        } else {
            $query->where('variable_key', $variableKey);
        }

        $existing = $query->first();

        if ($existing) {
            $existing->update([
                'endpoint' => $endpointPath,
                'variable_type' => $keyConfig['variable_type'] ?? 'Direct',
                'refresh_frequency' => $keyConfig['refresh_frequency'] ?? $endpointConfig['refresh_frequency'] ?? 'instant',
                'response_data' => $extractedValue,
                'computed_data' => $computedData,
                'last_status' => 'ok',
                'last_error' => null,
                'last_synced_at' => now(),
                'last_valid_synced_at' => now(),
            ]);
        } else {
            KpiData::create([
                'kpi_code' => $kpiCode,
                'variable_key' => $variableKey,
                'endpoint' => $endpointPath,
                'variable_type' => $keyConfig['variable_type'] ?? 'Direct',
                'refresh_frequency' => $keyConfig['refresh_frequency'] ?? $endpointConfig['refresh_frequency'] ?? 'instant',
                'response_data' => $extractedValue,
                'computed_data' => $computedData,
                'last_status' => 'ok',
                'last_error' => null,
                'last_synced_at' => now(),
                'last_valid_synced_at' => now(),
            ]);
        }
    }

    private function fetchEndpointData(string $endpointPath): array
    {
        $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
            ])
            ->timeout($this->timeout)
            ->get("{$this->baseUrl}/{$endpointPath}");

        if ($response->failed()) {
            $status = $response->status();
            $body = '';
            try {
                $decoded = $response->json();
                $body = is_array($decoded) ? json_encode($decoded) : (string) $decoded;
            } catch (\Throwable) {
                $body = $response->body();
            }
            $body = mb_substr($body, 0, 500);
            throw new \RuntimeException("HTTP {$status} from {$endpointPath}" . ($body ? ": {$body}" : ''));
        }

        $body = $response->json();

        if (isset($body['success']) && ! $body['success']) {
            $detail = is_array($body['error'] ?? null) ? json_encode($body['error']) : ($body['error'] ?? $body['message'] ?? 'unknown');
            throw new \RuntimeException("API returned success:false for {$endpointPath}" . ($detail ? ": {$detail}" : ''));
        }

        return $body['data'] ?? [];
    }

    private function extractKeyValue(array $responseData, ?string $variableKey, array $keyConfig): array
    {
        if (empty($responseData)) {
            return ['raw' => null, 'extracted' => null];
        }

        // If no variable key, return the raw response data as-is
        if ($variableKey === null) {
            return ['raw' => $responseData, 'extracted' => null, 'note' => 'no_variable_key'];
        }

        if (($keyConfig['variable_type'] ?? 'Direct') === 'Complex') {
            $extracted = $this->extractNestedValue($responseData, $variableKey);

            return ['raw' => $responseData, 'extracted' => $extracted];
        }

        $values = [];
        foreach ($responseData as $row) {
            if (is_array($row) && array_key_exists($variableKey, $row)) {
                $values[] = $row[$variableKey];
            }
        }

        return [
            'raw' => $responseData,
            'extracted' => $values,
            'count' => count($values),
        ];
    }

    private function extractNestedValue(array $data, string $key): mixed
    {
        foreach ($data as $row) {
            if (is_array($row) && array_key_exists($key, $row)) {
                return $row[$key];
            }
        }

        return null;
    }

    private function computeKpi(?string $variableKey, array $extractedValue, array $keyConfig): array
    {
        $value = $extractedValue['extracted'] ?? null;
        if (is_array($value)) {
            $value = reset($value);
        }

        return [
            'value' => $value,
            'variable_key' => $variableKey,
            'variable_type' => $keyConfig['variable_type'] ?? 'Direct',
            'fn' => $keyConfig['fn'] ?? 'Latest',
            'is_filtered' => $keyConfig['is_filtered'] ?? false,
            'filter_key' => $keyConfig['filter_key'] ?? null,
            'filter_value' => $keyConfig['filter_value'] ?? null,
        ];
    }

    public function recordError(string $endpoint, array $keyConfig, string $kpiCode, string $error): void
    {
        $variableKey = $keyConfig['variable_key'] ?? null;

        $query = KpiData::where('kpi_code', $kpiCode);
        if ($variableKey === null) {
            $query->whereNull('variable_key');
        } else {
            $query->where('variable_key', $variableKey);
        }

        $existing = $query->first();

        if ($existing) {
            $existing->update([
                'endpoint' => $endpoint,
                'variable_type' => $keyConfig['variable_type'] ?? 'Direct',
                'refresh_frequency' => $keyConfig['refresh_frequency'] ?? 'instant',
                'last_status' => 'error',
                'last_error' => $error,
                'last_synced_at' => now(),
            ]);
        } else {
            KpiData::create([
                'kpi_code' => $kpiCode,
                'variable_key' => $variableKey,
                'endpoint' => $endpoint,
                'variable_type' => $keyConfig['variable_type'] ?? 'Direct',
                'refresh_frequency' => $keyConfig['refresh_frequency'] ?? 'instant',
                'last_status' => 'error',
                'last_error' => $error,
                'last_synced_at' => now(),
            ]);
        }
    }
}
