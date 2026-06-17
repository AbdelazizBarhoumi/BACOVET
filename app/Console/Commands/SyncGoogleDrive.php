<?php

namespace App\Console\Commands;

use App\Services\SyncService;
use Illuminate\Console\Command;

class SyncGoogleDrive extends Command
{
    protected $signature = 'sync:drive';

    protected $description = 'Sync Google Drive / Sheets data';

    public function handle(SyncService $sync): int
    {
        $this->info('Starting Google Drive sync...');
        $sync->syncGoogleDrive();
        $this->info('Google Drive sync completed.');

        return self::SUCCESS;
    }
}
