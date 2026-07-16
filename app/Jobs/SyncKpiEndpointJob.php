<?php

namespace App\Jobs;

use App\Services\KpiEndpointService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncKpiEndpointJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    public function __construct(
        private string $endpointPath,
        private array $endpointConfig,
        private array $keyConfig,
        private string $kpiCode,
    ) {}

    public function handle(KpiEndpointService $service): void
    {
        $service->syncKpiFromEndpoint(
            $this->endpointPath,
            $this->endpointConfig,
            $this->keyConfig,
            $this->kpiCode
        );
    }

    public function failed(\Throwable $exception): void
    {
        app(KpiEndpointService::class)->recordError(
            $this->endpointPath,
            $this->keyConfig,
            $this->kpiCode,
            $exception->getMessage()
        );
    }
}
