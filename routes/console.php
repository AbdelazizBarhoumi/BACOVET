<?php

use App\Models\Setting;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Helper: run the command only when the DB-configured interval has elapsed
// since the last run. Falls back to 60s when unset; never below 60s.
if (! function_exists('isSyncDue')) {
    function isSyncDue(string $settingKey): bool
    {
        $intervalSeconds = max(60, (int) Setting::get($settingKey, 60));
        $lastRunKey = "sync_last_run:{$settingKey}";
        $lastRun = Cache::get($lastRunKey, 0);

        if ((time() - $lastRun) >= $intervalSeconds) {
            Cache::put($lastRunKey, time(), $intervalSeconds + 60);

            return true;
        }

        return false;
    }
}

// Endpoint registry refresh + dataset snapshots for the builder - keep
// columns/rows fresh. Interval is configurable from the admin UI
// (settings.sync_interval_seconds). The registry-refresh phase is gated
// internally (once per day at/after 08:00, plus hourly retries while a run
// ended with 0 successes), the dataset phase always runs when due.
Schedule::command('sync:endpoint-data')
    ->everyMinute()
    ->when(fn () => isSyncDue('sync_interval_seconds'))
    ->name('endpoint-data')
    ->withoutOverlapping();
