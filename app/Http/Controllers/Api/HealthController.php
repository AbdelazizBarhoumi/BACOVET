<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GproConsultingService;
use App\Services\GoogleDriveService;
use App\Services\NovacityService;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function check(): JsonResponse
    {
        return response()->json([
            'novacity' => $this->checkNovacity(),
            'google_drive' => $this->checkGoogleDrive(),
            'gpro' => $this->checkGpro(),
        ]);
    }

    private function checkNovacity(): string
    {
        try {
            $service = new NovacityService;
            $service->fetchEndpoint('check_pass_qte', 1);
            return 'healthy';
        } catch (\Throwable) {
            return 'unreachable';
        }
    }

    private function checkGoogleDrive(): string
    {
        try {
            $service = new GoogleDriveService;
            $service->fetchSheet('br_print');
            return 'healthy';
        } catch (\Throwable) {
            return 'unreachable';
        }
    }

    private function checkGpro(): string
    {
        try {
            $service = new GproConsultingService;
            $service->fetchData('chain_planning');
            return 'healthy';
        } catch (\Throwable) {
            return 'unreachable';
        }
    }
}
