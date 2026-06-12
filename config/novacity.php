<?php

return [
    'base_url' => env('NOVACITY_BASE_URL'),
    'api_key' => env('NOVACITY_API_KEY'),
    'admin_token' => env('NOVACITY_ADMIN_TOKEN', 'SYSTEM_TOKEN'),
    'timeout' => env('NOVACITY_TIMEOUT', 10),
];
