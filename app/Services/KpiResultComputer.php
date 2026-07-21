<?php

namespace App\Services;

use App\Models\KpiData;
use Illuminate\Support\Facades\Log;

/**
 * Pre-computes KPI results (formula, row-by-row, status) after sync.
 * Stores results in kpi_data.computed_result so the frontend can use them directly.
 */
class KpiResultComputer
{
    /**
     * Compute results for all KPIs in a module.
     */
    public function computeModule(string $module): void
    {
        $config = config('data-mappings');
        $kpis = $config[$module]['kpis'] ?? [];

        foreach ($kpis as $kpiDef) {
            try {
                $this->computeKpi($kpiDef);
            } catch (\Throwable $e) {
                Log::warning("Failed to compute KPI {$kpiDef['kpi']}: {$e->getMessage()}");
            }
        }
    }

    /**
     * Compute result for a single KPI and store in computed_result.
     */
    public function computeKpi(array $kpiDef): void
    {
        $kpiCode = $kpiDef['kpi'];
        $variables = $kpiDef['variables'] ?? [];
        $formula = $kpiDef['formula'] ?? null;
        $target = $kpiDef['target'] ?? [];
        $targetOperator = $target['operator'] ?? null;
        $targetValue = $target['value'] ?? null;

        // Gather raw_data for each variable
        $variableRaws = [];
        $allRawRows = [];
        foreach ($variables as $varDef) {
            $varKey = $varDef['variable_key'] ?? null;
            $row = KpiData::where('kpi_code', $kpiCode)
                ->where('variable_key', $varKey)
                ->first();
            $raw = $row?->response_data['raw'] ?? [];
            $variableRaws[] = $raw;
            $allRawRows = array_merge($allRawRows, $raw);
        }

        // Compute filter options from all raw data
        $filterOptions = $this->extractFilterOptions($variables, $variableRaws);

        // Compute formula result
        $scalarValue = null;
        $mappedRows = null;

        if ($formula && isset($formula['items']) && count($variables) >= 2) {
            // Check if variables should be computed row-by-row (Complex type, no aggregation, multiple rows)
            $hasArrayVar = false;
            foreach ($variables as $i => $var) {
                $raw = $variableRaws[$i] ?? [];
                $isComplex = ($var['variable_type'] ?? 'Direct') === 'Complex';
                $noAgg = empty($var['has_function']) && ($var['fn'] ?? 'Latest') === 'Latest';
                $hasMultipleRows = count($raw) > 1;
                if ($isComplex && $noAgg && $hasMultipleRows) {
                    $hasArrayVar = true;
                    break;
                }
            }

            if ($hasArrayVar && count($variableRaws) >= 2) {
                // Row-by-row: JOIN on shared keys, compute formula per row
                $mappedRows = $this->computeRowByRow($formula['items'], $variableRaws, $variables);
                // Scalar = average of all row values
                if (!empty($mappedRows)) {
                    $values = array_column($mappedRows, 'value');
                    $numericValues = array_filter($values, fn($v) => is_numeric($v));
                    $scalarValue = !empty($numericValues) ? array_sum($numericValues) / count($numericValues) : null;
                }
            } else {
                // Scalar formula
                $varValues = [];
                foreach ($variableRaws as $i => $raw) {
                    $vk = $variables[$i]['variable_key'] ?? null;
                    $fn = $variables[$i]['fn'] ?? 'Latest';
                    $val = $this->aggregateRaw($raw, $vk, $fn);
                    $varValues[] = $val;
                }
                $scalarValue = $this->computeFormulaScalar($formula['items'], $varValues);
            }
        } elseif (!empty($variableRaws[0])) {
            // Single variable or no formula: use first variable's aggregated value
            $vk = $variables[0]['variable_key'] ?? null;
            $fn = $variables[0]['fn'] ?? 'Latest';
            $scalarValue = $this->aggregateRaw($variableRaws[0], $vk, $fn);
        }

        // Compute status
        $status = $this->computeStatus($scalarValue, $targetOperator, $targetValue);

        // Store computed_result on the first variable's row (the "leader")
        $leaderVarKey = $variables[0]['variable_key'] ?? null;
        $query = KpiData::where('kpi_code', $kpiCode);
        if ($leaderVarKey === null) {
            $query->whereNull('variable_key');
        } else {
            $query->where('variable_key', $leaderVarKey);
        }
        $leader = $query->first();

        if ($leader) {
            $leader->update([
                'computed_result' => [
                    'scalar_value' => $scalarValue,
                    'status' => $status,
                    'mapped_rows' => $mappedRows,
                    'filter_options' => $filterOptions,
                    'computed_at' => now()->toIso8601String(),
                ],
            ]);
        }
    }

