<?php

namespace App\Console\Commands;

use App\Models\KpiData;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Client\Pool;

class SyncInstantEndpoints extends Command
{
    protected $signature = 'sync:instant-endpoints';

    protected $description = 'Fetch all instant KPI endpoints concurrently via HTTP pool and update DB';

    public function handle(): int
    {
        $baseUrl = (string) config('novacity.base_url');
        $apiKey = (string) config('novacity.api_key');
        $timeout = (int) config('novacity.timeout', 30);
        $endpoints = config('endpoints', []);

        // Group tasks by endpoint path so each external API URL is fetched only once
        $grouped = [];
        foreach ($endpoints as $endpointPath => $endpointConfig) {
            foreach ($endpointConfig['keys'] ?? [] as $keyConfig) {
                $freq = $keyConfig['refresh_frequency'] ?? $endpointConfig['refresh_frequency'] ?? 'instant';
                if ($freq !== 'instant') {
                    continue;
                }

                foreach ($keyConfig['kpis'] ?? [] as $kpiCode) {
                    $grouped[$endpointPath][] = [
                        'endpoint' => $endpointPath,
                        'kpi_code' => $kpiCode,
                        'variable_key' => $keyConfig['variable_key'] ?? null,
                        'variable_type' => $keyConfig['variable_type'] ?? 'Direct',
                        'key_config' => $keyConfig,
                        'endpoint_config' => $endpointConfig,
                    ];
                }
            }
        }

        if (empty($grouped)) {
            $this->warn('No instant tasks found.');
            return self::SUCCESS;
        }

        $totalTasks = array_sum(array_map('count', $grouped));
        $uniqueEndpoints = count($grouped);
        $this->info("Processing {$totalTasks} tasks across {$uniqueEndpoints} unique endpoints...");

        $start = microtime(true);
        $syncedAt = now();

        // Fire one HTTP request per unique endpoint path
        $endpointPaths = array_keys($grouped);
        $responses = Http::pool(function (Pool $pool) use ($endpointPaths, $baseUrl, $apiKey, $timeout) {
            foreach ($endpointPaths as $i => $endpointPath) {
                $pool->as($i)
                    ->withHeaders(['x-api-key' => $apiKey])
                    ->timeout($timeout)
                    ->get("{$baseUrl}/{$endpointPath}");
            }
        });

        // Process each endpoint response and extract all tasks from it
        $ok = 0;
        $errors = 0;
        foreach ($endpointPaths as $i => $endpointPath) {
            $response = $responses[$i];
            $tasks = $grouped[$endpointPath];

            // Validate response once per endpoint
            $endpointError = null;
            $data = null;

            try {
                if ($response instanceof \Illuminate\Http\Client\ConnectionException) {
                    $endpointError = $response->getMessage();
                } elseif ($response->failed()) {
                    $status = $response->status();
                    $body = '';
                    try {
                        $decoded = $response->json();
                        $body = is_array($decoded) ? json_encode($decoded) : (string) $decoded;
                    } catch (\Throwable) {
                        $body = $response->body();
                    }
                    $body = mb_substr($body, 0, 500);
                    $endpointError = "HTTP {$status}" . ($body ? ": {$body}" : '');
                } else {
                    $body = $response->json();
                    if (isset($body['success']) && ! $body['success']) {
                        $detail = is_array($body['error'] ?? null)
                            ? json_encode($body['error'])
                            : ($body['error'] ?? $body['message'] ?? 'unknown');
                        $endpointError = "API success:false" . ($detail ? ": {$detail}" : '');
                    } else {
                        $data = $body['data'] ?? [];
                    }
                }
            } catch (\Throwable $e) {
                $endpointError = $e->getMessage();
            }

            // If the endpoint itself failed, error all tasks for it
            if ($endpointError !== null) {
                foreach ($tasks as $task) {
                    $this->recordError($task, $endpointError, $syncedAt);
                    $errors++;
                }
                continue;
            }

            // Endpoint succeeded — extract each task's key from the single response
            foreach ($tasks as $task) {
                try {
                    if (empty($data) && $task['variable_key'] !== null) {
                        $this->recordError($task, "Empty response data for {$task['endpoint']} (expected key: {$task['variable_key']})", $syncedAt);
                        $errors++;
                        continue;
                    }

                    $extracted = $this->extractValue($data, $task['variable_key'], $task['key_config']);

                    if ($task['variable_key'] !== null
                        && ($task['variable_type'] ?? 'Direct') !== 'Complex'
                        && isset($extracted['count'])
                        && $extracted['count'] === 0
                    ) {
                        $this->recordError($task, "Key '{$task['variable_key']}' not found in response from {$task['endpoint']}", $syncedAt);
                        $errors++;
                        continue;
                    }

                    if ($task['variable_key'] !== null
                        && ($task['variable_type'] ?? 'Direct') === 'Complex'
                        && array_key_exists('extracted', $extracted)
                        && $extracted['extracted'] === null
                    ) {
                        $this->recordError($task, "Key '{$task['variable_key']}' not found in response from {$task['endpoint']}", $syncedAt);
                        $errors++;
                        continue;
                    }

                    $computed = $this->computeValue($task['variable_key'], $extracted, $task['key_config']);
                    $this->recordSuccess($task, $extracted, $computed, $syncedAt);
                    $ok++;
                } catch (\Throwable $e) {
                    $this->recordError($task, $e->getMessage(), $syncedAt);
                    $errors++;
                }
            }
        }

        $elapsed = round(microtime(true) - $start, 2);
        $this->info("Done: {$ok} ok, {$errors} errors | {$elapsed}s ({$uniqueEndpoints} HTTP calls instead of {$totalTasks})");

        // Pre-compute KPI results (formula, row-by-row, status) for all production modules
        $this->info("Computing KPI results...");
        $computer = new \App\Services\KpiResultComputer();
        foreach (['production:confection', 'production:coupe', 'production:flux', 'production'] as $module) {
            $computer->computeModule($module);
        }
        $this->info("KPI results computed.");

        return self::SUCCESS;
    }

