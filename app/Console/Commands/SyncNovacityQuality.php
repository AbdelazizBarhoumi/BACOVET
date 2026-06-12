<?php

namespace App\Console\Commands;

use App\Services\SyncService;
use Illuminate\Console\Command;

class SyncNovacityQuality extends Command
{
    protected $signature = 'sync:quality';

    protected $description = 'Sync Quality data from Novacity API';

    public function handle(SyncService $sync)
    {
        $this->info('Starting Quality sync...');
        $sync->syncQuality();
        $this->info('Quality sync completed.');
    }
}
