<?php

use App\Models\SyncSetting;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Helper to check if a sync is due based on DB interval
if (! function_exists('isSyncDue')) {
    function isSyncDue(string $settingKey): bool
    {
        $intervalSeconds = SyncSetting::get($settingKey, 60);
        $lastRunKey = "sync_last_run:{$settingKey}";
        $lastRun = Cache::get($lastRunKey, 0);

        if ((time() - $lastRun) >= $intervalSeconds) {
            Cache::put($lastRunKey, time(), $intervalSeconds + 60);

            return true;
        }

        return false;
    }
}

Schedule::command('sync:quality')
    ->when(fn () => isSyncDue('quality_interval_seconds'))
    ->everyMinute()
    ->name('sync-quality')
    ->withoutOverlapping(5);

Schedule::command('sync:production')
    ->when(fn () => isSyncDue('production_interval_seconds'))
    ->everyMinute()
    ->name('sync-production')
    ->withoutOverlapping(5);

Schedule::command('sync:logistics')
    ->when(fn () => isSyncDue('logistics_interval_seconds'))
    ->everyMinute()
    ->name('sync-logistics')
    ->withoutOverlapping(10);

Schedule::command('sync:drive')
    ->when(fn () => isSyncDue('drive_interval_seconds'))
    ->everyMinute()
    ->name('sync-drive')
    ->withoutOverlapping(10);

Schedule::command('sync:gpro')
    ->when(fn () => isSyncDue('gpro_interval_seconds'))
    ->everyMinute()
    ->name('sync-gpro')
    ->withoutOverlapping(5);