    /**
     * Row-by-row formula: JOIN variables on shared keys, compute formula per row.
     */
    private function computeRowByRow(array $formulaItems, array $variableRaws, array $variables): array
    {
        if (count($variableRaws) < 2) return [];

        // Find shared keys across all variable raw_data
        $allKeys = array_map(fn($raw) => !empty($raw) ? array_keys($raw[0] ?? []) : [], $variableRaws);
        $sharedKeys = !empty($allKeys[0]) ? $allKeys[0] : [];
        foreach ($allKeys as $keys) {
            $sharedKeys = array_values(array_intersect($sharedKeys, $keys));
        }

        $variableKeys = array_column($variables, 'variable_key');

        // Prefer filter_key as join key (unique row identifier)
        $filterKeys = array_column(array_filter($variables, fn($v) => !empty($v['filter_key'])), 'filter_key');
        $joinKey = null;
        foreach ($filterKeys as $fk) {
            if (in_array($fk, $sharedKeys)) {
                $joinKey = $fk;
                break;
            }
        }
        if (!$joinKey) {
            $joinKey = null;
            foreach ($sharedKeys as $sk) {
                if (!in_array($sk, $variableKeys)) {
                    $joinKey = $sk;
                    break;
                }
            }
        }
        if (!$joinKey && !empty($sharedKeys)) {
            $joinKey = $sharedKeys[0];
        }
        if (!$joinKey) return [];

        // Build lookup from first variable
        $lookup = [];
        foreach ($variableRaws[0] as $row) {
            $key = trim((string) ($row[$joinKey] ?? ''));
            if ($key !== '') {
                $lookup[$key] = $row;
            }
        }

        // For each row in last variable, match and compute
        $results = [];
        $lastRaw = end($variableRaws);
        foreach ($lastRaw as $row) {
            $key = trim((string) ($row[$joinKey] ?? ''));
            if (!isset($lookup[$key])) continue;
            $match = $lookup[$key];

            // Extract each variable's value
            $rowValues = [];
            foreach ($variables as $i => $var) {
                $vk = $var['variable_key'] ?? null;
                $v = $vk ? ($match[$vk] ?? $row[$vk] ?? null) : null;
                $rowValues[] = $v !== null ? (float) $v : null;
            }

            $rowResult = $this->computeFormulaScalar($formulaItems, $rowValues);

            // Build record: joinKey first, then other shared keys, then value
            $record = [$joinKey => trim((string) ($match[$joinKey] ?? $key))];
            foreach ($sharedKeys as $sk) {
                if ($sk === $joinKey) continue;
                $v = $match[$sk] ?? $row[$sk] ?? null;
                $record[$sk] = is_string($v) ? trim($v) : $v;
            }
            $record['value'] = $rowResult;
            $results[] = $record;
        }

        return $results;
    }

    /**
     * Compute formula from items and variable values (scalar path).
     */
    private function computeFormulaScalar(array $items, array $variableValues): ?float
    {
        $result = null;
        $operator = null;
        $varIndex = 0;

        foreach ($items as $item) {
            if ($item['type'] === 'variable') {
                $rawVal = $varIndex < count($variableValues) ? $variableValues[$varIndex] : null;
                $varIndex++;
                if ($rawVal === null) return null;
                $numVal = (float) $rawVal;
                if (is_nan($numVal)) return null;

                if ($result === null) {
                    $result = $numVal;
                } elseif ($operator !== null) {
                    $result = match ($operator) {
                        '+' => $result + $numVal,
                        '-' => $result - $numVal,
                        '*' => $result * $numVal,
                        '/' => $numVal != 0 ? $result / $numVal : null,
                        default => $result,
                    };
                    $operator = null;
                }
            } elseif ($item['type'] === 'operator') {
                $operator = $item['op'] ?? null;
            } elseif ($item['type'] === 'number') {
                $numVal = (float) ($item['value'] ?? 0);
                if ($operator !== null && $result !== null) {
                    $result = match ($operator) {
                        '+' => $result + $numVal,
                        '-' => $result - $numVal,
                        '*' => $result * $numVal,
                        '/' => $numVal != 0 ? $result / $numVal : null,
                        default => $result,
                    };
                    $operator = null;
                } elseif ($result === null) {
                    $result = $numVal;
                }
            }
        }

        return $result;
    }

    /**
     * Aggregate raw_data rows by variable_key and function.
     */
    private function aggregateRaw(array $raw, ?string $variableKey, string $fn): float|null
    {
        if (empty($raw) || !$variableKey) return null;

        $values = [];
        foreach ($raw as $row) {
            if (is_array($row) && array_key_exists($variableKey, $row)) {
                $v = $row[$variableKey];
                // Handle array values (Direct type often returns array like [15100])
                if (is_array($v)) {
                    $v = reset($v);
                }
                if (is_numeric($v)) $values[] = (float) $v;
            }
        }
        if (empty($values)) return null;

        return match ($fn) {
            'Sum' => array_sum($values),
            'Average' => array_sum($values) / count($values),
            'Min' => min($values),
            'Max' => max($values),
            'Count' => (float) count($values),
            'First' => $values[0],
            'Latest' => end($values),
            default => end($values),
        };
    }

    /**
     * Compute status (green/orange/red/grey) from value vs target.
     */
    private function computeStatus(float|null $value, ?string $operator, float|null $target): string
    {
        if ($value === null) return 'grey';
        if ($operator === null || $target === null) return 'green';

        return match ($operator) {
            '<=' => $value <= $target ? 'green' : ($value <= $target * 1.1 ? 'orange' : 'red'),
            '>=' => $value >= $target ? 'green' : ($value >= $target * 0.9 ? 'orange' : 'red'),
            '<' => $value < $target ? 'green' : 'red',
            '>' => $value > $target ? 'green' : 'red',
            '=' => $value == $target ? 'green' : 'red',
            default => 'grey',
        };
    }

    /**
     * Extract unique filter options from raw_data for each variable's filter_key and extra_filters.
     */
    private function extractFilterOptions(array $variables, array $variableRaws): array
    {
        $options = [];

        // Auto-generated filter options from variable filter_keys
        foreach ($variables as $i => $var) {
            if (!empty($var['is_filtered']) && !empty($var['filter_key'])) {
                $fk = $var['filter_key'];
                $raw = $variableRaws[$i] ?? [];
                if (!empty($raw) && isset($raw[0][$fk])) {
                    $vals = array_unique(array_map(fn($r) => trim((string) ($r[$fk] ?? '')), $raw));
                    $vals = array_filter($vals);
                    sort($vals);
                    if (!isset($options[$fk])) {
                        $options[$fk] = [];
                    }
                    $options[$fk] = array_values(array_unique(array_merge($options[$fk], $vals)));
                }
            }
        }

        return $options;
    }
}
