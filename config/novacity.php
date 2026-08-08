<?php

return [
    'base_url' => env('NOVACITY_BASE_URL', ''),
    'api_key' => env('NOVACITY_API_KEY', ''),
    'admin_token' => env('NOVACITY_ADMIN_TOKEN', ''),
    'login_path' => env('NOVACITY_LOGIN_PATH', '/api/auth/prestataire/login'),
    'login_payload' => env('NOVACITY_LOGIN_PAYLOAD', ''),
    'timeout' => env('NOVACITY_TIMEOUT', 60),
    'connect_timeout' => env('NOVACITY_CONNECT_TIMEOUT', 15),
    'data_file' => env('NOVACITY_DATA_FILE', 'app/private/data.json'),
    'data_backup' => env('NOVACITY_DATA_BACKUP', 'app/private/data.json.bak'),
    'refresh_meta' => env('NOVACITY_REFRESH_META', 'app/public/endpoints-refresh.json'),
];
