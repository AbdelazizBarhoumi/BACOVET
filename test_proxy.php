<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Http;

$apiKey = config('novacity.api_key');
$token = config('novacity.admin_token');
$baseUrl = config('novacity.base_url');

echo "api_key length: " . strlen($apiKey) . "\n";
echo "token length: " . strlen($token) . "\n";
echo "base_url: $baseUrl\n\n";

$response = Http::withHeaders([
    'x-api-key' => $apiKey,
    'Authorization' => 'Bearer ' . $token,
    'Accept' => 'application/json',
])->timeout(30)->get($baseUrl . '/api/data/itemtrxenq?limit=1');

echo "Status: " . $response->status() . "\n";
echo "Body: " . substr($response->body(), 0, 300) . "\n";
