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

// One dispatcher process runs every minute while the DB interval is due. It
// discovers every distinct root in data.json and spawns a separate
// sync:endpoint-data worker per root, so each root always gets its own
// parallel process - no schedule edits needed when roots/endpoints are added.
Schedule::command('sync:endpoint-data:dispatch')
    ->everyMinute()
    ->when(fn () => isSyncDue('sync_interval_seconds'))
    ->name('endpoint-data')
    ->withoutOverlapping();

// Daily safety-net: full registry refresh (status/response metadata) once per
// day, gated by a 24h interval (settings.sync_refresh_daily, defaults to 86400s).
Schedule::command('sync:endpoint-data --phase=refresh --force')
    ->everyMinute()
    ->when(fn () => isSyncDue('sync_refresh_daily', 86400))
    ->name('endpoint-data-daily')
    ->withoutOverlapping();
