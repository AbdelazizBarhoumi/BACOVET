<?php

namespace App\Console\Commands;

use App\Models\EndpointDataset;
use App\Services\EndpointDatasetRegistry;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class SyncEndpointDatasets extends Command
{
    protected $signature = 'sync:endpoint-datasets
        {--timeout=30 : Per-request timeout in seconds}';

    protected $description = 'Fetch rows for every eligible endpoint live from NOVACITY_BASE_URL into endpoint_datasets';

    public function handle(): int
    {
        $baseUrl = rtrim((string) config('novacity.base_url', ''), '/');

        if ($baseUrl === '') {
            $this->error('NOVACITY_BASE_URL is not configured (config novacity.base_url).');

            return self::FAILURE;
        }

        $registry = app(EndpointDatasetRegistry::class);
        $path = $registry->path();

        if (! file_exists($path)) {
            $this->error("data.json not found at {$path}.");

            return self::FAILURE;
        }

        $endpoints = $registry->endpoints();

        if ($endpoints === []) {
            $this->warn('No eligible endpoints found in data.json.');

            return self::SUCCESS;
        }

        $apiKey = (string) config('novacity.api_key');
        $timeout = max(1, (int) $this->option('timeout'));

        $urls = array_map(
            fn (array $ep): string => $this->buildUrl($baseUrl, (string) $ep['endpoint']),
            $endpoints
        );

        $start = microtime(true);
        $this->info('Fetching '.count($endpoints).' endpoint(s) from '.$baseUrl.' ...');

        $responses = Http::pool(function (Pool $pool) use ($endpoints, $urls, $apiKey, $timeout) {
            foreach ($endpoints as $i => $endpoint) {
                $pool->as((string) $i)
                    ->withHeaders([
                        'x-api-key' => $apiKey,
                        'Accept' => 'application/json',
                    ])
                    ->timeout($timeout)
                    ->get($urls[$i]);
            }
        });

        $syncedAt = now();
        $ok = 0;
        $errors = 0;

        foreach ($endpoints as $i => $endpoint) {
            $result = $this->fetchResult($responses[(string) $i] ?? null);
            $rows = $result['ok'] ? $this->extractRows($result['data']) : [];

            $payload = [
                'name' => (string) $endpoint['name'],
                'label' => $endpoint['label'],
                'object' => $endpoint['object'],
                'object_type' => $endpoint['object_type'],
                'source' => (string) $endpoint['source'],
                'method' => 'GET',
                'last_status' => $result['ok'] ? 'ok' : 'error',
                'last_error' => $result['ok'] ? null : mb_substr((string) $result['error'], 0, 2000),
                'last_synced_at' => $syncedAt,
            ];

            // Keep the last-known-good snapshot (columns/rows) when a fetch
            // fails so registered endpoints stay usable in the V5/V6 builder.
            if ($result['ok']) {
                $payload['columns'] = $this->buildColumns((array) $endpoint['columns'], $rows);
                $payload['sample_data'] = $rows;
                $payload['row_count'] = count($rows);
            }

            EndpointDataset::updateOrCreate(
                ['slug' => (string) $endpoint['slug']],
                $payload,
            );

            if ($result['ok']) {
                $ok++;
            } else {
                $errors++;
                $this->warn(sprintf(
                    '  ✗ %s — %s (%s)',
                    $endpoint['name'],
                    mb_substr((string) $result['error'], 0, 160),
                    $urls[$i]
                ));
            }
        }

        $elapsed = round(microtime(true) - $start, 2);
        $this->info("Done: {$ok} ok, {$errors} errors | {$elapsed}s");

        return self::SUCCESS;
    }

    /**
     * Rebuild the live URL from the base URL + stored path + preserved query.
     */
    private function buildUrl(string $baseUrl, string $endpoint): string
    {
        $parts = parse_url($endpoint);
        $path = isset($parts['path']) ? ltrim($parts['path'], '/') : '';
        $url = $path !== '' ? $baseUrl.'/'.$path : $baseUrl;

        if (isset($parts['query']) && $parts['query'] !== '') {
            $url .= '?'.$parts['query'];
        }

        return $url;
    }

    /**
     * Inspect a pool response: true on HTTP 200 + API success, else error message.
     *
     * @return array{ok: bool, data: mixed, error: ?string}
     */
    private function fetchResult(mixed $response): array
    {
        try {
            if ($response instanceof ConnectionException) {
                return ['ok' => false, 'data' => null, 'error' => $response->getMessage()];
            }

            if (! $response instanceof Response) {
                return ['ok' => false, 'data' => null, 'error' => 'No response returned for this endpoint'];
            }

            if ($response->failed()) {
                $status = $response->status();
                $body = '';

                try {
                    $decoded = $response->json();
                    $body = is_array($decoded) ? json_encode($decoded) : (string) $decoded;
                } catch (\Throwable) {
                    $body = $response->body();
                }

                return [
                    'ok' => false,
                    'data' => null,
                    'error' => "HTTP {$status}".($body !== '' ? ': '.mb_substr($body, 0, 500) : ''),
                ];
            }

            $decoded = $response->json();

            if (is_array($decoded) && ($decoded['success'] ?? true) === false) {
                $detail = is_array($decoded['error'] ?? null)
                    ? json_encode($decoded['error'])
                    : ($decoded['error'] ?? $decoded['message'] ?? 'unknown');

                return [
                    'ok' => false,
                    'data' => null,
                    'error' => 'API success:false'.($detail ? ": {$detail}" : ''),
                ];
            }

            return ['ok' => true, 'data' => $decoded ?? $response->body(), 'error' => null];
        } catch (\Throwable $e) {
            return ['ok' => false, 'data' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * Extract tabular rows from a decoded response payload.
     */
    private function extractRows(mixed $decoded): array
    {
        if (! is_array($decoded)) {
            return [];
        }

        $data = isset($decoded['data']) && is_array($decoded['data'])
            ? $decoded['data']
            : $decoded;

        return array_values(array_filter($data, 'is_array'));
    }

    /**
     * Build columns (name + type) for the given rows.
     *
     * @param  list<string>  $names
     * @return list<array{name: string, type: string}>
     */
    private function buildColumns(array $names, array $rows): array
    {
        return array_map(
            fn (string $name): array => [
                'name' => $name,
                'type' => $this->inferColumnType($rows, $name),
            ],
            $names
        );
    }

    private function inferColumnType(array $rows, string $column): string
    {
        $types = [];

        foreach (array_slice($rows, 0, 50) as $row) {
            if (! array_key_exists($column, $row)) {
                continue;
            }
            $value = $row[$column];
            if ($value === null) {
                continue;
            }

            if (is_bool($value)) {
                $types['boolean'] = true;
            } elseif (is_int($value) || is_float($value)) {
                $types['number'] = true;
            } elseif (is_string($value)) {
                $types[$this->isDateString($value) ? 'date' : 'text'] = true;
            } else {
                $types['text'] = true;
            }
        }

        if (count($types) === 0) {
            return 'text';
        }

        // Mixed -> most useful for the builder is text.
        if (count($types) > 1) {
            return 'text';
        }

        return (string) array_key_first($types);
    }

    private function isDateString(string $value): bool
    {
        $trimmed = trim($value);

        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}([T ].*)?$/', $trimmed)
            && strtotime(substr($trimmed, 0, 10)) !== false;
    }
}
