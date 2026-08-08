<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EndpointDataset;
use App\Services\EndpointDatasetRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;

class EndpointDatasetController extends Controller
{
    /**
     * Last successful DB sync (a run that produced at least one HTTP 200),
     * as tracked by the sync:endpoint-data worker. Used by the LIVE SYNC
     * pill so its timer reflects the worker, not the browser.
     */
    public function status(): JsonResponse
    {
        $lastSuccess = EndpointDataset::query()
            ->where('last_status', 'ok')
            ->orderByDesc('last_synced_at')
            ->value('last_synced_at');

        return response()->json([
            'last_success_at' => $lastSuccess?->toIso8601String() ?? null,
            'server_now' => now()->toIso8601String(),
            'ok_count' => EndpointDataset::query()
                ->where('last_status', 'ok')
                ->count(),
        ]);
    }

    /**
     * Trigger the dataset-sync phase of sync:endpoint-data synchronously and
     * return its summary. Backed by the same command the scheduler runs.
     */
    public function sync(): JsonResponse
    {
        $exitCode = Artisan::call('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--timeout' => (int) config('novacity.timeout', 30),
        ]);

        $registry = app(EndpointDatasetRegistry::class);
        $registry->forgetCache();

        return response()->json([
            'success' => $exitCode === 0,
            'exit_code' => $exitCode,
            'output' => Artisan::output(),
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
     */
    public function index(EndpointDatasetRegistry $registry): JsonResponse
    {
        $structure = $registry->endpoints();
        $structureBySlug = collect($structure)->keyBy('slug');

        $records = EndpointDataset::query()
            ->where('method', 'GET')
            ->whereIn('slug', $structureBySlug->keys())
            ->orderBy('slug')
            ->get()
            ->keyBy('slug');

        $datasets = $records->map(function (EndpointDataset $record) use ($structureBySlug) {
            $meta = $structureBySlug->get($record->slug);

            return [
                'slug' => $record->slug,
                'name' => $meta['name'] ?? $record->name,
                'label' => $meta['label'] ?? $record->label,
                'object' => $meta['object'] ?? $record->object,
                'object_type' => $meta['object_type'] ?? $record->object_type,
                'source' => $meta['source'] ?? $record->source,
                'method' => 'GET',
                'columns' => $this->mergeColumns(
                    $meta['columns'] ?? [],
                    $record->columns ?? [],
                ),
                'sample_data' => $record->sample_data,
                'row_count' => $record->row_count,
                'status' => $record->last_status,
                'last_error' => $record->last_error,
                'last_synced_at' => $record->last_synced_at?->toISOString(),
            ];
        })->values();

        return response()->json(['datasets' => $datasets]);
    }

    /**
     * Column names come from the data.json structure; types come from the
     * DB record (inferred from the live rows at sync time).
     *
     * @param  list<string>  $names
     * @param  list<array{name: string, type: string}>  $typed
     * @return list<array{name: string, type: string}>
     */
    private function mergeColumns(array $names, array $typed): array
    {
        $typeByName = collect($typed)
            ->mapWithKeys(fn (array $c): array => [(string) $c['name'] => (string) $c['type']]);

        return array_values(array_map(
            fn (string $name): array => [
                'name' => $name,
                'type' => $typeByName->get($name, 'text'),
            ],
            $names
        ));
    }
}
