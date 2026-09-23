<?php

namespace App\Support;

use Illuminate\Support\Facades\Artisan;

/**
 * Synchronous datasets-phase sync shared by every HTTP trigger that must
 * keep working on hosts without a usable shell/PHP CLI (jailed php-fpm).
 *
 * Same live fetch + upsert path as the detached worker's datasets phase,
 * executed in-request — like the per-endpoint refresh buttons. Callers use
 * this as the fallback when DetachedProcess::preflight() fails.
 */
class SyncRunner
{
    /**
     * @return array{exit_code: int, output: string}
     *
     * @throws \Throwable
     */
    public static function runDatasetsSynchronously(?int $timeout = null): array
    {
        $exitCode = Artisan::call('sync:endpoint-data', [
            '--phase' => 'datasets',
            '--force' => true,
            '--timeout' => $timeout ?? (int) config('novacity.web_timeout', 20),
        ]);

        return [
            'exit_code' => $exitCode,
            'output' => (string) Artisan::output(),
        ];
    }
}
