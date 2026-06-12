<?php

namespace App\Console\Commands;

use App\Services\SyncService;
use Illuminate\Console\Command;

class SyncNovacityProduction extends Command
{
    protected $signature = 'sync:production';
    protected $description = 'Sync Production data from Novacity API';

    public function handle(SyncService $sync)
    {
        $this->info('Starting Production sync...');
        $sync->syncProduction();
        $this->info('Production sync completed.');
    }
}
