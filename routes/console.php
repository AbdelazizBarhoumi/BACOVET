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
// since the last run. Falls back to $fallback when unset; never below 60s.
if (! function_exists('isSyncDue')) {
    function isSyncDue(string $settingKey, int $fallback = 60): bool
    {
        $intervalSeconds = max(60, (int) Setting::get($settingKey, $fallback));
        $lastRunKey = "sync_last_run:{$settingKey}";
        $lastRun = Cache::get($lastRunKey, 0);

        if ((time() - $lastRun) >= $intervalSeconds) {
            Cache::put($lastRunKey, time(), $intervalSeconds + 60);

            return true;
        }

        return false;
    }
}

// Everything runs on a single every-minute schedule: registry refresh + dataset
// sync in one pass. Each invocation fires every endpoint request concurrently
// (one Http::pool for the whole set, no sequential batches) inside its own
// process, then waits, saves and exits. Invocations are allowed to overlap: a
// run still in flight does NOT block the next minute's run, so a slow origin
// never skips a tick. The window guard is bypassed with --force so data stays
// fresh 24/7. The gate below keeps the cadence at the configured interval
// (settings.sync_interval_seconds, min 60s); the lock that used to skip
// overlapping refreshes has been removed.
Schedule::command('sync:endpoint-data --phase=refresh --force')
    ->everyMinute()
    ->when(fn () => isSyncDue('sync_interval_seconds'))
    ->name('endpoint-data');
