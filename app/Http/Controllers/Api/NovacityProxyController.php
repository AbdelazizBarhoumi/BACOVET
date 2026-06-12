<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class NovacityProxyController extends Controller
{
    public function proxy(Request $request, string $path): JsonResponse
    {
        if (! str_starts_with($path, 'data/')) {
            return response()->json([
                'success' => false,
                'error' => 'Unsupported Novacity path.',
            ], 404);
        }

        $baseUrl = rtrim((string) config('novacity.base_url'), '/');
        $query = collect($request->query())->only(['limit', 'offset'])->all();

        $response = Http::withHeaders([
            'x-api-key' => (string) config('novacity.api_key'),
        ])
            ->timeout((int) config('novacity.timeout', 10))
            ->get($baseUrl . '/api/' . $path, $query);

        if ($response->failed()) {
            return response()->json([
                'success' => false,
                'error' => "Novacity API error [{$path}]: HTTP {$response->status()}",
            ], $response->status());
        }

        return response()->json($response->json() ?? []);
    }
}