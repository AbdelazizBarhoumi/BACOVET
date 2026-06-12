<?php

namespace App\Console\Commands;

use App\Services\SyncService;
use Illuminate\Console\Command;

class SyncNovacityFull extends Command
{
    protected $signature = 'sync:full';

    protected $description = 'Sync all data from Novacity API';

    public function handle(SyncService $sync)
    {
        $this->info('Starting Full sync...');
        $sync->syncQuality();
        $sync->syncProduction();
        $sync->syncLogistics();
        $this->info('Full sync completed.');
    }
}
