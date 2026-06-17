<?php

return [
    'service_account_json' => env('GOOGLE_SERVICE_ACCOUNT_JSON'),
    'mock_url' => env('GOOGLE_DRIVE_MOCK_URL', 'http://127.0.0.1:3002'),
    'mock_mode' => env('GOOGLE_DRIVE_MOCK_MODE', true),
    'timeout' => env('GOOGLE_DRIVE_TIMEOUT', 15),
    'sheets' => [
        'br_print' => env('GOOGLE_DRIVE_BR_PRINT_SHEET_ID'),
        'br_care_label' => env('GOOGLE_DRIVE_BR_CARE_LABEL_SHEET_ID'),
        'br_accessoires' => env('GOOGLE_DRIVE_BR_ACCESSOIRES_SHEET_ID'),
        'br_compo' => env('GOOGLE_DRIVE_BR_COMPO_SHEET_ID'),
        'inspection_commande' => env('GOOGLE_DRIVE_INSPECTION_COMMANDE_SHEET_ID'),
        'dot_hot' => env('GOOGLE_DRIVE_DOT_HOT_SHEET_ID'),
        'development' => env('GOOGLE_DRIVE_DEVELOPMENT_SHEET_ID'),
        'gammes' => env('GOOGLE_DRIVE_GAMMES_SHEET_ID'),
        'cotation' => env('GOOGLE_DRIVE_COTATION_SHEET_ID'),
    ],
];
