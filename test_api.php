<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

use Illuminate\Http\Request;

$json = json_encode(['name' => 'Debug Test Page']);
$request = new Request();
$request->initialize([], [], [], [], [], [
    'CONTENT_TYPE' => 'application/json',
    'HTTP_ACCEPT' => 'application/json',
    'HTTP_X_REQUESTED_WITH' => 'XMLHttpRequest',
]);
$request->json = json_decode($json, true);
$request->setMethod('POST');
$request->server->set('REQUEST_METHOD', 'POST');
$request->content = $json;

$response = $kernel->handle($request);
echo "Status: " . $response->getStatusCode() . "\n";
$body = $response->getContent();
echo "Body: " . $body . "\n";

$data = json_decode($body, true);
if (isset($data['page'])) {
    echo "Page slug: " . var_export($data['page']['slug'] ?? 'UNDEFINED', true) . "\n";
    echo "Page keys: " . implode(', ', array_keys($data['page'])) . "\n";
}

// Cleanup
App\Models\BuilderPage::where('name', 'Debug Test Page')->delete();
