<?php

namespace App\Console\Commands;

use App\Models\DataMapping;
use Illuminate\Console\Command;

class ExportDataMappings extends Command
{
    protected $signature = 'export:mappings {--output=config/data-mappings.php : Output config file path}';

    protected $description = 'Export data mappings grouped by page/module as PHP config';

    public function handle(): int
    {
        $rows = DataMapping::orderBy('kpi')->orderBy('id')->get();

        if ($rows->isEmpty()) {
            $this->error('No data mappings found. Run php artisan db:seed --class=DataMappingSeeder first.');
            return 1;
        }

        $allModules = $rows->pluck('modules')->flatten()->unique()->sort()->values();

        $pages = [];

        foreach ($allModules as $module) {
            $moduleRows = $rows->filter(fn ($row) => in_array($module, $row->modules ?? []));
            $kpiGroups = $moduleRows->groupBy('kpi');

            $kpis = [];

            foreach ($kpiGroups as $kpiCode => $kpiRows) {
                $first = $kpiRows->first();

                $variables = $kpiRows->map(fn ($row) => array_filter([
                    'variable' => $row->variable,
                    'endpoint' => $row->endpoint,
                    'variable_type' => $row->variable_type,
                    'variable_key' => $row->variable_key,
                    'is_filtered' => $row->is_filtered,
                    'filter_key' => $row->filter_key,
                    'filter_value' => $row->filter_value,
                    'has_function' => $row->has_function,
                    'fn' => $row->fn,
                ], fn ($v) => $v !== null))->values();

                $kpis[] = array_filter([
                    'kpi' => $kpiCode,
                    'name' => $first->name,
                    'variables' => $variables,
                    'formula' => $first->formula,
                    'highlight_color' => $first->highlight_color,
                    'graph_types' => $first->graph_types,
                    'chart_config' => $first->chart_config,
                    'extra_filters' => $first->extra_filters,
                    'target' => [
                        'operator' => $first->cible_operator,
                        'value' => $first->cible_value,
                        'is_percentage' => $first->cible_is_percentage,
                    ],
                    'refresh_frequency' => $first->refresh_frequency,
                ], fn ($v) => $v !== null);
            }

            $pages[$module] = [
                'kpis' => $kpis,
            ];
        }

        $outputPath = base_path($this->option('output'));
        $dir = dirname($outputPath);

        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $php = $this->buildConfig($pages);
        file_put_contents($outputPath, $php);

        $totalKpis = collect($pages)->sum(fn ($p) => count($p['kpis']));

        $this->info("Exported data mappings config to {$outputPath}");
        $this->info("  Pages: " . count($pages));
        $this->info("  Total KPIs: {$totalKpis}");

        return 0;
    }

    private function buildConfig(array $pages): string
    {
        $lines = ['<?php', '', 'return ['];

        foreach ($pages as $module => $pageData) {
            $lines[] = "    '{$module}' => [";
            $lines[] = "        'kpis' => [";

            foreach ($pageData['kpis'] as $kpi) {
                $lines[] = "            [";
                $lines[] = "                'kpi' => '{$kpi['kpi']}',";
                $lines[] = "                'name' => " . $this->exportStr($kpi['name'] ?? null) . ",";

                // Variables
                $lines[] = "                'variables' => [";
                foreach ($kpi['variables'] as $var) {
                    $lines[] = "                    [";
                    $lines[] = "                        'variable' => " . $this->exportStr($var['variable'] ?? null) . ",";
                    $lines[] = "                        'endpoint' => " . $this->exportNullableStr($var['endpoint'] ?? null) . ",";
                    $lines[] = "                        'variable_type' => " . $this->exportStr($var['variable_type'] ?? null) . ",";
                    $lines[] = "                        'variable_key' => " . $this->exportNullableStr($var['variable_key'] ?? null) . ",";
                    $lines[] = "                        'is_filtered' => " . $this->exportBool($var['is_filtered'] ?? false) . ",";
                    $lines[] = "                        'filter_key' => " . $this->exportNullableStr($var['filter_key'] ?? null) . ",";
                    $lines[] = "                        'filter_value' => " . $this->exportNullableStr($var['filter_value'] ?? null) . ",";
                    $lines[] = "                        'has_function' => " . $this->exportBool($var['has_function'] ?? false) . ",";
                    $lines[] = "                        'fn' => " . $this->exportStr($var['fn'] ?? null) . ",";
                    $lines[] = "                    ],";
                }
                $lines[] = "                ],";

                // Formula
                $lines[] = "                'formula' => " . $this->exportFormula($kpi['formula'] ?? null) . ",";
                $lines[] = "                'formula_readable' => " . $this->buildReadableFormula($kpi['formula'] ?? null) . ",";

                // Highlight color
                $lines[] = "                'highlight_color' => " . $this->exportNullableStr($kpi['highlight_color'] ?? null) . ",";

                // Graph types
                $graphTypes = $kpi['graph_types'] ?? null;
                if ($graphTypes && is_array($graphTypes)) {
                    $escaped = array_map(fn($v) => addslashes($v), $graphTypes);
                    $quoted = array_map(fn($v) => "'{$v}'", $escaped);
                    $lines[] = "                'graph_types' => [" . implode(', ', $quoted) . "],";
                } else {
                    $lines[] = "                'graph_types' => null,";
                }

                // Chart config overrides
                $chartConfig = $kpi['chart_config'] ?? null;
                if ($chartConfig && is_array($chartConfig)) {
                    $lines[] = "                'chart_config' => " . $this->exportNestedArray($chartConfig) . ",";
                } else {
                    $lines[] = "                'chart_config' => null,";
                }

                // Extra filters
                $extraFilters = $kpi['extra_filters'] ?? null;
                if ($extraFilters && is_array($extraFilters)) {
                    $lines[] = "                'extra_filters' => " . $this->exportNestedArray($extraFilters) . ",";
                } else {
                    $lines[] = "                'extra_filters' => null,";
                }

                // Target
                $target = $kpi['target'] ?? [];
                $lines[] = "                'target' => [";
                $lines[] = "                    'operator' => " . $this->exportStr($target['operator'] ?? null) . ",";
                $lines[] = "                    'value' => " . $this->exportNumber($target['value'] ?? null) . ",";
                $lines[] = "                    'is_percentage' => " . $this->exportBool($target['is_percentage'] ?? false) . ",";
                $lines[] = "                ],";
                $lines[] = "                'target_readable' => " . $this->buildReadableTarget($target) . ",";

                $lines[] = "                'refresh_frequency' => " . $this->exportStr($kpi['refresh_frequency'] ?? null) . ",";
                $lines[] = "            ],";
            }

            $lines[] = "        ],";
            $lines[] = "    ],";
        }

        $lines[] = '];';
        $lines[] = '';

        return implode("\n", $lines);
    }

