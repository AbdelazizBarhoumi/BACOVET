<?php

return [
    'history_enabled' => env('SYNC_HISTORY_ENABLED', true),

    'sources' => [
        'novacity_quality' => env('SYNC_NOVACITY_QUALITY_ENABLED', true),
        'novacity_production' => env('SYNC_NOVACITY_PRODUCTION_ENABLED', true),
        'novacity_logistics' => env('SYNC_NOVACITY_LOGISTICS_ENABLED', true),
        'google_drive' => env('SYNC_GOOGLE_DRIVE_ENABLED', true),
        'gpro' => env('SYNC_GPRO_ENABLED', true),
    ],
];
