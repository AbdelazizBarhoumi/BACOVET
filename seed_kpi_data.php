<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$pageData = json_decode(file_get_contents(storage_path('app/public/page-data.json')), true);
$now = now();

$modules = ['production', 'production:confection', 'production:coupe', 'production:flux'];
$updated = 0;
$created = 0;

foreach ($modules as $module) {
    $kpis = $pageData[$module]['kpis'] ?? [];
    foreach ($kpis as $kpiCode => $kpiDef) {
        $variables = $kpiDef['variables'] ?? [];
        foreach ($variables as $var) {
            $varKey = $var['variable_key'] ?? null;
            $endpoint = $var['endpoint'] ?? null;
            if (!$endpoint) continue; // skip variables with no endpoint
            $varType = $var['variable_type'] ?? 'Direct';
            $rawData = $var['raw_data'] ?? [];
            $extracted = $var['value'] ?? null;

            // Compute value for Complex (first matching row)
            $computedValue = $extracted;
            if ($varType === 'Complex' && is_array($rawData) && !empty($rawData) && $varKey) {
                foreach ($rawData as $row) {
                    if (is_array($row) && array_key_exists($varKey, $row)) {
                        $computedValue = $row[$varKey];
                        break;
                    }
                }
            }

            $existing = \App\Models\KpiData::where('kpi_code', $kpiCode)
                ->when($varKey === null, fn($q) => $q->whereNull('variable_key'), fn($q) => $q->where('variable_key', $varKey))
                ->first();

            $payload = [
                'endpoint' => $endpoint,
                'variable_type' => $varType,
                'refresh_frequency' => 'instant',
                'response_data' => ['raw' => $rawData, 'extracted' => $extracted],
                'computed_data' => ['value' => $computedValue],
                'last_status' => 'ok',
                'last_error' => null,
                'last_synced_at' => $now,
                'last_valid_synced_at' => $now,
            ];

            if ($existing) {
                $existing->update($payload);
                $updated++;
            } else {
                \App\Models\KpiData::create(array_merge([
                    'kpi_code' => $kpiCode,
                    'variable_key' => $varKey,
                ], $payload));
                $created++;
            }
        }
    }
}

echo "Done: {$updated} updated, {$created} created" . PHP_EOL;
echo "Total kpi_data rows: " . \App\Models\KpiData::count() . PHP_EOL;
echo "Rows with status=ok: " . \App\Models\KpiData::where('last_status', 'ok')->count() . PHP_EOL;
