<?php

return [
    'base_url' => env('NOVACITY_BASE_URL', 'http://100.76.6.178:4100'),
    'api_key' => env('NOVACITY_API_KEY', ''),
    'admin_token' => env('NOVACITY_ADMIN_TOKEN', ''),
    'timeout' => env('NOVACITY_TIMEOUT', 30),
    'data_file' => env('NOVACITY_DATA_FILE', 'app/public/data.json'),
    'data_backup' => env('NOVACITY_DATA_BACKUP', 'app/public/data.json.bak'),
];
