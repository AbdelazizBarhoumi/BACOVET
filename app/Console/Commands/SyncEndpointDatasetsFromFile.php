<?php

namespace App\Console\Commands;

use App\Models\EndpointDataset;
use App\Services\EndpointDatasetRegistry;
use App\Support\DatasetRows;
use Illuminate\Console\Command;

class SyncEndpointDatasetsFromFile extends Command
{
    protected $signature = 'sync:endpoint-datasets:file
        {--file= : Override the data.json path}
        {--dry-run : Print what would be written without touching the DB}';

    protected $description = 'Feed endpoint_datasets from the data.json snapshot without calling NOVACITY_BASE_URL';

    public function handle(EndpointDatasetRegistry $registry): int
    {
        $path = $this->filePath();

        if (! file_exists($path)) {
            $this->error("data.json not found at {$path}.");

            return self::FAILURE;
        }

        $raw = file_get_contents($path);

        if ($raw === false) {
            $this->error("Unable to read data.json at {$path}.");

            return self::FAILURE;
        }

        $json = json_decode($raw, true);

        if (! is_array($json)) {
            $this->error("data.json is invalid or empty at {$path}.");

            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $syncedAt = now();
        $imported = 0;
        $skipped = 0;

        foreach ($json as $item) {
            if (! is_array($item)) {
                $skipped++;

                continue;
            }

            $entry = $registry->buildEntry($item);

            if ($entry === null) {
                $skipped++;

                continue;
            }

            $rows = DatasetRows::extractRows($item['response'] ?? null);
            $columns = DatasetRows::buildColumns((array) $entry['columns'], $rows);

            if ($dryRun) {
                $this->line(sprintf(
                    '  ✔ %s (%s) — %d columns, %d rows',
                    $entry['name'],
                    $entry['slug'],
                    count($columns),
                    count($rows)
                ));
                $imported++;

                continue;
            }

            EndpointDataset::updateOrCreate(
                ['slug' => (string) $entry['slug']],
                [
                    'name' => (string) $entry['name'],
                    'label' => $entry['label'],
                    'object' => $entry['object'],
                    'object_type' => $entry['object_type'],
                    'source' => (string) $entry['source'],
                    'method' => 'GET',
                    'columns' => $columns,
                    'sample_data' => $rows,
                    'row_count' => count($rows),
                    'last_status' => 'ok',
                    'last_error' => null,
                    'last_synced_at' => $syncedAt,
                ],
            );

            $imported++;
        }

        if ($dryRun) {
            $this->info("Dry run: {$imported} dataset(s) would be imported, {$skipped} skipped.");

            return self::SUCCESS;
        }

        $this->info("Done: {$imported} imported, {$skipped} skipped from {$path}.");

        return self::SUCCESS;
    }

    private function filePath(): string
    {
        $override = (string) $this->option('file');

        if ($override !== '') {
            return $override;
        }

        return storage_path((string) config('novacity.data_file', 'app/public/data.json'));
    }
}
