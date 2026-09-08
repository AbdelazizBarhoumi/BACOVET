<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->handle();
$rows = Illuminate\Support\Facades\DB::select('SELECT slug, params, last_status, row_count FROM endpoint_dataset_variants ORDER BY slug, params_hash');
echo count($rows)." variants\n";
foreach ($rows as $r) {
    echo $r->slug." | ".$r->params." | status=".$r->last_status." | rows=".$r->row_count."\n";
}