    private function exportStr($value): string
    {
        if ($value === null) {
            return "''";
        }
        $escaped = addslashes((string) $value);
        return "'{$escaped}'";
    }

    private function exportNullableStr($value): string
    {
        if ($value === null) {
            return 'null';
        }
        $escaped = addslashes((string) $value);
        return "'{$escaped}'";
    }

    private function exportBool($value): string
    {
        return $value ? 'true' : 'false';
    }

    private function exportNumber($value): string
    {
        if ($value === null) {
            return 'null';
        }
        return (string) $value;
    }

    private function exportFormula($formula): string
    {
        if ($formula === null || !isset($formula['items'])) {
            return 'null';
        }

        $lines = ['['];
        $lines[] = "            'items' => [";

        foreach ($formula['items'] as $item) {
            $lines[] = "                [";
            $lines[] = "                    'type' => '{$item['type']}',";

            if ($item['type'] === 'variable') {
                $lines[] = "                    'ref' => " . ($item['ref'] ?? 'null') . ",";
                if (isset($item['label'])) {
                    $escaped = addslashes($item['label']);
                    $lines[] = "                    'label' => '{$escaped}',";
                }
            } elseif ($item['type'] === 'operator') {
                $lines[] = "                    'op' => '{$item['op']}',";
            } elseif ($item['type'] === 'number') {
                $lines[] = "                    'value' => {$item['value']},";
            }

            $lines[] = "                ],";
        }

        $lines[] = "            ],";
        $lines[] = "        ]";

        return implode("\n", $lines);
    }

    private function buildReadableFormula($formula): string
    {
        if ($formula === null || !isset($formula['items'])) {
            return 'null';
        }

        $parts = [];

        foreach ($formula['items'] as $item) {
            $parts[] = match ($item['type'] ?? '') {
                'variable' => $item['label'] ?? "Var[{$item['ref']}]",
                'operator' => " {$item['op']} ",
                'number' => (string) $item['value'],
                'lparen' => '(',
                'rparen' => ')',
                default => '',
            };
        }

        $readable = trim(implode('', $parts));
        $escaped = addslashes($readable);

        return "'{$escaped}'";
    }

    private function buildReadableTarget(array $target): string
    {
        $operator = $target['operator'] ?? null;
        $value = $target['value'] ?? null;
        $isPercentage = $target['is_percentage'] ?? false;

        if ($operator === null || $value === null) {
            return 'null';
        }

        $suffix = $isPercentage ? '%' : '';
        $readable = "{$operator} {$value}{$suffix}";
        $escaped = addslashes($readable);

        return "'{$escaped}'";
    }

    private function exportNestedArray($data, int $depth = 4): string
    {
        if (!is_array($data)) {
            return 'null';
        }

        $indent = str_repeat(' ', $depth * 4);
        $innerIndent = str_repeat(' ', ($depth + 1) * 4);

        // Check if it's an associative array or a sequential array of associative arrays
        $isSequential = array_is_list($data);

        if ($isSequential && !empty($data) && is_array($data[0])) {
            // Array of associative arrays (like extra_filters)
            $lines = ['['];
            foreach ($data as $item) {
                $lines[] = $innerIndent . '[';
                foreach ($item as $key => $value) {
                    $lines[] = $innerIndent . "    '" . addslashes((string) $key) . "' => " . $this->exportScalarOrArray($value) . ",";
                }
                $lines[] = $innerIndent . '],';
            }
            $lines[] = $indent . ']';
            return implode("\n", $lines);
        }

        if (!$isSequential && !empty($data)) {
            // Associative array (like chart_config)
            $lines = ['['];
            foreach ($data as $key => $value) {
                $lines[] = $innerIndent . "'" . addslashes((string) $key) . "' => " . $this->exportScalarOrArray($value) . ",";
            }
            $lines[] = $indent . ']';
            return implode("\n", $lines);
        }

        // Empty or simple list
        if ($isSequential) {
            $escaped = array_map(fn($v) => addslashes((string) $v), $data);
            $quoted = array_map(fn($v) => "'{$v}'", $escaped);
            return '[' . implode(', ', $quoted) . ']';
        }

        return '[]';
    }

    private function exportScalarOrArray($value): string
    {
        if (is_array($value)) {
            return $this->exportNestedArray($value, 6);
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_numeric($value)) {
            return (string) $value;
        }
        if ($value === null) {
            return 'null';
        }
        return $this->exportStr($value);
    }
}
