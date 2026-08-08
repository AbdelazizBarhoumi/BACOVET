<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ExportV5Pages extends Command
{
    protected $signature = 'v5:export
        {--dump= : Path to the mysqldump/phpMyAdmin SQL file (defaults to novatixbacovetap*.sql in project root)}
        {--out=v5-pages.json : Output path relative to storage/app/private}';

    protected $description = 'Extract builder_pages_v5 rows from the V7 SQL dump into a reviewable JSON export';

    public function handle(): int
    {
        $dumpPath = $this->option('dump') ?: $this->findDump();

        if (! $dumpPath || ! is_file($dumpPath)) {
            $this->error('SQL dump not found. Pass --dump=/path/to/dump.sql');

            return self::FAILURE;
        }

        $this->info('Reading dump: '.$dumpPath);

        $sql = file_get_contents($dumpPath);

        if ($sql === false) {
            $this->error('Could not read the dump file.');

            return self::FAILURE;
        }

        $rows = $this->extractBuilderPagesV5($sql);

        if ($rows === []) {
            $this->error('No builder_pages_v5 rows found in the dump.');

            return self::FAILURE;
        }

        $groups = $this->extractGroups($sql);

        $users = $this->extractV5Users($sql);

        $measures = $this->extractMeasures($sql);

        $joins = $this->extractMeasureJoins($sql);

        $datasets = $this->extractEndpointDatasets($sql);

        $payload = [
            'source' => 'V7 SQL dump (builder_pages_v5)',
            'exported_at' => now()->toIso8601String(),
            'groups' => $groups,
            'users' => $users,
            'measures' => $measures,
            'joins' => $joins,
            'datasets' => $datasets,
            'pages' => $rows,
        ];

        $out = (string) $this->option('out');

        Storage::disk('local')->put($out, json_encode(
            $payload,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
        ));

        $this->info('Exported '.count($rows).' page(s), '.count($groups).' group(s), '.count($users).' user(s), '.count($measures).' measure(s), '.count($joins).' join(s) and '.count($datasets).' dataset(s) to storage/'.$out);

        $withImages = count(array_filter($rows, fn ($r) => $r['image_urls'] !== []));

        $this->warn($withImages.' page(s) reference image URLs that still need the image binaries.');

        return self::SUCCESS;
    }

    private function findDump(): ?string
    {
        $candidates = glob(base_path('novatixbacovetap*.sql'));

        return $candidates[0] ?? null;
    }

    /**
     * Extract and decode every builder_pages_v5 row from the dump.
     */
    private function extractBuilderPagesV5(string $sql): array
    {
        $inserts = $this->findInserts($sql, 'builder_pages_v5');

        $rows = [];

        foreach ($inserts as $columns => $tuples) {
            $columns = explode(',', (string) $columns);

            foreach ($tuples as $tuple) {
                $raw = $this->splitTuple($tuple);

                if (count($raw) !== count($columns)) {
                    $this->warn('Skipping malformed row (column count mismatch).');

                    continue;
                }

                $data = array_combine($columns, $raw);

                if (! isset($data['id'])) {
                    continue;
                }

                $layout = $this->decodeJsonField($data['layout'] ?? null);
                $draft = $this->decodeJsonField($data['layout_draft'] ?? null);

                $rows[] = [
                    'id' => (int) $data['id'],
                    'slug' => $this->decodeString($data['slug'] ?? null),
                    'name' => $this->decodeString($data['name'] ?? null),
                    'owner_user_id' => $this->nullableInt($data['owner_user_id'] ?? null),
                    'layout' => $layout,
                    'layout_draft' => $draft,
                    'group_id' => $this->nullableInt($data['group_id'] ?? null),
                    'sort_order' => (int) ($data['sort_order'] ?? 0),
                    'created_at' => $this->nullableString($data['created_at'] ?? null),
                    'updated_at' => $this->nullableString($data['updated_at'] ?? null),
                    'image_urls' => $this->collectImageUrls($layout, $draft),
                ];
            }
        }

        usort($rows, fn ($a, $b) => $a['id'] <=> $b['id']);

        return $rows;
    }

    /**
     * Extract builder_page_groups (the current/final table) rows.
     */
    private function extractGroups(string $sql): array
    {
        $inserts = $this->findInserts($sql, 'builder_page_groups');

        $groups = [];

        foreach ($inserts as $columns => $tuples) {
            $columns = explode(',', (string) $columns);

            foreach ($tuples as $tuple) {
                $raw = $this->splitTuple($tuple);

                if (count($raw) !== count($columns)) {
                    continue;
                }

                $data = array_combine($columns, $raw);

                $groups[] = [
                    'id' => (int) $data['id'],
                    'name' => $this->decodeString($data['name'] ?? null),
                    'slug' => $this->decodeString($data['slug'] ?? null),
                    'sort_order' => (int) ($data['sort_order'] ?? 0),
                ];
            }
        }

        usort($groups, fn ($a, $b) => $a['id'] <=> $b['id']);

        return $groups;
    }

    /**
     * Extract v5_users rows (id, email) so owner_user_id can be remapped later.
     */
    private function extractV5Users(string $sql): array
    {
        $inserts = $this->findInserts($sql, 'v5_users');

        $users = [];

        foreach ($inserts as $columns => $tuples) {
            $columns = explode(',', (string) $columns);

            foreach ($tuples as $tuple) {
                $raw = $this->splitTuple($tuple);

                if (count($raw) !== count($columns)) {
                    continue;
                }

                $data = array_combine($columns, $raw);

                if (! isset($data['id'])) {
                    continue;
                }

                $users[] = [
                    'id' => (int) $data['id'],
                    'email' => $this->decodeString($data['email'] ?? null),
                    'name' => $this->decodeString($data['name'] ?? null),
                    'role' => $this->decodeString($data['role'] ?? null),
                    'password' => $this->decodeString($data['password'] ?? null),
                    'has_password' => (int) ($data['has_password'] ?? 0) === 1,
                    'created_at' => $this->nullableString($data['created_at'] ?? null),
                    'updated_at' => $this->nullableString($data['updated_at'] ?? null),
                    'remember_token' => $this->nullableString($data['remember_token'] ?? null),
                ];
            }
        }

        usort($users, fn ($a, $b) => $a['id'] <=> $b['id']);

        return $users;
    }

    /**
     * Extract measures (the `measures_v5` table in the dump), whose schema
     * matches the final `measures` table exactly.
     */
    private function extractMeasures(string $sql): array
    {
        return $this->extractRows($sql, 'measures_v5', [
            'id' => 'int',
            'name' => 'string',
            'expression' => 'string',
            'description' => 'string',
            'config' => 'json',
            'category' => 'string',
            'user_id' => 'int:null',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);
    }

    /**
     * Extract measure_joins rows (same schema as the final table).
     */
    private function extractMeasureJoins(string $sql): array
    {
        return $this->extractRows($sql, 'measure_joins', [
            'id' => 'int',
            'table_a' => 'string',
            'column_a' => 'string',
            'table_b' => 'string',
            'column_b' => 'string',
            'trim_compare' => 'int',
            'user_id' => 'int:null',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);
    }

    /**
     * Extract endpoint_datasets rows (same schema as the final table).
     */
    private function extractEndpointDatasets(string $sql): array
    {
        return $this->extractRows($sql, 'endpoint_datasets', [
            'id' => 'int',
            'slug' => 'string',
            'name' => 'string',
            'label' => 'string',
            'object' => 'string',
            'object_type' => 'string',
            'source' => 'string',
            'method' => 'string',
            'columns' => 'json',
            'sample_data' => 'json',
            'row_count' => 'int',
            'last_status' => 'string',
            'last_error' => 'string',
            'last_synced_at' => 'string',
            'created_at' => 'string',
            'updated_at' => 'string',
        ]);
    }

    /**
     * Extract rows from any dump table into normalized arrays, applying a
     * per-column decoder: 'int', 'int:null', 'string', 'json' or 'bool'.
     *
     * @return array<int, array<string, mixed>>
     */
    private function extractRows(string $sql, string $table, array $format): array
    {
        $inserts = $this->findInserts($sql, $table);

        $rows = [];

        foreach ($inserts as $columns => $tuples) {
            $columns = explode(',', (string) $columns);

            foreach ($tuples as $tuple) {
                $raw = $this->splitTuple($tuple);

                if (count($raw) !== count($columns)) {
                    $this->warn('Skipping malformed '.$table.' row (column count mismatch).');

                    continue;
                }

                $data = array_combine($columns, $raw);

                if (! isset($data['id'])) {
                    continue;
                }

                $row = [];

                foreach ($format as $field => $type) {
                    $value = $data[$field] ?? null;

                    $row[$field] = match ($type) {
                        'int' => (int) $value,
                        'int:null' => $this->nullableInt($value),
                        'bool' => $this->decodedBool($value),
                        'json' => $this->decodeJsonField($value),
                        default => $this->decodeString($value),
                    };
                }

                $rows[] = $row;
            }
        }

        usort($rows, fn ($a, $b) => (int) $a['id'] <=> (int) $b['id']);

        return $rows;
    }

    private function decodedBool(?string $value): bool
    {
        return $this->decodeString($value) === '1';
    }

    /**
     * Locate INSERT INTO `table` statements and split into tuples per insert.
     *
     * @return array<string, array<int, string>> column-list => list of raw tuples
     */
    private function findInserts(string $sql, string $table): array
    {
        $pattern = '/INSERT\s+INTO\s+`'.preg_quote($table, '/').'`\s*(?:\((?P<cols>[^)]*)\))?\s*VALUES\s*(?P<values>.+?);/is';

        $result = [];

        if (preg_match_all($pattern, $sql, $matches, PREG_SET_ORDER)) {
            foreach ($matches as $match) {
                $columns = preg_split('/\s*,\s*/', trim((string) $match['cols'])) ?? [];

                $columns = array_map(fn ($c) => trim($c, '` '), $columns);

                $tuples = $this->splitTuples($match['values']);

                $key = implode(',', $columns);

                $result[$key] = array_merge($result[$key] ?? [], $tuples);
            }
        }

        return $result;
    }

    /**
     * Split "((1, 'a'), (2, 'b'));" into raw tuple strings, honoring quotes.
     *
     * @return array<int, string>
     */
    private function splitTuples(string $values): array
    {
        $tuples = [];

        $len = strlen($values);

        $i = 0;

        while ($i < $len) {
            // Find the next opening paren.
            while ($i < $len && $values[$i] !== '(') {
                $i++;
            }

            if ($i >= $len) {
                break;
            }

            $depth = 0;

            $inString = false;

            $start = $i;

            for (; $i < $len; $i++) {
                $ch = $values[$i];

                if ($inString) {
                    if ($ch === '\\') {
                        $i++; // skip escaped char

                        continue;
                    }

                    if ($ch === "'") {
                        $inString = false;
                    }

                    continue;
                }

                if ($ch === "'") {
                    $inString = true;

                    continue;
                }

                if ($ch === '(') {
                    $depth++;
                } elseif ($ch === ')') {
                    $depth--;

                    if ($depth === 0) {
                        $tuples[] = substr($values, $start, $i - $start + 1);
                        $i++;

                        break;
                    }
                }
            }
        }

        return $tuples;
    }

    /**
     * Split a raw tuple "(1, 'x, y', 3)" into unquoted, still-escaped fields.
     *
     * @return array<int, string>
     */
    private function splitTuple(string $tuple): array
    {
        $body = trim($tuple);

        $body = preg_replace('/^\(/', '', $body);

        $body = preg_replace('/\)$/', '', $body);

        $fields = [];

        $len = strlen($body);

        $current = '';

        $inString = false;

        for ($i = 0; $i < $len; $i++) {
            $ch = $body[$i];

            if ($inString) {
                $current .= $ch;

                if ($ch === '\\' && $i + 1 < $len) {
                    $i++;

                    $current .= $body[$i];

                    continue;
                }

                if ($ch === "'") {
                    $inString = false;
                }

                continue;
            }

            if ($ch === "'") {
                $inString = true;

                $current .= $ch;

                continue;
            }

            if ($ch === ',') {
                $fields[] = trim($current);

                $current = '';

                continue;
            }

            $current .= $ch;
        }

        if (trim($current) !== '') {
            $fields[] = trim($current);
        }

        return $fields;
    }

    private function decodeString(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = trim($value);

        if (strtoupper($value) === 'NULL') {
            return null;
        }

        if (strlen($value) >= 2 && $value[0] === "'" && $value[strlen($value) - 1] === "'") {
            $value = substr($value, 1, -1);

            // Unescape MySQL string escapes.
            $out = '';

            $len = strlen($value);

            for ($i = 0; $i < $len; $i++) {
                $ch = $value[$i];

                if ($ch === '\\' && $i + 1 < $len) {
                    $next = $value[$i + 1];

                    $map = [
                        'n' => "\n",
                        'r' => "\r",
                        't' => "\t",
                        '\\' => '\\',
                        "'" => "'",
                        '"' => '"',
                        '0' => "\0",
                    ];

                    $out .= $map[$next] ?? $next;

                    $i++;

                    continue;
                }

                $out .= $ch;
            }

            return $out;
        }

        return $value;
    }

    private function decodeJsonField(?string $value): mixed
    {
        $str = $this->decodeString($value);

        if ($str === null || trim($str) === '') {
            return null;
        }

        $decoded = json_decode($str, true);

        return is_array($decoded) ? $decoded : null;
    }

    private function nullableInt(?string $value): ?int
    {
        $str = $this->decodeString($value);

        if ($str === null || $str === '') {
            return null;
        }

        return (int) $str;
    }

    private function nullableString(?string $value): ?string
    {
        return $this->decodeString($value);
    }

    /**
     * Collect every image URL referenced by a layout (in imageUrl fields).
     *
     * @return array<int, string>
     */
    private function collectImageUrls(mixed $layout, mixed $draft): array
    {
        $urls = [];

        $this->walkLayout($layout, function ($url) use (&$urls) {
            if (is_string($url) && Str::contains($url, '/images/')) {
                $urls[] = $url;
            }
        });

        $this->walkLayout($draft, function ($url) use (&$urls) {
            if (is_string($url) && Str::contains($url, '/images/')) {
                $urls[] = $url;
            }
        });

        return array_values(array_unique($urls));
    }

    private function walkLayout(mixed $node, callable $onString): void
    {
        if (is_array($node)) {
            foreach ($node as $value) {
                $this->walkLayout($value, $onString);
            }

            return;
        }

        if (is_string($node)) {
            $onString($node);
        }
    }
}
