<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GproConsultingService
{
    private string $baseUrl;

    private string $apiKey;

    private int $timeout;

    private const ENDPOINTS = [
        'chain_planning' => '/api/v1/chain-planning',
        'article_master' => '/api/v1/article-master',
        'of_dates' => '/api/v1/of-dates',
        'suivi_paquets' => '/api/v1/suivi-paquets',
    ];

    public function __construct()
    {
        $this->baseUrl = (string) config('gpro_consulting.base_url');
        $this->apiKey = (string) config('gpro_consulting.api_key');
        $this->timeout = (int) config('gpro_consulting.timeout', 10);
    }

    public function fetchData(string $key): array
    {
        $path = self::ENDPOINTS[$key] ?? throw new \InvalidArgumentException("Unknown GPRO endpoint: {$key}");

        $response = Http::withHeaders(['x-api-key' => $this->apiKey])
            ->timeout($this->timeout)
            ->get($this->baseUrl.$path);

        if ($response->failed()) {
            throw new \RuntimeException("GPRO Consulting API error [{$key}]: HTTP {$response->status()}");
        }

        $body = $response->json();

        if (isset($body['success']) && ! $body['success']) {
            throw new \RuntimeException("GPRO returned success:false for [{$key}]");
        }

        return $body['data'] ?? [];
    }
}
