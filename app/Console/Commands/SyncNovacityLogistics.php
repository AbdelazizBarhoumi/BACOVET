<?php

namespace App\Console\Commands;

use App\Services\SyncService;
use Illuminate\Console\Command;

class SyncNovacityLogistics extends Command
{
    protected $signature = 'sync:logistics';

    protected $description = 'Sync Logistics data from Novacity API';

    public function handle(SyncService $sync)
    {
        $this->info('Starting Logistics sync...');
        $sync->syncLogistics();
        $this->info('Logistics sync completed.');
    }
}