    private function recordSuccess(array $task, array $extracted, array $computed, $syncedAt): void
    {
        $variableKey = $task['variable_key'] ?? null;

        $query = KpiData::where('kpi_code', $task['kpi_code']);
        if ($variableKey === null) {
            $query->whereNull('variable_key');
        } else {
            $query->where('variable_key', $variableKey);
        }

        $existing = $query->first();

        $payload = [
            'endpoint' => $task['endpoint'],
            'variable_type' => $task['variable_type'],
            'refresh_frequency' => 'instant',
            'response_data' => $extracted,
            'computed_data' => $computed,
            'last_status' => 'ok',
            'last_error' => null,
            'last_synced_at' => $syncedAt,
            'last_valid_synced_at' => $syncedAt,
        ];

        if ($existing) {
            $existing->update($payload);
        } else {
            KpiData::create(array_merge([
                'kpi_code' => $task['kpi_code'],
                'variable_key' => $variableKey,
            ], $payload));
        }
    }

    private function recordError(array $task, string $error, $syncedAt): void
    {
        $variableKey = $task['variable_key'] ?? null;

        $query = KpiData::where('kpi_code', $task['kpi_code']);
        if ($variableKey === null) {
            $query->whereNull('variable_key');
        } else {
            $query->where('variable_key', $variableKey);
        }

        $existing = $query->first();

        $payload = [
            'endpoint' => $task['endpoint'],
            'variable_type' => $task['variable_type'],
            'refresh_frequency' => 'instant',
            'last_status' => 'error',
            'last_error' => mb_substr($error, 0, 2000),
            'last_synced_at' => $syncedAt,
        ];

        if ($existing) {
            $existing->update($payload);
        } else {
            KpiData::create(array_merge([
                'kpi_code' => $task['kpi_code'],
                'variable_key' => $variableKey,
            ], $payload));
        }
    }

    private function extractValue(array $data, ?string $variableKey, array $keyConfig): array
    {
        if (empty($data)) {
            return ['raw' => null, 'extracted' => null];
        }

        if ($variableKey === null) {
            return ['raw' => $data, 'extracted' => null, 'note' => 'no_variable_key'];
        }

        if (($keyConfig['variable_type'] ?? 'Direct') === 'Complex') {
            foreach ($data as $row) {
                if (is_array($row) && array_key_exists($variableKey, $row)) {
                    return ['raw' => $data, 'extracted' => $row[$variableKey]];
                }
            }
            return ['raw' => $data, 'extracted' => null];
        }

        $values = [];
        foreach ($data as $row) {
            if (is_array($row) && array_key_exists($variableKey, $row)) {
                $values[] = $row[$variableKey];
            }
        }

        return ['raw' => $data, 'extracted' => $values, 'count' => count($values)];
    }

    private function computeValue(?string $variableKey, array $extracted, array $keyConfig): array
    {
        $value = $extracted['extracted'] ?? null;
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
}
