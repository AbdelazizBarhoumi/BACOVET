<?php

namespace App\Support;

/**
 * Analyzes the endpoint registry (data.json) to detect:
 *   - candidate primary keys per entry (unique columns + name heuristics)
 *   - foreign-key candidates (column name matches another entry's key column,
 *     with sampled value-coverage as a confidence boost)
 *   - shared join columns (e.g. ProdGroup appears in 13 endpoints)
 *
 * Self-contained (no dependency on controller helpers) so it can be unit-tested
 * directly. Sampling is capped because entries only carry a few hundred rows.
 */
class EndpointSchemaAnalyzer
{
    /**
     * Cross-request cache key for the full analysis result. The analysis is
     * expensive (re-reads + re-parses the registry and scans every column's
     * distinct values), so it is computed once and reused until the registry
     * is invalidated. The builder / endpoints manager both derive from it.
     */
    public const CACHE_KEY = 'endpoints:schema:analysis:v1';

    private const MAX_ROWS = 1000;

    private const MAX_DISTINCT = 2000;

    private const SAMPLE_VALUES = 20;

    /**
     * @param  array<int, array<string, mixed>>  $items  normalized entries from data.json
     * @return array{entries: array<int, array<string, mixed>>, columns: array<int, array<string, mixed>>, foreign_keys: array<int, array<string, mixed>>, generated_at: string}
     */
    public function analyze(array $items, ?string $columnFilter = null): array
    {
        $entries = [];
        $valueSets = [];

        foreach ($items as $item) {
            if (! is_array($item) || RootState::isDisabled($item)) {
                continue;
            }

            $result = $this->analyzeEntry($item);
            if ($result === null) {
                continue;
            }

            $entries[] = $result['entry'];
            $valueSets[$result['entry']['id']] = $result['values'];
        }

        return [
            'entries' => $entries,
            'columns' => array_values($this->buildSharedColumns($entries, $columnFilter)),
            'foreign_keys' => $this->detectForeignKeys($entries, $valueSets),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Analyze a single entry: columns + candidate primary keys.
     *
     * @param  array<string, mixed>  $item
     * @return array{entry: array<string, mixed>, values: array<string, array<int, mixed>>}|null
     */
    private function analyzeEntry(array $item): ?array
    {
        $response = is_array($item['response'] ?? null) ? $item['response'] : [];
        $rows = array_slice(DatasetRows::extractRows($response), 0, self::MAX_ROWS);

        $fields = $this->extractFields($response, $rows);
        $columns = [];
        $values = [];

        foreach ($fields as $field) {
            $distinct = [];
            $nullable = false;

            foreach ($rows as $row) {
                if (! array_key_exists($field, $row)) {
                    continue;
                }
                $value = $row[$field];
                if ($value === null) {
                    $nullable = true;

                    continue;
                }
                $key = $this->valueKey($value);
                if (count($distinct) < self::MAX_DISTINCT) {
                    $distinct[$key] = $value;
                }
            }

            $canonical = $this->canonical($field);
            $values[$canonical] = array_values($distinct);
            $distinctCount = count($distinct);

            $columns[] = [
                'name' => $field,
                'type' => $this->inferType(array_values($distinct)),
                'nullable' => $nullable,
                'distinct_count' => $distinctCount,
                'unique' => $distinctCount > 0 && $distinctCount === $this->nonNullCount($rows, $field) && $distinctCount < self::MAX_DISTINCT,
                'samples' => array_values(array_slice($distinct, 0, self::SAMPLE_VALUES)),
            ];
        }

        $uniqueColumns = array_values(array_filter($columns, fn (array $col) => $col['unique']));

        $primaryKey = null;
        if ($uniqueColumns !== []) {
            $best = $uniqueColumns[0];
            $bestScore = $this->nameScore($best['name']);
            foreach (array_slice($uniqueColumns, 1) as $col) {
                $score = $this->nameScore($col['name']);
                if ($score > $bestScore) {
                    $best = $col;
                    $bestScore = $score;
                }
            }
            $primaryKey = [
                'column' => $best['name'],
                'confidence' => $this->confidenceFromScore($bestScore),
            ];
        }

        return [
            'entry' => [
                'id' => (string) ($item['id'] ?? ''),
                'name' => (string) ($item['name'] ?? ''),
                'slug' => $this->extractSlug((string) ($item['endpoint'] ?? '')),
                'source' => $this->detectSource($item),
                'object_type' => is_string($response['object_type'] ?? null) ? $response['object_type'] : null,
                'row_count' => count($rows),
                'columns' => $columns,
                'primary_key' => $primaryKey,
                'candidate_keys' => array_column($uniqueColumns, 'name'),
            ],
            'values' => $values,
        ];
    }

    /**
     * Group columns across entries by normalized name (the join-column registry).
     *
     * @param  array<int, array<string, mixed>>  $entries
     * @return array<string, array<string, mixed>>
     */
    private function buildSharedColumns(array $entries, ?string $columnFilter = null): array
    {
        $shared = [];

        foreach ($entries as $entry) {
            foreach ($entry['columns'] as $col) {
                $canonical = $this->canonical($col['name']);

                if ($columnFilter !== null && $columnFilter !== '' && strcasecmp($columnFilter, $canonical) !== 0) {
                    continue;
                }

                if (! isset($shared[$canonical])) {
                    $shared[$canonical] = [
                        'name' => $col['name'],
                        'type' => $col['type'],
                        'endpoint_count' => 0,
                        'sources' => [],
                        'endpoints' => [],
                        'distinct_values' => [],
                    ];
                }

                $shared[$canonical]['endpoint_count']++;
                $shared[$canonical]['endpoints'][] = [
                    'entry_id' => $entry['id'],
                    'entry_name' => $entry['name'],
                    'slug' => $entry['slug'],
                    'source' => $entry['source'],
                    'distinct_count' => $col['distinct_count'],
                ];

                if (! in_array($entry['source'], $shared[$canonical]['sources'], true)) {
                    $shared[$canonical]['sources'][] = $entry['source'];
                }

                foreach ($col['samples'] as $value) {
                    if (count($shared[$canonical]['distinct_values']) >= self::SAMPLE_VALUES) {
                        break;
                    }
                    if (! in_array($value, $shared[$canonical]['distinct_values'], true)) {
                        $shared[$canonical]['distinct_values'][] = $value;
                    }
                }
            }
        }

        usort($shared, function (array $a, array $b) {
            return $b['endpoint_count'] <=> $a['endpoint_count']
                ?: strcasecmp((string) $a['name'], (string) $b['name']);
        });

        return $shared;
    }

    /**
     * Detect foreign-key candidates: a column whose normalized name matches a
     * candidate key of another entry, with value coverage as a confidence boost.
     *
     * @param  array<int, array<string, mixed>>  $entries
     * @param  array<string, array<string, array<int, mixed>>>  $valueSets
     * @return array<int, array<string, mixed>>
     */
    private function detectForeignKeys(array $entries, array $valueSets): array
    {
        $referenceMap = [];

        foreach ($entries as $entry) {
            $primaryKeyCanonical = $entry['primary_key']
                ? $this->canonical($entry['primary_key']['column'])
                : null;

            foreach ($entry['columns'] as $col) {
                if (! $col['unique']) {
                    continue;
                }

                $canonical = $this->canonical($col['name']);
                $set = [];
                foreach ($valueSets[$entry['id']][$canonical] ?? [] as $value) {
                    $set[$this->valueKey($value)] = true;
                }

                $referenceMap[$canonical][] = [
                    'entry_id' => $entry['id'],
                    'entry_name' => $entry['name'],
                    'column' => $col['name'],
                    'is_pk' => $canonical === $primaryKeyCanonical,
                    'set' => $set,
                ];
            }
        }

        $result = [];

        foreach ($entries as $entry) {
            $primaryKeyCanonical = $entry['primary_key']
                ? $this->canonical($entry['primary_key']['column'])
                : null;

            $entryRefs = [];

            foreach ($entry['columns'] as $col) {
                $canonical = $this->canonical($col['name']);

                if ($primaryKeyCanonical !== null && $canonical === $primaryKeyCanonical) {
                    continue;
                }

                $candidates = $referenceMap[$canonical] ?? [];
                if ($candidates === []) {
                    continue;
                }

                $mine = $valueSets[$entry['id']][$canonical] ?? [];
                if ($mine === []) {
                    continue;
                }

                $refs = [];

                foreach ($candidates as $ref) {
                    if ($ref['entry_id'] === $entry['id']) {
                        continue;
                    }

                    $overlap = 0;
                    foreach ($mine as $value) {
                        if (isset($ref['set'][$this->valueKey($value)])) {
                            $overlap++;
                        }
                    }

                    $coverage = $overlap / count($mine);
                    $confidence = min(1.0, 0.7 + ($ref['is_pk'] ? 0.1 : 0.0) + $coverage * 0.2);

                    $refs[] = [
                        'entry_id' => $ref['entry_id'],
                        'entry_name' => $ref['entry_name'],
                        'column' => $ref['column'],
                        'match' => 'name',
                        'coverage' => round($coverage, 3),
                        'confidence' => round($confidence, 2),
                    ];
                }

                usort($refs, fn (array $a, array $b) => $b['confidence'] <=> $a['confidence']);

                if ($refs !== []) {
                    $entryRefs[] = [
                        'column' => $col['name'],
                        'refs' => array_slice($refs, 0, 3),
                    ];
                }
            }

            if ($entryRefs !== []) {
                $result[] = [
                    'entry_id' => $entry['id'],
                    'entry_name' => $entry['name'],
                    'references' => $entryRefs,
                ];
            }
        }

        return $result;
    }

    /**
     * Extract column names from response.columns or the data rows.
     *
     * @param  array<string, mixed>  $response
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, string>
     */
    private function extractFields(array $response, array $rows): array
    {
        $columns = DatasetRows::columnsFrom($response);

        return array_values(array_unique(array_map('strval', (array) $columns)));
    }

    /**
     * Number of non-null, present values for a column across sampled rows.
     *
     * @param  array<int, array<string, mixed>>  $rows
     */
    private function nonNullCount(array $rows, string $field): int
    {
        $count = 0;

        foreach ($rows as $row) {
            if (array_key_exists($field, $row) && $row[$field] !== null) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Stable set key for a scalar value (type-prefixed to avoid collisions).
     */
    private function valueKey(mixed $value): string
    {
        if (is_array($value) || is_object($value)) {
            return gettype($value).':'.md5(serialize($value));
        }

        return gettype($value).':'.(string) $value;
    }

    /**
     * Normalized column name used for join matching (trimmed, lowercased).
     */
    private function canonical(string $name): string
    {
        return strtolower(trim($name));
    }

    /**
     * Heuristic strength of a column name as a primary key.
     */
    private function nameScore(string $name): int
    {
        $canonical = $this->canonical($name);

        if ($canonical === 'id') {
            return 130;
        }
        if (str_starts_with($canonical, 'id')) {
            return 120;
        }
        if ($canonical === 'code') {
            return 110;
        }
        if (str_starts_with($canonical, 'code')) {
            return 105;
        }
        if (str_ends_with($canonical, 'id')) {
            return 100;
        }
        if (str_starts_with($canonical, 'num')) {
            return 95;
        }
        if (str_ends_with($canonical, 'no')) {
            return 90;
        }
        if (str_ends_with($canonical, 'code')) {
            return 85;
        }
        if (str_starts_with($canonical, 'ref') || $canonical === 'reference') {
            return 80;
        }
        if (str_ends_with($canonical, 'ref')) {
            return 75;
        }

        return 10;
    }

    /**
     * Map a name score to a 0..1 confidence.
     */
    private function confidenceFromScore(int $score): float
    {
        return match (true) {
            $score >= 120 => 0.95,
            $score >= 100 => 0.85,
            $score >= 85 => 0.75,
            $score >= 60 => 0.6,
            default => 0.4,
        };
    }

    /**
     * Infer a column type from sampled values.
     *
     * @param  array<int, mixed>  $values
     */
    private function inferType(array $values): string
    {
        $types = [];

        foreach (array_slice($values, 0, 20) as $value) {
            if (is_bool($value)) {
                $types['boolean'] = true;
            } elseif (is_int($value)) {
                $types['integer'] = true;
            } elseif (is_float($value)) {
                $types['number'] = true;
            } elseif (is_string($value)) {
                $types[$this->isDateString($value) ? 'date' : 'string'] = true;
            } else {
                $types['mixed'] = true;
            }
        }

        if ($types === []) {
            return 'null';
        }

        return count($types) === 1 ? array_key_first($types) : 'mixed';
    }

    private function isDateString(string $value): bool
    {
        $trimmed = trim($value);

        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}([T ].*)?$/', $trimmed)
            && strtotime(substr($trimmed, 0, 10)) !== false;
    }

    /**
     * Detect the source system of an entry (SDT / QCM / DIVATEX / OTHER).
     *
     * @param  array<string, mixed>  $item
     */
    private function detectSource(array $item): string
    {
        $name = (string) ($item['name'] ?? '');

        if (preg_match('/\((SDT|QCM|DIVATEX)\)/', $name, $matches)) {
            return strtoupper($matches[1]);
        }

        $source = $item['response']['source'] ?? '';
        if (is_string($source) && $source !== '') {
            return strtoupper($source);
        }

        return 'OTHER';
    }

    private function extractSlug(string $url): string
    {
        $parsed = parse_url($url);
        if (! $parsed || ! isset($parsed['path'])) {
            return '';
        }

        return ltrim($parsed['path'], '/');
    }
}
