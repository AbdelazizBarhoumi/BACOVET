<?php

namespace App\Console\Commands;

use App\Services\KpiEndpointService;
use Illuminate\Console\Command;

class SyncKpiEndpoints extends Command
{
    protected $signature = 'sync:kpi-endpoints {--frequency= : Filter by frequency (instant|daily|weekly|monthly)} {--queue : Dispatch to queue for parallel execution}';

    protected $description = 'Fetch KPI data from configured endpoints and store results';

    public function handle(KpiEndpointService $service): int
    {
        $frequency = $this->option('frequency');

        if ($this->option('queue')) {
            $this->info("Dispatching KPI endpoint jobs to queue" . ($frequency ? " (frequency: {$frequency})" : "") . "...");

            $results = $service->dispatchByFrequency($frequency);

            $this->info("Dispatched: {$results['dispatched']}, Skipped: {$results['skipped']}");

            return self::SUCCESS;
        }

        $this->info("Starting KPI endpoint sync" . ($frequency ? " (frequency: {$frequency})" : "") . "...");

        $results = $service->syncByFrequency($frequency);

        $this->info("KPI endpoint sync completed:");
        $this->line("  OK: {$results['ok']}");
        $this->line("  Errors: {$results['error']}");
        $this->line("  Skipped: {$results['skipped']}");

        return $results['error'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
