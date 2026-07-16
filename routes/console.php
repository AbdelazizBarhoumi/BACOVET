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
    ->when(fn () => config('sync.sources.novacity_quality') && isSyncDue('quality_interval_seconds'))
    ->everyMinute()
    ->name('sync-quality')
    ->withoutOverlapping(5);

Schedule::command('sync:production')
    ->when(fn () => config('sync.sources.novacity_production') && isSyncDue('production_interval_seconds'))
    ->everyMinute()
    ->name('sync-production')
    ->withoutOverlapping(5);

Schedule::command('sync:logistics')
    ->when(fn () => config('sync.sources.novacity_logistics') && isSyncDue('logistics_interval_seconds'))
    ->everyMinute()
    ->name('sync-logistics')
    ->withoutOverlapping(10);

Schedule::command('sync:drive')
    ->when(fn () => config('sync.sources.google_drive') && isSyncDue('drive_interval_seconds'))
    ->everyMinute()
    ->name('sync-drive')
    ->withoutOverlapping(10);

Schedule::command('sync:gpro')
    ->when(fn () => config('sync.sources.gpro') && isSyncDue('gpro_interval_seconds'))
    ->everyMinute()
    ->name('sync-gpro')
    ->withoutOverlapping(5);

// KPI Endpoint scheduling — instant fired concurrently, others dispatched to queue
Schedule::command('sync:instant-endpoints')
    ->everyMinute()
    ->name('kpi-instant')
    ->withoutOverlapping();

Schedule::command('sync:kpi-endpoints', ['--frequency=daily', '--queue'])
    ->dailyAt('02:00')
    ->name('kpi-daily')
    ->withoutOverlapping(10);

Schedule::command('sync:kpi-endpoints', ['--frequency=weekly', '--queue'])
    ->weeklyOn(1, '03:00')
    ->name('kpi-weekly')
    ->withoutOverlapping(10);

Schedule::command('sync:kpi-endpoints', ['--frequency=monthly', '--queue'])
    ->monthlyOn(1, '04:00')
    ->name('kpi-monthly')
    ->withoutOverlapping(10);
