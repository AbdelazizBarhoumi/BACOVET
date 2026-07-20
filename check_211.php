<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$row = App\Models\KpiData::where('kpi_code', 'F-REQ-211')->where('variable_key', 'TempsStandard')->first();
if (!$row) { echo "NO DATA\n"; exit; }
$raw = $row->response_data['raw'] ?? [];
echo "Rows: " . count($raw) . "\n";
if (!empty($raw)) {
    echo "Keys: " . implode(', ', array_keys($raw[0])) . "\n";
    echo "First 3 rows:\n";
    foreach (array_slice($raw, 0, 3) as $r) {
        echo "  " . json_encode($r) . "\n";
    }
    $vals = array_column($raw, 'TempsStandard');
    echo "TempsStandard values: " . implode(', ', array_slice($vals, 0, 10)) . "...\n";
    echo "All numeric: " . (ctype_digit(implode('', array_map('strval', $vals))) ? 'YES' : 'NO') . "\n";
}
