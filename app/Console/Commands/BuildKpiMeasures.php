<?php

namespace App\Console\Commands;

use App\Models\DataMapping;
use App\Models\MeasureLibraryV6;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Schema;

class BuildKpiMeasures extends Command
{
    protected $signature = 'kpi:build-measures
        {--dry-run : Preview generated measures without writing to the DB}
        {--kpi=* : Only process the given KPI codes (repeatable)}
        {--category= : Override the category for every generated measure}
        {--no-wipe : Keep existing library rows that are not regenerated}';

    protected $description = 'Generate V6 shared measures from the V3 data_mappings KPIs and store them in measures_library_v6';

    private const AGG_FUNCTIONS = [
        'Sum' => 'SUM',
        'Average' => 'AVERAGE',
        'Min' => 'MIN',
        'Max' => 'MAX',
        'Count' => 'COUNT',
        'Latest' => 'SUM',
        'First' => 'SUM',
    ];

    public function handle(): int
    {
        if (! Schema::hasTable('measures_library_v6')) {
            $this->error('Table measures_library_v6 does not exist. Run `php artisan migrate` first.');

            return self::FAILURE;
        }

        $groups = DataMapping::query()
            ->orderBy('kpi')
            ->orderBy('id')
            ->get()
            ->groupBy('kpi');

        if ($filters = $this->option('kpi')) {
            $groups = $groups->filter(fn ($rows, $kpi) => in_array($kpi, $filters, true));
        }

        if ($groups->isEmpty()) {
            $this->error('No KPI groups found in data_mappings'.($filters ? ' matching the given codes.' : '.'));

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $category = $this->option('category');
        $noWipe = (bool) $this->option('no-wipe');

        if (! $dryRun && ! $noWipe) {
            $deleted = MeasureLibraryV6::query()->delete();
            $this->info("Wiped {$deleted} existing measure(s).");
        }

        $created = 0;
        $skipped = 0;
        $warnings = [];

        foreach ($groups as $kpi => $rows) {
            $measure = $this->buildMeasure($kpi, $rows, $category);

            if ($measure['warning'] !== null) {
                $warnings[] = "{$kpi}: {$measure['warning']}";
            }

            if ($measure['placeholder']) {
                $name = trim((string) ($measure['name'] ?: $kpi)) ?: $kpi;
                $this->line("  ! SKIPPED {$kpi} « {$name} » — no variable_key / no endpoint mapping");
                $skipped++;

                continue;
            }

            if ($dryRun) {
                $created++;

                continue;
            }

            MeasureLibraryV6::updateOrCreate(
                ['name' => $measure['name']],
                [
                    'expression' => $measure['expression'],
                    'description' => $measure['description'],
                    'category' => $measure['category'],
                ],
            );

            $created++;
        }

        $this->info(sprintf('%s %d measure(s) (%d skipped).', $dryRun ? 'Would generate' : 'Generated', $created, $skipped));

        if (! empty($warnings)) {
            $this->newLine();
            $this->warn(count($warnings).' warning(s):');
            foreach ($warnings as $warning) {
                $this->line("  ! {$warning}");
            }
        }

        if ($dryRun) {
            $this->newLine();
            $this->line('Dry run — nothing was written. Remove --dry-run to persist.');
        }

        return self::SUCCESS;
    }

    /**
     * @param  Collection<int, DataMapping>  $rows
     * @return array{name: string, expression: string, description: ?string, category: ?string, warning: ?string, placeholder: bool}
     */
    private function buildMeasure(string $kpi, Collection $rows, ?string $category): array
    {
        $first = $rows->first();
        $name = (string) ($first->name ?? $kpi);

        $formula = $first->formula ?? [];
        $items = $formula['items'] ?? [];
        $hasVariable = collect($items)->contains(fn ($item) => ($item['type'] ?? null) === 'variable');

        [$expression, $warning] = $hasVariable
            ? $this->expressionFromFormula($kpi, $rows, $items)
            : $this->expressionFromSingleVariable($kpi, $rows);

        $description = $kpi;
        if (($target = $this->formatTarget($first)) !== null) {
            $description .= ' — cible '.$target;
        }

        return [
            'name' => $name,
            'expression' => $expression,
            'description' => $description,
            'category' => $category ?? $this->resolveCategory($rows),
            'warning' => $warning,
            'placeholder' => $warning !== null && str_contains($warning, 'has no variable_key'),
        ];
    }

    /**
     * Walk formula items, consuming one ordered variable per `variable` item.
     *
     * @param  Collection<int, DataMapping>  $rows
     * @param  list<array<string, mixed>>  $items
     * @return array{0: string, 1: ?string}
     */
    private function expressionFromFormula(string $kpi, Collection $rows, array $items): array
    {
        $cursor = 0;
        $parts = [];
        $warnings = [];

        foreach ($items as $item) {
            switch ($item['type'] ?? null) {
                case 'variable':
                    $variable = $rows[$cursor] ?? null;
                    $cursor++;

                    if ($variable === null) {
                        $warnings[] = "{$kpi}: formula references more variables than exist";

                        continue 2;
                    }

                    [$part, $varWarning] = $this->variableExpression($variable);
                    $parts[] = $part;
                    if ($varWarning !== null) {
                        $warnings[] = $varWarning;
                    }
                    break;

                case 'operator':
                    $parts[] = (string) ($item['op'] ?? '');
                    break;

                case 'number':
                    $parts[] = (string) ($item['value'] ?? 0);
                    break;

                case 'lparen':
                    $parts[] = '(';
                    break;

                case 'rparen':
                    $parts[] = ')';
                    break;
            }
        }

        if ($cursor === 0) {
            return $this->expressionFromSingleVariable($kpi, $rows);
        }

        $expression = $this->cleanExpression(implode('', $parts));

        return [$expression, $warnings[0] ?? null];
    }

    /**
     * Trim dangling operators and unbalanced parens left by incomplete formulas.
     */
    private function cleanExpression(string $expression): string
    {
        $trimmed = rtrim($expression);

        while ($trimmed !== '' && preg_match('/[+\-*\/]$/', $trimmed)) {
            $trimmed = rtrim(substr($trimmed, 0, -1));
        }

        $open = substr_count($trimmed, '(');
        $close = substr_count($trimmed, ')');
        $trimmed = $trimmed.str_repeat(')', max(0, $open - $close));

        return $trimmed;
    }

    /**
     * @param  Collection<int, DataMapping>  $rows
     * @return array{0: string, 1: ?string}
     */
    private function expressionFromSingleVariable(string $kpi, Collection $rows): array
    {
        $variable = $rows->first();

        if ($variable === null) {
            return ['0', "no variables defined ({$kpi})"];
        }

        return $this->variableExpression($variable);
    }

    private function variableExpression(DataMapping $variable): array
    {
        $key = $variable->variable_key;
        $fn = $variable->has_function ? ($variable->fn ?? 'Latest') : 'Latest';
        $agg = self::AGG_FUNCTIONS[$fn] ?? 'SUM';

        if ($key === null || trim((string) $key) === '') {
            $placeholder = $this->quoteColumn($variable->variable);
            $label = trim((string) $variable->variable) ?: 'Column';

            return ["{$agg}({$placeholder})", "variable « {$label} » has no variable_key — placeholder column used, fix manually"];
        }

        return ["{$agg}({$key})", null];
    }

    /**
     * @param  Collection<int, DataMapping>  $rows
     */
    private function resolveCategory(Collection $rows): ?string
    {
        foreach ($rows as $row) {
            $modules = is_array($row->modules) ? $row->modules : null;
            if (is_array($modules) && count($modules) > 0) {
                return (string) $modules[0];
            }
        }

        return null;
    }

    private function quoteColumn(string $label): string
    {
        $trimmed = trim($label);

        if ($trimmed === '') {
            return 'Column';
        }

        if (preg_match('/^[\p{L}_][\p{L}\p{N}_]*$/u', $trimmed)) {
            return $trimmed;
        }

        return "'".str_replace("'", '', $trimmed)."'";
    }

    private function formatTarget(DataMapping $row): ?string
    {
        $operator = $row->cible_operator;
        $value = $row->cible_value;

        if ($value === null || $value === '' || $operator === null || $operator === '') {
            return null;
        }

        $formatted = number_format((float) $value, 2);
        $suffix = $row->cible_is_percentage ? '%' : '';

        return "{$operator} {$formatted}{$suffix}";
    }
}
