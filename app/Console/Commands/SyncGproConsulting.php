<?php

namespace App\Console\Commands;

use App\Services\SyncService;
use Illuminate\Console\Command;

class SyncGproConsulting extends Command
{
    protected $signature = 'sync:gpro';

    protected $description = 'Sync GPRO Consulting planning data';

    public function handle(SyncService $sync): int
    {
        $this->info('Starting GPRO Consulting sync...');
        $sync->syncGproConsulting();
        $this->info('GPRO Consulting sync completed.');

        return self::SUCCESS;
    }
}
