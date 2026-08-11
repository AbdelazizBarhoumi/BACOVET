<?php

namespace App\Console\Commands;

use App\Services\EndpointDatasetRegistry;
use Illuminate\Console\Command;
use Symfony\Component\Process\Process;
use Throwable;

class SyncEndpointDataDispatch extends Command
{
    protected $signature = 'sync:endpoint-data:dispatch
        {--phase=datasets : datasets|refresh|all per-root phase}
        {--timeout= : Per-request timeout for child workers (defaults to config)}
        {--retry= : Retries per child request (defaults to config)}
        {--batch= : Max concurrent requests per child worker (defaults to config)}
        {--force : Pass --force to child workers}';

    protected $description = 'Discover every root in data.json and spawn one sync:endpoint-data worker per root so each root gets its own process';

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

        $timeout = (string) (int) ($this->option('timeout') ?: config('novacity.timeout', 60));
        $retry = (string) max(0, (int) ($this->option('retry') ?? config('novacity.retry', 2)));
        $batch = (string) max(1, (int) ($this->option('batch') ?? config('novacity.batch', 25)));
        $maxWorkers = max(1, (int) config('novacity.sync_workers', 3));

        $this->info('Dispatching '.count($roots).' worker(s): '.implode(', ', $roots));

        $queue = $roots;
        $exit = self::SUCCESS;

        while ($queue !== []) {
            $wave = array_splice($queue, 0, $maxWorkers);
            $processes = [];

            foreach ($wave as $root) {
                $processes[] = $this->spawnChild($phase, $root, $timeout, $retry, $batch);
            }

            foreach ($processes as $process) {
                $exit = max($exit, $this->awaitChild($process));
            }
        }

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

    private function spawnChild(string $phase, string $root, string $timeout, string $retry, string $batch): Process
    {
        $command = [
            PHP_BINARY,
            base_path('artisan'),
            'sync:endpoint-data',
            '--phase='.$phase,
            '--root='.$root,
            '--timeout='.$timeout,
            '--retry='.$retry,
            '--batch='.$batch,
        ];

        if ($this->option('force')) {
            $command[] = '--force';
        }

        $process = new Process($command, base_path());
        $process->setTimeout(null);
        $process->start();

        return $process;
    }

    private function awaitChild(Process $process): int
    {
        try {
            $process->wait();

            if (! $process->isSuccessful()) {
                $this->warn(trim((string) $process->getErrorOutput()).PHP_EOL.trim((string) $process->getOutput()));

                return self::FAILURE;
            }

            foreach (explode(PHP_EOL, (string) $process->getOutput()) as $line) {
                if (trim((string) $line) !== '') {
                    $this->info(trim((string) $line));
                }
            }

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->warn($exception->getMessage());

            return self::FAILURE;
        }
    }
}