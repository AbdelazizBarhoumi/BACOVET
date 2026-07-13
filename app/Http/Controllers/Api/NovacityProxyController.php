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
        $baseUrl = rtrim((string) ($request->query('baseUrl') ?: config('novacity.base_url')), '/');
        $query = collect($request->query())->except('baseUrl')->all();

        $headers = [
            'x-api-key' => (string) config('novacity.api_key'),
            'Accept' => 'application/json',
        ];

        $token = config('novacity.admin_token');
        if ($token) {
            $headers['Authorization'] = 'Bearer ' . $token;
        }

        $response = Http::withHeaders($headers)
            ->timeout((int) config('novacity.timeout', 30))
            ->get($baseUrl . '/' . ltrim($path, '/'), $query);

        if ($response->failed()) {
            return response()->json([
                'success' => false,
                'error' => "Novacity API error [{$path}]: HTTP {$response->status()}",
            ], $response->status());
        }

        return response()->json($response->json() ?? []);
    }
}
