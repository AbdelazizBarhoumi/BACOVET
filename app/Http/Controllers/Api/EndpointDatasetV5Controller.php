<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EndpointDataset;
use App\Services\EndpointDatasetRegistry;
use Illuminate\Http\JsonResponse;

class EndpointDatasetV5Controller extends Controller
{
    /**
     * Merge the tabular structure from data.json with the rows stored by
     * sync:endpoint-datasets (fetched live from NOVACITY_BASE_URL).
     */
    public function index(EndpointDatasetRegistry $registry): JsonResponse
    {
        $structure = $registry->endpoints();
        $structureBySlug = collect($structure)->keyBy('slug');

        $records = EndpointDataset::query()
            ->where('method', 'GET')
            ->where('last_status', 'ok')
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
