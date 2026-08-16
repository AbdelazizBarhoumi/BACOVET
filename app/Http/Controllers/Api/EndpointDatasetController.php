<?php

namespace App\Http\Controllers\Api;

use App\Console\Commands\RunEndpointSync;
use App\Http\Controllers\Controller;
use App\Models\EndpointDataset;
use App\Services\EndpointDatasetRegistry;
use App\Support\DatasetRows;
use App\Support\DetachedProcess;
use App\Support\SyncStatus;
use Illuminate\Http\JsonResponse;
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

        $snapshots = $registry->rowsBySlug();

        $datasets = $structureBySlug->map(function (array $meta, string $slug) use ($records, $snapshots) {
            $record = $records->get($slug);

            $rows = ! empty($record?->sample_data)
                ? $record->sample_data
                : ($snapshots[$slug] ?? null);

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
                    $record->columns ?? [],
                    $rows,
                ),
                'sample_data' => $rows,
                'row_count' => is_array($rows) ? count($rows) : (int) ($record->row_count ?? 0),
                'status' => $record?->last_status,
                'last_error' => $record?->last_error,
                'last_synced_at' => $record?->last_synced_at?->toISOString(),
            ];
        })->values();

        return response()->json(['datasets' => $datasets]);
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
