<?php

namespace App\Console\Commands;

use App\Models\DataMapping;
use Illuminate\Console\Command;

class ExportEndpoints extends Command
{
    protected $signature = 'export:endpoints {--output=config/endpoints.php : Output config file path}';

    protected $description = 'Export API endpoints config with their needed keys and refresh frequency';

    public function handle(): int
    {
        $rows = DataMapping::whereNotNull('endpoint')
            ->where('endpoint', '!=', '')
            ->whereNotNull('variable_key')
            ->where('variable_key', '!=', '')
            ->orderBy('endpoint')
            ->orderBy('kpi')
            ->get();

        if ($rows->isEmpty()) {
            $this->error('No endpoints found in data mappings.');
            return 1;
        }

        // Group by endpoint
        $grouped = $rows->groupBy('endpoint');

        $endpoints = [];

        foreach ($grouped as $endpoint => $epRows) {
            $keys = $epRows->map(fn ($row) => array_filter([
                'variable_key' => $row->variable_key,
                'variable_type' => $row->variable_type,
                'is_filtered' => $row->is_filtered,
                'filter_key' => $row->filter_key,
                'filter_value' => $row->filter_value,
                'has_function' => $row->has_function,
                'fn' => $row->fn,
                'refresh_frequency' => $row->refresh_frequency,
                'kpis' => collect([$row->kpi])->unique()->values()->all(),
            ], fn ($v) => $v !== null))->values()->all();

            // Pick the most restrictive frequency (highest priority)
            $freqOrder = ['instant' => 0, 'daily' => 1, 'weekly' => 2, 'monthly' => 3, 'yearly' => 4];
            $frequencies = collect($keys)->pluck('refresh_frequency')->filter()->unique()->values();
            $sortedFreq = $frequencies->sortBy(fn ($f) => $freqOrder[$f] ?? 99)->values();
            $primaryFrequency = $sortedFreq->first() ?? 'instant';

            $endpoints[$endpoint] = [
                'refresh_frequency' => $primaryFrequency,
                'all_frequencies' => $sortedFreq->all(),
                'keys' => $keys,
            ];
        }

        ksort($endpoints);

        $outputPath = base_path($this->option('output'));
        $dir = dirname($outputPath);

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $php = $this->buildConfig($endpoints);
        file_put_contents($outputPath, $php);

        $totalKeys = collect($endpoints)->sum(fn ($ep) => count($ep['keys']));

        $this->info("Exported endpoints config to {$outputPath}");
        $this->info("  Endpoints: " . count($endpoints));
        $this->info("  Total keys: {$totalKeys}");

        return 0;
    }

    private function buildConfig(array $endpoints): string
    {
        $lines = ['<?php', '', 'return ['];

        foreach ($endpoints as $endpoint => $data) {
            $lines[] = "    '{$endpoint}' => [";
            $lines[] = "        'refresh_frequency' => '{$data['refresh_frequency']}',";
            $lines[] = "        'all_frequencies' => [" . $this->exportValues($data['all_frequencies']) . "],";
            $lines[] = "        'keys' => [";

            foreach ($data['keys'] as $key) {
                $lines[] = "            [";
                $lines[] = "                'variable_key' => " . $this->exportScalar($key['variable_key'] ?? null) . ",";
                $lines[] = "                'variable_type' => " . $this->exportScalar($key['variable_type'] ?? null) . ",";
                $lines[] = "                'is_filtered' => " . (!empty($key['is_filtered']) ? 'true' : 'false') . ",";
                $lines[] = "                'filter_key' => " . $this->exportNullable($key['filter_key'] ?? null) . ",";
                $lines[] = "                'filter_value' => " . $this->exportNullable($key['filter_value'] ?? null) . ",";
                $lines[] = "                'has_function' => " . (!empty($key['has_function']) ? 'true' : 'false') . ",";
                $lines[] = "                'fn' => " . $this->exportScalar($key['fn'] ?? null) . ",";
                $lines[] = "                'refresh_frequency' => " . $this->exportScalar($key['refresh_frequency'] ?? null) . ",";
                $lines[] = "                'kpis' => [" . $this->exportValues($key['kpis'] ?? []) . "],";
                $lines[] = "            ],";
            }

            $lines[] = "        ],";
            $lines[] = "    ],";
        }

        $lines[] = '];';
        $lines[] = '';

        return implode("\n", $lines);
    }

    private function exportValues(array $values): string
    {
        return implode(', ', array_map(fn ($v) => "'{$v}'", $values));
    }

    private function exportScalar($value): string
    {
        if ($value === null) {
            return 'null';
        }
        return is_string($value) ? "'{$value}'" : (string) $value;
    }

    private function exportNullable($value): string
    {
        return $value === null ? 'null' : "'{$value}'";
    }
}
