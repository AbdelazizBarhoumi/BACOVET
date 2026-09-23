<?php

namespace App\Console\Commands;

use App\Support\SyncStatus;
use Illuminate\Console\Command;

class PruneStaleDatasets extends Command
{
    protected $signature = 'datasets:prune-stale
        {--dry-run : Count stale rows without deleting them}';

    protected $description = 'Delete endpoint_datasets and variant rows whose slug is no longer in the (enabled) dataset registry';

    public function handle(): int
    {
        $slugs = SyncStatus::registrySlugs();

        if ($slugs === null) {
            $this->warn('Registry unavailable or empty — nothing pruned (refusing to wipe the tables on a missing data.json).');

            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $datasets = \App\Models\EndpointDataset::query()->whereNotIn('slug', $slugs)->count();
            $variants = \App\Models\EndpointDatasetVariant::query()->whereNotIn('slug', $slugs)->count();
            $this->info("Dry run: {$datasets} dataset row(s) and {$variants} variant row(s) would be deleted (".count($slugs).' registry slug(s) kept).');

            return self::SUCCESS;
        }

        $result = SyncStatus::pruneStale();

        $this->info("Pruned {$result['datasets']} dataset row(s) and {$result['variants']} variant row(s) (".count($slugs).' registry slug(s) kept).');

        return self::SUCCESS;
    }
}
