<?php

namespace App\Http\Controllers\Api;

use App\Console\Commands\RunEndpointSync;
use App\Http\Controllers\Controller;
use App\Models\EndpointDataset;
use App\Models\EndpointDatasetVariant;
use App\Services\EndpointDatasetRegistry;
use App\Support\DatasetRows;
use App\Support\DetachedProcess;
use App\Support\RootParameters;
use App\Support\SyncStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class EndpointDatasetController extends Controller
{
    /**
     * Canonical sync status merged from both worker phases (registry refresh +
     * dataset sync). Used by the LIVE SYNC pill and the admin health panel so
     * they always agree on "last run" / "last success".
     */
    public function status(): JsonResponse
    {
        return response()->json(SyncStatus::payload());
    }

    /**
     * Trigger the full registry + dataset sync in a detached background
     * process and return immediately — identical to the Rafraîchir buttons
     * (endpoint-sync:run). The web request never blocks on the sweep; the
     * UI reflects progress by polling /status. A duplicate click while a
     * sweep is already active is acked (queued=false) instead of stacking.
     */
    public function sync(): JsonResponse
    {
        if (RunEndpointSync::isActuallyRunning()) {
            return response()->json([
                'success' => true,
                'queued' => false,
                'running' => true,
                'reason' => 'already_running',
            ]);
        }

        $log = storage_path('logs/endpoint-sync-manual.log');

        // Clear any stale flag BEFORE spawning (see NovacityEndpointsController::refresh).
        RunEndpointSync::clearStale();

        DetachedProcess::spawn($log, ['endpoint-sync:run']);

        Cache::put(
            RunEndpointSync::RUNNING_KEY,
            now()->toIso8601String(),
            now()->addHours(2),
        );

        return response()->json([
            'success' => true,
            'queued' => true,
            'running' => true,
            'message' => 'Synchronisation lancée en arrière-plan — chaque endpoint est mis à jour en tâche de fond.',
        ]);
    }

    /**
     * Schema analysis (primary keys, shared join columns, FK candidates) for
     * the page builder so the report editor can
     * build its cross-table join registry without the main IT/web session.
     */
    public function schema(): JsonResponse
    {
        $result = (new NovacityEndpointsController)->schemaData();

        if ($result === null) {
            return response()->json([
                'entries' => [],
                'columns' => [],
                'foreign_keys' => [],
                'generated_at' => now()->toIso8601String(),
            ]);
        }

        return response()->json($result);
    }

    /**
     * Merge the tabular structure from data.json with the rows stored by
     * sync:endpoint-data (fetched live from NOVACITY_BASE_URL).
     *
     * Every eligible dataset in the registry is exposed. Rows come from the
     * live sync when available, and fall back to the last-known-good snapshot
     * in data.json so the builder / measure wizard stay usable even when the
     * API is unreachable or the database has never synced.
     *
     * An optional selection (`?p[chaine]=CH02`) switches each dataset to the
     * already-stored parameter variant matching that selection — instant
     * switching, no live fetch. Datasets that do not use the selected
     * parameters keep their default rows.
     */
    public function index(Request $request, EndpointDatasetRegistry $registry): JsonResponse
    {
        $selection = $this->normalizeSelection($request->query('p', []));

        $structure = $registry->endpoints();
        $structureBySlug = collect($structure)->keyBy('slug');

        $records = EndpointDataset::query()
            ->where('method', 'GET')
            ->whereIn('slug', $structureBySlug->keys())
            ->orderBy('slug')
            ->get()
            ->keyBy('slug');

        $snapshots = $registry->rowsBySlug();

        $variants = EndpointDatasetVariant::query()
            ->whereIn('slug', $structureBySlug->keys())
            ->get()
            ->groupBy('slug');

        $datasets = $structureBySlug->map(function (array $meta, string $slug) use ($records, $snapshots, $variants, $selection) {
            $record = $records->get($slug);

            $actives = $this->activeVariants($meta, $selection, $variants->get($slug));

            $defaultRows = ! empty($record?->sample_data)
                ? $record->sample_data
                : ($snapshots[$slug] ?? null);
            $defaultRows = is_array($defaultRows) ? $defaultRows : [];

            $includeDefault = $this->selectionCoversDefault($meta, $selection);

            if ($actives === [] && ! $includeDefault) {
                $rows = $defaultRows;
            } else {
                $rows = [];
                $seen = [];

                foreach ($actives as $active) {
                    $sample = $active['sample_data'] ?? null;

                    if (! is_array($sample)) {
                        continue;
                    }

                    foreach ($sample as $row) {
                        $key = json_encode($row);

                        if ($key === false || isset($seen[$key])) {
                            continue;
                        }

                        $seen[$key] = true;
                        $rows[] = $row;
                    }
                }

                if ($includeDefault) {
                    foreach ($defaultRows as $row) {
                        $key = json_encode($row);

                        if ($key === false || isset($seen[$key])) {
                            continue;
                        }

                        $seen[$key] = true;
                        $rows[] = $row;
                    }
                }
            }

            $rows = is_array($rows) ? $rows : [];

            $typed = [];

            foreach ($actives as $active) {
                foreach ($active['columns'] ?? [] as $column) {
                    $name = (string) ($column['name'] ?? '');
                    $type = (string) ($column['type'] ?? '');

                    if ($name !== '' && $type !== '' && ! isset($typed[$name])) {
                        $typed[$name] = $type;
                    }
                }
            }

            $typedColumns = array_map(
                static fn (string $name, string $type): array => ['name' => $name, 'type' => $type],
                array_keys($typed),
                array_values($typed),
            );

            $first = $actives[0] ?? null;

            return [
                'slug' => $slug,
                'name' => $meta['name'] ?? $record->name ?? $slug,
                'label' => $meta['label'] ?? $record->label ?? null,
                'object' => $meta['object'] ?? $record->object ?? null,
                'object_type' => $meta['object_type'] ?? $record->object_type ?? null,
                'source' => $meta['source'] ?? $record->source ?? null,
                'method' => 'GET',
                'columns' => $this->mergeColumns(
                    $meta['columns'] ?? [],
                    $typedColumns !== [] ? $typedColumns : ($record->columns ?? []),
                    $rows,
                ),
                'sample_data' => $rows,
                'row_count' => count($rows),
                'status' => $first['last_status'] ?? $record?->last_status,
                'last_error' => $first['last_error'] ?? $record?->last_error,
                'last_synced_at' => $first !== null
                    ? ($first['last_synced_at']?->toISOString() ?? $record?->last_synced_at?->toISOString())
                    : $record?->last_synced_at?->toISOString(),
                'params' => $first['params'] ?? [],
            ];
        })->values();

        return response()->json(['datasets' => $datasets]);
    }

    /**
     * Declared parameters (from endpoint-params.json) that are actually used
     * by at least one dataset in the registry.
     *
     * @return array<int, array{root: string, name: string, values: list<string>, current: ?string, affected_slugs: list<string>}>
     */
    public function dashboardParameters(EndpointDatasetRegistry $registry): JsonResponse
    {
        $definitions = RootParameters::load();
        $structure = $registry->endpoints();

        $usage = [];

        foreach ($structure as $meta) {
            $url = (string) ($meta['endpoint'] ?? '');
            $root = $this->rootOf($url);

            if ($root === '' || ! isset($definitions[$root])) {
                continue;
            }

            $query = [];

            $parsed = parse_url($url);

            if (isset($parsed['query']) && $parsed['query'] !== '') {
                parse_str($parsed['query'], $query);
            }

            foreach ($definitions[$root] as $definition) {
                $name = trim((string) ($definition['name'] ?? ''));

                if ($name === '' || ! array_key_exists($name, $query)) {
                    continue;
                }

                $key = $root.'::'.$name;

                if (! isset($usage[$key])) {
                    $usage[$key] = [
                        'root' => $root,
                        'name' => $name,
                        'values' => array_values(array_map('strval', (array) ($definition['values'] ?? []))),
                        'slugs' => [],
                        'current' => null,
                    ];
                }

                $slug = (string) ($meta['slug'] ?? '');

                if ($slug !== '' && ! in_array($slug, $usage[$key]['slugs'], true)) {
                    $usage[$key]['slugs'][] = $slug;
                }

                if ($usage[$key]['current'] === null && is_scalar($query[$name])) {
                    $usage[$key]['current'] = (string) $query[$name];
                }
            }
        }

        $result = array_values(array_map(
            static fn (array $entry): array => [
                'root' => $entry['root'],
                'name' => $entry['name'],
                'values' => $entry['values'],
                'current' => $entry['current'],
                'affected_slugs' => $entry['slugs'],
            ],
            $usage
        ));

        usort($result, static fn (array $a, array $b): int => strcmp($a['root'], $b['root']) ?: strcmp($a['name'], $b['name']));

        return response()->json(['parameters' => $result]);
    }

    /**
     * Collect the stored variants matching the active multi-value selection for
     * a dataset slug.
     *
     * Only parameters actually present in the dataset's URL are considered, so
     * a selection like {chaine: [CH02, CH03], zone: [ZA]} matches a
     * chaine-only dataset via {chaine: [CH02, CH03]}. A variant matches when
     * every selection parameter it uses has its stored value inside the
     * selected set; all matching variants are returned so their rows can be
     * merged (union). Returns [] when no selection is given, the dataset uses
     * none of the selected parameters, or no variant is synced yet.
     *
     * @param  array<string, mixed>  $meta
     * @param  array<string, list<string>>  $selection
     * @param  Collection<int, EndpointDatasetVariant>|null  $variants
     * @return array<int, EndpointDatasetVariant>
     */
    private function activeVariants(array $meta, array $selection, $variants): array
    {
        if ($selection === [] || $variants === null || $variants->isEmpty()) {
            return [];
        }

        $endpoint = (string) ($meta['endpoint'] ?? '');
        $query = [];

        $parsed = parse_url($endpoint);

        if (isset($parsed['query']) && $parsed['query'] !== '') {
            parse_str($parsed['query'], $query);
        }

        $expected = [];

        foreach (RootParameters::forRoot($this->rootOf($endpoint)) as $definition) {
            $name = trim((string) ($definition['name'] ?? ''));

            if ($name === '' || ! array_key_exists($name, $query) || ! array_key_exists($name, $selection)) {
                continue;
            }

            $allowed = array_values(array_filter(
                array_map('strval', (array) $selection[$name]),
                static fn (string $v): bool => $v !== '',
            ));

            if ($allowed === []) {
                continue;
            }

            $expected[$name] = $allowed;
        }

        if ($expected === []) {
            return [];
        }

        $matches = [];

        foreach ($variants as $variant) {
            $params = $variant['params'] ?? [];

            // Only serve a variant that actually carries rows: a variant whose
            // live fetch failed is stored with last_status=error and no
            // sample_data, and serving it would blank the dataset. Falling back
            // to the default last-known-good rows is always better.
            if (! is_array($params) || empty($variant['sample_data'])) {
                continue;
            }

            $matchesSelection = true;

            foreach ($expected as $name => $allowed) {
                if (! array_key_exists($name, $params)) {
                    continue;
                }

                if (! in_array((string) $params[$name], $allowed, true)) {
                    $matchesSelection = false;
                    break;
                }
            }

            if ($matchesSelection) {
                $matches[] = $variant;
            }
        }

        return $matches;
    }

    /**
     * Whether the multi-value selection includes the dataset endpoint URL's
     * current value for a declared parameter.
     *
     * A dataset's default rows are the live snapshot of its URL as-is, i.e.
     * they represent the URL's current value. When that value is part of the
     * selection, those rows must be merged alongside the matching stored
     * variants; otherwise selecting several values silently drops the current
     * value's data and the report only ever shows one selected value.
     *
     * @param  array<string, mixed>  $meta
     * @param  array<string, list<string>>  $selection
     */
    private function selectionCoversDefault(array $meta, array $selection): bool
    {
        if ($selection === []) {
            return false;
        }

        $endpoint = (string) ($meta['endpoint'] ?? '');
        $query = [];

        $parsed = parse_url($endpoint);

        if (isset($parsed['query']) && $parsed['query'] !== '') {
            parse_str($parsed['query'], $query);
        }

        foreach (RootParameters::forRoot($this->rootOf($endpoint)) as $definition) {
            $name = trim((string) ($definition['name'] ?? ''));

            if ($name === '' || ! array_key_exists($name, $query) || ! array_key_exists($name, $selection)) {
                continue;
            }

            $current = (string) $query[$name];

            if ($current !== '' && in_array($current, $selection[$name], true)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Normalize the `p` selection query into a name => values map. Repeated
     * `p[name]` entries (multiple selected values) are preserved as an array;
     * a single value stays a single-entry array.
     *
     * @return array<string, list<string>>
     */
    private function normalizeSelection(mixed $selection): array
    {
        if (! is_array($selection)) {
            return [];
        }

        $result = [];

        foreach ($selection as $key => $value) {
            $key = trim((string) $key);

            if ($key === '') {
                continue;
            }

            foreach (is_array($value) ? $value : [$value] as $item) {
                if (is_string($item) && $item !== '') {
                    $result[$key][] = $item;
                }
            }
        }

        return $result;
    }

    /**
     * Extract the root (scheme://host[:port]) of a URL.
     */
    private function rootOf(string $url): string
    {
        $parts = parse_url($url);

        if (isset($parts['scheme'], $parts['host'])) {
            $root = $parts['scheme'].'://'.$parts['host'];

            if (isset($parts['port'])) {
                $root .= ':'.$parts['port'];
            }

            return $root;
        }

        return '';
    }

    /**
     * Column names come from the data.json structure; types come from the
     * DB record (inferred from the live rows at sync time). When the record
     * carries no type for a column (e.g. the sync never succeeded), fall back
     * to inferring the type from the rows actually being served.
     *
     * @param  list<string>  $names
     * @param  list<array{name: string, type: string}>  $typed
     * @param  list<array<string, mixed>>  $rows
     * @return list<array{name: string, type: string}>
     */
    private function mergeColumns(array $names, array $typed, array $rows): array
    {
        $typeByName = collect($typed)
            ->mapWithKeys(fn (array $c): array => [(string) $c['name'] => (string) $c['type']]);

        return array_values(array_map(
            fn (string $name): array => [
                'name' => $name,
                'type' => $typeByName->get(
                    $name,
                    DatasetRows::inferColumnType($rows, $name),
                ),
            ],
            $names
        ));
    }
}
