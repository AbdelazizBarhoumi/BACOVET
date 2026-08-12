<?php

namespace App\Console\Commands;

use App\Services\EndpointDatasetRegistry;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Process;

class RunEndpointSync extends Command
{
    protected $signature = 'endpoint-sync:run
        {--timeout= : Per-request timeout for child workers (defaults to config)}';

    protected $description = 'Run a full registry + dataset sync in the background and publish a running flag the UI can poll';

    public const RUNNING_KEY = 'endpoints:refresh:running';

    /**
     * PID of the process that last set the running flag. A flag whose PID is
     * dead (or that has been up too long without a PID) is treated as stale
     * so a crashed worker can never wedge the Rafraîchir button for 30 min.
     */
    private const PID_KEY = 'endpoints:refresh:running_pid';

    /**
     * How long the flag may exist without a PID (worker still booting) before
     * it is considered stale. Covers spawn latency; not the full sweep.
     * Kept short so a worker that dies at boot (e.g. a transient DB hiccup)
     * unblocks the button within seconds instead of minutes.
     */
    private const BOOT_GRACE_SECONDS = 30;

    public function handle(EndpointDatasetRegistry $registry): int
    {
        $timeout = (int) ($this->option('timeout') ?: config('novacity.timeout', 60));

        // Publishing the flag must never kill the sweep: a transient store
        // hiccup (DB-backed cache) at boot would otherwise orphan a "running"
        // flag with no PID and wedge the button until the grace window expires.
        // Retry briefly, then give up rather than abort the whole command.
        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                Cache::put(self::RUNNING_KEY, now()->toIso8601String(), now()->addHours(2));
                Cache::put(self::PID_KEY, (int) getmypid(), now()->addHours(2));
                break;
            } catch (\Throwable) {
                if ($attempt < 2) {
                    usleep(1_000_000);
                }
            }
        }

        try {
            return $this->callSilently('sync:endpoint-data', [
                '--phase' => 'all',
                '--force' => true,
                '--timeout' => max(1, $timeout),
            ]);
        } finally {
            try {
                Cache::forget(self::RUNNING_KEY);
                Cache::forget(self::PID_KEY);
            } finally {
                $registry->forgetCache();
            }
        }
    }

    /**
     * True only when a worker is genuinely believed to be running. A stale
     * flag (dead PID, or no PID past the boot grace window) is cleared and
     * reported as not running so the UI/button can never be blocked forever.
     */
    public static function isActuallyRunning(): bool
    {
        $startedAt = Cache::get(self::RUNNING_KEY);

        if (! is_string($startedAt) || $startedAt === '') {
            return false;
        }

        $pid = (int) Cache::get(self::PID_KEY, 0);

        if ($pid > 0 && self::isAlive($pid)) {
            return true;
        }

        // No live PID: give a freshly-launched worker time to boot and publish
        // its own PID before declaring the flag stale.
        $started = strtotime($startedAt);

        if ($started !== false && (time() - $started) <= self::BOOT_GRACE_SECONDS) {
            return true;
        }

        Cache::forget(self::RUNNING_KEY);
        Cache::forget(self::PID_KEY);

        return false;
    }

    /**
     * Self-heal helper: drop the running flag/PID when the worker is dead.
     */
    public static function clearStale(): void
    {
        Cache::forget(self::RUNNING_KEY);
        Cache::forget(self::PID_KEY);
    }

    private static function isAlive(int $pid): bool
    {
        if ($pid <= 0) {
            return false;
        }

        try {
            $command = PHP_OS_FAMILY === 'Windows'
                ? (new Process(['tasklist', '/FI', 'PID eq '.$pid, '/NH', '/FO', 'CSV']))
                : (new Process(['kill', '-0', (string) $pid]));

            $command->run();

            if (PHP_OS_FAMILY === 'Windows') {
                return stripos((string) $command->getOutput(), '"'.$pid.'"') !== false;
            }

            return $command->isSuccessful();
        } catch (\Throwable) {
            // Any failure to inspect the process is treated as alive (fail-safe);
            // the boot-grace window and the 2h TTL still bound worst-case staleness.
            return true;
        }
    }
}
