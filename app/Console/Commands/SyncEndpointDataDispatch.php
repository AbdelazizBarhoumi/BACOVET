<?php

namespace App\Console\Commands;

use App\Services\EndpointDatasetRegistry;
use App\Support\DetachedProcess;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class SyncEndpointDataDispatch extends Command
{
    protected $signature = 'sync:endpoint-data:dispatch
        {--phase=datasets : datasets|refresh|all per-root phase}
        {--timeout= : Per-request timeout for child workers (defaults to config)}
        {--retry= : Retries per child request (defaults to config)}
        {--batch= : Max concurrent requests per child worker (defaults to config)}
        {--force : Pass --force to child workers}';

    protected $description = 'Discover every root in data.json and launch one detached sync:endpoint-data worker per root so each root gets its own process';

    /**
     * Atomic counter of detached workers currently running. Each spawned
     * worker decrements it (when given --wave) on completion. The dispatcher
     * refuses to launch a new wave while it is > 0, which is what replaces
     * `withoutOverlapping()` around the (now instantaneous) spawn decision.
     */
    public const INFLIGHT_KEY = 'endpoints:dispatch:inflight';

    private const STARTED_AT_KEY = 'endpoints:dispatch:started_at';

    public function handle(EndpointDatasetRegistry $registry): int
    {
        $roots = $this->distinctRoots($registry);

        if ($roots === []) {
            $this->info('No endpoints found in data.json — nothing to dispatch.');

            return self::SUCCESS;
        }

        $phase = strtolower((string) $this->option('phase'));

        if (! in_array($phase, ['datasets', 'refresh', 'all'], true)) {
            $this->error("Unknown phase '{$phase}' (datasets|refresh|all).");

            return self::FAILURE;
        }

        // A previous wave is still running its detached workers: skipping is the
        // correct behaviour here — the children own the actual long sweep.
        if ($this->inflight() > 0) {
            $this->info('A dataset sync wave is already in flight — skipping.');

            return self::SUCCESS;
        }

        $timeout = (string) (int) ($this->option('timeout') ?: config('novacity.timeout', 60));
        $retry = (string) max(0, (int) ($this->option('retry') ?? config('novacity.retry', 2)));
        $batch = (string) max(1, (int) ($this->option('batch') ?? config('novacity.batch', 25)));

        $this->info('Dispatching '.count($roots).' detached worker(s): '.implode(', ', $roots));
        $exit = self::SUCCESS;
        $wave = (string) Str::uuid();

        Cache::put(self::STARTED_AT_KEY, time());

        foreach ($roots as $root) {
            try {
                $this->spawnChild($phase, $root, $timeout, $retry, $batch, $wave);
            } catch (\Throwable $e) {
                $this->warn($e->getMessage());
                $exit = self::FAILURE;
            }
        }

        if ($exit !== self::SUCCESS) {
            Cache::set(self::INFLIGHT_KEY, 0);
        }

        $this->info('Workers launched in the background — schedule no longer blocks on the sweep.');

        return $exit;
    }

    /**
     * Distinct roots (scheme://host[:port]) of every endpoint in data.json.
     * New roots added to data.json are picked up automatically on the next tick.
     */
    private function distinctRoots(EndpointDatasetRegistry $registry): array
    {
        $baseUrl = rtrim((string) config('novacity.base_url', ''), '/');
        $path = $registry->path();

        if (! file_exists($path)) {
            return [];
        }

        $items = json_decode((string) file_get_contents($path), true);
        $roots = [];

        foreach (is_array($items) ? $items : [] as $item) {
            $endpoint = trim((string) ($item['endpoint'] ?? ''));

            if ($endpoint === '' || $endpoint === '#') {
                continue;
            }

            $parts = parse_url($endpoint);

            if (! isset($parts['scheme'], $parts['host'])) {
                $endpoint = $baseUrl === '' ? $endpoint : $baseUrl.'/'.ltrim($endpoint, '/');
                $parts = parse_url($endpoint);
            }

            if (! isset($parts['scheme'], $parts['host'])) {
                continue;
            }

            $root = $parts['scheme'].'://'.$parts['host'];

            if (isset($parts['port'])) {
                $root .= ':'.$parts['port'];
            }

            $roots[strtolower($root)] = $root;
        }

        sort($roots);

        return $roots;
    }

    /**
     * Launch one fully detached `sync:endpoint-data` worker per root. The
     * child is reparented away from this process so it keeps running even
     * after dispatch (and its scheduler) exits.
     */
    private function spawnChild(string $phase, string $root, string $timeout, string $retry, string $batch, string $wave): void
    {
        // Track this child in the in-flight counter; the child itself
        // decrements it when it finishes (see SyncEndpointData --wave).
        Cache::increment(self::INFLIGHT_KEY);

        $parts = [
            'sync:endpoint-data',
            '--phase='.$phase,
            '--root='.$root,
            '--timeout='.$timeout,
            '--retry='.$retry,
            '--batch='.$batch,
            '--wave='.$wave,
        ];

        if ($this->option('force')) {
            $parts[] = '--force';
        }

        $log = storage_path('logs/endpoint-sync-'.md5($root).'.log');

        DetachedProcess::spawn($log, $parts);
    }

    /**
     * Number of workers currently reported in flight. If the wave has been
     * running longer than {interval} without decrementing, the counter is
     * treated as stale (a worker was killed without its finally) and reset.
     */
    private function inflight(): int
    {
        $count = (int) Cache::get(self::INFLIGHT_KEY, 0);

        if ($count <= 0) {
            return 0;
        }

        $started = (int) Cache::get(self::STARTED_AT_KEY, 0);
        $maxAge = 12 * 3600;

        if ($started > 0 && (time() - $started) > $maxAge) {
            Cache::set(self::INFLIGHT_KEY, 0);
            Cache::forget(self::STARTED_AT_KEY);

            return 0;
        }

        return $count;
    }
}
