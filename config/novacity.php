<?php

return [
    'base_url' => env('NOVACITY_BASE_URL', ''),
    'api_key' => env('NOVACITY_API_KEY', ''),
    'admin_token' => env('NOVACITY_ADMIN_TOKEN', ''),
    'login_path' => env('NOVACITY_LOGIN_PATH', '/api/auth/prestataire/login'),
    'login_payload' => env('NOVACITY_LOGIN_PAYLOAD', ''),
    'timeout' => env('NOVACITY_TIMEOUT', 60),
    'web_timeout' => env('NOVACITY_WEB_TIMEOUT', 20),
    'connect_timeout' => env('NOVACITY_CONNECT_TIMEOUT', 15),
    'data_file' => env('NOVACITY_DATA_FILE', 'app/private/data.json'),
    'refresh_meta' => env('NOVACITY_REFRESH_META', 'app/private/endpoints-refresh.json'),
    'roots_file' => env('NOVACITY_ROOTS_FILE', 'app/private/endpoint-roots.json'),
    'sync_workers' => env('NOVACITY_SYNC_WORKERS', 3),
    'batch' => env('NOVACITY_BATCH', 25),
    'retry' => env('NOVACITY_RETRY', 2),
];
