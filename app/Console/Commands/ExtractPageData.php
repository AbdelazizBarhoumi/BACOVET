<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ExtractPageData extends Command
{
    protected $signature = 'export:page-data {--output=storage/app/public/page-data.json : Output file path}';

    protected $description = 'Extract per-page data from data.json based on KPI variable mappings';

    public function handle(): int
    {
        $pages = config('data-mappings');

        if (empty($pages)) {
            $this->error('No data mappings found in config/data-mappings.php.');
            return 1;
        }

        $dataJsonPath = storage_path('app/public/data.json');

        if (!file_exists($dataJsonPath)) {
            $this->error("data.json not found at {$dataJsonPath}");
            return 1;
        }

        $rawJson = file_get_contents($dataJsonPath);
        $dataJson = json_decode($rawJson, true);

        if (!is_array($dataJson)) {
            $this->error('data.json is not a valid JSON array.');
            return 1;
        }

        // Build endpoint lookup: slug => response.data[]
        $endpointMap = $this->buildEndpointMap($dataJson);

        $output = [];
        $totalExtracted = 0;
        $totalMatched = 0;

        foreach ($pages as $module => $pageData) {
            $output[$module] = ['kpis' => []];

            foreach ($pageData['kpis'] ?? [] as $kpi) {
                $kpiCode = $kpi['kpi'];
                $kpiName = $kpi['name'] ?? '';
                $variables = [];

                foreach ($kpi['variables'] ?? [] as $var) {
                    $endpoint = $var['endpoint'] ?? null;
                    $variableKey = $var['variable_key'] ?? null;

                    $result = $this->extractVariable(
                        $endpointMap,
                        $endpoint,
                        $variableKey,
                        $var['variable_type'] ?? 'Direct',
                        $var['is_filtered'] ?? false,
                        $var['filter_key'] ?? null,
                        $var['filter_value'] ?? null,
                        $var['has_function'] ?? false,
                        $var['fn'] ?? 'Latest'
                    );

                    $variables[] = [
                        'variable' => $var['variable'] ?? '',
                        'endpoint' => $endpoint,
                        'variable_key' => $variableKey,
                        'variable_type' => $var['variable_type'] ?? 'Direct',
                        'value' => $result['value'],
                        'raw_data' => $result['raw_data'],
                    ];

                    $totalExtracted++;
                    if ($result['matched']) {
                        $totalMatched++;
                    }
                }

                $output[$module]['kpis'][$kpiCode] = [
                    'name' => $kpiName,
                    'variables' => $variables,
                ];
            }
        }

        $outputPath = base_path($this->option('output'));
        $dir = dirname($outputPath);

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $json = json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($json === false) {
            $this->error('Failed to encode JSON.');
            return 1;
        }

        file_put_contents($outputPath, $json);

        $this->info("Exported page data to {$outputPath}");
        $this->info("  Pages: " . count($output));
        $this->info("  Total variables: {$totalExtracted}");
        $this->info("  Matched endpoints: {$totalMatched}");
        $this->info("  Unmatched: " . ($totalExtracted - $totalMatched));

        return 0;
    }

    private function buildEndpointMap(array $dataJson): array
    {
        $map = [];

        foreach ($dataJson as $item) {
            $url = $item['endpoint'] ?? '';
            $slug = $this->extractSlug($url);

            if ($slug === '') {
                continue;
            }

            $response = $item['response'] ?? [];
            $map[$slug] = $response['data'] ?? [];
        }

        return $map;
    }

    private function extractSlug(string $url): string
    {
        $parsed = parse_url($url);

        if (!$parsed || !isset($parsed['path'])) {
            return '';
        }

        $path = $parsed['path'];
        $path = ltrim($path, '/');

        if (!str_starts_with($path, 'api/')) {
            return '';
        }

        return $path;
    }

    private function extractVariable(
        array $endpointMap,
        ?string $endpoint,
        ?string $variableKey,
        string $variableType,
        bool $isFiltered,
        ?string $filterKey,
        ?string $filterValue,
        bool $hasFunction,
        string $fn
    ): array {
        if ($endpoint === null || $variableKey === null) {
            return ['value' => null, 'raw_data' => [], 'matched' => false];
        }

        $rows = $endpointMap[$endpoint] ?? null;

        if ($rows === null) {
            return ['value' => null, 'raw_data' => [], 'matched' => false];
        }

        // Apply filter
        if ($isFiltered && $filterKey !== null && $filterValue !== null) {
            $rows = array_values(array_filter(
                $rows,
                fn ($row) => isset($row[$filterKey]) && (string) $row[$filterKey] === $filterValue
            ));
        }

        if (empty($rows)) {
            return ['value' => null, 'raw_data' => [], 'matched' => true];
        }

        // Complex type: return first row's value
        if ($variableType === 'Complex') {
            $value = $rows[0][$variableKey] ?? null;

            return ['value' => $value, 'raw_data' => $rows, 'matched' => true];
        }

        // Direct type: collect all values and apply function
        $values = [];
        foreach ($rows as $row) {
            if (array_key_exists($variableKey, $row)) {
                $values[] = $row[$variableKey];
            }
        }

        $value = $this->applyFunction($values, $hasFunction ? $fn : 'Latest');

        return ['value' => $value, 'raw_data' => $rows, 'matched' => true];
    }

    private function applyFunction(array $values, string $fn): mixed
    {
        if (empty($values)) {
            return null;
        }

        // Convert to numbers where possible
        $numeric = array_map(fn ($v) => is_numeric($v) ? (float) $v : $v, $values);

        return match ($fn) {
            'Latest' => end($numeric),
            'First' => reset($numeric),
            'Sum' => array_sum($numeric),
            'Average' => array_sum($numeric) / count($numeric),
            'Count' => count($numeric),
            'Min' => min($numeric),
            'Max' => max($numeric),
            default => end($numeric),
        };
    }
}
